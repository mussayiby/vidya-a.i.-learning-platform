import { supabase } from "@/integrations/supabase/client";
import { profileService } from "@/services/profile.service";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type SignUpResult = {
  account: AuthUser;
  requiresEmailConfirmation: boolean;
};

function getDisplayNameFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  if (metadataName.trim()) return metadataName.trim();
  if (user.email) return user.email.split("@")[0] ?? "Student";
  return "Student";
}

function toAuthUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): AuthUser {
  return {
    id: user.id,
    name: getDisplayNameFromUser(user),
    email: user.email ?? "",
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isRateLimitError(error: { message?: string; status?: number }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return error.status === 429 || message.includes("rate limit") || message.includes("rate exceeded");
}

function getAuthErrorMessage(error: { message?: string; status?: number }, fallback: string): string {
  const message = error.message?.toLowerCase() ?? "";

  if (isRateLimitError(error)) {
    return "Too many attempts. Please wait and try again.";
  }

  if (message.includes("email not confirmed") || message.includes("email confirmation")) {
    return "Please verify your email before logging in.";
  }

  if (message.includes("already registered") || message.includes("already been registered")) {
    return "An account with this email already exists. Please log in instead.";
  }

  return fallback;
}

async function ensureProfileForUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const existing = await profileService.getForUser(user.id);
  if (existing) return existing;

  const profile = {
    name: getDisplayNameFromUser(user),
    email: user.email ?? "",
    classLevel: null,
    language: "en",
    subjects: [],
    goals: [],
    dailyMinutes: "30",
    difficulty: "intermediate",
    learningStyle: "visual",
    notifications: {
      dailyReminder: true,
      weeklyReport: true,
      achievements: true,
    },
    onboardingComplete: false,
  };

  return profileService.save(profile, user.id);
}

export const authService = {
  async getSession(): Promise<AuthUser | null> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session?.user) return null;
    return toAuthUser(session.user);
  },

  async signIn(email: string, password: string): Promise<AuthUser> {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes("@")) throw new Error("Enter a valid email address.");
    if (password.length < 6)
      throw new Error("Password must be at least 6 characters.");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) throw new Error(getAuthErrorMessage(error, "Invalid email or password."));
    if (!data.user) throw new Error("Login failed. Please try again.");

    await ensureProfileForUser(data.user);
    return toAuthUser(data.user);
  },

  async signUp(
    name: string,
    email: string,
    password: string,
  ): Promise<SignUpResult> {
    const normalizedEmail = normalizeEmail(email);
    if (!name.trim()) throw new Error("Please enter your name.");
    if (!normalizedEmail.includes("@")) throw new Error("Enter a valid email address.");
    if (password.length < 6)
      throw new Error("Password must be at least 6 characters.");

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
        ...(typeof window !== "undefined"
          ? { emailRedirectTo: `${window.location.origin}/auth/callback` }
          : {}),
      },
    });

    if (error) {
      if (isRateLimitError(error)) {
        throw new Error("Too many signup emails were requested. Please wait a while before trying again.");
      }
      throw new Error(getAuthErrorMessage(error, "Unable to create your account. Please try again."));
    }
    if (!data.user) throw new Error("Unable to create the account. Please try again.");

    if (data.session) {
      await ensureProfileForUser(data.user);
    }

    return {
      account: toAuthUser(data.user),
      requiresEmailConfirmation: !data.session,
    };
  },

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes("@")) throw new Error("Enter a valid email address.");

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    if (error) throw new Error(getAuthErrorMessage(error, "Unable to send the password reset email. Please try again."));
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};

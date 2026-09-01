import { supabase } from "@/integrations/supabase/client";

export type StudentProfile = {
  name: string;
  email: string;
  classLevel: string | null;
  language: string;
  subjects: string[];
  goals: string[];
  dailyMinutes: string;
  difficulty: string;
  learningStyle: string;
  notifications: {
    dailyReminder: boolean;
    weeklyReport: boolean;
    achievements: boolean;
  };
  onboardingComplete: boolean;
};

export const emptyProfile: StudentProfile = {
  name: "",
  email: "",
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

function normalizeProfile(
  raw: Partial<StudentProfile> | null | undefined
): StudentProfile {
  return {
    ...emptyProfile,
    ...raw,

    notifications: {
      ...emptyProfile.notifications,
      ...raw?.notifications,
    },

    subjects: Array.isArray(raw?.subjects)
      ? raw.subjects
      : [],

    goals: Array.isArray(raw?.goals)
      ? raw.goals
      : [],
  };
}

function fromRow(
  row: Record<string, unknown> | null
): StudentProfile | null {
  if (!row) {
    return null;
  }

  return normalizeProfile({
    name:
      typeof row["name"] === "string"
        ? row["name"]
        : "",

    email:
      typeof row["email"] === "string"
        ? row["email"]
        : "",

    classLevel:
      typeof row["class_level"] === "string"
        ? row["class_level"]
        : null,

    language:
      typeof row["language"] === "string"
        ? row["language"]
        : "en",

    subjects:
      Array.isArray(row["subjects"])
        ? row["subjects"].filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],

    goals:
      Array.isArray(row["goals"])
        ? row["goals"].filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],

    dailyMinutes:
      typeof row["daily_minutes"] === "string"
        ? row["daily_minutes"]
        : "30",

    difficulty:
      typeof row["difficulty"] === "string"
        ? row["difficulty"]
        : "intermediate",

    learningStyle:
      typeof row["learning_style"] === "string"
        ? row["learning_style"]
        : "visual",

    notifications:
      typeof row["notifications"] === "object" &&
      row["notifications"] !== null
        ? (row["notifications"] as StudentProfile["notifications"])
        : emptyProfile.notifications,

    onboardingComplete:
      row["onboarding_complete"] === true,
  });
}

export const profileService = {
  async get(): Promise<StudentProfile | null> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return user
      ? this.getForUser(user.id)
      : null;
  },

  async getForUser(
    userId: string
  ): Promise<StudentProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return fromRow(
      data as Record<string, unknown> | null
    );
  },

  async save(
    profile: StudentProfile,
    userId?: string
  ): Promise<StudentProfile> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    const targetUserId = userId ?? user?.id;

    if (!targetUserId || user?.id !== targetUserId) {
      throw new Error(
        "You must be signed in to update your own profile."
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: targetUserId,
          name: profile.name,
          email: profile.email,
          class_level: profile.classLevel,
          language: profile.language,
          subjects: profile.subjects,
          goals: profile.goals,
          daily_minutes: profile.dailyMinutes,
          difficulty: profile.difficulty,
          learning_style: profile.learningStyle,
          notifications: profile.notifications,
          onboarding_complete: profile.onboardingComplete,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return (
      fromRow(
        data as Record<string, unknown>
      ) ?? emptyProfile
    );
  },

  async clear(): Promise<void> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (error) {
      throw error;
    }
  },
};
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

function normalizeProfile(raw: Partial<StudentProfile> | null | undefined): StudentProfile {
  return {
    ...emptyProfile,
    ...raw,
    notifications: {
      ...emptyProfile.notifications,
      ...raw?.notifications,
    },
    subjects: Array.isArray(raw?.subjects) ? raw.subjects : [],
    goals: Array.isArray(raw?.goals) ? raw.goals : [],
  };
}

export const profileService = {
  async get(): Promise<StudentProfile | null> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return normalizeProfile(data as Partial<StudentProfile> | null);
  },

  async getForUser(userId: string): Promise<StudentProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return normalizeProfile(data as Partial<StudentProfile> | null);
  },

  async save(profile: StudentProfile, userId?: string): Promise<StudentProfile> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    const targetUserId = userId ?? user?.id;
    if (!targetUserId) {
      throw new Error("You must be signed in to update your profile.");
    }

    const payload = {
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
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;

    return normalizeProfile(data as Partial<StudentProfile> | null);
  },

  async clear(): Promise<void> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) return;

    const { error } = await supabase.from("profiles").delete().eq("id", user.id);
    if (error) throw error;
  },
};

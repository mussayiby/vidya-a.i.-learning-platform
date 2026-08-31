import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authService, type AuthUser, type SignUpResult } from "@/services/auth.service";
import {
  emptyProfile,
  profileService,
  type StudentProfile,
} from "@/services/profile.service";

type AppContextValue = {
  user: AuthUser | null;
  profile: StudentProfile;
  ready: boolean;
  completedLessons: string[];
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<StudentProfile>) => Promise<void>;
  toggleLessonComplete: (lessonId: string) => void;
};

export const AppContext = createContext<AppContextValue | null>(null);

const COMPLETED_KEY = "vidya.completedLessons";

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let syncVersion = 0;

    const syncAuth = async (sessionUser: AuthUser | null) => {
      const version = ++syncVersion;
      try {
        if (!isMounted || version !== syncVersion) return;

        setUser(sessionUser);

        if (sessionUser) {
          const currentProfile = await profileService.getForUser(sessionUser.id);
          setProfile(
            currentProfile ?? {
              ...emptyProfile,
              name: sessionUser.name,
              email: sessionUser.email,
            },
          );
        } else {
          setProfile(emptyProfile);
        }
      } catch {
        setUser(null);
        setProfile(emptyProfile);
      } finally {
        if (isMounted) setReady(true);
      }
    };

    void authService
      .getSession()
      .then(async (sessionUser) => {
        if (!isMounted) return;
        await syncAuth(sessionUser);
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setProfile(emptyProfile);
          setReady(true);
        }
      });

    try {
      const raw = window.localStorage.getItem(COMPLETED_KEY);
      if (raw) setCompletedLessons(JSON.parse(raw));
    } catch {
      // ignore local UI-only lessons for now
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const updateProfile = useCallback(async (patch: Partial<StudentProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });

    if (!user?.id) return;

    const nextProfile = await profileService.save(
      {
        ...profile,
        ...patch,
      },
      user.id,
    );

    setProfile(nextProfile);
  }, []);

  const toggleLessonComplete = useCallback((lessonId: string) => {
    setCompletedLessons((prev) => {
      const next = prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId];
      window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const account = await authService.signIn(email, password);
    const currentProfile = await profileService.getForUser(account.id);
    setUser(account);
    setProfile(
      currentProfile ?? {
        ...emptyProfile,
        name: account.name,
        email: account.email,
      },
    );
    return account;
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await authService.signUp(name, email, password);
      if (result.requiresEmailConfirmation) return result;

      const account = result.account;
      const nextProfile = {
        ...emptyProfile,
        name: account.name,
        email: account.email,
      };
      setUser(account);
      setProfile(nextProfile);
      return result;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setProfile(emptyProfile);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      ready,
      completedLessons,
      signIn,
      signUp,
      signOut,
      updateProfile,
      toggleLessonComplete,
    }),
    [
      user,
      profile,
      ready,
      completedLessons,
      signIn,
      signUp,
      signOut,
      updateProfile,
      toggleLessonComplete,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

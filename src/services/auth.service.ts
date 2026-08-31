export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type SignUpResult = {
  account: AuthUser;
  requiresEmailConfirmation: boolean;
};

type StoredUser = {
  id: string;
  name: string;
  email: string;
  password: string;
};

const AUTH_SESSION_KEY = "vidya.auth.session";
const AUTH_USERS_KEY = "vidya.auth.users";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readStoredUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredUsers(users: StoredUser[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function readStoredSession(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.id || !parsed.email) return null;
    return {
      id: parsed.id,
      name: parsed.name ?? parsed.email.split("@")[0] ?? "Student",
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

function writeStoredSession(user: AuthUser | null): void {
  if (typeof window === "undefined") return;

  if (!user) {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
}

export const authService = {
  async getSession(): Promise<AuthUser | null> {
    return readStoredSession();
  },

  async signIn(email: string, password: string): Promise<AuthUser> {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes("@")) throw new Error("Enter a valid email address.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    const users = readStoredUsers();
    const matchingUser = users.find((user) => user.email === normalizedEmail && user.password === password);
    if (!matchingUser) throw new Error("Invalid email or password.");

    const sessionUser: AuthUser = {
      id: matchingUser.id,
      name: matchingUser.name,
      email: matchingUser.email,
    };

    writeStoredSession(sessionUser);
    return sessionUser;
  },

  async signUp(
    name: string,
    email: string,
    password: string,
  ): Promise<SignUpResult> {
    const normalizedEmail = normalizeEmail(email);
    if (!name.trim()) throw new Error("Please enter your name.");
    if (!normalizedEmail.includes("@")) throw new Error("Enter a valid email address.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    const users = readStoredUsers();
    if (users.some((user) => user.email === normalizedEmail)) {
      throw new Error("An account with this email already exists. Please log in instead.");
    }

    const userId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user: StoredUser = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      password,
    };

    users.push(user);
    writeStoredUsers(users);

    const account: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    return {
      account,
      requiresEmailConfirmation: false,
    };
  },

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes("@")) throw new Error("Enter a valid email address.");
    return;
  },

  async signOut(): Promise<void> {
    writeStoredSession(null);
  },
};

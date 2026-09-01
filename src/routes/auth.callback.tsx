import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Confirming email — Vidya A.I." }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function handleCallback() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (!code) {
          throw new Error("Email confirmation code is missing or invalid.");
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw error;
        }

        if (!mounted) return;

        await navigate({
          to: "/onboarding/welcome",
          replace: true,
        });
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to confirm your email.",
        );
      }
    }

    void handleCallback();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">
            Email confirmation failed
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            {error}
          </p>

          <button
            className="mt-6 rounded-md bg-primary px-4 py-2 text-primary-foreground"
            onClick={() => {
              void navigate({
                to: "/login",
                replace: true,
              });
            }}
          >
            Go to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />

        <h1 className="mt-4 text-xl font-semibold">
          Confirming your email...
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Please wait while we finish setting up your account.
        </p>
      </div>
    </main>
  );
}
import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Confirming your email — Vidya A.I." }],
  }),
  component: AuthCallbackPage,
});

function getCallbackError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const error =
    params.get("error_description") ??
    params.get("error") ??
    hashParams.get("error_description") ??
    hashParams.get("error");
  return error ? "Your link is invalid or has expired. Please request a new one." : null;
}

function getHashValues() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
    type: hashParams.get("type"),
  };
}

function redirectToLogin(message: string): void {
  window.location.replace(`/login?error=${encodeURIComponent(message)}`);
}

function AuthCallbackPage() {
  useEffect(() => {
    async function completeConfirmation() {
      const callbackError = getCallbackError();
      if (callbackError) {
        redirectToLogin(callbackError);
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const hashValues = getHashValues();
      const isRecovery = searchParams.get("type") === "recovery" || hashValues.type === "recovery";

      // 1. Exchange code for session
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          redirectToLogin("Your link is invalid or has expired. Please request a new one.");
          return;
        }
      } else {
        // Old hash flow
        if (hashValues.accessToken && hashValues.refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: hashValues.accessToken,
            refresh_token: hashValues.refreshToken,
          });
          if (setSessionError) {
            redirectToLogin("Your link is invalid or has expired.");
            return;
          }
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        redirectToLogin("We could not verify. Please try again.");
        return;
      }

      // 2. IMPORTANT: If this was a password recovery, go to update password
      if (isRecovery) {
        window.location.replace("/auth/update-password");
        return;
      }

      window.location.replace("/onboarding/welcome");
    }

    void completeConfirmation();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-soft px-4 py-12">
      <div className="text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <h1 className="mt-4 text-xl font-semibold">Confirming your email...</h1>
        <p className="mt-2 text-sm text-muted-foreground">You will be redirected shortly.</p>
      </div>
    </main>
  );
}

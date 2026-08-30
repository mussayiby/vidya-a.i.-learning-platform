import { useEffect, useState } from "react";
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
  const error = params.get("error_description") ?? params.get("error");
  return error
    ? "Your email confirmation link is invalid or has expired. Please request a new one."
    : null;
}

function redirectToLogin(message: string): void {
  window.location.replace(`/login?error=${encodeURIComponent(message)}`);
}

function AuthCallbackPage() {
  useEffect(() => {
    let isMounted = true;

    async function completeConfirmation() {
      const callbackError = getCallbackError();
      if (callbackError) {
        redirectToLogin(callbackError);
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          redirectToLogin(
            "Your email confirmation link is invalid or has expired. Please request a new one.",
          );
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        redirectToLogin(
          "We could not complete email verification. Please try the confirmation link again.",
        );
        return;
      }

      window.location.replace("/onboarding/welcome");
    }

    void completeConfirmation();

    return () => {
      isMounted = false;
    };
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

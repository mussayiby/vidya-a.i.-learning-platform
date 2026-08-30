import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/update-password")({
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else {
      setMessage("Password updated! Redirecting...");
      setTimeout(() => (window.location.href = "/login"), 1500);
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-white">
      <form onSubmit={handleUpdate} className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow">
        <h1 className="text-xl font-bold">Set new password</h1>
        <input
          type="password"
          placeholder="New password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2"
          required
          minLength={6}
        />
        <button disabled={loading} className="w-full rounded bg-blue-600 py-2 text-white font-medium">
          {loading ? "Updating..." : "Update password"}
        </button>
        {message && <p className="text-sm text-center">{message}</p>}
      </form>
    </main>
  );
  }

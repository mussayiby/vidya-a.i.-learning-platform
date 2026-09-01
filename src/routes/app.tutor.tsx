import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Retains the original sidebar URL while directing it to the lesson-based
 * AI Tutor experience. The previous generic chat screen is no longer shown.
 */
export const Route = createFileRoute("/app/tutor")({
  beforeLoad: () => {
    throw redirect({ to: "/app/ai-tutor-library" });
  },
});

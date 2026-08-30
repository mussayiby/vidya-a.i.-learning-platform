import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const languageIds = ["en", "bn", "hi", "kn", "ml", "mr", "ta", "te", "ur"] as const;

const TranslateInput = z.object({
  // Recognition results are intentionally kept short so every sentence is
  // translated independently and reaches students with minimal delay.
  text: z.string().trim().min(1).max(2_000),
  from: z.enum(languageIds),
  to: z.enum(languageIds),
});

type SarvamResponse = {
  translated_text?: string;
  error?: { message?: string };
};

function serverEnvironment(): { SARVAM_API_KEY?: string } {
  const processLike = globalThis as typeof globalThis & {
    process?: { env?: { SARVAM_API_KEY?: string } };
  };
  return processLike.process?.env ?? {};
}

export const translateText = createServerFn({ method: "POST" })
  .validator((input: unknown) => TranslateInput.parse(input))
  .handler(async ({ data }) => {
    if (data.from === data.to) return { text: data.text };

    const apiKey = serverEnvironment().SARVAM_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "Translation is not configured. Add SARVAM_API_KEY to .env, then restart the server.",
      );
    }

    let response: Response;
    try {
      response = await fetch("https://api.sarvam.ai/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey,
        },
        body: JSON.stringify({
          input: data.text,
          source_language_code: `${data.from}-IN`,
          target_language_code: `${data.to}-IN`,
          model: "sarvam-translate:v1",
        }),
      });
    } catch (error) {
      throw new Error(
        `Translation service could not be reached: ${error instanceof Error ? error.message : "network error"}`,
      );
    }

    let payload: SarvamResponse;
    try {
      payload = (await response.json()) as SarvamResponse;
    } catch {
      throw new Error(`Translation service returned invalid JSON (HTTP ${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(
        `Translation service failed (HTTP ${response.status})${payload.error?.message ? `: ${payload.error.message}` : "."}`,
      );
    }

    const text = payload.translated_text?.trim();
    if (!text) throw new Error("Translation service returned no text.");
    return { text };
  });

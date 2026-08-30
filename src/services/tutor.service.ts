/**
 * AI tutor service.
 *
 * This app intentionally avoids fake AI responses. If no backend model is
 * configured, the tutor returns an honest message rather than pretending to
 * provide real answers.
 */
import { languages } from "@/data/catalog";

export type AskOptions = {
  question: string;
  subjectId: string;
  languageId: string;
  simple?: boolean;
  translate?: boolean;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const tutorService = {
  isLive: false,

  async ask({
    question,
    languageId,
    simple,
    translate,
  }: AskOptions): Promise<string> {
    await delay(450);

    const lang = languages.find((entry) => entry.id === languageId);
    const langLabel = lang ? `${lang.label} (${lang.native})` : "your language";
    const base =
      "AI tutor is not connected to a live model in this environment. Configure a real backend AI provider to enable personalized study answers and translations.";

    if (translate && languageId !== "en") {
      return `${base}\n\nTranslation requests are currently unavailable until the model is connected for ${langLabel}.`;
    }

    if (simple) {
      return `${base} Please connect the AI provider to continue.`;
    }

    return base;
  },
};

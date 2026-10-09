// Romanian <-> English translation for the admin, done by Claude.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export type Lang = "ro" | "en";

export class TranslationError extends Error {
  constructor(
    public code: "not_configured" | "invalid_key" | "quota" | "failed",
    message: string,
  ) {
    super(message);
  }
}

// Small, fast and cheap (about 0.1 cent per product). Set TRANSLATE_MODEL to
// use a stronger model, e.g. "claude-sonnet-5-5" or "claude-opus-5-5".
const DEFAULT_MODEL = "claude-haiku-5-5";

const SYSTEM_PROMPT = `You translate product and category texts for IDESIGN STUDIO, a small Romanian shop selling 3D-printed home accessories (vases, planters, organizers, trays) made from plant-based bioplastic, plus event decor and stationery.

Rules:
- Translate naturally, in a warm, clear, concise tone suited to online shop copy. Do not add, remove or explain anything.
- Keep product and brand names exactly as written, especially those in capital letters (TEAGRID, MORRA, COFESIA, STACKSEY, IDESIGN STUDIO).
- Keep the structure exactly: line breaks, blank lines, bullet characters (•), numbers, units (mm, RON) and punctuation.
- Texts may contain formatting markers: **bold** and *italic*. Keep every marker around the translation of the same words, exactly as written.
- Short fragments such as "Mare", "Mic", "Cutie" are names of product options or parts: translate them as short labels.
- Romanian text must use correct diacritics (ă â î ș ț).
- Return one translation per input item, in the same order.`;

const OutputSchema = z.object({ translations: z.array(z.string()) });

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new TranslationError("not_configured", "ANTHROPIC_API_KEY is not set");
  }
  cachedClient ??= new Anthropic();
  return cachedClient;
}

export async function translateTexts(
  texts: string[],
  from: Lang,
  client: Pick<Anthropic, "messages"> = getClient(),
): Promise<string[]> {
  if (texts.length === 0) return [];

  const [source, target] = from === "ro" ? ["Romanian", "English"] : ["English", "Romanian"];

  try {
    const response = await client.messages.parse({
      model: process.env.TRANSLATE_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Translate each of these ${texts.length} items from ${source} to ${target}. Items (JSON array):\n${JSON.stringify(texts)}`,
        },
      ],
      output_config: {
        effort: "low",
        format: zodOutputFormat(OutputSchema),
      },
    });

    const translations = response.parsed_output?.translations;
    if (
      response.stop_reason === "refusal" ||
      !translations ||
      translations.length !== texts.length
    ) {
      throw new TranslationError("failed", "Unexpected translation result");
    }
    return translations;
  } catch (err) {
    if (err instanceof TranslationError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new TranslationError("invalid_key", "Claude rejected the API key");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new TranslationError("quota", "Claude rate limit reached");
    }
    // A prepaid balance that ran out comes back as a 400 about credits.
    if (
      err instanceof Anthropic.BadRequestError &&
      /credit balance/i.test(err.message)
    ) {
      throw new TranslationError("quota", "Claude credit balance is empty");
    }
    console.error("Claude translation failed", err);
    throw new TranslationError("failed", "Claude request failed");
  }
}

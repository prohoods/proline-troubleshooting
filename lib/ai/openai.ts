// Minimal server-side OpenAI Chat Completions client.
//
// Reads credentials from env at call time (never bundled to the client). Uses
// JSON mode so the model returns a parseable object. Model is env-configurable
// (OPENAI_MODEL) so it can match the team's existing CS agent.

const DEFAULT_MODEL = "gpt-4o";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export class AiError extends Error {
  constructor(
    public code: "not_configured" | "upstream" | "parse",
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatJSON<T>(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new AiError("not_configured", "OPENAI_API_KEY is not set");
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 1200,
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
    });
  } catch (e) {
    throw new AiError(
      "upstream",
      `network error reaching OpenAI: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AiError(
      "upstream",
      `OpenAI HTTP ${res.status} (model ${model}): ${detail.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiError("parse", "empty completion");

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new AiError("parse", `non-JSON completion: ${content.slice(0, 200)}`);
  }
}

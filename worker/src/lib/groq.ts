import Groq from "groq-sdk";

export const CHAT_MODEL = "llama-3.3-70b-versatile";

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY não configurada");
    }
    client = new Groq({ apiKey });
  }
  return client;
}

export function groqClient(): Groq {
  return getClient();
}

export async function completeJson<T>(
  systemPrompt: string,
  userContent: string,
): Promise<T> {
  const completion = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Groq retornou uma resposta vazia");
  }

  return JSON.parse(raw) as T;
}

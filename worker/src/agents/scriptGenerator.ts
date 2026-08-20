import { supabase } from "../lib/supabase.js";
import { completeJson } from "../lib/groq.js";
import { notifyDiscord } from "../lib/notify.js";
import { lintScriptContent } from "../lib/brandLinter.js";
import type { Job } from "../lib/types.js";

const FRONTEND_URL = process.env.FRONTEND_URL;

const FORMAT_LABEL: Record<ScriptFormat, string> = {
  reel_30s: "Reel 30s",
  reel_60s: "Reel 60s",
  reel_90s: "Reel 90s",
  carousel: "Carrossel",
  static_post: "Post estático",
};

type ScriptFormat =
  | "reel_30s"
  | "reel_60s"
  | "reel_90s"
  | "carousel"
  | "static_post";

interface ScriptGeneratorPayload {
  content_item_id: string;
  format: ScriptFormat;
  voice_profile_id: string;
}

interface VoiceProfile {
  id: string;
  target_audience: string | null;
  tone_adjectives: string[];
  words_we_use: string[];
  words_we_avoid: string[];
  example_approved_post: string | null;
}

function isScriptGeneratorPayload(
  payload: unknown,
): payload is ScriptGeneratorPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.content_item_id === "string" &&
    typeof p.format === "string" &&
    typeof p.voice_profile_id === "string"
  );
}

function outputShapeFor(format: ScriptFormat): string {
  if (format === "carousel") {
    return `{ slides: [{ slide_number: number, headline: string, body: string, visual_suggestion: string }], caption: string, hashtags: string[] }`;
  }
  if (format === "static_post") {
    return `{ headline: string, body: string, cta: string, caption: string, hashtags: string[] }`;
  }
  return `{ hook: string, body_segments: string[], cta: string, caption: string, hashtags: string[] }`;
}

function buildSystemPrompt(format: ScriptFormat, voiceProfile: VoiceProfile): string {
  return `Você é um especialista em criação de conteúdo para Instagram. Use o perfil de voz fornecido abaixo
para criar o conteúdo — nunca copie o original, inspire-se apenas na estrutura e nos gatilhos identificados.
O resultado deve soar 100% como a voz descrita.

PERFIL DE VOZ:
Público-alvo: ${voiceProfile.target_audience ?? "não informado"}
Tom: ${voiceProfile.tone_adjectives.join(", ") || "não informado"}
Palavras que usamos: ${voiceProfile.words_we_use.join(", ") || "não informado"}
Palavras que evitamos: ${voiceProfile.words_we_avoid.join(", ") || "não informado"}
Exemplo de post aprovado: ${voiceProfile.example_approved_post ?? "não informado"}

Retorne APENAS um JSON válido no formato: ${outputShapeFor(format)}`;
}

export async function runScriptGeneratorAgent(job: Job): Promise<void> {
  if (!isScriptGeneratorPayload(job.payload)) {
    throw new Error("payload inválido para job de geração de roteiro");
  }

  const { content_item_id, format, voice_profile_id } = job.payload;

  const [{ data: analysis }, { data: critique }, { data: voiceProfile, error: voiceError }] =
    await Promise.all([
      supabase
        .from("analyses")
        .select("content")
        .eq("content_item_id", content_item_id)
        .eq("type", "analysis")
        .maybeSingle(),
      supabase
        .from("analyses")
        .select("content")
        .eq("content_item_id", content_item_id)
        .eq("type", "critique")
        .maybeSingle(),
      supabase
        .from("voice_profile")
        .select("*")
        .eq("id", voice_profile_id)
        .single(),
    ]);

  if (voiceError || !voiceProfile) {
    throw new Error(voiceError?.message ?? "perfil de voz não encontrado");
  }

  const systemPrompt = buildSystemPrompt(format, voiceProfile as VoiceProfile);
  const userContent = JSON.stringify({ analysis: analysis?.content, critique: critique?.content });

  const result = await completeJson<Record<string, unknown>>(systemPrompt, userContent);

  const flaggedWords = lintScriptContent(
    result,
    (voiceProfile as VoiceProfile).words_we_avoid,
  );

  const { error: insertError } = await supabase.from("scripts").insert({
    content_item_id,
    format,
    content: result,
    voice_profile_snapshot: voiceProfile,
    approved: false,
    flagged_words: flaggedWords,
  });

  if (insertError) throw new Error(insertError.message);

  const link = FRONTEND_URL ? ` ${FRONTEND_URL}/conteudo/${content_item_id}` : "";
  const warning =
    flaggedWords.length > 0
      ? ` ⚠️ contém palavra(s) a evitar: ${flaggedWords.join(", ")}.`
      : "";
  await notifyDiscord(
    `📝 Roteiro pronto para aprovação (${FORMAT_LABEL[format]}).${warning}${link}`,
  );
}

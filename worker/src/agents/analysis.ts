import { supabase } from "../lib/supabase.js";
import { completeJson } from "../lib/groq.js";
import { withContentItemErrorHandling } from "../lib/errors.js";
import type { Job } from "../lib/types.js";

interface AnalysisPayload {
  content_item_id: string;
}

interface AnalysisResult {
  hook: string;
  narrative_structure: { intro: string; body: string; cta: string };
  tone: string[];
  engagement_triggers: string[];
  why_it_works: string;
}

const SYSTEM_PROMPT = `Você é especialista em conteúdo viral para Instagram. Analise o conteúdo e retorne APENAS um JSON válido com:
{ hook: string, narrative_structure: { intro: string, body: string, cta: string },
  tone: string[], engagement_triggers: string[], why_it_works: string }`;

function isAnalysisPayload(payload: unknown): payload is AnalysisPayload {
  if (!payload || typeof payload !== "object") return false;
  return typeof (payload as Record<string, unknown>).content_item_id === "string";
}

export async function runAnalysisAgent(job: Job): Promise<void> {
  if (!isAnalysisPayload(job.payload)) {
    throw new Error("payload inválido para job de análise");
  }

  const { content_item_id } = job.payload;

  await withContentItemErrorHandling(content_item_id, async () => {
    const { data: contentItem, error: contentError } = await supabase
      .from("content_items")
      .select("caption")
      .eq("id", content_item_id)
      .single();
    if (contentError) throw new Error(contentError.message);

    const { data: transcription } = await supabase
      .from("analyses")
      .select("content")
      .eq("content_item_id", content_item_id)
      .eq("type", "transcription")
      .maybeSingle();

    const userContent = JSON.stringify({
      caption: contentItem?.caption ?? null,
      transcription: (transcription?.content as { text?: string } | null)?.text ?? null,
    });

    const result = await completeJson<AnalysisResult>(SYSTEM_PROMPT, userContent);

    const { error: insertError } = await supabase.from("analyses").insert({
      content_item_id,
      type: "analysis",
      content: result,
    });
    if (insertError) throw new Error(insertError.message);

    const { error: jobError } = await supabase.from("jobs").insert({
      type: "critique",
      payload: { content_item_id },
      status: "pending",
    });
    if (jobError) throw new Error(jobError.message);
  });
}

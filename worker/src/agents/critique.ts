import { supabase } from "../lib/supabase.js";
import { completeJson } from "../lib/groq.js";
import { withContentItemErrorHandling } from "../lib/errors.js";
import type { Job } from "../lib/types.js";

interface CritiquePayload {
  content_item_id: string;
}

interface CritiqueResult {
  relevance_score: number;
  adaptation_potential: "alta" | "media" | "baixa";
  risks: string[];
  recommendation: "adaptar" | "inspirar" | "ignorar";
  justification: string;
}

const SYSTEM_PROMPT = `Avalie a adaptabilidade deste conteúdo para o nicho informado. Retorne APENAS JSON:
{ relevance_score: number (0-10), adaptation_potential: 'alta'|'media'|'baixa',
  risks: string[], recommendation: 'adaptar'|'inspirar'|'ignorar', justification: string }`;

function isCritiquePayload(payload: unknown): payload is CritiquePayload {
  if (!payload || typeof payload !== "object") return false;
  return typeof (payload as Record<string, unknown>).content_item_id === "string";
}

export async function runCritiqueAgent(job: Job): Promise<void> {
  if (!isCritiquePayload(job.payload)) {
    throw new Error("payload inválido para job de crítica");
  }

  const { content_item_id } = job.payload;

  await withContentItemErrorHandling(content_item_id, async () => {
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select("content")
      .eq("content_item_id", content_item_id)
      .eq("type", "analysis")
      .single();
    if (analysisError) throw new Error(analysisError.message);

    const { data: contentItem, error: contentError } = await supabase
      .from("content_items")
      .select("search_id")
      .eq("id", content_item_id)
      .single();
    if (contentError) throw new Error(contentError.message);

    let niche: { name: string; hashtags: string[] } | null = null;
    if (contentItem.search_id) {
      const { data: search } = await supabase
        .from("searches")
        .select("name, hashtags")
        .eq("id", contentItem.search_id)
        .maybeSingle();
      if (search) niche = { name: search.name, hashtags: search.hashtags };
    }

    const userContent = JSON.stringify({ analysis: analysis.content, niche });

    const result = await completeJson<CritiqueResult>(SYSTEM_PROMPT, userContent);

    const { error: insertError } = await supabase.from("analyses").insert({
      content_item_id,
      type: "critique",
      content: result,
    });
    if (insertError) throw new Error(insertError.message);

    const { error: updateError } = await supabase
      .from("content_items")
      .update({ status: "done" })
      .eq("id", content_item_id);
    if (updateError) throw new Error(updateError.message);
  });
}

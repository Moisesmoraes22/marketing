import { supabase } from "../lib/supabase.js";
import { completeJson } from "../lib/groq.js";
import { withContentItemErrorHandling } from "../lib/errors.js";
import type { Job } from "../lib/types.js";

interface CritiquePayload {
  content_item_id: string;
}

type Level5 = "muito_baixa" | "baixa" | "media" | "alta" | "muito_alta";
type Level5Masc = "muito_baixo" | "baixo" | "medio" | "alto" | "muito_alto";
type OpportunityLevel = "alta" | "moderada" | "baixa";
type RiskLevel = "baixo" | "medio" | "alto";
type Recommendation = "adaptar" | "inspirar" | "ignorar";

interface CritiqueResult {
  opportunity_level: OpportunityLevel;
  viralidade: Level5;
  relevancia: Level5;
  potencial_comercial: Level5Masc;
  adaptabilidade: Level5;
  risk_level: RiskLevel;
  risks: string[];
  recommendation: Recommendation;
  justification: string;
}

const OPPORTUNITY_RANK: Record<OpportunityLevel, number> = {
  alta: 3,
  moderada: 2,
  baixa: 1,
};

const SYSTEM_PROMPT = `Você avalia se um conteúdo representa uma boa oportunidade de inspiração/adaptação para o nicho informado.
Não calcule notas numéricas — classifique qualitativamente. A precisão de um número de 0-100 é falsa; uma classificação clara e justificada é mais honesta e útil.

Avalie 4 pilares, cada um em uma escala de 5 níveis ('muito_baixa'|'baixa'|'media'|'alta'|'muito_alta', ou a variação masculina 'muito_baixo'|'baixo'|'medio'|'alto'|'muito_alto' quando o campo pedir):
- viralidade: potencial de alcance e elementos que contribuíram para o desempenho do conteúdo original.
- relevancia: o quanto o tema, contexto e abordagem fazem sentido para o público e posicionamento da marca.
- potencial_comercial: se a estrutura permite gerar conteúdo ligado a produtos, serviços, campanhas ou objetivos comerciais.
- adaptabilidade: a facilidade de transformar a ideia em conteúdo original para a marca, sem copiar o conteúdo de origem.

A partir desses 4 pilares, decida opportunity_level ('alta'|'moderada'|'baixa') — a síntese de quanto essa oportunidade merece atenção.

Risco é um conceito SEPARADO de oportunidade: um conteúdo pode ter oportunidade alta e risco alto ao mesmo tempo (ex: afirmação médica, promessa exagerada, tema sensível, linguagem incompatível com a marca) — nesse caso a recomendação deve pender para 'ignorar' mesmo com oportunidade alta.

recommendation também é separado: 'adaptar' (estrutura muito aproveitável, vale transformar em conteúdo original agora), 'inspirar' (elementos interessantes mas não vale adaptar diretamente), 'ignorar' (não justifica investir tempo, ou risco alto demais).

Retorne APENAS JSON no formato exato:
{ "opportunity_level": "alta"|"moderada"|"baixa",
  "viralidade": "muito_baixa"|"baixa"|"media"|"alta"|"muito_alta",
  "relevancia": "muito_baixa"|"baixa"|"media"|"alta"|"muito_alta",
  "potencial_comercial": "muito_baixo"|"baixo"|"medio"|"alto"|"muito_alto",
  "adaptabilidade": "muito_baixa"|"baixa"|"media"|"alta"|"muito_alta",
  "risk_level": "baixo"|"medio"|"alto",
  "risks": string[],
  "recommendation": "adaptar"|"inspirar"|"ignorar",
  "justification": string (2-4 frases, linguagem natural para um profissional de marketing, explicando o "por quê") }`;

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
      .update({
        status: "done",
        opportunity_level: result.opportunity_level,
        opportunity_rank: OPPORTUNITY_RANK[result.opportunity_level],
        risk_level: result.risk_level,
        recommendation: result.recommendation,
      })
      .eq("id", content_item_id);
    if (updateError) throw new Error(updateError.message);
  });
}

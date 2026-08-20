import { supabase } from "../lib/supabase.js";
import type { Job } from "../lib/types.js";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR = "apify~instagram-scraper";
const POLL_INTERVAL_MS = 10_000;
// runs reais do Apify levam 30-90s+ mesmo para uma única conta — 10 tentativas
// de 5s (50s) estourava perto do fim. 30 tentativas de 10s dá 5 minutos.
const MAX_POLL_ATTEMPTS = 30;
const UNIQUE_VIOLATION = "23505";

export interface DiscoveryPayload {
  search_id: string;
  hashtags: string[];
  accounts: string[];
  min_engagement: number;
  results_limit?: number;
}

const DEFAULT_RESULTS_LIMIT = 20;

interface ApifyRunResponse {
  data: { id: string; defaultDatasetId: string; status: string };
}

export interface ApifyPost {
  id?: string;
  url: string;
  shortCode?: string;
  caption?: string;
  type?: string;
  productType?: string;
  likesCount?: number;
  commentsCount?: number;
  displayUrl?: string;
  videoUrl?: string;
  ownerUsername?: string;
}

type MediaType = "post" | "carousel" | "reel";

function isDiscoveryPayload(payload: unknown): payload is DiscoveryPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.search_id === "string" &&
    Array.isArray(p.hashtags) &&
    Array.isArray(p.accounts) &&
    typeof p.min_engagement === "number"
  );
}

export function mapMediaType(post: ApifyPost): MediaType {
  if (post.productType === "clips" || post.type === "Video") return "reel";
  if (post.type === "Sidecar") return "carousel";
  return "post";
}

// normaliza a URL do post para comparação de identidade — remove protocolo,
// www, query string (utm etc.) e barra final. Mantém o path como está (o
// shortcode do Instagram é case-sensitive, nunca deve virar lowercase).
export function normalizeInstagramUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, "https://")
    .split("?")[0]
    .replace(/\/+$/, "");
}

async function startApifyRun(payload: DiscoveryPayload): Promise<string> {
  // apify/instagram-scraper: directUrls de contas retornam posts normalmente.
  // directUrls apontando pra página de exploração de uma hashtag (explore/tags/)
  // retornam METADADOS da hashtag (contagem de posts, tags relacionadas), não
  // posts — confirmado testando em produção. O campo nativo "hashtags" é o
  // caminho certo para buscar posts por hashtag; enviar arrays vazios junto
  // (directUrls: [] ou hashtags: []) fazia o ator retornar um erro de "sem
  // dados", então cada campo só é incluído quando tem conteúdo.
  const accountUrls = payload.accounts.map(
    (account) => `https://www.instagram.com/${account.replace(/^@/, "")}/`,
  );

  const input: Record<string, unknown> = {
    resultsType: "posts",
    resultsLimit: payload.results_limit ?? DEFAULT_RESULTS_LIMIT,
  };
  if (accountUrls.length > 0) input.directUrls = accountUrls;
  if (payload.hashtags.length > 0) input.hashtags = payload.hashtags;

  const res = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APIFY_API_TOKEN}`,
      },
      body: JSON.stringify(input),
    },
  );

  if (!res.ok) {
    throw new Error(`Apify run request falhou com status ${res.status}`);
  }

  const body = (await res.json()) as ApifyRunResponse;
  return body.data.id;
}

async function abortApifyRun(runId: string): Promise<void> {
  try {
    await fetch(`https://api.apify.com/v2/actor-runs/${runId}/abort`, {
      method: "POST",
      headers: { Authorization: `Bearer ${APIFY_API_TOKEN}` },
    });
  } catch (err) {
    console.error("[discovery] falha ao abortar run do Apify:", err);
  }
}

async function isJobCancelled(jobId: string): Promise<boolean> {
  const { data } = await supabase.from("jobs").select("status").eq("id", jobId).maybeSingle();
  return data?.status === "cancelled";
}

async function waitForRunAndFetchDataset(runId: string, jobId: string): Promise<ApifyPost[]> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (await isJobCancelled(jobId)) {
      await abortApifyRun(runId);
      throw new Error("Busca cancelada pelo usuário");
    }

    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: { Authorization: `Bearer ${APIFY_API_TOKEN}` },
    });

    if (!res.ok) {
      throw new Error(`Apify status check falhou com status ${res.status}`);
    }

    const body = (await res.json()) as ApifyRunResponse;

    if (body.data.status === "SUCCEEDED") {
      const datasetRes = await fetch(
        `https://api.apify.com/v2/datasets/${body.data.defaultDatasetId}/items`,
        { headers: { Authorization: `Bearer ${APIFY_API_TOKEN}` } },
      );
      if (!datasetRes.ok) {
        throw new Error(`Apify dataset fetch falhou com status ${datasetRes.status}`);
      }
      return (await datasetRes.json()) as ApifyPost[];
    }

    if (body.data.status === "FAILED" || body.data.status === "ABORTED") {
      throw new Error(`Apify run terminou com status ${body.data.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Apify run não concluiu dentro do tempo limite de polling");
}

// registra a busca atual como fonte de descoberta do conteúdo, sem duplicar
// se essa combinação (conteúdo + busca) já existir.
async function registerSource(contentId: string, searchId: string): Promise<void> {
  const { data, error } = await supabase
    .from("content_sources")
    .upsert(
      { content_id: contentId, search_id: searchId },
      { onConflict: "content_id,search_id", ignoreDuplicates: true },
    )
    .select("id");

  if (error) {
    console.error("[discovery] falha ao registrar fonte de descoberta:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log(`[discovery] Nova fonte associada: busca ${searchId}`);
  } else {
    console.log("[discovery] Fonte já associada, ignorando duplicação");
  }
}

async function enqueuePipeline(
  contentId: string,
  mediaType: MediaType,
  sourceUrl: string,
): Promise<void> {
  if (mediaType === "reel") {
    const { error: jobError } = await supabase.from("jobs").insert({
      type: "transcribe",
      payload: { content_item_id: contentId, source_url: sourceUrl },
      status: "pending",
    });
    if (jobError) {
      console.error("[discovery] falha ao criar job de transcrição:", jobError.message);
      return;
    }
    await supabase.from("content_items").update({ status: "transcribing" }).eq("id", contentId);
  } else {
    // post/carrossel não têm áudio — vão direto para análise
    const { error: jobError } = await supabase.from("jobs").insert({
      type: "analyze",
      payload: { content_item_id: contentId },
      status: "pending",
    });
    if (jobError) {
      console.error("[discovery] falha ao criar job de análise:", jobError.message);
      return;
    }
    await supabase.from("content_items").update({ status: "analyzing" }).eq("id", contentId);
  }
}

interface ExistingContentItem {
  id: string;
  status: string;
  media_type: MediaType;
  source_url: string;
}

async function findExistingContentItem(
  instagramMediaId: string | null,
  normalizedUrl: string,
): Promise<ExistingContentItem | null> {
  if (instagramMediaId) {
    const { data } = await supabase
      .from("content_items")
      .select("id, status, media_type, source_url")
      .eq("instagram_media_id", instagramMediaId)
      .maybeSingle();
    if (data) return data as ExistingContentItem;
  }

  const { data } = await supabase
    .from("content_items")
    .select("id, status, media_type, source_url")
    .eq("source_url_normalized", normalizedUrl)
    .maybeSingle();
  return (data as ExistingContentItem | null) ?? null;
}

// encontra o content_item correspondente a este post do Apify (por
// instagram_media_id, com fallback pra URL normalizada) ou cria um novo.
// Nunca cria dois content_items para o mesmo conteúdo original.
export async function processPost(
  post: ApifyPost,
  payload: DiscoveryPayload,
): Promise<"new" | "duplicate"> {
  const mediaType = mapMediaType(post);
  const instagramMediaId = post.id ?? null;
  const normalizedUrl = normalizeInstagramUrl(post.url);

  const existing = await findExistingContentItem(instagramMediaId, normalizedUrl);

  if (existing) {
    console.log(
      `[discovery] Conteúdo já existente: ${instagramMediaId ?? post.shortCode ?? existing.id}`,
    );
    await supabase.rpc("increment_content_discovery", { p_content_id: existing.id });
    await registerSource(existing.id, payload.search_id);

    // já processado (done) ou em andamento: não reprocessar, não duplicar pipeline.
    // com erro: dar mais uma chance, seguindo a mesma política de retry do restante do sistema.
    if (existing.status === "error") {
      await enqueuePipeline(existing.id, existing.media_type, existing.source_url);
    }
    return "duplicate";
  }

  const { data: inserted, error: insertError } = await supabase
    .from("content_items")
    .insert({
      search_id: payload.search_id,
      source_url: post.url,
      source_url_normalized: normalizedUrl,
      instagram_media_id: instagramMediaId,
      caption: post.caption ?? null,
      media_type: mediaType,
      engagement_score: (post.likesCount ?? 0) + (post.commentsCount ?? 0),
      likes_count: post.likesCount ?? 0,
      comments_count: post.commentsCount ?? 0,
      owner_username: post.ownerUsername ?? null,
      thumbnail_url: post.displayUrl ?? null,
      video_url: post.videoUrl ?? null,
      status: "collected",
    })
    .select("id")
    .single();

  if (insertError) {
    // corrida rara: outro processo inseriu o mesmo conteúdo entre o SELECT e o INSERT.
    // a constraint UNIQUE do banco é a última camada de proteção — cai pro caminho de duplicata.
    if (insertError.code === UNIQUE_VIOLATION) {
      const raceWinner = await findExistingContentItem(instagramMediaId, normalizedUrl);
      if (raceWinner) {
        await supabase.rpc("increment_content_discovery", { p_content_id: raceWinner.id });
        await registerSource(raceWinner.id, payload.search_id);
        return "duplicate";
      }
    }
    console.error("[discovery] falha ao inserir content_item:", insertError.message);
    return "duplicate";
  }

  if (!inserted) return "duplicate";

  console.log(`[discovery] Novo conteúdo encontrado: ${instagramMediaId ?? post.shortCode}`);
  await registerSource(inserted.id, payload.search_id);
  await enqueuePipeline(inserted.id, mediaType, post.url);
  return "new";
}

export async function runDiscoveryAgent(job: Job): Promise<void> {
  if (!APIFY_API_TOKEN) {
    throw new Error("APIFY_API_TOKEN não configurado");
  }
  if (!isDiscoveryPayload(job.payload)) {
    throw new Error("payload inválido para job de discovery");
  }

  const payload = job.payload;

  const runId = await startApifyRun(payload);
  const posts = await waitForRunAndFetchDataset(runId, job.id);

  const filtered = posts.filter(
    (post) =>
      typeof post.url === "string" &&
      post.url.length > 0 &&
      typeof post.shortCode === "string" && // exclui registros de analytics de hashtag, que não têm shortCode
      (post.likesCount ?? 0) + (post.commentsCount ?? 0) >= payload.min_engagement,
  );

  const skipped = posts.length - filtered.length;
  if (skipped > 0) {
    console.warn(
      `[discovery] job ${job.id}: ${skipped} item(s) sem "url" ou abaixo do engajamento mínimo foram ignorados`,
    );
  }

  let newCount = 0;
  let duplicateCount = 0;

  for (const post of filtered) {
    const outcome = await processPost(post, payload);
    if (outcome === "new") newCount++;
    else duplicateCount++;
  }

  await supabase
    .from("jobs")
    .update({ result: { found: filtered.length, new: newCount, duplicates: duplicateCount } })
    .eq("id", job.id);

  console.log(
    `[discovery] job ${job.id}: ${newCount} novo(s), ${duplicateCount} duplicado(s) de ${filtered.length} encontrados (search ${payload.search_id})`,
  );
}

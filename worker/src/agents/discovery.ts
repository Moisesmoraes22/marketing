import { supabase } from "../lib/supabase.js";
import type { Job } from "../lib/types.js";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR = "apify~instagram-scraper";
const POLL_INTERVAL_MS = 10_000;
// runs reais do Apify levam 30-90s+ mesmo para uma única conta — 10 tentativas
// de 5s (50s) estourava perto do fim. 30 tentativas de 10s dá 5 minutos.
const MAX_POLL_ATTEMPTS = 30;

interface DiscoveryPayload {
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

interface ApifyPost {
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

function mapMediaType(post: ApifyPost): "post" | "carousel" | "reel" {
  if (post.productType === "clips" || post.type === "Video") return "reel";
  if (post.type === "Sidecar") return "carousel";
  return "post";
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

  for (const post of filtered) {
    const mediaType = mapMediaType(post);

    const { data: inserted, error: insertError } = await supabase
      .from("content_items")
      .insert({
        search_id: payload.search_id,
        source_url: post.url,
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
      console.error("[discovery] falha ao inserir content_item:", insertError.message);
      continue;
    }

    if (!inserted) continue;

    if (mediaType === "reel") {
      const { error: jobError } = await supabase.from("jobs").insert({
        type: "transcribe",
        payload: { content_item_id: inserted.id, source_url: post.url },
        status: "pending",
      });
      if (jobError) {
        console.error("[discovery] falha ao criar job de transcrição:", jobError.message);
        continue;
      }
      await supabase
        .from("content_items")
        .update({ status: "transcribing" })
        .eq("id", inserted.id);
    } else {
      // post/carrossel não têm áudio — vão direto para análise
      const { error: jobError } = await supabase.from("jobs").insert({
        type: "analyze",
        payload: { content_item_id: inserted.id },
        status: "pending",
      });
      if (jobError) {
        console.error("[discovery] falha ao criar job de análise:", jobError.message);
        continue;
      }
      await supabase
        .from("content_items")
        .update({ status: "analyzing" })
        .eq("id", inserted.id);
    }
  }

  console.log(
    `[discovery] job ${job.id}: ${filtered.length}/${posts.length} posts salvos (search ${payload.search_id})`,
  );
}

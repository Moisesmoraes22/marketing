import { supabase } from "../lib/supabase.js";
import type { Job } from "../lib/types.js";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR = "apify~instagram-scraper";
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 10;

interface DiscoveryPayload {
  search_id: string;
  hashtags: string[];
  accounts: string[];
  min_engagement: number;
}

interface ApifyRunResponse {
  data: { id: string; defaultDatasetId: string; status: string };
}

interface ApifyPost {
  url: string;
  caption?: string;
  type?: string;
  productType?: string;
  likesCount?: number;
  commentsCount?: number;
  displayUrl?: string;
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
  const directUrls = payload.accounts.map(
    (account) => `https://www.instagram.com/${account.replace(/^@/, "")}/`,
  );

  const res = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APIFY_API_TOKEN}`,
      },
      body: JSON.stringify({
        directUrls,
        hashtags: payload.hashtags,
        resultsLimit: 50,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Apify run request falhou com status ${res.status}`);
  }

  const body = (await res.json()) as ApifyRunResponse;
  return body.data.id;
}

async function waitForRunAndFetchDataset(runId: string): Promise<ApifyPost[]> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
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
  const posts = await waitForRunAndFetchDataset(runId);

  const filtered = posts.filter(
    (post) =>
      (post.likesCount ?? 0) + (post.commentsCount ?? 0) >=
      payload.min_engagement,
  );

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
        thumbnail_url: post.displayUrl ?? null,
        status: "collected",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[discovery] falha ao inserir content_item:", insertError.message);
      continue;
    }

    if (mediaType === "reel" && inserted) {
      const { error: jobError } = await supabase.from("jobs").insert({
        type: "transcribe",
        payload: { content_item_id: inserted.id, source_url: post.url },
        status: "pending",
      });
      if (jobError) {
        console.error("[discovery] falha ao criar job de transcrição:", jobError.message);
      }
    }
  }

  console.log(
    `[discovery] job ${job.id}: ${filtered.length}/${posts.length} posts salvos (search ${payload.search_id})`,
  );
}

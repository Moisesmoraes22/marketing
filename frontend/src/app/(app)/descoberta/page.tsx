import { createClient } from "@/lib/supabase/server";
import type { ContentItem, Search } from "@/lib/types";
import { DescobertaTabs } from "./descoberta-tabs";

const PAGE_SIZE = 12;

type ContentSearchParams = {
  page?: string;
  type?: string;
  potential?: string;
  recommendation?: string;
  status?: string;
  period?: string;
  sort?: string;
  q?: string;
};

const PERIOD_TO_MS: Record<string, number> = {
  today: 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export default async function DescobertaPage({
  searchParams,
}: {
  searchParams: Promise<ContentSearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase.from("content_items").select("*", { count: "exact" });

  if (params.type) query = query.eq("media_type", params.type);
  if (params.status) query = query.eq("status", params.status);
  if (params.recommendation) query = query.eq("recommendation", params.recommendation);
  if (params.potential === "alto") query = query.gte("omega_score", 80);
  else if (params.potential === "medio") query = query.gte("omega_score", 50).lt("omega_score", 80);
  else if (params.potential === "baixo") query = query.lt("omega_score", 50);
  if (params.period && PERIOD_TO_MS[params.period]) {
    query = query.gte(
      "collected_at",
      new Date(Date.now() - PERIOD_TO_MS[params.period]).toISOString(),
    );
  }
  if (params.q) query = query.ilike("caption", `%${params.q}%`);

  if (params.sort === "score") {
    query = query.order("omega_score", { ascending: false, nullsFirst: false });
  } else if (params.sort === "engagement") {
    query = query.order("engagement_score", { ascending: false });
  } else {
    query = query.order("collected_at", { ascending: false });
  }

  const [{ data: searchesData }, { data: contentData, count }] = await Promise.all([
    supabase.from("searches").select("*").order("created_at", { ascending: false }),
    query.range(from, to),
  ]);

  const searches = (searchesData ?? []) as Search[];
  const content = (contentData ?? []) as ContentItem[];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Descoberta</h1>
        <p className="text-sm text-muted-foreground">
          Busque conteúdo viral e acompanhe o resultado.
        </p>
      </div>
      <DescobertaTabs
        searches={searches}
        content={content}
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}

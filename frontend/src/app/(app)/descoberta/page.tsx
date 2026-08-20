import { createClient } from "@/lib/supabase/server";
import type { ContentItem, Search } from "@/lib/types";
import { NewSearchForm } from "./new-search-form";
import { SearchList } from "./search-list";
import { ContentFeed } from "../conteudo/content-feed";
import { ProcessingBanner } from "../conteudo/processing-banner";

const PAGE_SIZE = 12;

export default async function DescobertaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const [{ data: searchesData }, { data: contentData, count }] = await Promise.all([
    supabase.from("searches").select("*").order("created_at", { ascending: false }),
    supabase
      .from("content_items")
      .select("*", { count: "exact" })
      .order("collected_at", { ascending: false })
      .range(from, to),
  ]);

  const searches = (searchesData ?? []) as Search[];
  const content = (contentData ?? []) as ContentItem[];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Descoberta</h1>
          <p className="text-sm text-muted-foreground">
            Configure hashtags, contas e engajamento mínimo para buscar conteúdo viral.
          </p>
        </div>
        <NewSearchForm />
        <SearchList searches={searches} />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Conteúdo</h2>
          <p className="text-sm text-muted-foreground">
            Feed de posts coletados com status do pipeline em tempo real.
          </p>
        </div>
        <ProcessingBanner />
        <ContentFeed initialItems={content} page={page} pageCount={pageCount} />
      </div>
    </div>
  );
}

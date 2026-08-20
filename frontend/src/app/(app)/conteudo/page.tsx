import { createClient } from "@/lib/supabase/server";
import type { ContentItem } from "@/lib/types";
import { ContentFeed } from "./content-feed";

const PAGE_SIZE = 12;

export default async function ConteudoPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("content_items")
    .select("*", { count: "exact" })
    .order("collected_at", { ascending: false })
    .range(from, to);

  const items = (data ?? []) as ContentItem[];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conteúdo</h1>
        <p className="text-sm text-muted-foreground">
          Feed de posts coletados com status do pipeline em tempo real.
        </p>
      </div>
      <ContentFeed initialItems={items} page={page} pageCount={pageCount} />
    </div>
  );
}

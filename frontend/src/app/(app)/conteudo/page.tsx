import { createClient } from "@/lib/supabase/server";
import type { ContentItem } from "@/lib/types";
import { ContentFeed } from "./content-feed";

export default async function ConteudoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .order("collected_at", { ascending: false });

  const items = (data ?? []) as ContentItem[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conteúdo</h1>
        <p className="text-sm text-muted-foreground">
          Feed de posts coletados com status do pipeline em tempo real.
        </p>
      </div>
      <ContentFeed initialItems={items} />
    </div>
  );
}

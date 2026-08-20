import { createClient } from "@/lib/supabase/server";
import type { ContentItem } from "@/lib/types";
import { NewScriptForm } from "./new-script-form";

export default async function NovoRoteiroPage({
  searchParams,
}: {
  searchParams: Promise<{ content_item_id?: string }>;
}) {
  const { content_item_id: preselectedId } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("status", "done")
    .order("collected_at", { ascending: false });

  const items = (data ?? []) as ContentItem[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo roteiro</h1>
        <p className="text-sm text-muted-foreground">
          Escolha a inspiração, o objetivo e o estilo — a IA cuida do resto.
        </p>
      </div>
      <NewScriptForm items={items} preselectedId={preselectedId ?? null} />
    </div>
  );
}

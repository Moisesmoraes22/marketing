import { createClient } from "@/lib/supabase/server";
import type { Search } from "@/lib/types";
import { NewSearchForm } from "./new-search-form";
import { SearchList } from "./search-list";

export default async function DescobertaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("searches")
    .select("*")
    .order("created_at", { ascending: false });

  const searches = (data ?? []) as Search[];

  return (
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
  );
}

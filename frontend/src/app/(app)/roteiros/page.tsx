import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { ScriptRow } from "@/lib/types";
import { ScriptLibrary } from "./script-library";

export default async function RoteirosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scripts")
    .select("*")
    .order("created_at", { ascending: false });

  const scripts = (data ?? []) as ScriptRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roteiros</h1>
          <p className="text-sm text-muted-foreground">
            Biblioteca de roteiros gerados a partir de conteúdo analisado.
          </p>
        </div>
        <Button render={<Link href="/roteiros/novo" />}>Novo roteiro</Button>
      </div>
      <ScriptLibrary initialScripts={scripts} />
    </div>
  );
}

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/app/(app)/conteudo/status-badge";
import { createClient } from "@/lib/supabase/server";
import type { ContentItem, ScriptRow } from "@/lib/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

  const [
    { count: jobsInProgress },
    { count: scriptsThisWeek },
    { count: contentThisWeek },
    { data: recentScripts },
    { data: recentContent },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "processing"]),
    supabase
      .from("scripts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .gte("collected_at", weekAgo),
    supabase
      .from("scripts")
      .select("id, format, content, approved, created_at, content_item_id")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("content_items")
      .select("id, caption, status, thumbnail_url, collected_at")
      .order("collected_at", { ascending: false })
      .limit(5),
  ]);

  const scripts = (recentScripts ?? []) as Pick<
    ScriptRow,
    "id" | "format" | "content" | "approved" | "created_at" | "content_item_id"
  >[];
  const content = (recentContent ?? []) as Pick<
    ContentItem,
    "id" | "caption" | "status" | "thumbnail_url" | "collected_at"
  >[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Jobs em andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {jobsInProgress ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Roteiros gerados (semana)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {scriptsThisWeek ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Conteúdo coletado (semana)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {contentThisWeek ?? 0}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos roteiros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {scripts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum roteiro gerado ainda.
              </p>
            )}
            {scripts.map((script) => (
              <Link
                key={script.id}
                href={`/conteudo/${script.content_item_id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <span className="capitalize">{script.format.replace("_", " ")}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(script.created_at).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conteúdo recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {content.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum conteúdo coletado ainda.
              </p>
            )}
            {content.map((item) => (
              <Link
                key={item.id}
                href={`/conteudo/${item.id}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <span className="truncate">{item.caption ?? "Sem legenda"}</span>
                <StatusBadge status={item.status} className="shrink-0 text-[0.65rem]" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpportunityBadge, RecommendationBadge } from "@/components/opportunity";
import { createClient } from "@/lib/supabase/server";
import type { ContentItem, ScriptRow } from "@/lib/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

  const [
    { count: opportunitiesFound },
    { count: highOpportunity },
    { count: moderateOpportunity },
    { count: lowOpportunity },
    { count: scriptsThisWeek },
    { data: topOpportunities },
    { data: recentScripts },
  ] = await Promise.all([
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .not("opportunity_level", "is", null),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .eq("opportunity_level", "alta"),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .eq("opportunity_level", "moderada"),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .eq("opportunity_level", "baixa"),
    supabase
      .from("scripts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase
      .from("content_items")
      .select(
        "id, caption, media_type, likes_count, comments_count, opportunity_level, opportunity_rank, recommendation, thumbnail_url, owner_username",
      )
      .not("opportunity_level", "is", null)
      .order("opportunity_rank", { ascending: false })
      .order("collected_at", { ascending: false })
      .limit(6),
    supabase
      .from("scripts")
      .select("id, format, created_at, content_item_id")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const opportunityItems = (topOpportunities ?? []) as Pick<
    ContentItem,
    | "id"
    | "caption"
    | "media_type"
    | "likes_count"
    | "comments_count"
    | "opportunity_level"
    | "opportunity_rank"
    | "recommendation"
    | "thumbnail_url"
    | "owner_username"
  >[];
  const scripts = (recentScripts ?? []) as Pick<
    ScriptRow,
    "id" | "format" | "created_at" | "content_item_id"
  >[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{greeting()}, Marketing 👋</h1>
        <p className="text-sm text-muted-foreground">Resumo da inteligência de conteúdo.</p>
      </div>

      <div className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border bg-card p-5">
        <Stat label="🔥 Oportunidades encontradas" value={opportunitiesFound ?? 0} />
        <Stat label="🟢 Alta oportunidade" value={highOpportunity ?? 0} />
        <Stat label="🟡 Moderadas" value={moderateOpportunity ?? 0} />
        <Stat label="🔴 Baixa oportunidade" value={lowOpportunity ?? 0} />
        <Stat label="Roteiros gerados (semana)" value={scriptsThisWeek ?? 0} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">🔥 Oportunidades de hoje</h2>
        {opportunityItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há conteúdo analisado. Rode uma busca em Descoberta para começar.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opportunityItems.map((item) => (
              <Link
                key={item.id}
                href={`/conteudo/${item.id}`}
                className="group flex gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/50"
              >
                {item.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail_url}
                    alt=""
                    className="h-24 w-16 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="text-xs capitalize text-muted-foreground">
                    {item.media_type}
                    {item.owner_username ? ` · @${item.owner_username}` : ""}
                  </span>
                  {item.opportunity_level && (
                    <OpportunityBadge level={item.opportunity_level} className="text-[0.65rem]" />
                  )}
                  <p className="truncate text-sm font-medium">
                    {item.caption ?? "Sem legenda"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {item.likes_count.toLocaleString("pt-BR")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {item.comments_count.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {item.recommendation && (
                    <RecommendationBadge recommendation={item.recommendation} />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos roteiros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scripts.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum roteiro gerado ainda.</p>
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
    </div>
  );
}

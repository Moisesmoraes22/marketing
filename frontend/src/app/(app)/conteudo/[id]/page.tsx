import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpportunityBadge, RecommendationBadge, RiskBadge } from "@/components/opportunity";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalysisContent,
  AnalysisRow,
  ContentItem,
  ContentSource,
  CritiqueContent,
  TranscriptionContent,
} from "@/lib/types";
import { LEVEL5_LABEL, LEVEL5_MASC_LABEL } from "@/lib/types";
import { StatusBadge } from "../status-badge";
import { VideoPlayer } from "../video-player";

function Pillar({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">
        {emoji} {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: item }, { data: analysesData }, { data: sourcesData }] = await Promise.all([
    supabase.from("content_items").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("analyses")
      .select("*")
      .eq("content_item_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("content_sources")
      .select("id, content_id, search_id, found_at, searches(name)")
      .eq("content_id", id)
      .order("found_at", { ascending: false }),
  ]);

  if (!item) notFound();

  const contentItem = item as ContentItem;
  const analyses = (analysesData ?? []) as AnalysisRow[];
  const sources = (sourcesData ?? []) as unknown as ContentSource[];

  const transcription = analyses.find((a) => a.type === "transcription")
    ?.content as TranscriptionContent | undefined;
  const analysis = analyses.find((a) => a.type === "analysis")?.content as
    | AnalysisContent
    | undefined;
  const critique = analyses.find((a) => a.type === "critique")?.content as
    | CritiqueContent
    | undefined;

  return (
    <div className="space-y-6">
      <Link
        href="/descoberta"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Conteúdo</h1>
          <Badge variant="secondary" className="capitalize">
            {contentItem.media_type}
          </Badge>
          <StatusBadge status={contentItem.status} />
          {contentItem.discovery_count > 1 && (
            <Badge variant="outline">🔎 Encontrado em {contentItem.discovery_count} ocasiões</Badge>
          )}
        </div>
        {contentItem.opportunity_level && (
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">🧠 Oportunidade Ômega</p>
              <OpportunityBadge level={contentItem.opportunity_level} />
            </div>
            {contentItem.recommendation && (
              <RecommendationBadge recommendation={contentItem.recommendation} />
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Post original</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="max-w-xs">
            <VideoPlayer
              videoUrl={contentItem.video_url}
              thumbnailUrl={contentItem.thumbnail_url}
              caption={contentItem.caption}
            />
          </div>
          <p className="text-muted-foreground">{contentItem.caption ?? "Sem legenda"}</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-muted-foreground" />
              {contentItem.likes_count.toLocaleString("pt-BR")} curtidas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              {contentItem.comments_count.toLocaleString("pt-BR")} comentários
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              = {contentItem.engagement_score.toLocaleString("pt-BR")} de engajamento
            </span>
          </div>
          <a
            href={contentItem.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Ver no Instagram
          </a>
        </CardContent>
      </Card>

      {sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              🔎 Descoberto através de {sources.length}{" "}
              {sources.length === 1 ? "busca" : "buscas"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-1.5">
              {sources.map((source) => (
                <Badge key={source.id} variant="secondary" className="font-normal">
                  {source.searches?.name ?? "busca removida"}
                </Badge>
              ))}
            </div>
            <div>
              <p className="mb-1.5 font-medium">Histórico de descoberta</p>
              <ul className="space-y-1.5 text-muted-foreground">
                {sources.map((source) => (
                  <li key={source.id} className="flex items-center justify-between gap-2">
                    <span>{source.searches?.name ?? "busca removida"}</span>
                    <span className="text-xs">
                      {new Date(source.found_at).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {transcription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transcrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {transcription.text}
            </p>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Análise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Gancho</p>
              <p className="text-muted-foreground">{analysis.hook}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="font-medium">Introdução</p>
                <p className="text-muted-foreground">
                  {analysis.narrative_structure.intro}
                </p>
              </div>
              <div>
                <p className="font-medium">Desenvolvimento</p>
                <p className="text-muted-foreground">
                  {analysis.narrative_structure.body}
                </p>
              </div>
              <div>
                <p className="font-medium">CTA</p>
                <p className="text-muted-foreground">
                  {analysis.narrative_structure.cta}
                </p>
              </div>
            </div>
            <div>
              <p className="font-medium">Tom</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {analysis.tone.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium">Gatilhos de engajamento</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {analysis.engagement_triggers.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium">Por que funciona</p>
              <p className="text-muted-foreground">{analysis.why_it_works}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {critique && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🧠 Oportunidade Ômega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <OpportunityBadge level={critique.opportunity_level} className="text-sm" />

            <div>
              <p className="mb-1 font-medium">Por quê?</p>
              <p className="text-muted-foreground">{critique.justification}</p>
            </div>

            <div>
              <p className="mb-2 font-medium">🔎 Análise</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Pillar emoji="🔥" label="Viralidade" value={LEVEL5_LABEL[critique.viralidade]} />
                <Pillar
                  emoji="🎯"
                  label="Relevância para Ômega"
                  value={LEVEL5_LABEL[critique.relevancia]}
                />
                <Pillar
                  emoji="💰"
                  label="Potencial comercial"
                  value={LEVEL5_MASC_LABEL[critique.potencial_comercial]}
                />
                <Pillar
                  emoji="🛠️"
                  label="Adaptabilidade"
                  value={LEVEL5_LABEL[critique.adaptabilidade]}
                />
              </div>
            </div>

            <div>
              <p className="mb-1.5 font-medium">⚠️ Risco</p>
              <RiskBadge level={critique.risk_level} />
              <p className="mt-1.5 text-muted-foreground">
                {critique.risks.length > 0
                  ? critique.risks.join(" · ")
                  : "Não foram identificados riscos relevantes para adaptação."}
              </p>
            </div>

            <div>
              <p className="mb-1.5 font-medium">💡 Recomendação</p>
              <RecommendationBadge recommendation={critique.recommendation} />
            </div>

            <Button
              nativeButton={false}
              render={<Link href={`/roteiros/novo?content_item_id=${contentItem.id}`} />}
            >
              ✨ Gerar conteúdo
            </Button>
          </CardContent>
        </Card>
      )}

      {!transcription && !analysis && !critique && (
        <p className="text-sm text-muted-foreground">
          Ainda não há análises para este conteúdo — o pipeline está processando.
        </p>
      )}
    </div>
  );
}

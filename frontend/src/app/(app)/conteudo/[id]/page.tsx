import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OmegaScore, RecommendationBadge } from "@/components/omega-score";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalysisContent,
  AnalysisRow,
  ContentItem,
  CritiqueContent,
  TranscriptionContent,
} from "@/lib/types";
import { StatusBadge } from "../status-badge";
import { VideoPlayer } from "../video-player";

const RISK_LABEL: Record<string, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

function SubScore({ label, value }: { label: string; value: number | undefined }) {
  if (typeof value !== "number") return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
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

  const [{ data: item }, { data: analysesData }] = await Promise.all([
    supabase.from("content_items").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("analyses")
      .select("*")
      .eq("content_item_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!item) notFound();

  const contentItem = item as ContentItem;
  const analyses = (analysesData ?? []) as AnalysisRow[];

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
        </div>
        {typeof contentItem.omega_score === "number" && (
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2">
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">Score Ômega</p>
              <OmegaScore score={contentItem.omega_score} size="lg" />
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
            <CardTitle className="text-base">🎯 Aplicabilidade para Ômega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <RecommendationBadge recommendation={critique.recommendation} />
              {critique.risk_level && (
                <Badge variant="outline">Risco: {RISK_LABEL[critique.risk_level]}</Badge>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SubScore label="Viralidade" value={critique.virality_score} />
              <SubScore label="Relevância" value={critique.relevance_score} />
              <SubScore label="Potencial comercial" value={critique.commercial_score} />
              <SubScore label="Adaptação" value={critique.adaptation_score} />
            </div>
            {critique.risks.length > 0 && (
              <div>
                <p className="font-medium">Riscos</p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {critique.risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="font-medium">Justificativa</p>
              <p className="text-muted-foreground">{critique.justification}</p>
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

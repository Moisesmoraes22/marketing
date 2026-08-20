import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const RECOMMENDATION_LABEL: Record<CritiqueContent["recommendation"], string> = {
  adaptar: "Adaptar",
  inspirar: "Inspirar-se",
  ignorar: "Ignorar",
};

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
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Conteúdo</h1>
        <Badge variant="secondary" className="capitalize">
          {contentItem.media_type}
        </Badge>
        <StatusBadge status={contentItem.status} />
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
            <CardTitle className="text-base">Crítica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">
                Relevância: {critique.relevance_score}/10
              </span>
              <Badge variant="outline" className="capitalize">
                potencial {critique.adaptation_potential}
              </Badge>
              <Badge>{RECOMMENDATION_LABEL[critique.recommendation]}</Badge>
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

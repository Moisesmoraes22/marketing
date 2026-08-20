import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { ContentItem } from "@/lib/types";
import { StatusBadge } from "../status-badge";

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const item = data as ContentItem;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Conteúdo</h1>
        <Badge variant="secondary" className="capitalize">
          {item.media_type}
        </Badge>
        <StatusBadge status={item.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Post original</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">{item.caption ?? "Sem legenda"}</p>
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Ver no Instagram
          </a>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Transcrição, análise e crítica aparecem aqui a partir da Fase 3.
      </p>
    </div>
  );
}

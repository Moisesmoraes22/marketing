"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { ContentItem } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function ContentFeed({ initialItems }: { initialItems: ContentItem[] }) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("content_items_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "content_items" },
        (payload) => {
          setItems((current) => [payload.new as ContentItem, ...current]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "content_items" },
        (payload) => {
          const updated = payload.new as ContentItem;
          setItems((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum conteúdo coletado ainda. Dispare uma busca em Descoberta.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden py-0">
          <div className="aspect-video w-full bg-muted">
            {item.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnail_url}
                alt={item.caption ?? "Prévia do conteúdo"}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="capitalize">
                {item.media_type}
              </Badge>
              <StatusBadge status={item.status} />
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {item.caption ?? "Sem legenda"}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {item.engagement_score.toLocaleString("pt-BR")} de engajamento
              </span>
              {item.status === "done" ? (
                <Link
                  href={`/conteudo/${item.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  Ver análise
                </Link>
              ) : (
                <Link
                  href={`/conteudo/${item.id}`}
                  className="font-medium text-muted-foreground hover:underline"
                >
                  Detalhes
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import type { ContentItem } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function ContentFeed({ initialItems }: { initialItems: ContentItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);

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
          setPreviewItem((current) =>
            current?.id === updated.id ? updated : current,
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
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreviewItem(item)}
            className="group relative aspect-[9/16] w-full overflow-hidden rounded-md bg-muted text-left"
          >
            {item.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnail_url}
                alt={item.caption ?? "Prévia do conteúdo"}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
              <StatusBadge status={item.status} className="text-[0.65rem]" />
            </div>
          </button>
        ))}
      </div>

      <Sheet open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <SheetContent side="right" className="w-full p-4 sm:max-w-sm">
          {previewItem && (
            <>
              <SheetHeader className="p-0">
                <SheetTitle className="sr-only">Prévia do conteúdo</SheetTitle>
              </SheetHeader>
              <div className="aspect-[9/16] w-full overflow-hidden rounded-md bg-muted">
                {previewItem.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewItem.thumbnail_url}
                    alt={previewItem.caption ?? "Prévia do conteúdo"}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {previewItem.media_type}
                  </Badge>
                  <StatusBadge status={previewItem.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {previewItem.caption ?? "Sem legenda"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {previewItem.engagement_score.toLocaleString("pt-BR")} de engajamento
                </p>
                <Button render={<Link href={`/conteudo/${previewItem.id}`} />}>
                  Ver detalhes completos
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

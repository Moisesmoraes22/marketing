"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ContentStatus } from "@/lib/types";

const ACTIVE_WINDOW_MS = 2 * 60 * 60 * 1000;
const FINAL_STATUSES: ContentStatus[] = ["done", "error"];

interface TrackedItem {
  id: string;
  status: ContentStatus;
  collected_at: string;
}

export function ProcessingBanner() {
  const instanceId = useId();
  const [items, setItems] = useState<TrackedItem[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();

    supabase
      .from("content_items")
      .select("id, status, collected_at")
      .gte("collected_at", cutoff)
      .then(({ data }) => {
        if (data) setItems(data as TrackedItem[]);
      });

    const channel = supabase
      .channel(`content_items_progress:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "content_items" },
        (payload) => {
          const item = payload.new as TrackedItem;
          if (new Date(item.collected_at).getTime() < Date.now() - ACTIVE_WINDOW_MS) return;
          setItems((current) => [...current, item]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "content_items" },
        (payload) => {
          const updated = payload.new as TrackedItem;
          setItems((current) =>
            current.some((item) => item.id === updated.id)
              ? current.map((item) => (item.id === updated.id ? updated : item))
              : current,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId]);

  const total = items.length;
  const finished = items.filter((item) => FINAL_STATUSES.includes(item.status)).length;
  const inProgress = total - finished;

  if (inProgress <= 0) return null;

  const percent = total > 0 ? Math.round((finished / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-4 py-3">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm">
          {finished} de {total} posts processados — os demais estão sendo transcritos e
          analisados por IA
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

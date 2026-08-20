"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Heart, MessageCircle, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ContentItem } from "@/lib/types";
import { OPPORTUNITY_META } from "@/lib/types";
import { OpportunityBadge, RecommendationBadge } from "@/components/opportunity";
import { StatusBadge } from "./status-badge";
import { VideoPlayer } from "./video-player";
import { deleteContentItems, toggleFavorite } from "./actions";

const HOVER_PREVIEW_MS = 5000;

export function ContentFeed({
  initialItems,
  page,
  pageCount,
}: {
  initialItems: ContentItem[];
  page: number;
  pageCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const instanceId = useId();
  const [items, setItems] = useState(initialItems);
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
    setSelected(new Set());
  }, [initialItems]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`content_items_feed:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "content_items" },
        (payload) => {
          const hasFilters = [
            "type",
            "opportunity",
            "risk",
            "recommendation",
            "status",
            "period",
            "q",
            "favorite",
          ].some((key) => searchParams.get(key));
          if (page !== 1 || hasFilters) return;
          setItems((current) => [payload.new as ContentItem, ...current].slice(0, 12));
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
  }, [page]);

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
  }

  function toggleItem(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  function handleToggleFavorite(item: ContentItem) {
    const next = !item.is_favorite;
    setItems((current) =>
      current.map((i) => (i.id === item.id ? { ...i, is_favorite: next } : i)),
    );
    setPreviewItem((current) =>
      current?.id === item.id ? { ...current, is_favorite: next } : current,
    );
    toggleFavorite(item.id, next).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Falha ao favoritar");
      setItems((current) =>
        current.map((i) => (i.id === item.id ? { ...i, is_favorite: !next } : i)),
      );
    });
  }

  function handleDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Excluir ${selected.size} item(ns) selecionado(s)? Essa ação não pode ser desfeita.`)) {
      return;
    }
    const ids = Array.from(selected);
    startDeleteTransition(async () => {
      try {
        await deleteContentItems(ids);
        setItems((current) => current.filter((item) => !selected.has(item.id)));
        setSelected(new Set());
        toast.success(`${ids.length} item(ns) excluído(s)`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao excluir");
      }
    });
  }

  if (items.length === 0 && page === 1) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum conteúdo coletado ainda. Dispare uma busca em Descoberta.
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={selectMode ? "default" : "outline"}
            onClick={toggleSelectMode}
          >
            {selectMode ? "Cancelar seleção" : "Selecionar"}
          </Button>
          {selectMode && (
            <Button size="sm" variant="outline" onClick={toggleSelectAll}>
              {allSelected ? "Desmarcar todos" : "Selecionar todos"}
            </Button>
          )}
        </div>
        {selectMode && selected.size > 0 && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting
              ? "Excluindo..."
              : allSelected
                ? `Excluir todos (${selected.size})`
                : `Excluir (${selected.size})`}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {items.map((item) => (
          <ContentTile
            key={item.id}
            item={item}
            selectMode={selectMode}
            selected={selected.has(item.id)}
            onSelect={() =>
              selectMode ? toggleItem(item.id) : setPreviewItem(item)
            }
            onToggleFavorite={() => handleToggleFavorite(item)}
          />
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination count={pageCount} page={page} onPageChange={goToPage} />
        </div>
      )}

      <Sheet open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <SheetContent side="right" className="w-full p-4 sm:max-w-sm">
          {previewItem && (
            <>
              <SheetHeader className="p-0">
                <SheetTitle className="sr-only">Prévia do conteúdo</SheetTitle>
              </SheetHeader>
              <VideoPlayer
                videoUrl={previewItem.video_url}
                thumbnailUrl={previewItem.thumbnail_url}
                caption={previewItem.caption}
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {previewItem.media_type}
                    </Badge>
                    <StatusBadge status={previewItem.status} />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleFavorite(previewItem)}
                  >
                    <Heart
                      className={cn("h-4 w-4", previewItem.is_favorite && "fill-current text-red-500")}
                    />
                    {previewItem.is_favorite ? "Inspiração salva" : "Salvar inspiração"}
                  </Button>
                </div>
                {previewItem.opportunity_level && (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                    <OpportunityBadge level={previewItem.opportunity_level} />
                    {previewItem.recommendation && (
                      <RecommendationBadge recommendation={previewItem.recommendation} />
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {previewItem.caption ?? "Sem legenda"}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="h-4 w-4" />
                    {previewItem.likes_count.toLocaleString("pt-BR")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    {previewItem.comments_count.toLocaleString("pt-BR")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    {previewItem.engagement_score.toLocaleString("pt-BR")} total
                  </span>
                </div>
                <Button
                  nativeButton={false}
                  render={<Link href={`/conteudo/${previewItem.id}`} />}
                >
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

function ContentTile({
  item,
  selectMode,
  selected,
  onSelect,
  onToggleFavorite,
}: {
  item: ContentItem;
  selectMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewing, setPreviewing] = useState(false);

  function handleMouseEnter() {
    if (!item.video_url || selectMode) return;
    setPreviewing(true);
    requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = 0;
      video.play().catch(() => {});
    });
    timeoutRef.current = setTimeout(() => setPreviewing(false), HOVER_PREVIEW_MS);
  }

  function handleMouseLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPreviewing(false);
    videoRef.current?.pause();
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative aspect-[9/16] w-full overflow-hidden rounded-md bg-muted text-left"
    >
      {item.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnail_url}
          alt={item.caption ?? "Prévia do conteúdo"}
          className={cn(
            "h-full w-full object-cover transition-transform group-hover:scale-105",
            previewing && item.video_url && "invisible",
          )}
        />
      )}
      {item.video_url && (
        <video
          ref={videoRef}
          src={item.video_url}
          muted
          loop
          playsInline
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            previewing ? "block" : "hidden",
          )}
        />
      )}
      {selectMode && (
        <div
          className={cn(
            "absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-white bg-black/30",
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </div>
      )}
      {item.opportunity_level && (
        <div className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[0.7rem]">
          {OPPORTUNITY_META[item.opportunity_level].emoji}
        </div>
      )}
      {!selectMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={item.is_favorite ? "Remover dos favoritos" : "Salvar inspiração"}
          className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 data-[favorite=true]:opacity-100"
          data-favorite={item.is_favorite}
        >
          <Heart className={cn("h-3.5 w-3.5", item.is_favorite && "fill-current text-red-500")} />
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
        <StatusBadge status={item.status} className="text-[0.65rem]" />
        <span className="inline-flex items-center gap-0.5 text-[0.65rem] font-medium text-white">
          <Heart className="h-3 w-3" />
          {item.likes_count.toLocaleString("pt-BR")}
        </span>
      </div>
    </button>
  );
}

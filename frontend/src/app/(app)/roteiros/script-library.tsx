"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import type {
  CarouselScriptContent,
  ReelScriptContent,
  ScriptFormat,
  ScriptRow,
  StaticPostScriptContent,
} from "@/lib/types";
import { SCRIPT_FORMAT_LABEL } from "@/lib/types";
import { approveScript } from "./actions";

const FILTERS: Array<ScriptFormat | "all"> = [
  "all",
  "reel_30s",
  "reel_60s",
  "reel_90s",
  "carousel",
  "static_post",
];

function HashtagRow({ hashtags }: { hashtags: string[] }) {
  if (hashtags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {hashtags.map((tag) => (
        <Badge key={tag} variant="outline" className="font-normal">
          #{tag.replace(/^#/, "")}
        </Badge>
      ))}
    </div>
  );
}

function ScriptContentView({ script }: { script: ScriptRow }) {
  if (script.format === "carousel") {
    const content = script.content as CarouselScriptContent;
    return (
      <div className="space-y-4 text-sm">
        {content.slides.map((slide) => (
          <div key={slide.slide_number} className="rounded-lg border p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Slide {slide.slide_number}
            </p>
            <p className="font-medium">{slide.headline}</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{slide.body}</p>
            <p className="mt-2 text-xs italic text-muted-foreground">
              Sugestão visual: {slide.visual_suggestion}
            </p>
          </div>
        ))}
        <div>
          <p className="mb-1 font-medium">Legenda</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{content.caption}</p>
        </div>
        <HashtagRow hashtags={content.hashtags} />
      </div>
    );
  }

  if (script.format === "static_post") {
    const content = script.content as StaticPostScriptContent;
    return (
      <div className="space-y-4 text-sm">
        <div>
          <p className="mb-1 font-medium">Headline</p>
          <p className="text-muted-foreground">{content.headline}</p>
        </div>
        <div>
          <p className="mb-1 font-medium">Texto</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{content.body}</p>
        </div>
        <div>
          <p className="mb-1 font-medium">CTA</p>
          <p className="text-muted-foreground">{content.cta}</p>
        </div>
        <div>
          <p className="mb-1 font-medium">Legenda</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{content.caption}</p>
        </div>
        <HashtagRow hashtags={content.hashtags} />
      </div>
    );
  }

  // reel_30s / reel_60s / reel_90s
  const content = script.content as ReelScriptContent;
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-1 font-medium">Gancho (hook)</p>
        <p className="text-muted-foreground">{content.hook}</p>
      </div>
      <div>
        <p className="mb-1.5 font-medium">Cenas</p>
        <div className="space-y-2">
          {content.body_segments.map((segment, i) => (
            <div key={i} className="rounded-lg border p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Cena {i + 1}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{segment}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 font-medium">CTA</p>
        <p className="text-muted-foreground">{content.cta}</p>
      </div>
      <div>
        <p className="mb-1 font-medium">Legenda</p>
        <p className="whitespace-pre-wrap text-muted-foreground">{content.caption}</p>
      </div>
      <HashtagRow hashtags={content.hashtags} />
    </div>
  );
}

function scriptPreview(script: ScriptRow): string {
  const content = script.content as unknown as Record<string, unknown>;
  if (typeof content.headline === "string") return content.headline;
  if (typeof content.hook === "string") return content.hook;
  if (Array.isArray(content.slides) && content.slides[0]?.headline) {
    return content.slides[0].headline as string;
  }
  return "Roteiro gerado";
}

export function ScriptLibrary({ initialScripts }: { initialScripts: ScriptRow[] }) {
  const instanceId = useId();
  const [scripts, setScripts] = useState(initialScripts);
  const [filter, setFilter] = useState<ScriptFormat | "all">("all");
  const [openScript, setOpenScript] = useState<ScriptRow | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`scripts_library:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scripts" },
        (payload) => {
          setScripts((current) => [payload.new as ScriptRow, ...current]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scripts" },
        (payload) => {
          const updated = payload.new as ScriptRow;
          setScripts((current) =>
            current.map((s) => (s.id === updated.id ? updated : s)),
          );
          setOpenScript((current) => (current?.id === updated.id ? updated : current));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? scripts : scripts.filter((s) => s.format === filter)),
    [scripts, filter],
  );

  function handleApprove(id: string, flaggedWords: string[]) {
    if (
      flaggedWords.length > 0 &&
      !window.confirm(
        `Este roteiro contém palavra(s) que a marca evita: ${flaggedWords.join(", ")}. Aprovar mesmo assim?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await approveScript(id);
        toast.success("Roteiro aprovado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao aprovar");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todos" : SCRIPT_FORMAT_LABEL[f]}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum roteiro neste filtro.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((script) => (
            <Card key={script.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-sm">{scriptPreview(script)}</CardTitle>
                <Badge variant={script.approved ? "default" : "secondary"}>
                  {script.approved ? "aprovado" : "pendente aprovação"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Badge variant="outline">{SCRIPT_FORMAT_LABEL[script.format]}</Badge>
                {script.flagged_words.length > 0 && (
                  <div className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Contém palavra(s) a evitar: {script.flagged_words.join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpenScript(script)}>
                    Ver roteiro completo
                  </Button>
                  {!script.approved && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(script.id, script.flagged_words)}
                      disabled={isPending}
                    >
                      Aprovar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!openScript} onOpenChange={(open) => !open && setOpenScript(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-lg">
          {openScript && (
            <>
              <SheetHeader className="p-0">
                <SheetTitle>{SCRIPT_FORMAT_LABEL[openScript.format]}</SheetTitle>
              </SheetHeader>
              {openScript.flagged_words.length > 0 && (
                <div className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Contém palavra(s) a evitar: {openScript.flagged_words.join(", ")}
                  </span>
                </div>
              )}
              <ScriptContentView script={openScript} />
              {!openScript.approved && (
                <Button
                  onClick={() => handleApprove(openScript.id, openScript.flagged_words)}
                  disabled={isPending}
                >
                  Aprovar
                </Button>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { ScriptFormat, ScriptRow } from "@/lib/types";
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
  const [scripts, setScripts] = useState(initialScripts);
  const [filter, setFilter] = useState<ScriptFormat | "all">("all");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("scripts_library")
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

  function handleApprove(id: string) {
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
                {!script.approved && (
                  <Button
                    size="sm"
                    onClick={() => handleApprove(script.id)}
                    disabled={isPending}
                  >
                    Aprovar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

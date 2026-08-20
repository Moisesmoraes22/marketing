"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ContentItem, ScriptFormat } from "@/lib/types";
import { SCRIPT_FORMAT_LABEL } from "@/lib/types";
import { requestScript } from "../actions";

const FORMATS: ScriptFormat[] = [
  "reel_30s",
  "reel_60s",
  "reel_90s",
  "carousel",
  "static_post",
];

export function NewScriptForm({ items }: { items: ContentItem[] }) {
  const router = useRouter();
  const [contentItemId, setContentItemId] = useState(items[0]?.id ?? "");
  const [format, setFormat] = useState<ScriptFormat>("reel_30s");
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum conteúdo analisado ainda. Espere o pipeline concluir em Conteúdo.
      </p>
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        await requestScript(contentItemId, format);
        toast.success("Roteiro sendo gerado — acompanhe na biblioteca");
        router.push("/roteiros");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao gerar roteiro");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gerar roteiro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="content_item">Conteúdo analisado</Label>
          <select
            id="content_item"
            value={contentItemId}
            onChange={(e) => setContentItemId(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {(item.caption ?? item.source_url).slice(0, 80)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="format">Formato</Label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as ScriptFormat)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {SCRIPT_FORMAT_LABEL[f]}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Gerando..." : "Gerar"}
        </Button>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpportunityBadge } from "@/components/opportunity";
import { cn } from "@/lib/utils";
import type {
  ContentItem,
  ScriptFormat,
  ScriptObjective,
  ScriptStyle,
} from "@/lib/types";
import { OBJECTIVE_LABEL, SCRIPT_FORMAT_LABEL, STYLE_LABEL } from "@/lib/types";
import { requestScript } from "../actions";

const FORMATS: ScriptFormat[] = [
  "reel_30s",
  "reel_60s",
  "reel_90s",
  "carousel",
  "static_post",
];
const OBJECTIVES: ScriptObjective[] = [
  "vender",
  "engajar",
  "educar",
  "atrair_seguidores",
  "fortalecer_marca",
];
const STYLES: ScriptStyle[] = ["viral", "educativo", "comercial", "storytelling", "humor"];

const STEPS = ["Inspiração", "Objetivo", "Formato", "Estilo", "Gerar"] as const;

function OptionGrid<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
            value === opt
              ? "border-primary bg-primary/5 text-primary"
              : "hover:border-primary/40",
          )}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

export function NewScriptForm({
  items,
  preselectedId,
}: {
  items: ContentItem[];
  preselectedId: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [contentItemId, setContentItemId] = useState(
    preselectedId ?? items[0]?.id ?? "",
  );
  const [objective, setObjective] = useState<ScriptObjective | null>(null);
  const [format, setFormat] = useState<ScriptFormat | null>(null);
  const [style, setStyle] = useState<ScriptStyle | null>(null);
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum conteúdo analisado ainda. Espere o pipeline concluir em Descoberta.
      </p>
    );
  }

  const selectedItem = items.find((i) => i.id === contentItemId) ?? items[0];

  function canAdvance(): boolean {
    if (step === 0) return !!contentItemId;
    if (step === 1) return !!objective;
    if (step === 2) return !!format;
    if (step === 3) return !!style;
    return true;
  }

  function handleGenerate() {
    if (!objective || !format || !style) return;
    startTransition(async () => {
      try {
        await requestScript(contentItemId, format, objective, style);
        toast.success("Roteiro sendo gerado — acompanhe na biblioteca");
        router.push("/roteiros");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao gerar roteiro");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <CardTitle className="text-base">Gerar roteiro</CardTitle>
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "border-2 border-primary text-primary"
                      : "border text-muted-foreground",
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs sm:inline",
                  i === step ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="h-px flex-1 bg-border" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 0 && (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setContentItemId(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
                  contentItemId === item.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/40",
                )}
              >
                {item.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail_url}
                    alt=""
                    className="h-14 w-10 shrink-0 rounded object-cover"
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {item.caption ?? item.source_url}
                </span>
                {item.opportunity_level && (
                  <OpportunityBadge level={item.opportunity_level} className="text-[0.65rem]" />
                )}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <OptionGrid
            options={OBJECTIVES}
            labels={OBJECTIVE_LABEL}
            value={objective}
            onChange={setObjective}
          />
        )}

        {step === 2 && (
          <OptionGrid
            options={FORMATS}
            labels={SCRIPT_FORMAT_LABEL}
            value={format}
            onChange={setFormat}
          />
        )}

        {step === 3 && (
          <OptionGrid
            options={STYLES}
            labels={STYLE_LABEL}
            value={style}
            onChange={setStyle}
          />
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Inspiração</p>
              <p className="font-medium">
                {selectedItem?.caption ?? selectedItem?.source_url}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Objetivo</p>
                <p className="font-medium">{objective && OBJECTIVE_LABEL[objective]}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Formato</p>
                <p className="font-medium">{format && SCRIPT_FORMAT_LABEL[format]}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Estilo</p>
                <p className="font-medium">{style && STYLE_LABEL[style]}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
              Próximo
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? "Gerando..." : "✨ Gerar conteúdo"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

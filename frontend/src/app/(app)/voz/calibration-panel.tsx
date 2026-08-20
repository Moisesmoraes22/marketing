"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type {
  ScriptRow,
  StaticPostScriptContent,
  VoiceProfile,
} from "@/lib/types";
import { generateCalibrationDraft, submitCalibrationFeedback } from "./actions";

function calibrationLevel(notes: string | null): number {
  if (!notes) return 0;
  const lines = notes.split("\n").filter(Boolean);
  if (lines.length === 0) return 0;
  const approved = lines.filter((line) => line.includes("] aprovei")).length;
  return Math.round((approved / lines.length) * 100);
}

export function CalibrationPanel({ profile }: { profile: VoiceProfile }) {
  const router = useRouter();
  const instanceId = useId();
  const [draft, setDraft] = useState<ScriptRow | null>(null);
  const [isGenerating, setGenerating] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`voice_calibration:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scripts" },
        (payload) => {
          const row = payload.new as ScriptRow;
          if (row.voice_profile_snapshot?.id === profile.id && !row.approved) {
            setDraft(row);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await generateCalibrationDraft(profile.id);
      toast.success("Gerando rascunho de calibração...");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar rascunho");
    } finally {
      setGenerating(false);
    }
  }

  function handleFeedback(approved: boolean) {
    if (!draft) return;
    startTransition(async () => {
      try {
        await submitCalibrationFeedback(draft.id, profile.id, approved, note);
        setDraft(null);
        setNote("");
        toast.success(approved ? "Aprovado" : "Ajuste registrado");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao enviar feedback");
      }
    });
  }

  const content = draft?.content as StaticPostScriptContent | undefined;
  const level = calibrationLevel(profile.calibration_notes);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">🧠 Calibrar IA</CardTitle>
          <span className="text-sm font-semibold tabular-nums">{level}%</span>
        </div>
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${level}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Nível de calibração</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!draft && (
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Gerando..." : "Gerar conteúdo de teste"}
          </Button>
        )}

        {draft && content && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Como esse conteúdo ficou?</p>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-sm font-medium">{content.headline}</p>
              <p className="text-sm text-muted-foreground">{content.body}</p>
              <p className="text-sm text-muted-foreground">{content.cta}</p>
            </div>
            <Input
              placeholder="O que você mudaria? (deixe em branco se for aprovar)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={() => handleFeedback(true)} disabled={isPending}>
                👍 Aprovar
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFeedback(false)}
                disabled={isPending || !note}
              >
                ✏️ Ajustar
              </Button>
            </div>
          </div>
        )}

        {profile.calibration_notes && (
          <div>
            <p className="text-sm font-medium">Histórico de calibração</p>
            <pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
              {profile.calibration_notes}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
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

export function CalibrationPanel({ profile }: { profile: VoiceProfile }) {
  const [draft, setDraft] = useState<ScriptRow | null>(null);
  const [isGenerating, setGenerating] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("voice_calibration")
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
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao enviar feedback");
      }
    });
  }

  const content = draft?.content as StaticPostScriptContent | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calibrar com rascunho</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!draft && (
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Gerando..." : "Gerar post de teste"}
          </Button>
        )}

        {draft && content && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{content.headline}</p>
              <p className="text-sm text-muted-foreground">{content.body}</p>
              <p className="text-sm text-muted-foreground">{content.cta}</p>
            </div>
            <Input
              placeholder="O que ajustar? (deixe em branco se for aprovar)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={() => handleFeedback(true)} disabled={isPending}>
                Aprovei
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFeedback(false)}
                disabled={isPending || !note}
              >
                Pedir ajuste
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

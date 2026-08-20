"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VoiceProfile } from "@/lib/types";
import { saveVoiceProfile } from "./actions";

interface Step {
  key: keyof typeof FIELD_NAMES;
  question: string;
  placeholder: string;
  multiline?: boolean;
}

const FIELD_NAMES = {
  target_audience: "target_audience",
  tone_adjectives: "tone_adjectives",
  words_we_use: "words_we_use",
  words_we_avoid: "words_we_avoid",
  example_approved_post: "example_approved_post",
} as const;

const STEPS: Step[] = [
  {
    key: "target_audience",
    question: "Quem é o seu público?",
    placeholder: "Ex: mulheres de 25-40 anos interessadas em treino em casa",
    multiline: true,
  },
  {
    key: "tone_adjectives",
    question: "Descreva o tom de voz em 3 a 5 adjetivos",
    placeholder: "direto, acolhedor, motivador (separados por vírgula)",
  },
  {
    key: "words_we_use",
    question: "Palavras e expressões que usamos muito",
    placeholder: "bora, sem desculpa, na prática (separadas por vírgula)",
  },
  {
    key: "words_we_avoid",
    question: "Palavras e expressões que nunca usamos",
    placeholder: "jargão técnico, gírias regionais (separadas por vírgula)",
  },
  {
    key: "example_approved_post",
    question: "Cole aqui um post que você considera ideal para a marca",
    placeholder: "Cole o texto completo do post...",
    multiline: true,
  },
];

function defaultsFrom(profile: VoiceProfile | null): Record<string, string> {
  return {
    target_audience: profile?.target_audience ?? "",
    tone_adjectives: profile?.tone_adjectives.join(", ") ?? "",
    words_we_use: profile?.words_we_use.join(", ") ?? "",
    words_we_avoid: profile?.words_we_avoid.join(", ") ?? "",
    example_approved_post: profile?.example_approved_post ?? "",
  };
}

export function VoiceWizard({ profile }: { profile: VoiceProfile | null }) {
  const [editing, setEditing] = useState(!profile);

  if (profile && !editing) {
    return <VoiceProfileSummary profile={profile} onEdit={() => setEditing(true)} />;
  }

  return (
    <VoiceProfileEditor
      profile={profile}
      onSaved={() => setEditing(false)}
      onCancel={profile ? () => setEditing(false) : undefined}
    />
  );
}

function VoiceProfileSummary({
  profile,
  onEdit,
}: {
  profile: VoiceProfile;
  onEdit: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Perfil de voz</CardTitle>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div>
          <p className="mb-1 font-medium text-muted-foreground">Público</p>
          <p>{profile.target_audience || "não definido"}</p>
        </div>
        <div>
          <p className="mb-1.5 font-medium text-muted-foreground">Tom</p>
          <TagRow items={profile.tone_adjectives} />
        </div>
        <div>
          <p className="mb-1.5 font-medium text-muted-foreground">Palavras que usamos</p>
          <TagRow items={profile.words_we_use} variant="secondary" />
        </div>
        <div>
          <p className="mb-1.5 font-medium text-muted-foreground">Palavras que evitamos</p>
          <TagRow items={profile.words_we_avoid} variant="destructive" />
        </div>
        {profile.example_approved_post && (
          <div>
            <p className="mb-1.5 font-medium text-muted-foreground">Exemplo aprovado</p>
            <div className="rounded-md border bg-muted/40 p-3 text-muted-foreground">
              {profile.example_approved_post}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TagRow({
  items,
  variant = "outline",
}: {
  items: string[];
  variant?: "outline" | "secondary" | "destructive";
}) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant={variant} className="font-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function VoiceProfileEditor({
  profile,
  onSaved,
  onCancel,
}: {
  profile: VoiceProfile | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState(() => defaultsFrom(profile));
  const [isPending, startTransition] = useTransition();

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(values)) {
        formData.set(key, value);
      }
      try {
        await saveVoiceProfile(formData);
        toast.success("Perfil de voz salvo");
        onSaved();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao salvar");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          Passo {stepIndex + 1} de {STEPS.length}
        </CardTitle>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={step.key}>{step.question}</Label>
          <Input
            id={step.key}
            value={values[step.key]}
            placeholder={step.placeholder}
            onChange={(e) =>
              setValues((current) => ({ ...current, [step.key]: e.target.value }))
            }
          />
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          >
            Voltar
          </Button>
          {isLastStep ? (
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar perfil de voz"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            >
              Próximo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

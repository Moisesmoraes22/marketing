"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSearch } from "./actions";

export function NewSearchForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createSearch(formData);
        formRef.current?.reset();
        toast.success("Busca criada");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao criar busca");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova busca</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required placeholder="Ex: Concorrentes — moda fitness" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hashtags">Hashtags (separadas por vírgula)</Label>
            <Input id="hashtags" name="hashtags" placeholder="modafitness, treinoemcasa" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accounts">Contas (separadas por vírgula)</Label>
            <Input id="accounts" name="accounts" placeholder="@conta1, @conta2" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_engagement">Engajamento mínimo</Label>
            <Input
              id="min_engagement"
              name="min_engagement"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Criar busca"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

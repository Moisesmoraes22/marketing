"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSearch } from "./actions";

export function NewSearchForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createSearch(formData);
        formRef.current?.reset();
        toast.success("Busca criada e disparada — acompanhe o resultado em Conteúdo");
        router.push("/conteudo");
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
          <div className="space-y-2">
            <Label htmlFor="results_limit">Quantidade de posts a buscar</Label>
            <Input
              id="results_limit"
              name="results_limit"
              type="number"
              min={1}
              max={200}
              defaultValue={20}
            />
            <p className="text-xs text-muted-foreground">
              Números maiores demoram mais para processar.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="auto_run_interval_hours">Repetir automaticamente</Label>
            <select
              id="auto_run_interval_hours"
              name="auto_run_interval_hours"
              defaultValue="manual"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="manual">Só manual</option>
              <option value="6">A cada 6 horas</option>
              <option value="12">A cada 12 horas</option>
              <option value="24">Diariamente</option>
              <option value="168">Semanalmente</option>
            </select>
            <p className="text-xs text-muted-foreground">
              O worker dispara sozinho nesse intervalo, sem precisar clicar.
            </p>
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

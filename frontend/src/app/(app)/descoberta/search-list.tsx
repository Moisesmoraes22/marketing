"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Search } from "@/lib/types";
import { toggleSearchActive } from "./actions";

export function SearchList({ searches }: { searches: Search[] }) {
  if (searches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma busca configurada ainda.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {searches.map((search) => (
        <SearchCard key={search.id} search={search} />
      ))}
    </div>
  );
}

function SearchCard({ search }: { search: Search }) {
  const [running, setRunning] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleRun() {
    setRunning(true);
    try {
      const res = await fetch(`/api/searches/${search.id}/run`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "falha ao executar busca");
      toast.success("Busca disparada — acompanhe em Conteúdo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao executar busca");
    } finally {
      setRunning(false);
    }
  }

  function handleToggle() {
    startTransition(async () => {
      try {
        await toggleSearchActive(search.id, !search.active);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao atualizar busca");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base">{search.name}</CardTitle>
        <Badge variant={search.active ? "default" : "secondary"}>
          {search.active ? "ativa" : "inativa"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground">Hashtags</p>
          <p>{search.hashtags.length ? search.hashtags.join(", ") : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Contas</p>
          <p>{search.accounts.length ? search.accounts.join(", ") : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Engajamento mínimo</p>
          <p>{search.min_engagement}</p>
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleRun} disabled={running}>
            {running ? "Executando..." : "Executar agora"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggle}
            disabled={isPending}
          >
            {search.active ? "Desativar" : "Ativar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

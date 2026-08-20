"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AtSign, Clock, Hash, ListVideo, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Search } from "@/lib/types";
import { toggleSearchActive } from "./actions";

const INTERVAL_LABEL: Record<number, string> = {
  6: "a cada 6h",
  12: "a cada 12h",
  24: "diariamente",
  168: "semanalmente",
};

const TAG_PREVIEW_LIMIT = 6;

export function SearchList({
  searches,
  onRun,
}: {
  searches: Search[];
  onRun?: () => void;
}) {
  if (searches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma busca configurada ainda.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {searches.map((search) => (
        <SearchCard key={search.id} search={search} onRun={onRun} />
      ))}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const visible = expanded ? items : items.slice(0, TAG_PREVIEW_LIMIT);
  const hidden = items.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((item) => (
        <Badge key={item} variant="secondary" className="font-normal">
          {item}
        </Badge>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-medium text-primary hover:underline"
        >
          +{hidden}
        </button>
      )}
      {expanded && items.length > TAG_PREVIEW_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs font-medium text-muted-foreground hover:underline"
        >
          mostrar menos
        </button>
      )}
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

function SearchCard({ search, onRun }: { search: Search; onRun?: () => void }) {
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
      toast.success(
        body.queued
          ? "Essa busca já está na fila — aguarde terminar antes de rodar de novo"
          : "Busca disparada — acompanhe o progresso em Conteúdo",
      );
      onRun?.();
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
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base">{search.name}</CardTitle>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={search.active ? "default" : "secondary"}>
            {search.active ? "ativa" : "inativa"}
          </Badge>
          {search.auto_run_interval_hours && (
            <Badge variant="outline" className="gap-1 text-[0.65rem]">
              <Clock className="h-3 w-3" />
              {INTERVAL_LABEL[search.auto_run_interval_hours] ??
                `a cada ${search.auto_run_interval_hours}h`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <Field icon={Hash} label="Hashtags">
          <TagList items={search.hashtags} />
        </Field>
        <Field icon={AtSign} label="Contas">
          <TagList items={search.accounts} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field icon={TrendingUp} label="Engajamento mínimo">
            {search.min_engagement.toLocaleString("pt-BR")}
          </Field>
          <Field icon={ListVideo} label="Quantidade de posts">
            {search.results_limit}
          </Field>
        </div>
        {search.auto_run_interval_hours && (
          <Field icon={Clock} label="Última execução automática">
            {search.last_run_at
              ? new Date(search.last_run_at).toLocaleString("pt-BR")
              : "ainda não rodou"}
          </Field>
        )}
        <div className="mt-auto flex gap-2 border-t pt-4">
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

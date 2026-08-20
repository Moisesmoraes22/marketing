"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "reel", label: "Reel" },
  { value: "post", label: "Post" },
  { value: "carousel", label: "Carrossel" },
];

const POTENTIAL_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "alto", label: "Alto" },
  { value: "medio", label: "Médio" },
  { value: "baixo", label: "Baixo" },
];

const RECOMMENDATION_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "adaptar", label: "🟢 Adaptar" },
  { value: "inspirar", label: "🟡 Inspirar-se" },
  { value: "ignorar", label: "🔴 Ignorar" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "collected", label: "Coletado" },
  { value: "transcribing", label: "Transcrevendo" },
  { value: "analyzing", label: "Analisando" },
  { value: "done", label: "Pronto" },
  { value: "error", label: "Erro" },
];

const PERIOD_OPTIONS = [
  { value: "all", label: "Todo período" },
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "score", label: "Score" },
  { value: "engagement", label: "Engajamento" },
];

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function ContentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParam("q", query.trim());
  }

  const hasActiveFilters =
    ["type", "potential", "recommendation", "status", "period", "q"].some((key) =>
      searchParams.get(key),
    ) || searchParams.get("sort");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por legenda..."
          className="h-9 w-48 pl-8"
        />
      </form>
      <Select
        label="Tipo"
        value={searchParams.get("type") ?? "all"}
        onChange={(v) => setParam("type", v)}
        options={TYPE_OPTIONS}
      />
      <Select
        label="Potencial"
        value={searchParams.get("potential") ?? "all"}
        onChange={(v) => setParam("potential", v)}
        options={POTENTIAL_OPTIONS}
      />
      <Select
        label="Recomendação"
        value={searchParams.get("recommendation") ?? "all"}
        onChange={(v) => setParam("recommendation", v)}
        options={RECOMMENDATION_OPTIONS}
      />
      <Select
        label="Status"
        value={searchParams.get("status") ?? "all"}
        onChange={(v) => setParam("status", v)}
        options={STATUS_OPTIONS}
      />
      <Select
        label="Período"
        value={searchParams.get("period") ?? "all"}
        onChange={(v) => setParam("period", v)}
        options={PERIOD_OPTIONS}
      />
      <Select
        label="Ordenar por"
        value={searchParams.get("sort") ?? "recent"}
        onChange={(v) => setParam("sort", v)}
        options={SORT_OPTIONS}
      />
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Limpar filtros
        </button>
      )}
      {isPending && (
        <span className="text-xs text-muted-foreground">Filtrando...</span>
      )}
    </div>
  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface DiscoverJob {
  id: string;
  status: "pending" | "running" | "done" | "error" | "cancelled";
  payload: { results_limit?: number; search_id?: string };
  error_message: string | null;
  started_at: string | null;
  created_at: string;
  result: { found: number; new: number; duplicates: number } | null;
}

interface DiscoverStats {
  secondsPerItem: number;
  baseSeconds: number;
}

const MAX_SKELETONS = 12;
const TICK_MS = 1000;

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "quase lá...";
  if (seconds < 60) return `~${Math.ceil(seconds)}s restantes`;
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes} min restante${minutes > 1 ? "s" : ""}`;
}

export function DiscoveryStatus() {
  const instanceId = useId();
  const [activeJobs, setActiveJobs] = useState<Map<string, DiscoverJob>>(new Map());
  const [stats, setStats] = useState<DiscoverStats | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [cancelling, setCancelling] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/jobs/discover-stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("jobs")
      .select("id, status, payload, error_message, started_at, created_at, result")
      .eq("type", "discover")
      .in("status", ["pending", "running"])
      .then(({ data }) => {
        if (!data) return;
        setActiveJobs(new Map(data.map((job) => [job.id, job as DiscoverJob])));
      });

    const channel = supabase
      .channel(`discover_jobs:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jobs" },
        (payload) => {
          const job = payload.new as DiscoverJob & { type: string };
          if (job.type !== "discover") return;
          setActiveJobs((current) => new Map(current).set(job.id, job));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs" },
        (payload) => {
          const job = payload.new as DiscoverJob & { type: string };
          if (job.type !== "discover") return;

          setActiveJobs((current) => {
            if (!current.has(job.id) && job.status !== "pending" && job.status !== "running") {
              return current;
            }
            const next = new Map(current);
            if (job.status === "pending" || job.status === "running") {
              next.set(job.id, job);
            } else {
              if (next.has(job.id)) {
                if (job.status === "done") {
                  toast.success(
                    job.result
                      ? `Busca concluída ✅ — ${job.result.new} novo(s), ${job.result.duplicates} já conhecido(s)`
                      : "Busca concluída ✅",
                  );
                } else if (job.status === "cancelled") {
                  toast("Busca cancelada");
                } else {
                  toast.error(`Busca falhou: ${job.error_message ?? "erro desconhecido"}`);
                }
              }
              next.delete(job.id);
            }
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId]);

  useEffect(() => {
    if (activeJobs.size === 0) return;
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [activeJobs.size]);

  function handleCancel(jobId: string) {
    setCancelling((current) => new Set(current).add(jobId));
    fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "falha ao cancelar");
        setActiveJobs((current) => {
          const next = new Map(current);
          next.delete(jobId);
          return next;
        });
        toast("Busca cancelada");
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Falha ao cancelar busca");
      })
      .finally(() => {
        setCancelling((current) => {
          const next = new Set(current);
          next.delete(jobId);
          return next;
        });
      });
  }

  if (activeJobs.size === 0) return null;

  const jobs = Array.from(activeJobs.values());
  const skeletonCount = Math.min(
    MAX_SKELETONS,
    Math.max(...jobs.map((j) => j.payload.results_limit ?? 6)),
  );

  return (
    <div className="space-y-3">
      {jobs.map((job) => {
        let etaLabel = "na fila, aguardando a busca anterior terminar...";
        if (job.status === "running" && job.started_at) {
          if (stats) {
            const items = job.payload.results_limit ?? 6;
            const totalEstimateSec = stats.baseSeconds + stats.secondsPerItem * items;
            const elapsedSec = (now - new Date(job.started_at).getTime()) / 1000;
            etaLabel = formatRemaining(totalEstimateSec - elapsedSec);
          } else {
            etaLabel = "isso pode levar alguns minutos...";
          }
        }

        return (
          <div key={job.id} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando posts no Instagram — {etaLabel}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCancel(job.id)}
              disabled={cancelling.has(job.id)}
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </Button>
          </div>
        );
      })}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="aspect-[9/16] w-full animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    </div>
  );
}

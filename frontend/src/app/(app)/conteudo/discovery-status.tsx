"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface DiscoverJob {
  id: string;
  status: "pending" | "running" | "done" | "error";
  payload: { results_limit?: number; search_id?: string };
  error_message: string | null;
  started_at: string | null;
  created_at: string;
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
      .select("id, status, payload, error_message, started_at, created_at")
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
            if (job.status === "done" || job.status === "error") {
              if (next.has(job.id)) {
                toast[job.status === "done" ? "success" : "error"](
                  job.status === "done"
                    ? "Busca concluída ✅"
                    : `Busca falhou: ${job.error_message ?? "erro desconhecido"}`,
                );
              }
              next.delete(job.id);
            } else {
              next.set(job.id, job);
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

  if (activeJobs.size === 0) return null;

  const jobs = Array.from(activeJobs.values());
  const skeletonCount = Math.min(
    MAX_SKELETONS,
    Math.max(...jobs.map((j) => j.payload.results_limit ?? 6)),
  );

  const running = jobs.find((j) => j.status === "running" && j.started_at);
  let etaLabel = "isso pode levar alguns minutos...";
  if (running && stats && running.started_at) {
    const items = running.payload.results_limit ?? 6;
    const totalEstimateSec = stats.baseSeconds + stats.secondsPerItem * items;
    const elapsedSec = (now - new Date(running.started_at).getTime()) / 1000;
    etaLabel = formatRemaining(totalEstimateSec - elapsedSec);
  } else if (jobs.some((j) => j.status === "pending")) {
    etaLabel = "na fila, aguardando a busca anterior terminar...";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Buscando posts no Instagram — {etaLabel}
      </div>
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

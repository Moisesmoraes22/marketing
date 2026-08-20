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
}

const MAX_SKELETONS = 12;

export function DiscoveryStatus() {
  const instanceId = useId();
  const [activeJobs, setActiveJobs] = useState<Map<string, DiscoverJob>>(new Map());

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("jobs")
      .select("id, status, payload, error_message")
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

  if (activeJobs.size === 0) return null;

  const skeletonCount = Math.min(
    MAX_SKELETONS,
    Math.max(...Array.from(activeJobs.values()).map((j) => j.payload.results_limit ?? 6)),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Buscando posts no Instagram — isso pode levar alguns minutos...
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

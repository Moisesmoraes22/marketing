import { supabase } from "./lib/supabase.js";
import type { AgentHandler, Job, JobType } from "./lib/types.js";

const POLL_INTERVAL_MS = 30_000;

const handlers = new Map<JobType, AgentHandler>();

export function registerHandler(type: JobType, handler: AgentHandler) {
  handlers.set(type, handler);
}

async function claimNextJob(): Promise<Job | null> {
  const { data: candidates, error: selectError } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (selectError) {
    console.error("[poller] falha ao buscar job pendente:", selectError.message);
    return null;
  }

  const candidate = candidates?.[0] as Job | undefined;
  if (!candidate) return null;

  const { data: claimed, error: updateError } = await supabase
    .from("jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("[poller] falha ao reivindicar job:", updateError.message);
    return null;
  }

  return (claimed as Job | null) ?? null;
}

async function processJob(job: Job) {
  console.log(`[poller] job ${job.id} (${job.type}) recebido:`, job.payload);

  const handler = handlers.get(job.type);
  if (!handler) {
    console.warn(`[poller] nenhum handler registrado para o tipo "${job.type}"`);
    return;
  }

  try {
    await handler(job);
    await supabase
      .from("jobs")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", job.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[poller] job ${job.id} falhou:`, message);

    const { data: current } = await supabase
      .from("jobs")
      .select("status")
      .eq("id", job.id)
      .maybeSingle();
    if (current?.status === "cancelled") return;

    await supabase
      .from("jobs")
      .update({
        status: "error",
        error_message: message,
        finished_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq("id", job.id);
  }
}

async function tick() {
  const job = await claimNextJob();
  if (job) {
    await processJob(job);
  }
}

// setInterval sobreporia execuções se um job demorar mais que o intervalo
// (ex: transcrição de vídeo) — o que rodaria jobs em paralelo e estouraria
// os limites de taxa do Groq/Apify. Reagendar só após o tick anterior
// terminar garante no máximo 1 job em processamento por vez.
export function startPoller() {
  console.log(`[poller] iniciado — intervalo de ${POLL_INTERVAL_MS / 1000}s`);

  async function loop() {
    try {
      await tick();
    } catch (err) {
      console.error("[poller] erro inesperado no tick:", err);
    } finally {
      setTimeout(loop, POLL_INTERVAL_MS);
    }
  }

  loop();
}

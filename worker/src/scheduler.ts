import { supabase } from "./lib/supabase.js";

const CHECK_INTERVAL_MS = 5 * 60_000; // checa a cada 5 min — barato, não precisa ser exato

interface DueSearch {
  id: string;
  hashtags: string[];
  accounts: string[];
  min_engagement: number;
  results_limit: number;
  auto_run_interval_hours: number;
  last_run_at: string | null;
}

async function runDueSearches() {
  const { data: searches, error } = await supabase
    .from("searches")
    .select("id, hashtags, accounts, min_engagement, results_limit, auto_run_interval_hours, last_run_at")
    .eq("active", true)
    .not("auto_run_interval_hours", "is", null);

  if (error) {
    console.error("[scheduler] falha ao buscar buscas ativas:", error.message);
    return;
  }

  const now = Date.now();
  const due = (searches as DueSearch[] | null)?.filter((search) => {
    if (!search.last_run_at) return true;
    const elapsedHours = (now - new Date(search.last_run_at).getTime()) / 3_600_000;
    return elapsedHours >= search.auto_run_interval_hours;
  });

  if (!due || due.length === 0) return;

  for (const search of due) {
    const { error: jobError } = await supabase.from("jobs").insert({
      type: "discover",
      payload: {
        search_id: search.id,
        hashtags: search.hashtags,
        accounts: search.accounts,
        min_engagement: search.min_engagement,
        results_limit: search.results_limit,
      },
      status: "pending",
    });

    if (jobError) {
      console.error(`[scheduler] falha ao enfileirar busca ${search.id}:`, jobError.message);
      continue;
    }

    await supabase
      .from("searches")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", search.id);

    console.log(`[scheduler] busca ${search.id} disparada automaticamente`);
  }
}

export function startScheduler() {
  console.log(`[scheduler] iniciado — checagem a cada ${CHECK_INTERVAL_MS / 60_000}min`);

  async function loop() {
    try {
      await runDueSearches();
    } catch (err) {
      console.error("[scheduler] erro inesperado:", err);
    } finally {
      setTimeout(loop, CHECK_INTERVAL_MS);
    }
  }

  loop();
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FALLBACK_SECONDS_PER_ITEM = 3;
const FALLBACK_BASE_SECONDS = 20;
const SAMPLE_SIZE = 15;

interface JobRow {
  started_at: string;
  finished_at: string;
  payload: { results_limit?: number };
}

export async function GET() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("jobs")
    .select("started_at, finished_at, payload")
    .eq("type", "discover")
    .eq("status", "done")
    .not("started_at", "is", null)
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(SAMPLE_SIZE);

  const rows = (data ?? []) as JobRow[];

  const points = rows
    .map((row) => {
      const durationSec =
        (new Date(row.finished_at).getTime() - new Date(row.started_at).getTime()) / 1000;
      const items = row.payload.results_limit ?? 0;
      return { durationSec, items };
    })
    .filter((p) => p.durationSec > 0 && p.items > 0);

  if (points.length < 2) {
    return NextResponse.json({
      secondsPerItem: FALLBACK_SECONDS_PER_ITEM,
      baseSeconds: FALLBACK_BASE_SECONDS,
      sampleSize: points.length,
    });
  }

  // regressão linear simples: duration ≈ base + secondsPerItem * items
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.items, 0);
  const sumY = points.reduce((s, p) => s + p.durationSec, 0);
  const sumXY = points.reduce((s, p) => s + p.items * p.durationSec, 0);
  const sumXX = points.reduce((s, p) => s + p.items * p.items, 0);

  const denominator = n * sumXX - sumX * sumX;
  let secondsPerItem = FALLBACK_SECONDS_PER_ITEM;
  let baseSeconds = FALLBACK_BASE_SECONDS;

  if (denominator !== 0) {
    secondsPerItem = (n * sumXY - sumX * sumY) / denominator;
    baseSeconds = (sumY - secondsPerItem * sumX) / n;
  }

  // regressão pode dar coeficientes estranhos com poucos pontos — nunca deixar negativo
  secondsPerItem = Math.max(0.5, secondsPerItem);
  baseSeconds = Math.max(5, baseSeconds);

  return NextResponse.json({ secondsPerItem, baseSeconds, sampleSize: n });
}

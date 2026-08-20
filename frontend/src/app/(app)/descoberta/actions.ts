"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const searchSchema = z.object({
  name: z.string().trim().min(1, "Nome da busca é obrigatório").max(120),
  hashtags: z.array(z.string().trim().min(1).max(60)).max(30),
  accounts: z.array(z.string().trim().min(1).max(60)).max(30),
  min_engagement: z.number().int().min(0).max(10_000_000),
  results_limit: z.number().int().min(1, "Mínimo de 1 post").max(200, "Máximo de 200 posts"),
  auto_run_interval_hours: z.number().int().min(1).max(720).nullable(),
});

function parseAutoRunInterval(raw: string | null): number | null {
  if (!raw || raw === "manual") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function createSearch(formData: FormData) {
  const parsed = searchSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    hashtags: splitList(String(formData.get("hashtags") ?? "")),
    accounts: splitList(String(formData.get("accounts") ?? "")),
    min_engagement: Number(formData.get("min_engagement") ?? 0),
    results_limit: Number(formData.get("results_limit") ?? 20),
    auto_run_interval_hours: parseAutoRunInterval(
      formData.get("auto_run_interval_hours") as string | null,
    ),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  if (parsed.data.hashtags.length === 0 && parsed.data.accounts.length === 0) {
    throw new Error("Informe ao menos uma hashtag ou conta para buscar");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: search, error } = await supabase
    .from("searches")
    .insert({
      ...parsed.data,
      created_by: user?.id ?? null,
    })
    .select("id, hashtags, accounts, min_engagement, results_limit")
    .single();

  if (error) throw new Error(error.message);

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
  if (jobError) throw new Error(jobError.message);

  revalidatePath("/descoberta");
  revalidatePath("/conteudo");
}

const idSchema = z.string().uuid();

export async function toggleSearchActive(id: string, active: boolean) {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) throw new Error("id inválido");

  const supabase = await createClient();
  const { error } = await supabase
    .from("searches")
    .update({ active })
    .eq("id", parsedId.data);

  if (error) throw new Error(error.message);

  revalidatePath("/descoberta");
}

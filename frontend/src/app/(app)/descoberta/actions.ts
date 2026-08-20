"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createSearch(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const hashtags = splitList(String(formData.get("hashtags") ?? ""));
  const accounts = splitList(String(formData.get("accounts") ?? ""));
  const minEngagement = Number(formData.get("min_engagement") ?? 0);

  if (!name) throw new Error("Nome da busca é obrigatório");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("searches").insert({
    name,
    hashtags,
    accounts,
    min_engagement: Number.isFinite(minEngagement) ? minEngagement : 0,
    created_by: user?.id ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/descoberta");
}

export async function toggleSearchActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("searches")
    .update({ active })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/descoberta");
}

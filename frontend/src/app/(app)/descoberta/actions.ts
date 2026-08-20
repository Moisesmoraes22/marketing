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
});

export async function createSearch(formData: FormData) {
  const parsed = searchSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    hashtags: splitList(String(formData.get("hashtags") ?? "")),
    accounts: splitList(String(formData.get("accounts") ?? "")),
    min_engagement: Number(formData.get("min_engagement") ?? 0),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("searches").insert({
    ...parsed.data,
    created_by: user?.id ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/descoberta");
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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const idsSchema = z.array(z.string().uuid()).min(1).max(200);
const idSchema = z.string().uuid();

export async function toggleFavorite(id: string, favorite: boolean) {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) throw new Error("id inválido");

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_items")
    .update({ is_favorite: favorite })
    .eq("id", parsedId.data);

  if (error) throw new Error(error.message);

  revalidatePath("/descoberta");
}

export async function deleteContentItems(ids: string[]) {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) throw new Error("ids inválidos");

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_items")
    .delete()
    .in("id", parsed.data);

  if (error) throw new Error(error.message);

  revalidatePath("/descoberta");
}

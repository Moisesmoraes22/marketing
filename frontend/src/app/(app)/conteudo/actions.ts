"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const idsSchema = z.array(z.string().uuid()).min(1).max(200);

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

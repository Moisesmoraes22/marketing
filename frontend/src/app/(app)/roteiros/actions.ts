"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ScriptFormat } from "@/lib/types";

export async function requestScript(contentItemId: string, format: ScriptFormat) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("voice_profile")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) {
    throw new Error("Configure o perfil de voz em /voz antes de gerar roteiros.");
  }

  const { error: jobError } = await supabase.from("jobs").insert({
    type: "generate_script",
    payload: {
      content_item_id: contentItemId,
      format,
      voice_profile_id: profile.id,
    },
    status: "pending",
  });
  if (jobError) throw new Error(jobError.message);

  revalidatePath("/roteiros");
}

export async function approveScript(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scripts")
    .update({ approved: true })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/roteiros");
}

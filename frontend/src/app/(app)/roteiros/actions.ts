"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ScriptFormat, ScriptObjective, ScriptStyle } from "@/lib/types";

const idSchema = z.string().uuid();
const formatSchema = z.enum([
  "reel_30s",
  "reel_60s",
  "reel_90s",
  "carousel",
  "static_post",
]);
const objectiveSchema = z.enum([
  "vender",
  "engajar",
  "educar",
  "atrair_seguidores",
  "fortalecer_marca",
]);
const styleSchema = z.enum(["viral", "educativo", "comercial", "storytelling", "humor"]);

export async function requestScript(
  contentItemId: string,
  format: ScriptFormat,
  objective: ScriptObjective,
  style: ScriptStyle,
) {
  const parsedId = idSchema.safeParse(contentItemId);
  const parsedFormat = formatSchema.safeParse(format);
  const parsedObjective = objectiveSchema.safeParse(objective);
  const parsedStyle = styleSchema.safeParse(style);
  if (
    !parsedId.success ||
    !parsedFormat.success ||
    !parsedObjective.success ||
    !parsedStyle.success
  ) {
    throw new Error("dados inválidos");
  }

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
      objective,
      style,
    },
    status: "pending",
  });
  if (jobError) throw new Error(jobError.message);

  revalidatePath("/roteiros");
}

export async function approveScript(id: string) {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) throw new Error("id inválido");

  const supabase = await createClient();
  const { error } = await supabase
    .from("scripts")
    .update({ approved: true })
    .eq("id", parsedId.data);
  if (error) throw new Error(error.message);

  revalidatePath("/roteiros");
}

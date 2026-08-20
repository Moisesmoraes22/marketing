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

const voiceProfileSchema = z.object({
  target_audience: z.string().trim().max(500).nullable(),
  tone_adjectives: z.array(z.string().trim().min(1).max(40)).max(20),
  words_we_use: z.array(z.string().trim().min(1).max(60)).max(30),
  words_we_avoid: z.array(z.string().trim().min(1).max(60)).max(30),
  example_approved_post: z.string().trim().max(5000).nullable(),
});

const idSchema = z.string().uuid();

export async function saveVoiceProfile(formData: FormData) {
  const supabase = await createClient();

  const parsed = voiceProfileSchema.safeParse({
    target_audience: String(formData.get("target_audience") ?? "").trim() || null,
    tone_adjectives: splitList(String(formData.get("tone_adjectives") ?? "")),
    words_we_use: splitList(String(formData.get("words_we_use") ?? "")),
    words_we_avoid: splitList(String(formData.get("words_we_avoid") ?? "")),
    example_approved_post:
      String(formData.get("example_approved_post") ?? "").trim() || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const payload = { ...parsed.data, updated_at: new Date().toISOString() };

  const { data: existing } = await supabase
    .from("voice_profile")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("voice_profile").update(payload).eq("id", existing.id)
    : await supabase.from("voice_profile").insert(payload);

  if (error) throw new Error(error.message);

  revalidatePath("/roteiros");
}

export async function generateCalibrationDraft(voiceProfileId: string) {
  const parsedId = idSchema.safeParse(voiceProfileId);
  if (!parsedId.success) throw new Error("voiceProfileId inválido");

  const supabase = await createClient();

  const { data: candidate, error: candidateError } = await supabase
    .from("content_items")
    .select("id")
    .eq("status", "done")
    .order("collected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (candidateError) throw new Error(candidateError.message);
  if (!candidate) {
    throw new Error(
      "Nenhum conteúdo analisado ainda — rode uma busca e espere o pipeline concluir antes de calibrar.",
    );
  }

  const { error: jobError } = await supabase.from("jobs").insert({
    type: "generate_script",
    payload: {
      content_item_id: candidate.id,
      format: "static_post",
      voice_profile_id: voiceProfileId,
    },
    status: "pending",
  });

  if (jobError) throw new Error(jobError.message);

  revalidatePath("/roteiros");
}

export async function submitCalibrationFeedback(
  scriptId: string,
  voiceProfileId: string,
  approved: boolean,
  note: string,
) {
  if (!idSchema.safeParse(scriptId).success) throw new Error("scriptId inválido");
  if (!idSchema.safeParse(voiceProfileId).success) {
    throw new Error("voiceProfileId inválido");
  }

  const supabase = await createClient();

  const { error: scriptError } = await supabase
    .from("scripts")
    .update({ approved })
    .eq("id", scriptId);
  if (scriptError) throw new Error(scriptError.message);

  const feedback = approved ? "aprovei" : `ajustar: ${note}`;
  const { data: profile, error: profileError } = await supabase
    .from("voice_profile")
    .select("calibration_notes")
    .eq("id", voiceProfileId)
    .single();
  if (profileError) throw new Error(profileError.message);

  const timestamp = new Date().toLocaleString("pt-BR");
  const nextNotes = [profile.calibration_notes, `[${timestamp}] ${feedback}`]
    .filter(Boolean)
    .join("\n");

  const { error: updateError } = await supabase
    .from("voice_profile")
    .update({ calibration_notes: nextNotes })
    .eq("id", voiceProfileId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/roteiros");
}

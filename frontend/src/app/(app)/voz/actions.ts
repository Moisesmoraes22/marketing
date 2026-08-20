"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveVoiceProfile(formData: FormData) {
  const supabase = await createClient();

  const payload = {
    target_audience: String(formData.get("target_audience") ?? "").trim() || null,
    tone_adjectives: splitList(String(formData.get("tone_adjectives") ?? "")),
    words_we_use: splitList(String(formData.get("words_we_use") ?? "")),
    words_we_avoid: splitList(String(formData.get("words_we_avoid") ?? "")),
    example_approved_post:
      String(formData.get("example_approved_post") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

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

  revalidatePath("/voz");
}

export async function generateCalibrationDraft(voiceProfileId: string) {
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

  revalidatePath("/voz");
}

export async function submitCalibrationFeedback(
  scriptId: string,
  voiceProfileId: string,
  approved: boolean,
  note: string,
) {
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

  revalidatePath("/voz");
}

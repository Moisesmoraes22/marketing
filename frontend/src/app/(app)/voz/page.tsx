import { createClient } from "@/lib/supabase/server";
import type { VoiceProfile } from "@/lib/types";
import { VoiceWizard } from "./voice-wizard";
import { CalibrationPanel } from "./calibration-panel";

export default async function VozPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("voice_profile")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const profile = data as VoiceProfile | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Voz da Marca</h1>
        <p className="text-sm text-muted-foreground">
          Construa e refine o perfil de voz usado pelo gerador de roteiros.
        </p>
      </div>
      <VoiceWizard profile={profile} />
      {profile && <CalibrationPanel profile={profile} />}
    </div>
  );
}

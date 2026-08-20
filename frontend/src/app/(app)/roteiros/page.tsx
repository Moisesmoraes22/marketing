import { createClient } from "@/lib/supabase/server";
import type { ScriptRow, VoiceProfile } from "@/lib/types";
import { RoteirosTabs } from "./roteiros-tabs";

export default async function RoteirosPage() {
  const supabase = await createClient();
  const [{ data: scriptsData }, { data: voiceData }] = await Promise.all([
    supabase.from("scripts").select("*").order("created_at", { ascending: false }),
    supabase
      .from("voice_profile")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const scripts = (scriptsData ?? []) as ScriptRow[];
  const voiceProfile = voiceData as VoiceProfile | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Roteiros</h1>
        <p className="text-sm text-muted-foreground">
          Roteiros gerados e o perfil de voz usado para criá-los.
        </p>
      </div>
      <RoteirosTabs scripts={scripts} voiceProfile={voiceProfile} />
    </div>
  );
}

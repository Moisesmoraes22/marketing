"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsIndicator,
  TabsContent,
} from "@/components/ui/tabs";
import type { ScriptRow, VoiceProfile } from "@/lib/types";
import { ScriptLibrary } from "./script-library";
import { VoiceWizard } from "../voz/voice-wizard";
import { CalibrationPanel } from "../voz/calibration-panel";

export function RoteirosTabs({
  scripts,
  voiceProfile,
}: {
  scripts: ScriptRow[];
  voiceProfile: VoiceProfile | null;
}) {
  return (
    <Tabs defaultValue="roteiros">
      <TabsList>
        <TabsIndicator />
        <TabsTrigger value="roteiros">Roteiros</TabsTrigger>
        <TabsTrigger value="voz">Voz da Marca</TabsTrigger>
      </TabsList>

      <TabsContent value="roteiros" className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Biblioteca de roteiros gerados a partir de conteúdo analisado.
          </p>
          <Button nativeButton={false} render={<Link href="/roteiros/novo" />}>
            Novo roteiro
          </Button>
        </div>
        <ScriptLibrary initialScripts={scripts} />
      </TabsContent>

      <TabsContent value="voz" className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Construa e refine o perfil de voz usado pelo gerador de roteiros.
        </p>
        <VoiceWizard profile={voiceProfile} />
        {voiceProfile && <CalibrationPanel profile={voiceProfile} />}
      </TabsContent>
    </Tabs>
  );
}

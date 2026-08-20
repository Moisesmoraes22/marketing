import { createClient } from "@/lib/supabase/server";
import { TeamSection } from "./team-section";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground">
          Usuários do time, integrações e API keys.
        </p>
      </div>

      <TeamSection members={data ?? []} />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Integrações e API keys</h2>
        <p className="text-sm text-muted-foreground">
          Apify, Groq e Supabase são configurados via variáveis de ambiente do
          worker e do frontend, não por aqui — veja o{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">README.md</code>{" "}
          do projeto.
        </p>
      </section>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  member: "Membro",
};

function initialsFrom(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function TeamSection({ members }: { members: Profile[] }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Time</h2>
        <p className="text-sm text-muted-foreground">
          Quem tem acesso a este sistema.
        </p>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="group relative overflow-hidden rounded-xl border bg-card p-6 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom scale-y-0 rounded-t-full bg-gradient-to-t from-primary/10 to-transparent transition-transform duration-500 ease-out group-hover:scale-y-100"
                aria-hidden
              />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-transparent bg-primary/10 text-lg font-semibold text-primary transition-colors duration-300 group-hover:border-primary">
                  {initialsFrom(member.name, member.email)}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {member.name ?? member.email}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                  {ROLE_LABEL[member.role] ?? member.role}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

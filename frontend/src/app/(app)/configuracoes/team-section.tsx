"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { inviteMember } from "./actions";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  member: "Membro",
};

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

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

export function TeamSection({
  members,
  isAdmin,
}: {
  members: Profile[];
  isAdmin: boolean;
}) {
  const [selected, setSelected] = useState<Profile | null>(null);
  const [inviting, setInviting] = useState(false);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Time</h2>
        <p className="text-sm text-muted-foreground">
          Quem tem acesso a este sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => setSelected(member)}
            className="group relative overflow-hidden rounded-xl border bg-card p-6 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom scale-y-0 rounded-t-full bg-gradient-to-t from-primary/10 to-transparent transition-transform duration-500 ease-out group-hover:scale-y-100"
              aria-hidden
            />
            <InstagramIcon
              className="absolute right-4 top-4 h-5 w-5 text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100"
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
          </button>
        ))}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setInviting(true)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">Adicionar pessoa</span>
          </button>
        )}
      </div>

      {/* painel de detalhes */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full p-4 sm:max-w-sm">
          {selected && (
            <>
              <SheetHeader className="p-0">
                <SheetTitle>{selected.name ?? selected.email}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                    {initialsFrom(selected.name, selected.email)}
                  </div>
                  <div>
                    <p className="font-medium">{selected.email}</p>
                    <Badge
                      variant={selected.role === "admin" ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {ROLE_LABEL[selected.role] ?? selected.role}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Membro desde{" "}
                  {new Date(selected.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* convidar pessoa */}
      {isAdmin && (
        <Sheet open={inviting} onOpenChange={setInviting}>
          <SheetContent side="right" className="w-full p-4 sm:max-w-sm">
            <SheetHeader className="p-0">
              <SheetTitle>Adicionar pessoa</SheetTitle>
            </SheetHeader>
            <InviteForm onDone={() => setInviting(false)} />
          </SheetContent>
        </Sheet>
      )}
    </section>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await inviteMember(formData);
        toast.success("Convite enviado por e-mail");
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao convidar");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required placeholder="pessoa@grupoomega.com.br" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Papel</Label>
        <select
          id="role"
          name="role"
          defaultValue="member"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        >
          <option value="member">Membro</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar convite"}
      </Button>
    </form>
  );
}

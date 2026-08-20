"use client";

import { LogOut, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { createClient } from "@/lib/supabase/client";

export function Header({ userEmail }: { userEmail: string | null }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <header className="flex h-14 items-center border-b bg-background px-4 md:hidden">
      <Sheet>
        <SheetTrigger render={<Button variant="ghost" size="icon" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="flex w-64 flex-col p-4">
          <SheetTitle className="mb-4 text-sm font-semibold">
            Sistema de Conteúdo
          </SheetTitle>
          <SidebarNav />

          <div className="mt-auto flex flex-col gap-1 border-t pt-3">
            <Link
              href="/configuracoes"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
            <div className="flex items-center gap-2 px-3 py-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-sm text-muted-foreground">
                {userEmail}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleLogout}
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

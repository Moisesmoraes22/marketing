"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FileStack,
  ScrollText,
  Mic,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Sidebar, DesktopSidebar, SidebarLink } from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/descoberta", label: "Descoberta", icon: Search },
  { href: "/conteudo", label: "Conteúdo", icon: FileStack },
  { href: "/roteiros", label: "Roteiros", icon: ScrollText },
  { href: "/voz", label: "Voz da Marca", icon: Mic },
] as const;

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1">
      <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
      {!collapsed && (
        <span className="whitespace-pre text-sm font-semibold text-sidebar-foreground">
          Sistema de Conteúdo
        </span>
      )}
    </Link>
  );
}

export function AppSidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <DesktopSidebar className="justify-between gap-6">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <Logo collapsed={!open} />
          <div className="mt-6 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <SidebarLink
                  key={item.href}
                  link={{
                    label: item.label,
                    href: item.href,
                    icon: (
                      <item.icon
                        className={cn(
                          "h-4.5 w-4.5 shrink-0",
                          active ? "text-primary" : "text-sidebar-foreground/70",
                        )}
                      />
                    ),
                  }}
                  className={cn(active && "bg-sidebar-accent")}
                />
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1 border-t border-sidebar-border pt-3">
          <SidebarLink
            link={{
              label: "Configurações",
              href: "/configuracoes",
              icon: (
                <Settings
                  className={cn(
                    "h-4.5 w-4.5 shrink-0",
                    pathname.startsWith("/configuracoes")
                      ? "text-primary"
                      : "text-sidebar-foreground/70",
                  )}
                />
              ),
            }}
            className={cn(pathname.startsWith("/configuracoes") && "bg-sidebar-accent")}
          />
          <SidebarLink
            link={{
              label: userEmail ?? "Usuário",
              href: "/configuracoes",
              icon: (
                <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary text-[0.6rem] font-medium text-primary-foreground">
                  {(userEmail ?? "??").slice(0, 2).toUpperCase()}
                </span>
              ),
            }}
          />
          <button
            type="button"
            onClick={handleLogout}
            className="group/sidebar flex items-center justify-start gap-2 rounded-md px-2 py-2 text-left"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0 text-sidebar-foreground/70" />
            {open && (
              <span className="whitespace-pre text-sm text-sidebar-foreground transition duration-150 group-hover/sidebar:translate-x-1">
                Sair
              </span>
            )}
          </button>
        </div>
      </DesktopSidebar>
    </Sidebar>
  );
}

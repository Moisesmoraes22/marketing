"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Sidebar,
  DesktopSidebar,
  SidebarLink,
  SidebarPinToggle,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/descoberta", label: "Descoberta", icon: Search },
  { href: "/roteiros", label: "Roteiros", icon: ScrollText },
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
  const reducedMotion = useReducedMotion();
  const pillTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 500, damping: 35 };

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
          <div className="flex items-center justify-between gap-2">
            <Logo collapsed={!open} />
            <SidebarPinToggle className="shrink-0" />
          </div>
          <div className="mt-6 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <div key={item.href} className="relative">
                  {active && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-md bg-sidebar-accent"
                      transition={pillTransition}
                    />
                  )}
                  <SidebarLink
                    link={{
                      label: item.label,
                      href: item.href,
                      icon: (
                        <item.icon
                          className={cn(
                            "h-4.5 w-4.5 shrink-0 transition-colors",
                            active ? "text-primary" : "text-sidebar-foreground/70",
                          )}
                        />
                      ),
                    }}
                    className="relative z-10"
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1 border-t border-sidebar-border pt-3">
          <div className="relative">
            {pathname.startsWith("/configuracoes") && (
              <motion.div
                layoutId="sidebar-active-pill"
                className="absolute inset-0 rounded-md bg-sidebar-accent"
                transition={pillTransition}
              />
            )}
            <SidebarLink
              link={{
                label: "Configurações",
                href: "/configuracoes",
                icon: (
                  <Settings
                    className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-colors",
                      pathname.startsWith("/configuracoes")
                        ? "text-primary"
                        : "text-sidebar-foreground/70",
                    )}
                  />
                ),
              }}
              className="relative z-10"
            />
          </div>
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

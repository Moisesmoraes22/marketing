import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar p-4 md:block">
        <div className="mb-6 flex items-center gap-2 px-3">
          <span className="size-2.5 rounded-full bg-primary" aria-hidden />
          <p className="text-sm font-semibold text-sidebar-foreground">
            Sistema de Conteúdo
          </p>
        </div>
        <SidebarNav />
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <Header userEmail={user.email ?? null} />
        <main className="flex-1 bg-muted/30 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

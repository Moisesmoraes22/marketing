import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service_role key — ignora RLS. Só pode ser usado em
 * Server Actions/Route Handlers, nunca importado de um Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

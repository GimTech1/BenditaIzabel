import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service role — só no servidor, nunca no browser.
 * Use para operações que precisam ignorar RLS (ex.: pedido anônimo na mesa).
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

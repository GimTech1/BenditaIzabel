import { createClient } from "@supabase/supabase-js";

/** Cliente só com anon key — sem cookies; ideal para pedidos da mesa (RLS como visitante). */
export function createAnonOnlyClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

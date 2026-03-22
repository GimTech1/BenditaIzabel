-- ══════════════════════════════════════════════════════════
-- Pedidos na mesa: garantir que anon pode INSERT em menu_orders
-- (e evitar falha se GRANT estiver faltando no projeto)
-- ══════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON TABLE public.menu_orders TO anon;

DROP POLICY IF EXISTS "menu_orders_anon_insert" ON public.menu_orders;

CREATE POLICY "menu_orders_anon_insert"
  ON public.menu_orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

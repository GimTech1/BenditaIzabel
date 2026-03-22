-- ══════════════════════════════════════════════════════════
-- Cardápio digital + pedidos por mesa (tablet cliente / garçom)
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_label TEXT NOT NULL,
  customer_note TEXT,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_preparo', 'entregue', 'cancelado')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_orders_status ON public.menu_orders(status);
CREATE INDEX IF NOT EXISTS idx_menu_orders_created ON public.menu_orders(created_at DESC);

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER menu_orders_updated_at
  BEFORE UPDATE ON public.menu_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_orders ENABLE ROW LEVEL SECURITY;

-- Cardápio: visitante (anon) só vê itens disponíveis; equipe vê tudo
CREATE POLICY "menu_anon_select_available"
  ON public.menu_items FOR SELECT TO anon
  USING (is_available = true);

CREATE POLICY "menu_auth_select_all"
  ON public.menu_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "menu_admin_manage"
  ON public.menu_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente')
    )
  );

-- Pedidos: cliente anônimo só cria; equipe lê e atualiza
CREATE POLICY "menu_orders_anon_insert"
  ON public.menu_orders FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "menu_orders_auth_select"
  ON public.menu_orders FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "menu_orders_auth_update"
  ON public.menu_orders FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Realtime para avisar garçom (respeita RLS: só autenticados recebem eventos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'menu_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_orders;
  END IF;
END $$;

-- Itens de exemplo só se o cardápio estiver vazio
INSERT INTO public.menu_items (name, description, category, price, sort_order)
SELECT v.name, v.description, v.category, v.price, v.sort_order
FROM (
  VALUES
    ('Chope Pilsen 300ml', 'Caneca gelada', 'Bebidas', 12.00::numeric, 10),
    ('Caipirinha', 'Limão, cachaça e açúcar', 'Bebidas', 18.00::numeric, 20),
    ('Porção de batatas', 'Com cheddar e bacon', 'Petiscos', 32.00::numeric, 30),
    ('Hambúrguer Bendita', 'Pão, blend 180g, queijo, molho da casa', 'Pratos', 38.00::numeric, 40)
) AS v(name, description, category, price, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items LIMIT 1);

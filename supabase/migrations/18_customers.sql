-- ══════════════════════════════════════════════════════════
-- Clientes: cadastro via IZA (tablet self-service)
-- Rode no SQL Editor do Supabase em produção.
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.customers (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  birth_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Anônimo pode cadastrar (tablet sem login)
CREATE POLICY "Anon insere clientes" ON public.customers
  FOR INSERT TO anon
  WITH CHECK (true);

-- Equipe autenticada pode ver e excluir
CREATE POLICY "Autenticados gerenciam clientes" ON public.customers
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grants necessários para anon insert
GRANT INSERT ON public.customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;

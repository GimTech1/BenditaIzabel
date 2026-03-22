-- ══════════════════════════════════════════════════════════
-- Lista de compras (estoque): linhas até "registrar compra"
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.purchase_list_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT purchase_list_lines_stock_unique UNIQUE (stock_item_id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_list_stock ON public.purchase_list_lines(stock_item_id);

ALTER TABLE public.purchase_list_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_list_select" ON public.purchase_list_lines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "purchase_list_insert" ON public.purchase_list_lines
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "purchase_list_update" ON public.purchase_list_lines
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "purchase_list_delete" ON public.purchase_list_lines
  FOR DELETE TO authenticated USING (true);

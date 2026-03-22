-- ══════════════════════════════════════════════════════════
-- Lista de compras: permitir itens NOVOS (sem stock_item_id)
-- ao registrar compra → INSERT em stock_items com current_qty = quantity
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.purchase_list_lines
  DROP CONSTRAINT IF EXISTS purchase_list_lines_stock_unique;

ALTER TABLE public.purchase_list_lines
  ALTER COLUMN stock_item_id DROP NOT NULL;

-- Campos espelhando cadastro de stock_items (preenchidos só para linha "nova")
ALTER TABLE public.purchase_list_lines
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS min_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC(10,2);

ALTER TABLE public.purchase_list_lines
  DROP CONSTRAINT IF EXISTS purchase_list_lines_kind_check;

ALTER TABLE public.purchase_list_lines
  ADD CONSTRAINT purchase_list_lines_kind_check CHECK (
    stock_item_id IS NOT NULL
    OR (
      name IS NOT NULL
      AND btrim(name) <> ''
      AND category IS NOT NULL
      AND btrim(category) <> ''
      AND unit IS NOT NULL
      AND btrim(unit) <> ''
    )
  );

-- No máximo uma linha por item já cadastrado no estoque
CREATE UNIQUE INDEX IF NOT EXISTS purchase_list_lines_one_per_stock_item
  ON public.purchase_list_lines (stock_item_id)
  WHERE stock_item_id IS NOT NULL;

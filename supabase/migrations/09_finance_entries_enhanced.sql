-- ══════════════════════════════════════════════════════════
-- Financeiro: forma de pagamento, status, fornecedor, notas, referência
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'nao_informado',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS reference_code TEXT;

ALTER TABLE public.finance_entries DROP CONSTRAINT IF EXISTS finance_entries_payment_method_check;
ALTER TABLE public.finance_entries ADD CONSTRAINT finance_entries_payment_method_check
  CHECK (payment_method IN (
    'dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia',
    'boleto', 'nao_informado', 'outros'
  ));

ALTER TABLE public.finance_entries DROP CONSTRAINT IF EXISTS finance_entries_status_check;
ALTER TABLE public.finance_entries ADD CONSTRAINT finance_entries_status_check
  CHECK (status IN ('confirmed', 'pending', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_finance_entries_status ON public.finance_entries(status);
CREATE INDEX IF NOT EXISTS idx_finance_entries_payment ON public.finance_entries(payment_method);
CREATE INDEX IF NOT EXISTS idx_finance_entries_supplier ON public.finance_entries(supplier_id);

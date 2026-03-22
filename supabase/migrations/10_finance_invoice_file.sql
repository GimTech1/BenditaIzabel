-- ══════════════════════════════════════════════════════════
-- Financeiro: URL do arquivo da nota fiscal (PDF/XML) no Storage
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS invoice_file_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bendita-finance-nf',
  'bendita-finance-nf',
  true,
  15728640,
  ARRAY[
    'application/pdf',
    'application/xml',
    'text/xml'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Ler NF financeiro" ON storage.objects;
DROP POLICY IF EXISTS "Inserir NF financeiro" ON storage.objects;
DROP POLICY IF EXISTS "Excluir NF financeiro" ON storage.objects;

CREATE POLICY "Ler NF financeiro" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'bendita-finance-nf');

CREATE POLICY "Inserir NF financeiro" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bendita-finance-nf');

CREATE POLICY "Excluir NF financeiro" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'bendita-finance-nf');

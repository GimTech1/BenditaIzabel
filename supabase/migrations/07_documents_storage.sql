-- ══════════════════════════════════════════════════════════
-- Storage: ficheiros do módulo Documentos (upload no app)
-- Rode no SQL Editor do Supabase (produção e novos projetos).
-- ══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bendita-documents',
  'bendita-documents',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Ler documentos bendita" ON storage.objects;
DROP POLICY IF EXISTS "Inserir documentos bendita" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar documentos bendita" ON storage.objects;
DROP POLICY IF EXISTS "Excluir documentos bendita" ON storage.objects;

CREATE POLICY "Ler documentos bendita" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'bendita-documents');

CREATE POLICY "Inserir documentos bendita" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bendita-documents');

CREATE POLICY "Atualizar documentos bendita" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'bendita-documents')
  WITH CHECK (bucket_id = 'bendita-documents');

CREATE POLICY "Excluir documentos bendita" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'bendita-documents');

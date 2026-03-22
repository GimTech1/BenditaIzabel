-- ══════════════════════════════════════════════════════════
-- Storage: imagens dos itens do cardápio (público para o tablet /mesa)
-- Upload/delete: admin ou gerente (igual CRUD de menu_items).
-- ══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bendita-menu-items',
  'bendita-menu-items',
  true,
  5242880,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "menu_items_img_select" ON storage.objects;
DROP POLICY IF EXISTS "menu_items_img_insert" ON storage.objects;
DROP POLICY IF EXISTS "menu_items_img_delete" ON storage.objects;

-- Visitante na /mesa precisa carregar a imagem (URL pública + leitura)
CREATE POLICY "menu_items_img_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'bendita-menu-items');

CREATE POLICY "menu_items_img_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bendita-menu-items'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "menu_items_img_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'bendita-menu-items'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente')
    )
  );

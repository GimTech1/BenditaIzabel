-- ══════════════════════════════════════════════════════════
-- Cardápio: admin, gerente e funcionário (employee) podem CRUD itens + fotos
-- ══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "menu_admin_manage" ON public.menu_items;

CREATE POLICY "menu_staff_manage"
  ON public.menu_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente', 'employee')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente', 'employee')
    )
  );

DROP POLICY IF EXISTS "menu_items_img_insert" ON storage.objects;
DROP POLICY IF EXISTS "menu_items_img_delete" ON storage.objects;

CREATE POLICY "menu_items_img_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bendita-menu-items'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente', 'employee')
    )
  );

CREATE POLICY "menu_items_img_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'bendita-menu-items'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente', 'employee')
    )
  );

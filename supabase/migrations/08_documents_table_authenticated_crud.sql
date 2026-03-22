-- ══════════════════════════════════════════════════════════
-- Documentos (tabela public.documents): CRUD para toda a equipa autenticada
-- (alinha com Contatos — antes só admin/gerente podiam inserir)
-- ══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admin gerencia documentos" ON public.documents;

CREATE POLICY "Autenticados gerenciam documentos" ON public.documents
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════
-- Contatos: permitir CRUD a todos os autenticados
-- (antes só admin/gerente — employees viam o erro RLS ao criar)
-- Rode no SQL Editor do Supabase em produção.
-- ══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admin gerencia contatos" ON public.contacts;

-- Directório partilhado: equipa autenticada cria/edita/apaga contatos
CREATE POLICY "Autenticados gerenciam contatos" ON public.contacts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

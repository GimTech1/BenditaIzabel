-- ══════════════════════════════════════════════════════════
-- Corrige: infinite recursion detected in policy for relation "profiles" (42P17)
-- Causa: políticas que fazem EXISTS/SELECT em `profiles` sobre a própria tabela `profiles`.
-- Solução: funções STABLE + SECURITY DEFINER (leem `profiles` sem reaplicar RLS).
-- Rode este arquivo no SQL Editor do Supabase se o projeto já existia antes desta correção.
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_gerente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_department_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_gerente() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_department_id() TO authenticated;

-- ── departments ──
DROP POLICY IF EXISTS "Admin gerencia departamentos" ON public.departments;
CREATE POLICY "Admin gerencia departamentos" ON public.departments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── profiles: remover FOR ALL recursivo; admin só por função ──
DROP POLICY IF EXISTS "Admin gerencia profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin insere profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin atualiza qualquer perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin deleta profiles" ON public.profiles;

CREATE POLICY "Admin insere profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin atualiza qualquer perfil" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin deleta profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── Trello: recriar políticas sem subconsulta recursiva em profiles ──
DROP POLICY IF EXISTS "Ver boards por visibilidade" ON public.trello_boards;
DROP POLICY IF EXISTS "Admin e gerente criam boards" ON public.trello_boards;
DROP POLICY IF EXISTS "Admin e gerente editam boards" ON public.trello_boards;
DROP POLICY IF EXISTS "Admin e gerente excluem boards" ON public.trello_boards;

CREATE POLICY "Ver boards por visibilidade" ON public.trello_boards
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR visibility = 'all'
    OR (visibility = 'department' AND department_id = public.current_profile_department_id())
    OR (visibility = 'specific' AND visible_to_user_id = auth.uid())
    OR public.is_admin_or_gerente()
  );

CREATE POLICY "Admin e gerente criam boards" ON public.trello_boards
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente());

CREATE POLICY "Admin e gerente editam boards" ON public.trello_boards
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente())
  WITH CHECK (true);

CREATE POLICY "Admin e gerente excluem boards" ON public.trello_boards
  FOR DELETE TO authenticated
  USING (public.is_admin_or_gerente());

DROP POLICY IF EXISTS "Ver listas do board" ON public.trello_lists;
DROP POLICY IF EXISTS "Admin e gerente gerenciam listas" ON public.trello_lists;

CREATE POLICY "Ver listas do board" ON public.trello_lists
  FOR SELECT TO authenticated
  USING (board_id IN (
    SELECT id FROM public.trello_boards WHERE
      created_by = auth.uid() OR visibility = 'all'
      OR (visibility = 'department' AND department_id = public.current_profile_department_id())
      OR (visibility = 'specific' AND visible_to_user_id = auth.uid())
      OR public.is_admin_or_gerente()
  ));

CREATE POLICY "Admin e gerente gerenciam listas" ON public.trello_lists
  FOR ALL TO authenticated
  USING (public.is_admin_or_gerente())
  WITH CHECK (true);

DROP POLICY IF EXISTS "Ver cartoes" ON public.trello_cards;
DROP POLICY IF EXISTS "Autenticados inserem cartoes" ON public.trello_cards;
DROP POLICY IF EXISTS "Autenticados atualizam cartoes" ON public.trello_cards;
DROP POLICY IF EXISTS "Autenticados excluem cartoes" ON public.trello_cards;

CREATE POLICY "Ver cartoes" ON public.trello_cards
  FOR SELECT TO authenticated
  USING (list_id IN (
    SELECT tl.id FROM public.trello_lists tl
    JOIN public.trello_boards tb ON tb.id = tl.board_id
    WHERE tb.created_by = auth.uid() OR tb.visibility = 'all'
      OR (tb.visibility = 'department' AND tb.department_id = public.current_profile_department_id())
      OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
      OR public.is_admin_or_gerente()
  ));

CREATE POLICY "Autenticados inserem cartoes" ON public.trello_cards
  FOR INSERT TO authenticated
  WITH CHECK (list_id IN (
    SELECT tl.id FROM public.trello_lists tl
    JOIN public.trello_boards tb ON tb.id = tl.board_id
    WHERE tb.created_by = auth.uid() OR tb.visibility = 'all'
      OR (tb.visibility = 'department' AND tb.department_id = public.current_profile_department_id())
      OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
      OR public.is_admin_or_gerente()
  ));

CREATE POLICY "Autenticados atualizam cartoes" ON public.trello_cards
  FOR UPDATE TO authenticated
  USING (list_id IN (
    SELECT tl.id FROM public.trello_lists tl
    JOIN public.trello_boards tb ON tb.id = tl.board_id
    WHERE tb.created_by = auth.uid() OR tb.visibility = 'all'
      OR (tb.visibility = 'department' AND tb.department_id = public.current_profile_department_id())
      OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
      OR public.is_admin_or_gerente()
  ))
  WITH CHECK (true);

CREATE POLICY "Autenticados excluem cartoes" ON public.trello_cards
  FOR DELETE TO authenticated
  USING (list_id IN (
    SELECT tl.id FROM public.trello_lists tl
    JOIN public.trello_boards tb ON tb.id = tl.board_id
    WHERE tb.created_by = auth.uid() OR tb.visibility = 'all'
      OR (tb.visibility = 'department' AND tb.department_id = public.current_profile_department_id())
      OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
      OR public.is_admin_or_gerente()
  ));

-- ── Módulos do bar (03) ──
DROP POLICY IF EXISTS "Admin gerencia fornecedores" ON public.suppliers;
DROP POLICY IF EXISTS "Admin gerencia estoque" ON public.stock_items;
DROP POLICY IF EXISTS "Admin gerencia financeiro" ON public.finance_entries;
DROP POLICY IF EXISTS "Admin gerencia documentos" ON public.documents;
DROP POLICY IF EXISTS "Admin gerencia contatos" ON public.contacts;

CREATE POLICY "Admin gerencia fornecedores" ON public.suppliers FOR ALL TO authenticated
  USING (public.is_admin_or_gerente())
  WITH CHECK (public.is_admin_or_gerente());

CREATE POLICY "Admin gerencia estoque" ON public.stock_items FOR ALL TO authenticated
  USING (public.is_admin_or_gerente())
  WITH CHECK (public.is_admin_or_gerente());

CREATE POLICY "Admin gerencia financeiro" ON public.finance_entries FOR ALL TO authenticated
  USING (public.is_admin_or_gerente())
  WITH CHECK (public.is_admin_or_gerente());

CREATE POLICY "Admin gerencia documentos" ON public.documents FOR ALL TO authenticated
  USING (public.is_admin_or_gerente())
  WITH CHECK (public.is_admin_or_gerente());

CREATE POLICY "Admin gerencia contatos" ON public.contacts FOR ALL TO authenticated
  USING (public.is_admin_or_gerente())
  WITH CHECK (public.is_admin_or_gerente());

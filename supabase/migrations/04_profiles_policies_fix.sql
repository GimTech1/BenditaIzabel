-- ══════════════════════════════════════════════════════════
-- Ajustes em profiles: INSERT do próprio usuário + evitar RLS
-- problemática em alguns cenários (usuários criados manualmente
-- no Dashboard sem trigger / perfil órfão).
-- ══════════════════════════════════════════════════════════

-- Permite que usuário autenticado crie a própria linha em profiles
-- (útil se o trigger handle_new_user não rodou).
DROP POLICY IF EXISTS "Usuario insere proprio perfil" ON public.profiles;
CREATE POLICY "Usuario insere proprio perfil"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ══════════════════════════════════════════════════════════
-- Se o login funciona mas o Trello/API dá erro, pode faltar
-- linha em public.profiles (ex.: usuário criado manualmente no Dashboard).
--
-- 1) Confira se existe perfil:
--    SELECT * FROM public.profiles WHERE id = auth.uid();
--    (no SQL Editor use o UUID do usuário em vez de auth.uid())
--
-- 2) Se não existir, insira (troque os valores):
-- ══════════════════════════════════════════════════════════

INSERT INTO public.profiles (id, full_name, email, role, department_id)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  u.email,
  'admin',
  (SELECT id FROM public.departments WHERE name = 'Geral' LIMIT 1)
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email;

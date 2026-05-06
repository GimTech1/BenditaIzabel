# Trello — guia único para copiar para outro sistema

Este documento reúne **tudo o que você precisa** para replicar o módulo Trello deste projeto (Next.js + Supabase) em outro repositório ou ambiente.

---

## 1. Visão geral

| Camada | O quê |
|--------|--------|
| **Banco (Supabase/Postgres)** | Tabelas `trello_*`, RLS, bucket `trello-attachments` |
| **API** | Rotas em `app/api/trello/**` (Next.js App Router) |
| **UI** | Página `app/(dashboard)/trello/page.tsx` |
| **Lib** | `lib/trello/activity.ts` (log de atividade em comentários) |
| **Integração** | Item no menu lateral + título no layout do dashboard |

**Pré-requisitos no banco (já existentes neste RH):**

- `public.departments` (quadros referenciam `department_id`)
- `public.profiles` com `id`, `department_id`, `role` — a RLS usa `role IN ('admin', 'gerente')`
- `auth.users` (Supabase Auth)

**Nota sobre papéis:** No front-end do sidebar os papéis aparecem como `admin` | `manager` | `employee`; no **Postgres/RLS** o gerente costuma ser **`gerente`**. As rotas da API fazem `['admin', 'gerente'].includes(role)`. Garanta que o perfil no banco use **`gerente`** para equivaler ao “manager” da UI, ou ajuste as políticas/API.

---

## 2. Variáveis de ambiente

O cliente Supabase deve estar configurado como no projeto de origem, tipicamente:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Copie também **`lib/supabase/server.ts`** e **`lib/supabase/client.ts`** (ou equivalente), pois as rotas usam `@/lib/supabase/server`.

---

## 3. Dependências npm relevantes

Do `package.json` deste projeto, o Trello usa principalmente:

- `next`, `react`, `react-dom`
- `@supabase/ssr`, `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs` (se ainda usado em algum lugar)
- `lucide-react`
- `react-hot-toast`
- `@radix-ui/react-dialog`
- `tailwindcss` + utilitários (`clsx`, `tailwind-merge` se usados pelos componentes)
- `date-fns` (se usado na página)

A página importa **`@/components/ui/button`** — copie esse componente (e o que ele depende, ex. `cn` em `lib/utils`) ou substitua por um botão equivalente.

---

## 4. Arquivos e pastas a copiar

### 4.1 Obrigatório (núcleo Trello)

| Caminho | Descrição |
|---------|-----------|
| `app/api/trello/` | **Toda a pasta** (todas as `route.ts`) |
| `app/(dashboard)/trello/page.tsx` | Interface do quadro |
| `lib/trello/activity.ts` | Helpers de log `[ATIVIDADE]` nos comentários |

### 4.2 Rotas da API (referência)

- `app/api/trello/boards/route.ts`
- `app/api/trello/boards/summaries/route.ts`
- `app/api/trello/boards/[id]/route.ts`
- `app/api/trello/boards/[id]/lists/route.ts`
- `app/api/trello/boards/[id]/labels/route.ts`
- `app/api/trello/boards/[id]/dashboard/route.ts`
- `app/api/trello/lists/[id]/route.ts`
- `app/api/trello/lists/[id]/cards/route.ts`
- `app/api/trello/cards/[id]/route.ts`
- `app/api/trello/cards/[id]/labels/route.ts`
- `app/api/trello/cards/[id]/assignees/route.ts`
- `app/api/trello/cards/[id]/checklists/route.ts`
- `app/api/trello/cards/[id]/comments/route.ts`
- `app/api/trello/cards/[id]/attachments/route.ts`
- `app/api/trello/comments/[id]/route.ts`
- `app/api/trello/attachments/[id]/route.ts`
- `app/api/trello/checklists/[id]/route.ts`
- `app/api/trello/checklists/[id]/items/route.ts`
- `app/api/trello/checklist-items/[id]/route.ts`
- `app/api/trello/labels/[id]/route.ts`
- `app/api/trello/users/route.ts`

### 4.3 Integração no app (ajuste manual no destino)

- **Menu:** em `components/layout/sidebar.tsx`, há um item com `title: 'Trello'`, `href: '/trello'`, ícone `Columns`.
- **Título da página:** em `app/(dashboard)/layout.tsx`, mapeamento `'/trello': 'Trello'`.

### 4.4 Supabase — migrations (ordem exata)

Execute no SQL Editor do Supabase **nesta ordem** (ou use `supabase db` com os mesmos arquivos):

1. `20250317000000_create_trello.sql`
2. `20250317000001_trello_visibility.sql`
3. `20250318000000_trello_checklists_labels_comments.sql`
4. `20250318000001_trello_storage_bucket.sql`
5. `20260317000000_trello_card_progress.sql`
6. `20260317000001_trello_card_priority.sql`
7. `20260317000002_trello_card_assignee.sql`
8. `20260317000003_trello_card_assignees.sql`
9. `20260317000004_trello_card_completion.sql`
10. `20260318000005_trello_list_color.sql`

---

## 5. Storage

- **Bucket:** `trello-attachments` (público para leitura na configuração deste projeto)
- Políticas em `storage.objects` para `SELECT` / `INSERT` / `DELETE` no bucket `trello-attachments` (usuários autenticados)

---

## 6. SQL completo (colar em ordem)

> Se já tiver os arquivos em `supabase/migrations/`, pode **copiar só a pasta** em vez de colar abaixo. O conteúdo é o mesmo.

### 6.1 — `20250317000000_create_trello.sql`

```sql
-- Quadros Trello por setor (Operacional)
CREATE TABLE IF NOT EXISTS public.trello_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Listas (colunas) do quadro
CREATE TABLE IF NOT EXISTS public.trello_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.trello_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cartões nas listas
CREATE TABLE IF NOT EXISTS public.trello_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.trello_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trello_boards_department ON public.trello_boards(department_id);
CREATE INDEX IF NOT EXISTS idx_trello_lists_board ON public.trello_lists(board_id);
CREATE INDEX IF NOT EXISTS idx_trello_cards_list ON public.trello_cards(list_id);

CREATE OR REPLACE FUNCTION public.set_trello_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_trello_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trello_boards_updated_at ON public.trello_boards;
CREATE TRIGGER trello_boards_updated_at
  BEFORE UPDATE ON public.trello_boards
  FOR EACH ROW EXECUTE FUNCTION public.set_trello_boards_updated_at();

DROP TRIGGER IF EXISTS trello_cards_updated_at ON public.trello_cards;
CREATE TRIGGER trello_cards_updated_at
  BEFORE UPDATE ON public.trello_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_trello_cards_updated_at();

ALTER TABLE public.trello_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_cards ENABLE ROW LEVEL SECURITY;

-- Boards: usuário vê boards do seu departamento; admin/gerente podem criar
DROP POLICY IF EXISTS "Ver boards do departamento" ON public.trello_boards;
CREATE POLICY "Ver boards do departamento"
  ON public.trello_boards FOR SELECT TO authenticated
  USING (
    department_id IN (
      SELECT department_id FROM public.profiles WHERE id = auth.uid() AND department_id IS NOT NULL
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
  );

DROP POLICY IF EXISTS "Admin e gerente criam boards" ON public.trello_boards;
CREATE POLICY "Admin e gerente criam boards"
  ON public.trello_boards FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
  );

DROP POLICY IF EXISTS "Admin e gerente editam boards" ON public.trello_boards;
CREATE POLICY "Admin e gerente editam boards"
  ON public.trello_boards FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')))
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin e gerente excluem boards" ON public.trello_boards;
CREATE POLICY "Admin e gerente excluem boards"
  ON public.trello_boards FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')));

-- Listas: quem vê o board vê as listas
DROP POLICY IF EXISTS "Ver listas do board" ON public.trello_lists;
CREATE POLICY "Ver listas do board"
  ON public.trello_lists FOR SELECT TO authenticated
  USING (
    board_id IN (
      SELECT id FROM public.trello_boards WHERE
        department_id IN (SELECT department_id FROM public.profiles WHERE id = auth.uid() AND department_id IS NOT NULL)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  );

DROP POLICY IF EXISTS "Admin e gerente gerenciam listas" ON public.trello_lists;
CREATE POLICY "Admin e gerente gerenciam listas"
  ON public.trello_lists FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')))
  WITH CHECK (true);

-- Cartões: quem vê o board vê/edita cartões (todos do setor podem adicionar/mover)
DROP POLICY IF EXISTS "Ver cartões" ON public.trello_cards;
CREATE POLICY "Ver cartões"
  ON public.trello_cards FOR SELECT TO authenticated
  USING (
    list_id IN (
      SELECT tl.id FROM public.trello_lists tl
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.department_id IN (SELECT department_id FROM public.profiles WHERE id = auth.uid() AND department_id IS NOT NULL)
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  );

DROP POLICY IF EXISTS "Autenticados inserem cartões" ON public.trello_cards;
CREATE POLICY "Autenticados inserem cartões"
  ON public.trello_cards FOR INSERT TO authenticated
  WITH CHECK (
    list_id IN (
      SELECT tl.id FROM public.trello_lists tl
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.department_id IN (SELECT department_id FROM public.profiles WHERE id = auth.uid() AND department_id IS NOT NULL)
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  );

DROP POLICY IF EXISTS "Autenticados atualizam cartões" ON public.trello_cards;
CREATE POLICY "Autenticados atualizam cartões"
  ON public.trello_cards FOR UPDATE TO authenticated
  USING (
    list_id IN (
      SELECT tl.id FROM public.trello_lists tl
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.department_id IN (SELECT department_id FROM public.profiles WHERE id = auth.uid() AND department_id IS NOT NULL)
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados excluem cartões" ON public.trello_cards;
CREATE POLICY "Autenticados excluem cartões"
  ON public.trello_cards FOR DELETE TO authenticated
  USING (
    list_id IN (
      SELECT tl.id FROM public.trello_lists tl
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.department_id IN (SELECT department_id FROM public.profiles WHERE id = auth.uid() AND department_id IS NOT NULL)
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  );
```

### 6.2 — `20250317000001_trello_visibility.sql`

```sql
-- Visibilidade do quadro: todos, equipe, apenas criador ou pessoa específica
ALTER TABLE public.trello_boards
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'department'
    CHECK (visibility IN ('all', 'department', 'owner', 'specific')),
  ADD COLUMN IF NOT EXISTS visible_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.trello_boards.visibility IS 'all=todos, department=equipe do setor, owner=apenas criador, specific=uma pessoa (visible_to_user_id)';

-- Política de visualização: quem pode ver o quadro
DROP POLICY IF EXISTS "Ver boards do departamento" ON public.trello_boards;
CREATE POLICY "Ver boards por visibilidade"
  ON public.trello_boards FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR visibility = 'all'
    OR (visibility = 'department' AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    OR (visibility = 'specific' AND visible_to_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
  );

-- Listas: quem vê o board vê as listas (usar mesma lógica de visibilidade)
DROP POLICY IF EXISTS "Ver listas do board" ON public.trello_lists;
CREATE POLICY "Ver listas do board"
  ON public.trello_lists FOR SELECT TO authenticated
  USING (
    board_id IN (
      SELECT id FROM public.trello_boards WHERE
        created_by = auth.uid()
        OR visibility = 'all'
        OR (visibility = 'department' AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
        OR (visibility = 'specific' AND visible_to_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  );

-- Cartões: quem vê o board vê e pode editar cartões
DROP POLICY IF EXISTS "Ver cartões" ON public.trello_cards;
CREATE POLICY "Ver cartões"
  ON public.trello_cards FOR SELECT TO authenticated
  USING (
    list_id IN (
      SELECT tl.id FROM public.trello_lists tl
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.created_by = auth.uid()
        OR tb.visibility = 'all'
        OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
        OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  );

DROP POLICY IF EXISTS "Autenticados inserem cartões" ON public.trello_cards;
CREATE POLICY "Autenticados inserem cartões"
  ON public.trello_cards FOR INSERT TO authenticated
  WITH CHECK (
    list_id IN (
      SELECT tl.id FROM public.trello_lists tl
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.created_by = auth.uid()
        OR tb.visibility = 'all'
        OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
        OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  );

DROP POLICY IF EXISTS "Autenticados atualizam cartões" ON public.trello_cards;
CREATE POLICY "Autenticados atualizam cartões"
  ON public.trello_cards FOR UPDATE TO authenticated
  USING (
    list_id IN (
      SELECT tl.id FROM public.trello_lists tl
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.created_by = auth.uid()
        OR tb.visibility = 'all'
        OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
        OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados excluem cartões" ON public.trello_cards;
CREATE POLICY "Autenticados excluem cartões"
  ON public.trello_cards FOR DELETE TO authenticated
  USING (
    list_id IN (
      SELECT tl.id FROM public.trello_lists tl
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.created_by = auth.uid()
        OR tb.visibility = 'all'
        OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
        OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  );
```

### 6.3 — `20250318000000_trello_checklists_labels_comments.sql`

```sql
-- ========== CARTÕES: data de vencimento e cor de capa ==========
ALTER TABLE public.trello_cards
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cover_color TEXT;

-- ========== CHECKLISTS ==========
CREATE TABLE IF NOT EXISTS public.trello_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.trello_cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Checklist',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trello_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.trello_checklists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trello_checklists_card ON public.trello_checklists(card_id);
CREATE INDEX IF NOT EXISTS idx_trello_checklist_items_checklist ON public.trello_checklist_items(checklist_id);

-- ========== ETIQUETAS (por quadro) ==========
CREATE TABLE IF NOT EXISTS public.trello_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.trello_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trello_card_labels (
  card_id UUID NOT NULL REFERENCES public.trello_cards(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.trello_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_trello_labels_board ON public.trello_labels(board_id);

-- ========== COMENTÁRIOS (com menções no body: @(user_id)) ==========
CREATE TABLE IF NOT EXISTS public.trello_card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.trello_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trello_card_comments_card ON public.trello_card_comments(card_id);

-- ========== ANEXOS ==========
CREATE TABLE IF NOT EXISTS public.trello_card_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.trello_cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trello_card_attachments_card ON public.trello_card_attachments(card_id);

-- ========== RLS (quem vê o card vê os dados do card) ==========
ALTER TABLE public.trello_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_card_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_card_attachments ENABLE ROW LEVEL SECURITY;

-- Checklists: quem vê o card vê
CREATE POLICY "Ver checklists" ON public.trello_checklists FOR SELECT TO authenticated
  USING (card_id IN (SELECT c.id FROM public.trello_cards c JOIN public.trello_lists tl ON tl.id = c.list_id JOIN public.trello_boards tb ON tb.id = tl.board_id WHERE tb.created_by = auth.uid() OR tb.visibility = 'all' OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)) OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))));
CREATE POLICY "Gerenciar checklists" ON public.trello_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Checklist items
CREATE POLICY "Ver checklist items" ON public.trello_checklist_items FOR SELECT TO authenticated
  USING (checklist_id IN (SELECT id FROM public.trello_checklists WHERE card_id IN (SELECT c.id FROM public.trello_cards c JOIN public.trello_lists tl ON tl.id = c.list_id JOIN public.trello_boards tb ON tb.id = tl.board_id WHERE tb.created_by = auth.uid() OR tb.visibility = 'all' OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)) OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')))));
CREATE POLICY "Gerenciar checklist items" ON public.trello_checklist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Labels: quem vê o board vê
CREATE POLICY "Ver labels" ON public.trello_labels FOR SELECT TO authenticated
  USING (board_id IN (SELECT id FROM public.trello_boards WHERE created_by = auth.uid() OR visibility = 'all' OR (visibility = 'department' AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)) OR (visibility = 'specific' AND visible_to_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))));
CREATE POLICY "Gerenciar labels" ON public.trello_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Card labels
CREATE POLICY "Ver card labels" ON public.trello_card_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gerenciar card labels" ON public.trello_card_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Comments
CREATE POLICY "Ver comments" ON public.trello_card_comments FOR SELECT TO authenticated
  USING (card_id IN (SELECT c.id FROM public.trello_cards c JOIN public.trello_lists tl ON tl.id = c.list_id JOIN public.trello_boards tb ON tb.id = tl.board_id WHERE tb.created_by = auth.uid() OR tb.visibility = 'all' OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)) OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))));
CREATE POLICY "Inserir comment" ON public.trello_card_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Atualizar comment" ON public.trello_card_comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (true);
CREATE POLICY "Excluir comment" ON public.trello_card_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Attachments
CREATE POLICY "Ver attachments" ON public.trello_card_attachments FOR SELECT TO authenticated
  USING (card_id IN (SELECT c.id FROM public.trello_cards c JOIN public.trello_lists tl ON tl.id = c.list_id JOIN public.trello_boards tb ON tb.id = tl.board_id WHERE tb.created_by = auth.uid() OR tb.visibility = 'all' OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)) OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))));
CREATE POLICY "Inserir attachment" ON public.trello_card_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Excluir attachment" ON public.trello_card_attachments FOR DELETE TO authenticated USING (uploaded_by = auth.uid());
```

### 6.4 — `20250318000001_trello_storage_bucket.sql`

```sql
-- Bucket para anexos de cartões Trello
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trello-attachments',
  'trello-attachments',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Ler anexos Trello" ON storage.objects;
CREATE POLICY "Ler anexos Trello"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'trello-attachments');

DROP POLICY IF EXISTS "Inserir anexos Trello" ON storage.objects;
CREATE POLICY "Inserir anexos Trello"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trello-attachments');

DROP POLICY IF EXISTS "Excluir anexos Trello" ON storage.objects;
CREATE POLICY "Excluir anexos Trello"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'trello-attachments');
```

### 6.5 — `20260317000000_trello_card_progress.sql`

```sql
-- Adiciona progresso manual (0-100) no card
ALTER TABLE public.trello_cards
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;

-- Garante limites 0..100
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trello_cards_progress_range'
  ) THEN
    ALTER TABLE public.trello_cards
      ADD CONSTRAINT trello_cards_progress_range CHECK (progress >= 0 AND progress <= 100);
  END IF;
END $$;
```

### 6.6 — `20260317000001_trello_card_priority.sql`

```sql
-- Adiciona prioridade (5-10) no card (nullable)
ALTER TABLE public.trello_cards
  ADD COLUMN IF NOT EXISTS priority INTEGER;

-- Garante limites 5..10 (ou NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trello_cards_priority_range'
  ) THEN
    ALTER TABLE public.trello_cards
      ADD CONSTRAINT trello_cards_priority_range CHECK (priority IS NULL OR (priority >= 5 AND priority <= 10));
  END IF;
END $$;
```

### 6.7 — `20260317000002_trello_card_assignee.sql`

```sql
-- Atribuição de responsável ao card
ALTER TABLE public.trello_cards
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trello_cards_assigned_to ON public.trello_cards(assigned_to);
```

### 6.8 — `20260317000003_trello_card_assignees.sql`

```sql
-- Multi-responsáveis por card (estilo Trello)
CREATE TABLE IF NOT EXISTS public.trello_card_assignees (
  card_id UUID NOT NULL REFERENCES public.trello_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trello_card_assignees_card ON public.trello_card_assignees(card_id);
CREATE INDEX IF NOT EXISTS idx_trello_card_assignees_user ON public.trello_card_assignees(user_id);

ALTER TABLE public.trello_card_assignees ENABLE ROW LEVEL SECURITY;

-- Quem vê o card vê os responsáveis
DROP POLICY IF EXISTS "Ver card assignees" ON public.trello_card_assignees;
CREATE POLICY "Ver card assignees" ON public.trello_card_assignees FOR SELECT TO authenticated
  USING (
    card_id IN (
      SELECT c.id
      FROM public.trello_cards c
      JOIN public.trello_lists tl ON tl.id = c.list_id
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.created_by = auth.uid()
        OR tb.visibility = 'all'
        OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
        OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  );

-- Quem pode editar o card pode gerenciar responsáveis (insert/delete)
DROP POLICY IF EXISTS "Gerenciar card assignees" ON public.trello_card_assignees;
CREATE POLICY "Gerenciar card assignees" ON public.trello_card_assignees FOR ALL TO authenticated
  USING (
    card_id IN (
      SELECT c.id
      FROM public.trello_cards c
      JOIN public.trello_lists tl ON tl.id = c.list_id
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.created_by = auth.uid()
        OR tb.visibility = 'all'
        OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
        OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  )
  WITH CHECK (
    card_id IN (
      SELECT c.id
      FROM public.trello_cards c
      JOIN public.trello_lists tl ON tl.id = c.list_id
      JOIN public.trello_boards tb ON tb.id = tl.board_id
      WHERE tb.created_by = auth.uid()
        OR tb.visibility = 'all'
        OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
        OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  );
```

### 6.9 — `20260317000004_trello_card_completion.sql`

```sql
-- Status explícito de conclusão do card (com auditoria)
ALTER TABLE public.trello_cards
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trello_cards_is_completed ON public.trello_cards(is_completed);
CREATE INDEX IF NOT EXISTS idx_trello_cards_completed_at ON public.trello_cards(completed_at);
CREATE INDEX IF NOT EXISTS idx_trello_cards_completed_by ON public.trello_cards(completed_by);
```

### 6.10 — `20260318000005_trello_list_color.sql`

```sql
-- Cor visual (hex) para a coluna/lista do quadro
ALTER TABLE public.trello_lists
  ADD COLUMN IF NOT EXISTS color TEXT;

CREATE INDEX IF NOT EXISTS idx_trello_lists_color ON public.trello_lists(color);
```

---

## 7. Checklist final no projeto destino

- [ ] Rodar SQL na ordem da secção 4.4 (ou colar blocos da secção 6).
- [ ] Copiar `app/api/trello/`, `app/(dashboard)/trello/page.tsx`, `lib/trello/activity.ts`.
- [ ] Copiar `lib/supabase/server` (+ `client` se necessário) e variáveis de ambiente.
- [ ] Garantir `profiles` + `departments` compatíveis com as FKs e RLS.
- [ ] Adicionar rota `/trello` ao menu e ao mapa de títulos do dashboard.
- [ ] Copiar `components/ui/button` (ou ajustar imports na página).
- [ ] Subir o app e testar: criar quadro, listas, cartões, labels, checklists, comentários, anexos.

---

*Gerado a partir do repositório SistemadeRH — módulo Trello.*

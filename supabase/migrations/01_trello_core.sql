-- ══════════════════════════════════════════════════════════
-- Trello: boards, lists, cards (core)
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.trello_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'department'
    CHECK (visibility IN ('all', 'department', 'owner', 'specific')),
  visible_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trello_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.trello_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trello_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.trello_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ,
  cover_color TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  priority INTEGER,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trello_cards_progress_range CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT trello_cards_priority_range CHECK (priority IS NULL OR (priority >= 5 AND priority <= 10))
);

CREATE INDEX IF NOT EXISTS idx_trello_boards_department ON public.trello_boards(department_id);
CREATE INDEX IF NOT EXISTS idx_trello_lists_board ON public.trello_lists(board_id);
CREATE INDEX IF NOT EXISTS idx_trello_cards_list ON public.trello_cards(list_id);
CREATE INDEX IF NOT EXISTS idx_trello_cards_assigned_to ON public.trello_cards(assigned_to);
CREATE INDEX IF NOT EXISTS idx_trello_cards_is_completed ON public.trello_cards(is_completed);
CREATE INDEX IF NOT EXISTS idx_trello_lists_color ON public.trello_lists(color);

CREATE OR REPLACE FUNCTION public.set_trello_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_trello_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trello_boards_updated_at ON public.trello_boards;
CREATE TRIGGER trello_boards_updated_at
  BEFORE UPDATE ON public.trello_boards
  FOR EACH ROW EXECUTE FUNCTION public.set_trello_boards_updated_at();

DROP TRIGGER IF EXISTS trello_cards_updated_at ON public.trello_cards;
CREATE TRIGGER trello_cards_updated_at
  BEFORE UPDATE ON public.trello_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_trello_cards_updated_at();

-- ── RLS ──

ALTER TABLE public.trello_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver boards por visibilidade" ON public.trello_boards
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR visibility = 'all'
    OR (visibility = 'department' AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    OR (visibility = 'specific' AND visible_to_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
  );

CREATE POLICY "Admin e gerente criam boards" ON public.trello_boards
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')));

CREATE POLICY "Admin e gerente editam boards" ON public.trello_boards
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')))
  WITH CHECK (true);

CREATE POLICY "Admin e gerente excluem boards" ON public.trello_boards
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')));

CREATE POLICY "Ver listas do board" ON public.trello_lists
  FOR SELECT TO authenticated
  USING (board_id IN (
    SELECT id FROM public.trello_boards WHERE
      created_by = auth.uid() OR visibility = 'all'
      OR (visibility = 'department' AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      OR (visibility = 'specific' AND visible_to_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
  ));

CREATE POLICY "Admin e gerente gerenciam listas" ON public.trello_lists
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')))
  WITH CHECK (true);

CREATE POLICY "Ver cartoes" ON public.trello_cards
  FOR SELECT TO authenticated
  USING (list_id IN (
    SELECT tl.id FROM public.trello_lists tl
    JOIN public.trello_boards tb ON tb.id = tl.board_id
    WHERE tb.created_by = auth.uid() OR tb.visibility = 'all'
      OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
  ));

CREATE POLICY "Autenticados inserem cartoes" ON public.trello_cards
  FOR INSERT TO authenticated
  WITH CHECK (list_id IN (
    SELECT tl.id FROM public.trello_lists tl
    JOIN public.trello_boards tb ON tb.id = tl.board_id
    WHERE tb.created_by = auth.uid() OR tb.visibility = 'all'
      OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
  ));

CREATE POLICY "Autenticados atualizam cartoes" ON public.trello_cards
  FOR UPDATE TO authenticated
  USING (list_id IN (
    SELECT tl.id FROM public.trello_lists tl
    JOIN public.trello_boards tb ON tb.id = tl.board_id
    WHERE tb.created_by = auth.uid() OR tb.visibility = 'all'
      OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
  ))
  WITH CHECK (true);

CREATE POLICY "Autenticados excluem cartoes" ON public.trello_cards
  FOR DELETE TO authenticated
  USING (list_id IN (
    SELECT tl.id FROM public.trello_lists tl
    JOIN public.trello_boards tb ON tb.id = tl.board_id
    WHERE tb.created_by = auth.uid() OR tb.visibility = 'all'
      OR (tb.visibility = 'department' AND tb.department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
      OR (tb.visibility = 'specific' AND tb.visible_to_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
  ));

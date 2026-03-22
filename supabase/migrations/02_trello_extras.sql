-- ══════════════════════════════════════════════════════════
-- Trello: checklists, labels, comments, attachments, assignees
-- ══════════════════════════════════════════════════════════

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

CREATE TABLE IF NOT EXISTS public.trello_card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.trello_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.trello_card_assignees (
  card_id UUID NOT NULL REFERENCES public.trello_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trello_checklists_card ON public.trello_checklists(card_id);
CREATE INDEX IF NOT EXISTS idx_trello_checklist_items_checklist ON public.trello_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_trello_labels_board ON public.trello_labels(board_id);
CREATE INDEX IF NOT EXISTS idx_trello_card_comments_card ON public.trello_card_comments(card_id);
CREATE INDEX IF NOT EXISTS idx_trello_card_attachments_card ON public.trello_card_attachments(card_id);
CREATE INDEX IF NOT EXISTS idx_trello_card_assignees_card ON public.trello_card_assignees(card_id);
CREATE INDEX IF NOT EXISTS idx_trello_card_assignees_user ON public.trello_card_assignees(user_id);

-- RLS
ALTER TABLE public.trello_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_card_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_card_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_card_assignees ENABLE ROW LEVEL SECURITY;

-- Checklists
CREATE POLICY "Ver checklists" ON public.trello_checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gerenciar checklists" ON public.trello_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Checklist items
CREATE POLICY "Ver checklist items" ON public.trello_checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gerenciar checklist items" ON public.trello_checklist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Labels
CREATE POLICY "Ver labels" ON public.trello_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gerenciar labels" ON public.trello_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Card labels
CREATE POLICY "Ver card labels" ON public.trello_card_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gerenciar card labels" ON public.trello_card_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Comments
CREATE POLICY "Ver comments" ON public.trello_card_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserir comment" ON public.trello_card_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Atualizar comment" ON public.trello_card_comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (true);
CREATE POLICY "Excluir comment" ON public.trello_card_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Attachments
CREATE POLICY "Ver attachments" ON public.trello_card_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserir attachment" ON public.trello_card_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Excluir attachment" ON public.trello_card_attachments FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

-- Assignees
CREATE POLICY "Ver card assignees" ON public.trello_card_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gerenciar card assignees" ON public.trello_card_assignees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trello-attachments', 'trello-attachments', true, 10485760,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/csv','image/jpeg','image/png','image/gif','image/webp','application/zip']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Ler anexos Trello" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'trello-attachments');
CREATE POLICY "Inserir anexos Trello" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trello-attachments');
CREATE POLICY "Excluir anexos Trello" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'trello-attachments');

-- ══════════════════════════════════════════════════════════
-- SEED: Preenche boards do Bendita a partir do processo operacional
-- ══════════════════════════════════════════════════════════
--
-- Pré-requisitos:
-- 1. Migrations (00 → 03) já executadas no Supabase
-- 2. Pelo menos UMA conta criada no app (/register) — define auth.users
--
-- O script usa automaticamente:
--   • o primeiro usuário de auth.users (mais antigo)
--   • o departamento "Geral"
--
-- Se quiser outro usuário/departamento, rode antes no SQL Editor:
--   SELECT id, email FROM auth.users;
--   SELECT id, name FROM public.departments;
-- e ajuste as queries SELECT abaixo.
-- ══════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;

  v_board_id UUID;
  v_list_id  UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Geral' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário em auth.users. Crie uma conta em /register e rode este script de novo.';
  END IF;

  IF v_dept_id IS NULL THEN
    RAISE EXCEPTION 'Departamento "Geral" não encontrado. Rode a migration 00_base_tables.sql antes.';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- Board 1: Operação Inicial
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Operação Inicial', v_dept_id, v_user_id, 'all');

  -- Lista: A Fazer
  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Seguir com o mesmo cardápio do Giggs de bebidas e comidas', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir o que entra igual, o que sai e o que precisa adaptar', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Atualizar ficha técnica e verificar novos custos/preços', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Mandar fazer a impressão do cardápio provisório', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Cadastrar todos os itens no sistema/PDV', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Verificar quantidade de comandas', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir fluxo de atendimento: mesa, balcão, comanda individual, caixa', 6, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir horário de funcionamento inicial', 7, v_user_id),
    (gen_random_uuid(), v_list_id, 'Criar rotina de abertura, operação e fechamento', 8, v_user_id);

  -- Lista: Em Andamento
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  -- Lista: Concluído
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 2: Equipe
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Equipe', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Testar cozinheira', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Testar bartender', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir equipe mínima de abertura', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Alinhar funções de cada pessoa', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Treinar padrão de atendimento', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Treinar limpeza, organização e reposição', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir responsável por compras', 6, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir responsável pelo caixa', 7, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir responsável pelo fechamento', 8, v_user_id),
    (gen_random_uuid(), v_list_id, 'Uniforme ou padrão visual da equipe', 9, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 3: Cozinha
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Cozinha', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Conferir estrutura da cozinha', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Testar fogão, chapa, fritadeira, forno, coifa, geladeira e freezer', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Verificar utensílios de produção', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Contagem de louças', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Verificar potes de armazenamento e etiquetagem', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Produção de comidas', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Compras para primeira produção', 6, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir espaço de armazenamento seco, refrigerado e congelado', 7, v_user_id),
    (gen_random_uuid(), v_list_id, 'Criar rotina de pré-preparo e mise en place', 8, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 4: Bar
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Bar', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Conferir balcão, estação de drinks e fluxo do bartender', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Testar chopeira, torre, cilindro, extratora e refrigeração', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Testar geladeiras e freezers de bebida', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Conferir copos e taças', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Separar utensílios: dosadores, coqueteleiras, colheres, jiggers, peneiras, tábuas', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Organizar insumos de bar: gelo, açúcar, xaropes, espumas, especiarias', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir produção inicial de xaropes e insumos internos', 6, v_user_id),
    (gen_random_uuid(), v_list_id, 'Testar padrão dos principais drinks', 7, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 5: Estoque / Compras
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Estoque / Compras', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Montar lista de compra da primeira semana', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Montar estoque mínimo de abertura', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir fornecedores prioritários', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Conferir embalagens, descartáveis e materiais de apoio', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Guardanapos, Ketchup, Mostarda, Maionese e Canudos', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Papel toalha, papel higiênico, detergente, desinfetante, saco de lixo', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Bobina do caixa/impressora', 6, v_user_id),
    (gen_random_uuid(), v_list_id, 'Etiquetas para validade e identificação', 7, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 6: Salão / Estrutura
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Salão / Estrutura', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Contagem de mesas e cadeiras', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Verificar conforto e estabilidade das mesas', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Conferir iluminação do salão', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Conferir som, TV, controles e internet', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Conferir banheiros', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Conferir limpeza pesada antes da abertura', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Verificar estoque de mesas/bistrôs externos', 6, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 7: Identidade / Comunicação
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Identidade / Comunicação', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Solicitar logo + identidade', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Atualizar cardápio com identidade nova', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Produzir materiais básicos de mesa e balcão', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Pedir login do Instagram', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Atualizar o Google', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Criar post inauguração p/ amigos', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Preparar campanhas de tráfego pago', 6, v_user_id),
    (gen_random_uuid(), v_list_id, 'Marcar data para gravar aniversário fake', 7, v_user_id),
    (gen_random_uuid(), v_list_id, 'Achar um videomaker', 8, v_user_id),
    (gen_random_uuid(), v_list_id, 'Editar materiais para anúncio', 9, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 8: Sistema / Financeiro
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Sistema / Financeiro', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Configurar formas de pagamento', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Testar maquininha', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Configurar taxas, comissão e relatórios', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir política de desconto/cortesia', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Criar planilha ou rotina de conferência diária', 4, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 9: Documentação / Regularização
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Documentação / Regularização', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Verificar alvará de funcionamento', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Verificar vigilância sanitária', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Verificar AVCB/bombeiros', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Verificar licença para música', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Verificar CNPJ, CNAEs e emissão fiscal', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Conferir necessidade de troca de titularidade', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Verificar empresa de segurança e cancelar', 6, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 10: Documentação / Contatos
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Documentação / Contatos', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Passar contrato social, água, luz, gás para nosso nome', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Situação alvará, vigilância, AVCB, bombeiros, meio ambiente', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Lista de fornecedores com cadastro e contato', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Sistema de alarme', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Coleta de lixo', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Acesso plataforma de delivery', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Contato das pessoas que trabalhavam no bendita', 6, v_user_id),
    (gen_random_uuid(), v_list_id, 'Pedir contato do contador', 7, v_user_id),
    (gen_random_uuid(), v_list_id, 'Contatos de técnicos (chope, elétrica, refrigeração, coifa, internet, câmeras)', 8, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 11: Senhas, Logins e Acessos
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Senhas, Logins e Acessos', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Login e senha do Instagram', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Login e senha do Google Business', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Sistema para recuperar base de dados de clientes', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Login e senha de plataformas de delivery', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Login e senha de plataformas de anúncio', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Acesso a pastas, artes, arquivos e fotos', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Confirmar recuperação por email e telefone', 6, v_user_id),
    (gen_random_uuid(), v_list_id, 'Whatsapp (solicitar chip)', 7, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  -- ════════════════════════════════════════════════════════
  -- Board 12: Prioridades Curtíssimo Prazo
  -- ════════════════════════════════════════════════════════
  v_board_id := gen_random_uuid();
  INSERT INTO public.trello_boards (id, name, department_id, created_by, visibility)
  VALUES (v_board_id, 'Prioridades Curtíssimo Prazo', v_dept_id, v_user_id, 'all');

  v_list_id := gen_random_uuid();
  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (v_list_id, v_board_id, 'A Fazer', 0, '#ef4444');

  INSERT INTO public.trello_cards (id, list_id, title, position, created_by) VALUES
    (gen_random_uuid(), v_list_id, 'Buscar um seguro (Lucas)', 0, v_user_id),
    (gen_random_uuid(), v_list_id, 'Falar com Leo de anúncio (Lucas)', 1, v_user_id),
    (gen_random_uuid(), v_list_id, 'Buscar empresa de limpeza (Fer)', 2, v_user_id),
    (gen_random_uuid(), v_list_id, 'Levar Muniz e Ro pra entender compras', 3, v_user_id),
    (gen_random_uuid(), v_list_id, 'Criativos estáticos e Videos (Fer)', 4, v_user_id),
    (gen_random_uuid(), v_list_id, 'Definir cardápio inicial (Fer)', 5, v_user_id),
    (gen_random_uuid(), v_list_id, 'Dedetização (Lucas)', 6, v_user_id),
    (gen_random_uuid(), v_list_id, 'Colocar ponto de internet (Fer)', 7, v_user_id),
    (gen_random_uuid(), v_list_id, 'Listar possíveis cozinheiros (Fer e Lucas)', 8, v_user_id),
    (gen_random_uuid(), v_list_id, 'Falar com Sky canais futebol (Fer)', 9, v_user_id),
    (gen_random_uuid(), v_list_id, 'Conta de Luz e Sanepar (Lucas)', 10, v_user_id);

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Em Andamento', 1, '#f59e0b');

  INSERT INTO public.trello_lists (id, board_id, title, position, color)
  VALUES (gen_random_uuid(), v_board_id, 'Concluído', 2, '#22c55e');

  RAISE NOTICE 'Seed concluído! 12 boards criados com sucesso.';

END $$;

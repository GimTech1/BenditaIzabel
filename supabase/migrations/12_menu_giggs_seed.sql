-- ══════════════════════════════════════════════════════════
-- Cardápio Giggs 2026 — itens extraídos do PDF (OCR) para menu_items
-- Rode após 11_menu_cardapio.sql. Idempotente: só insere nomes ainda inexistentes.
-- ══════════════════════════════════════════════════════════

-- Remove só os 4 placeholders exatos da migration 11 (evita conflito de nome/preço)
DELETE FROM public.menu_items
WHERE (name, COALESCE(description, '')) IN (
  ('Chope Pilsen 300ml', 'Caneca gelada'),
  ('Caipirinha', 'Limão, cachaça e açúcar'),
  ('Porção de batatas', 'Com cheddar e bacon'),
  ('Hambúrguer Bendita', 'Pão, blend 180g, queijo, molho da casa')
);

INSERT INTO public.menu_items (name, description, category, price, sort_order, is_available)
SELECT v.name, v.description, v.category, v.price::numeric, v.sort_order, true
FROM (
  VALUES
    -- Petiscos
    ('Dadinhos de Tapioca', 'Acompanha molho de maracujá', 'Petiscos', '29.90', 10),
    ('Polenta Frita Giggs', 'Especial da casa, molho gorgonzola', 'Petiscos', '29.90', 20),
    ('Fish and chips', 'Peixe empanado crocante com batata frita', 'Petiscos', '42.90', 30),
    ('Frango Crocante da Casa', 'Servido com molho Giggs', 'Petiscos', '34.90', 40),
    ('Bolinho de Costela', '5 unidades, com queijo, molho Giggs', 'Petiscos', '35.90', 50),
    ('Porco Espinho', 'Especial da casa', 'Petiscos', '29.90', 60),
    ('Batata Frita Giggs', 'Acompanha molho Giggs', 'Petiscos', '29.90', 70),
    ('Batata Hashbrown', 'Batata ralada e frita, molho Giggs', 'Petiscos', '29.90', 80),
    ('Batata Frita com Cheddar', 'Cheddar cremoso', 'Petiscos', '34.90', 90),
    ('Torresminho em tiras', 'Tirinhas crocantes', 'Petiscos', '32.90', 100),
    ('Giggs Beef and Strips', 'Ragu de carne, barbecue, massinha de pastel', 'Petiscos', '49.90', 110),
    ('Torresmo de rolo', 'Feito artesanalmente', 'Petiscos', '49.90', 120),
    ('Parmegiana no palito', 'Carne bovina à parmegiana gratinada', 'Petiscos', '59.90', 130),
    ('Bolinho de moqueca', 'Com camarão, 9 unidades', 'Petiscos', '29.90', 140),
    ('Pastéis de feira', 'Mini pastéis carne ou queijo, 5 unidades', 'Petiscos', '34.90', 150),
    ('Azeitona Espanhola', 'Recheada com linguiça Blumenau, 12 unidades', 'Petiscos', '19.90', 160),
    ('Cúpula de chocolate', 'Sobremesa', 'Petiscos', '29.90', 170),
    ('Bastões de queijo', 'Mussarela e minas empanados, 9 unidades', 'Petiscos', '37.90', 180),
    ('Petit gateau', 'Com sorvete', 'Petiscos', '27.90', 190),
    ('Brownie Giggs', 'Brownie artesanal', 'Petiscos', '25.90', 200),

    -- Burgers e sanduíches
    ('Giggs Supreme', 'Pão, maionese, hambúrguer, mozarela de búfala, tomate cereja, rúcula, cebola crispy, molho Giggs', 'Burgers', '44.90', 210),
    ('Costela Burger', 'Maionese defumada, hambúrguer, costela, queijo prato, bacon, vinagrete, farofa', 'Burgers', '43.90', 220),
    ('Giggs Gorgonzola', 'Hambúrguer, molho gorgonzola, panceta suína, alface, tomate', 'Burgers', '41.90', 230),
    ('Pão com bolinho', 'Pão de água, bolinho de carne, queijo prato, cebolinha, molho Giggs', 'Burgers', '37.90', 240),
    ('Cheese 885', 'Hambúrguer, queijo prato, molho Giggs', 'Burgers', '34.90', 250),
    ('Cheddar Crispy Bacon', 'Hambúrguer, cebola crispy, cheddar, bacon, alface, tomate', 'Burgers', '37.90', 260),
    ('Pão com Costela', 'Costela, queijo prato, cebola crispy', 'Burgers', '37.90', 270),
    ('Pão com Bife', 'Bife de alcatra, queijo prato, cebolinha', 'Burgers', '34.90', 280),
    ('Giggs Salad', 'Hambúrguer, queijo prato, alface, tomate, molho Giggs', 'Burgers', '37.90', 290),
    ('Monster Giggs', '2 hambúrgueres, cebola crispy, bacon, queijo prato, alface', 'Burgers', '51.90', 300),
    ('Pão com Pernil', 'Pernil, queijo prato, cebolinha', 'Burgers', '34.90', 310),

    -- Pratos para compartilhar (acompanham pão de alho, molho Giggs, farofa e vinagrete)
    ('Flat Iron', 'Prato principal — consulte acompanhamentos no cardápio', 'Pratos para compartilhar', '94.90', 320),
    ('Fraldinha na mostarda', 'Prato principal', 'Pratos para compartilhar', '94.90', 330),
    ('Matambre recheado', 'Especial da casa', 'Pratos para compartilhar', '72.90', 340),
    ('Alcatra acebolada', 'Prato principal', 'Pratos para compartilhar', '64.90', 350),
    ('Alcatra gorgonzola', 'Prato principal', 'Pratos para compartilhar', '69.90', 360),
    ('Linguiça artesanal em rolo', 'Prato principal', 'Pratos para compartilhar', '54.90', 370),

    -- Caipirinhas (vodka, cachaça ou sem álcool)
    ('Caipirinha Limão 300ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '24.90', 380),
    ('Caipirinha Limão 500ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '29.90', 390),
    ('Caipirinha Morango 300ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '25.90', 400),
    ('Caipirinha Morango 500ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '30.90', 410),
    ('Caipirinha Maracujá 300ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '25.90', 420),
    ('Caipirinha Maracujá 500ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '31.90', 430),
    ('Caipirinha Abacaxi 300ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '25.90', 440),
    ('Caipirinha Abacaxi 500ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '32.90', 450),
    ('Caipirinha Frutas vermelhas 300ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '27.90', 460),
    ('Caipirinha Frutas vermelhas 500ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '32.90', 470),
    ('Caipirinha Amora 300ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '25.90', 480),
    ('Caipirinha Amora 500ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '30.90', 490),
    ('Caipirinha Cajá 300ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '27.90', 500),
    ('Caipirinha Cajá 500ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '32.90', 510),
    ('Caipirinha Uva 300ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '26.90', 520),
    ('Caipirinha Uva 500ml', 'Escolha: vodka, cachaça ou sem álcool', 'Caipirinhas', '31.90', 530),

    -- Sem álcool
    ('Refrigerante', 'Coca-Cola, Guaraná, Sprite ou Fanta', 'Bebidas', '7.90', 540),
    ('Suco de Laranja', NULL, 'Bebidas', '14.90', 550),
    ('Suco de Limão', NULL, 'Bebidas', '10.90', 560),
    ('Soda italiana', NULL, 'Bebidas', '18.90', 570),
    ('Água', 'Com ou sem gás', 'Bebidas', '5.90', 580),
    ('Água tônica', NULL, 'Bebidas', '7.90', 590),
    ('Red Bull', NULL, 'Bebidas', '18.90', 600),

    -- Cervejas 600 ml (valores conforme cardápio; balde c/5 unidades no PDF)
    ('Cerveja Heineken 600ml', 'Consulte promoção balde no salão', 'Cervejas', '23.90', 610),
    ('Cerveja Eisenbahn 600ml', NULL, 'Cervejas', '19.90', 620),
    ('Cerveja Amstel 600ml', NULL, 'Cervejas', '19.90', 630),
    ('Cerveja Original 600ml', NULL, 'Cervejas', '21.90', 640),

    -- Coquetéis frutados (página drinks)
    ('Rosa Tropical', 'Pitaya e maracujá', 'Coquetéis', '33.90', 650),
    ('Majestade', 'Abacaxi, amora e espuma de gengibre', 'Coquetéis', '34.90', 660),
    ('Amor de Verão', NULL, 'Coquetéis', '33.90', 670),
    ('Trio Tropical', 'Morango e maracujá; abacaxi, morango e espuma de gengibre', 'Coquetéis', '34.90', 680),
    ('Azedinha', NULL, 'Coquetéis', '34.90', 690),
    ('Summer', 'Morango, limão e espuma de limão; ou cajá, morango e espuma', 'Coquetéis', '34.90', 700),

    -- Vinhos
    ('Taça de vinho', 'Consulte rótulos no salão', 'Vinhos', '19.90', 710),
    ('Garrafa de vinho', 'Consulte rótulos no salão', 'Vinhos', '89.90', 720),
    ('Quentão', 'Opções: marshmallow, cravo, canela ou gengibre', 'Vinhos', '13.90', 730),
    ('Quentão da casa', NULL, 'Vinhos', '16.90', 740),

    -- Long neck
    ('Long neck Corona', NULL, 'Long neck', '15.90', 750),
    ('Long neck Heineken', NULL, 'Long neck', '15.90', 760),
    ('Long neck Amstel Ultra', NULL, 'Long neck', '14.90', 770),
    ('Smirnoff Ice', NULL, 'Long neck', '17.90', 780),
    ('Skol Beats', NULL, 'Long neck', '17.90', 790),

    -- Drinks clássicos
    ('Jagerbomb', 'Jägermeister e energético', 'Drinks clássicos', '37.90', 800),
    ('Negroni', 'Campari, gin e vermouth rosso', 'Drinks clássicos', '29.90', 810),
    ('Gin tônica', 'Escolha um xarope (consulte sabores)', 'Drinks clássicos', '27.90', 820),
    ('Moscow Mule', 'Vodka, limão, xarope de gengibre, tônica e espuma', 'Drinks clássicos', '29.90', 830),
    ('Maracujack', 'Jack Daniel''s, maracujá e Coca-Cola', 'Drinks clássicos', '34.90', 840),
    ('Mojito', 'Rum, limão, água com gás e hortelã', 'Drinks clássicos', '27.90', 850),
    ('Jack and Coke', 'Jack Daniel''s e Coca-Cola', 'Drinks clássicos', '32.90', 860),
    ('Cuba libre', 'Rum, Coca-Cola e limão', 'Drinks clássicos', '24.90', 870),
    ('Sex on the beach', 'Vodka, suco de laranja e grenadine', 'Drinks clássicos', '30.90', 880),
    ('Tropical gin', 'Gin, energético tropical e maracujá', 'Drinks clássicos', '31.90', 890),

    -- Doses
    ('Dose tequila', NULL, 'Doses', '23.90', 900),
    ('Dose jambu', NULL, 'Doses', '16.90', 910),
    ('Dose pequi com mel', NULL, 'Doses', '9.90', 920),
    ('Dose cachaça Salinas', NULL, 'Doses', '15.90', 930),
    ('Dose vodka', NULL, 'Doses', '14.90', 940),
    ('Dose Fireball', NULL, 'Doses', '18.90', 950),
    ('Dose Black Label', NULL, 'Doses', '26.90', 960),
    ('Dose Licor 43', NULL, 'Doses', '26.90', 970),
    ('Dose Jack Daniel''s', NULL, 'Doses', '26.90', 980),
    ('Dose Jägermeister', NULL, 'Doses', '26.90', 990),
    ('Dose Red Label', NULL, 'Doses', '20.90', 1000),
    ('Dose Jameson', NULL, 'Doses', '22.90', 1010),
    ('Dose gin', NULL, 'Doses', '16.90', 1020),

    -- Assinatura Giggs (drinks especiais)
    ('Verano', 'Vinho tinto, suco de laranja e moscatel', 'Drinks Giggs', '35.90', 1030),
    ('Chá da praia', 'Vodka, chá mate, abacaxi e limão taiti', 'Drinks Giggs', '33.90', 1040),
    ('Whisky spritz', 'Whisky, xarope de gengibre e refri de limão', 'Drinks Giggs', '36.90', 1050),
    ('Mon', 'Vodka, maracujá e licor de café', 'Drinks Giggs', '33.90', 1060),
    ('Licor 43 spritz', 'Licor 43 e refri de limão', 'Drinks Giggs', '37.90', 1070),
    ('Jardim botânico', 'Rum de coco, suco de abacaxi e refri de limão', 'Drinks Giggs', '33.90', 1080),
    ('Red Monster', 'Gin, purê de morango, pipeline punch, espuma de gengibre', 'Drinks Giggs', '35.90', 1090),
    ('Tanguã', 'Cachaça de banana, jambu e limão', 'Drinks Giggs', '34.90', 1100),

    -- Chopes artesanais (chope próprio — preços 300ml / 500ml / torre)
    ('Chope Pilsen 300ml', 'ABV 4,6% · IBU 6', 'Chopes', '9.90', 1110),
    ('Chope Pilsen 500ml', 'ABV 4,6% · IBU 6', 'Chopes', '13.90', 1120),
    ('Torre Chope Pilsen 2,5L', NULL, 'Chopes', '59.90', 1130),
    ('Chope Session IPA 300ml', 'ABV 5,4% · IBU 38', 'Chopes', '13.90', 1140),
    ('Chope Session IPA 500ml', 'ABV 5,4% · IBU 38', 'Chopes', '18.90', 1150),
    ('Torre Session IPA 2,5L', NULL, 'Chopes', '82.90', 1160),
    ('Chope Vinho branco 300ml', 'ABV 6,1% · IBU 7', 'Chopes', '12.90', 1170),
    ('Chope Vinho branco 500ml', 'ABV 6,1% · IBU 7', 'Chopes', '17.90', 1180),
    ('Torre Vinho branco 2,5L', NULL, 'Chopes', '79.90', 1190),
    ('Chope Giggs Verde 300ml', 'ABV 5,0% · IBU 9', 'Chopes', '12.90', 1200),
    ('Chope Giggs Verde 500ml', 'ABV 5,0% · IBU 9', 'Chopes', '17.90', 1210),
    ('Torre Giggs Verde 2,5L', NULL, 'Chopes', '79.90', 1220),
    ('Chope Red Ale 300ml', 'ABV 5,8% · IBU 27', 'Chopes', '13.90', 1230),
    ('Chope Red Ale 500ml', 'ABV 5,8% · IBU 27', 'Chopes', '18.90', 1240),
    ('Torre Red Ale 2,5L', NULL, 'Chopes', '82.90', 1250),
    ('Chope Vinho tinto 300ml', 'ABV 6,1% · IBU 6', 'Chopes', '12.90', 1260),
    ('Chope Vinho tinto 500ml', 'ABV 6,1% · IBU 6', 'Chopes', '17.90', 1270),
    ('Torre Vinho tinto 2,5L', NULL, 'Chopes', '79.90', 1280),
    ('Chope Weiss 300ml', 'ABV 6,6% · IBU 68', 'Chopes', '14.90', 1290),
    ('Chope Weiss 500ml', 'ABV 6,6% · IBU 68', 'Chopes', '19.90', 1300),
    ('Torre Weiss 2,5L', NULL, 'Chopes', '89.90', 1310),
    ('Chope IPA Mutum 300ml', 'ABV 5,3% · IBU 12', 'Chopes', '14.90', 1320),
    ('Chope IPA Mutum 500ml', 'ABV 5,3% · IBU 12', 'Chopes', '19.90', 1330),
    ('Torre IPA Mutum 2,5L', NULL, 'Chopes', '89.90', 1340),
    ('Chope IPA Cavalo 300ml', 'ABV 7,4% · IBU 70', 'Chopes', '19.90', 1350),
    ('Chope IPA Cavalo 500ml', 'ABV 7,4% · IBU 70', 'Chopes', '29.90', 1360),
    ('Torre IPA Cavalo 2,5L', NULL, 'Chopes', '129.90', 1370),
    ('Chope APA 300ml', 'ABV 5,1% · IBU 29', 'Chopes', '13.90', 1380),
    ('Chope APA 500ml', 'ABV 5,1% · IBU 29', 'Chopes', '18.90', 1390),
    ('Torre APA 2,5L', NULL, 'Chopes', '82.90', 1400),
    ('Chope Stout Submarino 300ml', 'Chope pilsen com dose de steinhaeger · ABV 4,1% · IBU 30', 'Chopes', '14.90', 1410),
    ('Chope Stout Submarino 500ml', NULL, 'Chopes', '19.90', 1420),
    ('Torre Stout Submarino 2,5L', NULL, 'Chopes', '89.90', 1430)
) AS v(name, description, category, price, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items m WHERE m.name = v.name
);

# Identidade visual Bendita

Fonte oficial dos arquivos de marca. O app web usa cópias em `public/brand/` (atualize lá se trocar o logo).

## Cores extraídas dos SVGs (IDV)

| Uso | Hex | Arquivo de referência |
|-----|-----|------------------------|
| **Verde principal** | `#018B45` | `bendita_logo_verde@1x.svg`, `B - Green@1x.svg` |
| **Amarelo / destaque** | `#FFC400` | `bendita_logo_amarelo@1x.svg`, `B - Yellow@1x.svg` |

Essas cores estão espelhadas em `src/app/globals.css` (`--color-brand-*` e `--color-gold-*`).

## Arquivos na pasta

- **Marca “B”**: `B - Green@1x.svg`, `B - Yellow@1x.svg`, `B - White@1x.svg`, etc.
- **Logotipo completo**: `bendita_logo_verde@1x.svg`, `bendita_logo_amarelo@1x.svg`, `bendita_logo_Branco@1x.svg`, variações azul/vermelho/bege/preto.

## Canva

O link do projeto no Canva não pode ser aberto por ferramentas automáticas. Para alinhar novos layouts:

1. Exporte SVG ou PNG da Canva.
2. Substitua ou adicione em `Branding/IDV bendita izabel/`.
3. Copie os assets usados no app para `public/brand/` e ajuste `globals.css` se surgirem novos hex.

## App Next.js

- Logos servidos: `public/brand/mark-green.svg`, `wordmark-green.svg`, `wordmark-white.svg`
- Componentes: `src/components/brand/BrandMark.tsx`, `BrandWordmark.tsx`

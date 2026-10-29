# Prazo Certo — instruções para quem for desenvolver

SaaS multiempresa de vencimentos (PMOC, laudos, ART, contratos, manutenções) para empresas de climatização.
Next.js 15 (App Router) + Supabase (Postgres/Auth/Storage, RLS por empresa) + Vercel. Interface em pt-BR.

## Design System 2.0 é obrigatório
Antes de criar ou alterar qualquer tela, leia `docs/design-system/README.md`.
- Use os componentes de `components/ui/` (Cabecalho, Metrica, Etiqueta, Selo, Aviso, Vazio, Confirmar, BotaoEnviar, Upload, Toast, Logo, TemaToggle) e `components/ItemLinha`.
- Cores, espaços, raios e tipos **só** via `var(--pc-*)` de `styles/tokens.css`. Não adicionar hex novo.
- Cor de status (vencido/vence logo/em dia) nunca como decoração. Um botão primário por tela.
- Toda tela precisa funcionar no tema claro e no escuro, no celular (abas 72px, toque 44px, campos 16px) e no desktop (sidebar 280px).
- Ações destrutivas usam `<Confirmar>`; sucesso volta com toast via `redirect(\`...?${qsToast(título, descrição)}\`)` (`lib/toast.ts`).
- Textos: frases normais, verbo no início, sem caixa alta em rótulos, erro diz o que fazer.
- Componente novo: crie em `components/ui/`, estilize em `app/globals.css` e adicione ao catálogo `app/design-system/page.tsx`.

## Regras de dados
- Toda consulta filtra por `empresa_id` (RLS também garante). `createAdminClient()` ignora RLS: use só no servidor e sempre filtrando pela empresa.
- Migrações: aplicar no Supabase e registrar em `supabase/schema.sql`.
- Lembretes: regras em `lib/lembretes.ts` (envio diário via `/api/cron/lembretes`, Vercel Cron).

## Verificação antes de publicar
`npx tsc --noEmit` e `npx next build` sem erros; conferir as telas alteradas no claro e no escuro, em 390px e 1366px.

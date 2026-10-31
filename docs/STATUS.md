# Prazo Certo — onde paramos (30/10/2026)

## No ar
- Site: https://prazo-certo-xi.vercel.app (Vercel, projeto `prazo-certo`, publica a cada push na `main`)
- Código: github.com/coffeeassessoria/prazo-certo
- Banco: Supabase, projeto `prazo-certo-sp` (id `aujxgakmvlthpdndohht`, região sa-east-1 São Paulo), ligado à Vercel pela integração Supabase→Vercel
- Banco antigo `prazo-certo` (id `qdzdolvuqtykfsvbohrs`, us-east-1): PAUSADO, guardado como cópia de segurança
- Admin da plataforma: arenales.vinicius@gmail.com
- Catálogo do Design System: `/design-system` · demonstração: `/demo`

## Pronto
- Multiempresa com isolamento por RLS; painel Admin para criar clientes (senha provisória → troca obrigatória no 1º login → quiz da empresa)
- Quiz de boas-vindas (7 perguntas) e cadastro de vencimento guiado em 4 etapas
- Renovar / concluir / reabrir / excluir, histórico, anexos (PDF/foto), clientes
- Lembretes diários por e-mail (Vercel Cron 7h Cuiabá, SMTP Hostinger `lembretes@coffeeassessoria.com.br`)
- Esqueci minha senha (link por e-mail, 1 hora)
- Design System 2.0 completo, tema claro e escuro, PWA
- Variáveis de e-mail (SMTP_*, EMAIL_FROM, CRON_SECRET, APP_URL) cadastradas na Vercel

## Pendente
1. **Conferir o login no banco novo** (São Paulo) e o Vanderlei recadastrar o documento que não foi salvo.
2. **Testar o e-mail**: Ajustes → "Enviar e-mail de teste".
3. **Google Agenda**: criar credencial OAuth no Google Cloud (Calendar API, app "Em produção",
   redirect `https://prazo-certo-xi.vercel.app/api/google/callback`) e cadastrar
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` na Vercel.
4. Proteção contra senhas vazadas (Supabase): não disponível no plano gratuito.
5. WhatsApp: comprar número dedicado e ligar o webhook da Evolution (`/api/whatsapp?token=...`).
6. Vídeo animado de tutorial e guia de uso didático.

## Feito em 30/10
- Banco migrado para São Paulo com todos os dados (usuários, senhas, empresa Thermoplus, cliente).
- Cadastro público desligado no Supabase ("Allow new users to sign up" = off).

## Próximas ideias
- Cadastro de vencimento pelo WhatsApp; resumo semanal no WhatsApp
- Aviso para o cliente final ("seu PMOC vence em 30 dias")
- Importar planilha de vencimentos; cobrança recorrente (Asaas/Mercado Pago)

## Primeira etapa de demandas de climatização (código preparado em 30/10)
- Branch `codex/demandas-climatizacao`: responsável, situação, próxima ação, retorno, vínculo ao vencimento e histórico de contatos.
- Exemplos de orçamento, agendamento, peças, documentos e pós-atendimento; demonstração interativa.
- Migração incremental e guia de ativação em `docs/DEMANDAS.md`.
- Ainda não aplicado no Supabase nem publicado na main. O banco deve ser migrado antes da publicação.

# Prazo Certo — onde paramos (29/10/2026)

## No ar
- Site: https://prazo-certo-xi.vercel.app (Vercel, projeto `prazo-certo`, publica a cada push na `main`)
- Código: github.com/coffeeassessoria/prazo-certo
- Banco: Supabase, projeto `prazo-certo` (id `qdzdolvuqtykfsvbohrs`, região us-east-1)
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
1. **Testar o e-mail**: Ajustes → "Enviar e-mail de teste" (ainda não testado).
2. **Google Agenda**: criar credencial OAuth no Google Cloud (Calendar API, app "Em produção",
   redirect `https://prazo-certo-xi.vercel.app/api/google/callback`) e cadastrar
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` na Vercel.
3. **Empresa do Vanderlei** ("Empresa de Vanderlei"): acesso criado, ainda não fez o 1º login nem o quiz.
4. Desligar "Allow new users to sign up" no Supabase (Authentication → Email), se ainda não feito.
5. Opcional: recriar o Supabase em São Paulo (sa-east-1) para mais velocidade, antes de ter dados reais.
6. WhatsApp: comprar número dedicado e ligar o webhook da Evolution (`/api/whatsapp?token=...`).
7. Vídeo animado de tutorial (quando as telas estiverem finais) e guia de uso didático.

## Próximas ideias
- Cadastro de vencimento pelo WhatsApp; resumo semanal no WhatsApp
- Aviso para o cliente final ("seu PMOC vence em 30 dias")
- Importar planilha de vencimentos; cobrança recorrente (Asaas/Mercado Pago)

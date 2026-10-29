# Prazo Certo — vencimentos de documentos, contratos e manutenções

Sistema web multiempresa (SaaS) para empresas de serviço técnico (ex.: climatização) controlarem
vencimentos de PMOC, laudos, ART, contratos e manutenções preventivas dos clientes.

- **Painel** com vencidos / vencem em breve / em dia, filtros por cliente e tipo
- **Renovar** em 1 clique: fecha o item e cria o próximo vencimento (sugerido pela repetição)
- **Anexos** (PDF/foto do documento) e **histórico** de renovações
- **Google Agenda**: cada vencimento vira evento com alertas no celular
- **WhatsApp** (Evolution API): consulta por comandos (`vencimentos`, `vencidos`, `semana`, `cliente X`…)
- **Multiempresa**: cada empresa só enxerga os próprios dados (Row Level Security no banco)
- **Admin da plataforma**: criar empresas, usuários, suspender acesso, mensalidade
- Funciona no PC e no celular; pode ser instalado na tela inicial (PWA)

Interface: **Design System 2.0** — guia em `docs/design-system/README.md`, catálogo vivo em `/design-system`, regras para devs em `CLAUDE.md`.

Stack: Next.js 15 + Supabase (Postgres, Auth, Storage). Hospedagem: Vercel **ou** sua VPS (Docker).

---

## 1. Supabase (banco + login) — ~10 min

1. Crie um projeto em <https://supabase.com> (região São Paulo).
2. **SQL Editor** → cole e rode todo o arquivo `supabase/schema.sql`.
3. **Authentication → Sign In / Providers → Email**: desative *Allow new users to sign up*
   (só você cria acessos pelo painel Admin).
4. **Authentication → Users → Add user**: crie o SEU usuário (marque *Auto Confirm*).
5. **SQL Editor**, para virar o dono da plataforma (troque o e-mail):

```sql
insert into public.perfis (user_id, nome, email, papel, is_superadmin)
select id, 'Vinicius', email, 'admin', true
from auth.users where email = 'seu@email.com';
```

6. **Project Settings → API**: copie *URL*, *anon key* e *service_role key* para o `.env`.

## 2. Google Agenda — ~10 min

1. <https://console.cloud.google.com> → novo projeto → **APIs e serviços → Biblioteca** → ative **Google Calendar API**.
2. **Tela de permissão OAuth**: tipo *Externo*, nome do app, seu e-mail. Escopos: `.../auth/calendar.events`, `openid`, `email`.
3. **Publique o app (status "Em produção")**. Em modo *Teste* o Google derruba a conexão a cada 7 dias.
   Sem a verificação do Google, quem conectar verá o aviso "app não verificado" → *Avançado* → *Continuar*. Funciona normalmente;
   a verificação oficial só é necessária quando passar de 100 usuários conectados.
4. **Credenciais → Criar ID do cliente OAuth → Aplicativo da Web**.
   URI de redirecionamento autorizado: `https://SEU-DOMINIO/api/google/callback`
5. Copie *Client ID* e *Client Secret* para o `.env`.

Cada empresa conecta a própria agenda em **Configurações → Conectar Google Agenda**.
Ao conectar, todos os vencimentos ativos já cadastrados são enviados para a agenda.

## 3. Publicar

### Opção A — Vercel (mais simples)
1. Suba esta pasta para um repositório no GitHub.
2. Vercel → *Add New Project* → importe o repositório.
3. Cadastre as variáveis do `.env.example` em *Environment Variables* e faça o deploy.
4. Ajuste `APP_URL` para o domínio final (ex.: `https://prazo.coffeeassessoria.com.br`).

### Opção B — Sua VPS Hostinger (Docker)
```bash
cp .env.example .env   # preencha
docker compose up -d --build
```
O app sobe na porta 3010. Aponte um subdomínio para ele no seu proxy (Nginx/Traefik/Caddy) com HTTPS.

## 4. Lembretes por e-mail

Todo dia às 7h (horário de Cuiabá) a Vercel chama `/api/cron/lembretes` (configurado em `vercel.json`)
e cada empresa recebe **um e-mail-resumo** com o que precisa de atenção.

Quando cada item é avisado (uma vez cada):
- ao entrar no prazo de aviso do item (ex.: 30 dias antes)
- 7 dias antes, 1 dia antes e no dia
- depois de vencido, uma vez por semana até ser renovado ou concluído

Configuração:
1. Na Hostinger, crie a caixa `lembretes@coffeeassessoria.com.br` (Emails → Criar conta).
2. Na Vercel, cadastre `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` e `CRON_SECRET` (ver `.env.example`).
3. Em **Configurações → Lembretes por e-mail**, use **Enviar e-mail de teste agora**.

## 5. WhatsApp (Evolution API)

Configure o webhook da instância para chamar o sistema quando chegar mensagem:

- URL: `https://SEU-DOMINIO/api/whatsapp?token=VALOR_DE_WHATSAPP_WEBHOOK_TOKEN`
- Evento: `MESSAGES_UPSERT`

Pelo Evolution Manager (Instância → Webhook) ou pela API:

```bash
curl -X POST "$EVOLUTION_API_URL/webhook/set/$EVOLUTION_INSTANCE" \
  -H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json" \
  -d '{"webhook":{"enabled":true,"url":"https://SEU-DOMINIO/api/whatsapp?token=SEU_TOKEN","events":["MESSAGES_UPSERT"]}}'
```

Regras de segurança do bot:
- Só responde a números cadastrados em **Configurações → WhatsApp** (ou no Admin) de empresas **ativas**.
- Só responde a comandos conhecidos; qualquer outra conversa é ignorada.
- Cada número só vê os dados da própria empresa.
- **Recomendado:** usar uma instância/número exclusivo para o sistema, separado do WhatsApp da agência.

Comandos: `vencimentos` · `vencidos` · `hoje` · `semana` · `mes` (ou `60`, `90`) · `cliente nome` · `ajuda`

## 6. Primeiro uso

1. Entre com o seu usuário → **Admin** → *Nova empresa* (ex.: empresa do seu irmão), com o e-mail dele e o WhatsApp.
2. O sistema gera a senha e um texto pronto para enviar no WhatsApp.
3. No primeiro login ele responde o **quiz de boas-vindas** (empresa, área, o que controla, antecedência,
   quem recebe os lembretes, clientes) e cai direto no cadastro do primeiro vencimento.
4. O painel mostra uma lista de **primeiros passos** até ele ter 3 vencimentos cadastrados.
5. No celular: abrir o site no Chrome/Safari → *Adicionar à tela inicial*.

No Admin você também pode: suspender/reativar empresas (bloqueia o acesso, útil para mensalidade em atraso),
gerar nova senha para um usuário e **Visualizar** os dados de uma empresa para dar suporte.

## Variáveis de ambiente

Veja `.env.example`. `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET` e `EVOLUTION_API_KEY` são segredos: nunca no navegador nem no Git.

## Estrutura

```
app/(app)/page.tsx          painel de vencimentos
app/(app)/itens/...         cadastro, detalhe, renovar, concluir, excluir
app/(app)/clientes          clientes da empresa
app/(app)/config            Google Agenda, WhatsApp, usuários, senha
app/(app)/admin             painel do dono da plataforma
app/api/google/*            conexão OAuth com Google Agenda
app/api/whatsapp            webhook da Evolution API
lib/bot.ts                  comandos e respostas do WhatsApp
lib/google.ts               criação/atualização dos eventos
supabase/schema.sql         tabelas + isolamento entre empresas (RLS)
```

## Próximos passos sugeridos

- Cadastro de vencimento pelo WhatsApp (ex.: "novo PMOC Frigorífico 15/03/2027 anual")
- Resumo automático toda segunda-feira no WhatsApp
- Cobrança recorrente (Asaas/Mercado Pago) suspendendo a empresa automaticamente se não pagar
- Enviar aviso ao cliente final ("seu PMOC vence em 30 dias, vamos agendar?") — gera venda de renovação
- Importação de planilha com os vencimentos atuais

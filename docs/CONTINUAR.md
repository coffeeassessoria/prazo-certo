# Continuar em outro notebook

Estado registrado em 31/10/2026. O repositório contém a aplicação, migrações, testes, Design System e fontes do primeiro motion.

## Baixar e executar

Tenha Git e Node.js. A versão usada neste computador é **24.14.1**, registrada em `.nvmrc`.
Com nvm instalado:

```bash
git clone https://github.com/coffeeassessoria/prazo-certo.git
cd prazo-certo
nvm install
nvm use
npm ci
npm run dev
```

Sem nvm, instale a versão indicada em `.nvmrc` pelo gerenciador de sua preferência e execute os demais comandos.
Abra `http://localhost:3000/demo`, `/demo/acompanhamentos`, `/demo/pmoc` ou `/design-system`.
As demonstrações usam dados fictícios e podem ser abertas sem configurar uma conta Supabase.

## Configurar o sistema autenticado

```bash
cp .env.example .env.local
```

Preencha os valores necessários usando o projeto existente na Vercel/Supabase e defina `APP_URL=http://localhost:3000` para a instalação local.
O modelo `.env.example` contém apenas exemplos; não é um backup das credenciais de produção.
As variáveis reais permanecem nas configurações dos serviços. Para copiar pelo painel da Vercel, acesse o projeto `prazo-certo` → Settings → Environment Variables com sua conta autorizada.

Para login e dados: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
SMTP, Google Agenda e Evolution API têm variáveis separadas, documentadas no README e no modelo.
A conexão Google local também depende de um redirect OAuth autorizado para o endereço local.

## Banco existente e instalação nova

O banco em uso é o Supabase **prazo-certo-sp**, região São Paulo, projeto `aujxgakmvlthpdndohht`.
As migrações de demandas e de PMOC/documentos já foram aplicadas nesse projeto em 30/10/2026.
Continuar em outro computador usando o mesmo Supabase não exige recriar o projeto nem executar novamente o schema.

Para um banco novo de desenvolvimento, use `supabase/schema.sql`, que consolida a estrutura inicial e essas migrações.
Para uma instalação anterior sem os módulos novos, use as migrações incrementais na ordem indicada em `docs/DEMANDAS.md` e `docs/PMOC.md`.
O Git guarda a estrutura e o código; dados, usuários, arquivos privados e configurações dos serviços permanecem nesses serviços.

## Onde continuar

| Assunto | Local |
|---|---|
| Estado entregue e pendências reais | `docs/STATUS.md` |
| Regras para Codex e outros agentes | `AGENTS.md` e `CLAUDE.md` |
| Interface azul/champanhe | `docs/design-system/README.md`, `styles/tokens.css` |
| Demandas e retornos | `docs/DEMANDAS.md` |
| PMOC e PDF timbrado | `docs/PMOC.md` |
| Plano dos primeiros 10 assinantes | `docs/AQUISICAO.md` |
| Vídeo, capturas, fontes e renderizador | `marketing/motion-prazo-certo/` |
| Estudos anteriores de cores | `docs/design-system/exploracoes/` |

O histórico completo da conversa não acompanha um clone do GitHub. Estes documentos registram as decisões necessárias para retomá-lo.
Ao abrir o projeto no Codex do outro notebook, peça: **“Leia AGENTS.md, docs/CONTINUAR.md e docs/STATUS.md e continue a partir desse estado.”**

## Verificar e publicar

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Os testes usam infraestrutura simulada/PGlite. Não substituem o piloto autenticado e os testes das integrações externas descritos no status.
Trabalhe em uma branch e revise antes de mesclar na `main`: a Vercel publica automaticamente os commits da `main`.
Banco e migrations precisam estar preparados antes de publicar uma mudança que dependa deles.

## Operação comercial e offline

A etapa foi integrada à `main` no PR #5 e publicada. A migração de 31/10 já foi aplicada no Supabase. Consulte `OPERACAO.md` para o fluxo, limites do offline e roteiro de teste; o início de `STATUS.md` registra a publicação e as verificações. Para continuar em outro notebook, use a `main` atualizada depois do clone.

# Prazo Certo — onde paramos (31/10/2026)

Leia `CONTINUAR.md` para preparar outro notebook e `../AGENTS.md`/`../CLAUDE.md` para as regras de desenvolvimento.

## Produção e código

- Site: https://prazo-certo-xi.vercel.app
- Repositório: https://github.com/coffeeassessoria/prazo-certo — branch principal `main`.
- Vercel: projeto `prazo-certo`, com publicação automática da `main`.
- Supabase em uso: **prazo-certo-sp**, projeto `aujxgakmvlthpdndohht`, região São Paulo.
- O projeto antigo `prazo-certo`, `qdzdolvuqtykfsvbohrs`, foi registrado como pausado e mantido como cópia de segurança; não houve nova verificação desse estado nesta etapa.
- As credenciais ficam nos serviços; o Git contém apenas `.env.example`.

## Entregas integradas e publicadas

| Entrega | Referência |
|---|---|
| Demandas de climatização, responsável, situação, próxima ação e histórico; PMOC, inventário, timbrado/logo e PDF A4 versionado | [PR #1](https://github.com/coffeeassessoria/prazo-certo/pull/1), merge `684f1e1c84d145bb18769b2a8d35eec4b43bcf27` |
| Destaque champanhe em ações e seleções, com azul preservado; temas claro/escuro e catálogo atualizado | [PR #2](https://github.com/coffeeassessoria/prazo-certo/pull/2), merge `d202632501d1e4caa5ed84ec2c1ac571c632c357` |
| Capturas da página inicial refeitas; imagens sem o corte de altura; dimensões corrigidas | [PR #3](https://github.com/coffeeassessoria/prazo-certo/pull/3), merge `7d26cd7eb24dc3cee5c444a49065cd6f7d3f0142` |

Também existem: painel multiempresa, clientes, vencimentos, renovação/conclusão e anexos; Admin da plataforma; quiz e recuperação de senha; PWA; integração opcional Google Agenda; bot Evolution API e cron de lembretes por e-mail. Existência de código não confirma configuração de cada integração externa.

## Banco e arquivos

Aplicadas no Supabase em uso em **30/10/2026**:

1. `supabase/migrations/20261030_demandas_climatizacao.sql`.
2. `supabase/migrations/20261030_pmoc_documentos.sql`.

Na publicação, foram conferidas as oito tabelas novas com RLS e os buckets privados `identidades` (2 MB) e `documentos` (10 MB).
O PDF fictício baixado da produção foi conferido com quatro páginas A4, logo e rodapés.
Para desenvolvimento no mesmo projeto, não recriar o banco nem rodar o schema completo. Para um banco novo, `supabase/schema.sql` inclui essas estruturas.

## Verificação já registrada

- 30 testes passaram; incluem migrações em PGlite, isolamento, demandas, PMOC e PDF.
- Typecheck e build de produção passaram nas entregas funcionais e visuais; a correção dos prints também teve build concluído.
- Temas claro/escuro e layout desktop/mobile foram inspecionados nas alterações do champanhe.
- Página inicial corrigida conferida em desktop e 390 px, sem corte dos arquivos nem rolagem horizontal.
- Publicações dos três PRs concluídas na Vercel e resultado conferido no site.

Esses registros não substituem um teste operacional completo com usuário e dados reais.

## Pendências antes dos primeiros clientes

1. **Piloto autenticado em produção:** confirmar login/admin/membro; cadastrar cliente, unidade, ambiente e aparelho; enviar logo, emitir e baixar PDFs privados; substituir o logo e conferir preservação das versões anteriores. Testar também demanda vinculada, contato, conclusão e reabertura mantendo o prazo original.
2. **Lembretes reais:** testar o e-mail em Ajustes e acompanhar execução do cron/destinatários. O fluxo externo não foi exercitado na validação local de demandas/PMOC.
3. **Google Agenda:** confirmar configuração das credenciais, redirect OAuth e sincronização com conta real. O registro anterior indicava configuração pendente.
4. **WhatsApp operacional:** confirmar número dedicado, Evolution API e webhook; o registro anterior indicava integração externa pendente.
5. **Oferta e assinatura:** confirmar destino de contato comercial, link de pagamento e processo de ativação. Cobrança recorrente automática ainda é uma ideia, não entrega confirmada.

## Marketing e aquisição

- Objetivo do usuário: primeiros **10 assinantes em todo o Brasil**, inclusive público frio por anúncios.
- Orçamento informado: **até R$ 500** para o primeiro teste de 14 dias; planejamento em `AQUISICAO.md`.
- Primeiro motion pronto em `../marketing/motion-prazo-certo/`: 26 segundos, 1080 × 1920, capturas fictícias da aplicação, sem locução nem trilha. MP4, fontes, capturas, código e manifesto incluídos.
- Campanhas não foram criadas, publicadas ou pagas. Não há métricas reais de conversão ou CAC.

## Melhorias discutidas, ainda sem implementação confirmada

- Dividir o formulário longo de PMOC em etapas e melhorar retomada de rascunho.
- Corrigir o confinamento de foco com Shift+Tab no modal `Confirmar`.
- Melhorar acesso rápido/navegação ativa do PMOC no celular e feedback de erros junto aos campos.
- Revisar mensagens que misturam situação de prazo, processo e documento e pequenas inconsistências de linguagem do guia.
- Importação de planilhas, aviso ao cliente final, resumo/cadastro por WhatsApp e cobrança recorrente.

## Escopo de PMOC

O PDF é um plano editável baseado na estrutura inicial documentada em `PMOC.md`; não emite ART/TRT, não verifica habilitação e não contém assinatura eletrônica.
Periodicidades e adequação técnica continuam sob revisão do profissional. A versão “para assinatura” preserva a declaração de revisão e os dados no snapshot.

## Continuidade

O backup de portabilidade inclui os materiais do motion e os estudos de cores que estavam fora do repositório.
Foram encontradas 27 cópias locais com sufixo ` 2`, comparadas byte a byte com os respectivos originais já versionados. Eram idênticas e foram preservadas em uma pasta separada neste notebook; os arquivos canônicos continuam no Git.
Pastas geradas (`node_modules`, `.next`), ambientes Python e segredos não fazem parte do backup Git; são reinstalados/configurados conforme `CONTINUAR.md`.

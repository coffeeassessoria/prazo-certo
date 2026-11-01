# Prazo Certo — onde paramos (31/10/2026)

Leia `CONTINUAR.md` para preparar outro notebook e `../AGENTS.md`/`../CLAUDE.md` para as regras de desenvolvimento.

## Assinatura do atendimento na tela

Implementada a coleta de aceite do representante antes da conclusão da OS: resumo para conferência, termo, desenho com dedo/caneta/mouse, vínculo com conteúdo/empresa/versão/coletor, fila offline e reprodução no PDF A4. Dados são privados por empresa, com até 800 pontos; não há nova assinatura de serviço externo. Detalhes em `ASSINATURAS.md`.

Migração `20261101_assinatura_atendimento.sql` aplicada no Supabase `prazo-certo-sp`, consulta `990731c6-1cdd-4356-b589-e163ac573475` (Success). Teste transacional `cbcce48f-0364-4a92-a38d-dfa42269ee80` validou aceite, hash, relógio do servidor, rejeição de conteúdo alterado, reenvio, PMOC e preservação; dados fictícios revertidos por rollback. Os 60 testes passaram, incluindo fila durável e reprodução do hash. Fluxo demonstrativo conferido no navegador em 390 e 1366 px, claro/escuro, com eventos de ponteiro reais, limpeza automática do desenho após edição e bloqueio após conclusão. PDF A4 com aceite renderizado e inspecionado. O teste no celular físico e o piloto autenticado completo da aplicação continuam necessários. O aceite não verifica identidade nem representa certificado digital/assinatura do responsável técnico.

## Relatórios de manutenção e fotos

Integrado à `main` pelo [PR #6](https://github.com/coffeeassessoria/prazo-certo/pull/6), merge `6b96865ab9141272c9838ff48711f01bc59d34d6`: OS vinculada a unidade/aparelhos, ciência declarada, fotos privadas otimizadas, PDF A4, execução de rotinas PMOC e retorno para a próxima manutenção. Detalhes em `RELATORIOS.md`. Migração `20261031_relatorios_fotos.sql` aplicada no Supabase `prazo-certo-sp` em 31/10/2026 (consulta `28d4df83-32df-4059-82a0-4888f955a282`, Success). Verificação transacional `3271b1a3-f2d5-4c69-a891-af4e0301aa9b` confirmou relatório, snapshot, reenvio, PMOC, retorno, preservação e reserva de fotos; todos os dados fictícios foram revertidos por rollback. Conferidos bucket privado/limite e ausência de escrita direta pelo usuário. Grant explícito de leitura/exclusão ao service role aplicado na verificação e incluído na migração. 56 testes e build/typecheck passaram; teste de navegador recuperou a foto após recarregar offline e confirmou exatamente um upload/recibo na reconexão. Vercel confirmou a publicação funcional: [deployment](https://vercel.com/vinicius-arenales-projects/prazo-certo/DsJiyse2dUZR1k7ePQ5HobTuww9e). A demonstração publicada concluiu OS com foto e baixou um PDF de três páginas A4. Recuperação de fotos de formulários fechados antes de salvar também foi conferida no navegador local. As rotas de operação e PDF negaram acesso anônimo; ajuste de middleware mantém também a resposta JSON da API de fotos para sessão expirada. O piloto autenticado de upload real ao Storage e câmera de celular continua necessário.

## Nova etapa — operação e offline

Integrado à `main` pelo [PR #5](https://github.com/coffeeassessoria/prazo-certo/pull/5), merge `2dbdc16cce84a97bc687d09648d1a96588d17560`: orçamentos/PDF, OS/checklist/PDF, demandas offline, financeiro gerencial para administradores e importação CSV/XLSX de clientes. Detalhes, limites e validação em [OPERACAO.md](OPERACAO.md).

Migração `20261031_operacao_offline.sql` aplicada no Supabase `prazo-certo-sp` em 31/10/2026 (horário local), com `Success. No rows returned`. Consulta de implantação `f5f8f671-32f0-4a06-9734-cc0c2b971fd6`. Entrega no PR #5. Conferidas as três tabelas com RLS e sem escrita direta para authenticated. Adicionadas referências geradas para impedir exclusão de clientes/responsáveis/orçamentos em uso. Teste transacional no banco real, com papel authenticated, executou orçamento, reenvio, aprovação, OS, recebível, baixa parcial, demanda e importação; todas as alterações de teste foram revertidas por rollback. Vercel confirmou a publicação em produção: [deployment](https://vercel.com/vinicius-arenales-projects/prazo-certo/AvTkGB2jZH2Hj251FhTQGpkKzfa3). Conferidos `/demo/operacao` e `/operacao` com HTTP 200; APIs de operação, importação e PDF devolvem 401 sem sessão; service worker publicado com no-store e escopo da aplicação.

Build/typecheck e 45 testes passaram na preparação. Validação de navegador do offline usou API fictícia local, com queda real do servidor, reabertura, persistência e reconexão; o piloto no navegador com uma conta real da aplicação ainda é necessário.

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

- 45 testes passaram; incluem migrações em PGlite, isolamento, demandas, PMOC/PDF, orçamento, OS, financeiro, importação e IndexedDB.
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
- Revalidar o modal `Confirmar` após a melhoria de confinamento de foco nesta branch.
- Melhorar acesso rápido/navegação ativa do PMOC no celular e feedback de erros junto aos campos.
- Revisar mensagens que misturam situação de prazo, processo e documento e pequenas inconsistências de linguagem do guia.
- Aviso ao cliente final, resumo/cadastro por WhatsApp e cobrança recorrente. A importação de clientes foi publicada no PR #5.

## Escopo de PMOC

O PDF é um plano editável baseado na estrutura inicial documentada em `PMOC.md`; não emite ART/TRT, não verifica habilitação e não contém assinatura eletrônica.
Periodicidades e adequação técnica continuam sob revisão do profissional. A versão “para assinatura” preserva a declaração de revisão e os dados no snapshot.

## Continuidade

O backup de portabilidade inclui os materiais do motion e os estudos de cores que estavam fora do repositório.
Foram encontradas 27 cópias locais com sufixo ` 2`, comparadas byte a byte com os respectivos originais já versionados. Eram idênticas e foram preservadas em uma pasta separada neste notebook; os arquivos canônicos continuam no Git.
Pastas geradas (`node_modules`, `.next`), ambientes Python e segredos não fazem parte do backup Git; são reinstalados/configurados conforme `CONTINUAR.md`.

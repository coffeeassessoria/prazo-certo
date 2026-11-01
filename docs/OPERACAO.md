# Operação comercial e de campo — primeira etapa

## Fluxo entregue

- `/operacao`: orçamento com serviços/materiais, quantidades fracionadas, desconto, condições e PDF A4 usando a identidade/logo da prestadora.
- Situações da proposta: rascunho, enviado, aprovado, recusado e cancelado. Aprovado preserva valores; uma negociação diferente pede outra proposta.
- Botão Agendar retorno cria uma demanda no fluxo existente, com responsável, data e próxima ação. O usuário decide quando cobrar a aprovação.
- Proposta aprovada preenche uma OS com cliente, vínculo e etapas dos serviços. Também é possível cadastrar OS avulsa. Conclusão exige checklist completo e resultado; relatório A4 disponível conectado.
- Administradores podem criar um recebível da proposta, receitas/despesas avulsas e baixas parciais. Aprovar orçamento ou criar recebível não soma dinheiro ao saldo realizado. Baixas são preservadas. Um orçamento possui no máximo uma OS e um recebível nesta etapa.
- `/clientes/importar`: CSV UTF-8/XLSX, modelo CSV, prévia completa, erros por linha, confirmação e resultado. Até 500 clientes, 2 MB; primeira aba visível no XLSX. Não aceita fórmulas/mesclagens. Confirmação transacional, não altera cadastros existentes; documento normalizado ou, sem documento, nome normalizado define repetidos.
- `/demo/operacao`: exemplos fictícios interativos, sem API nem gravação na empresa. Recarregar a demonstração restaura os exemplos.

## Offline

É necessário abrir `/operacao` conectado e preparar cada aparelho de confiança. Somente a estrutura pública e os arquivos estáticos entram no CacheStorage; APIs, páginas autenticadas e PDFs não são armazenados pelo service worker. Dados ficam no IndexedDB separados por usuário e empresa. O financeiro fica fora dessa cópia local.

O aparelho conserva até 500 registros comerciais/financeiros consultados (financeiro descartado antes de persistir), 500 demandas recentes e 2.000 clientes. Não representa um backup da empresa nem garante toda a carteira/histórico em contas maiores. Nesta etapa, novos clientes e importações requerem conexão.

A fila durável usa UUID por envio e versão esperada por registro. O banco mantém recibos transacionais: repetir um envio após falha de conexão devolve o mesmo resultado. Um rascunho que nunca foi enviado pode ser editado offline. Após uma tentativa sem confirmação, o registro aguarda sincronização, preservando a identidade do envio; outros registros continuam disponíveis. Conflitos e erros preservam os dados locais e exigem revisão explícita, sem sobrescrever automaticamente o servidor.

A sincronização acontece com a página aberta: ao reconectar, voltar à janela, a cada 30 segundos ou no botão Sincronizar agora. Fechar o navegador não garante envio em segundo plano. Uma sessão expirada pausa os envios até entrar novamente na conta de origem. Trocar de conta não envia a fila anterior usando a nova empresa.

Ao sair, dados sincronizados podem ser limpos. Se houver pendências, o usuário pode sincronizar ou encerrar a sessão mantendo os envios bloqueados para o próximo acesso autenticado. A rota de saída também bloqueia o acesso offline, inclusive quando acionada fora da nova tela.

O navegador pode remover o armazenamento, especialmente em modo privado, falta de espaço ou limpeza manual. A aplicação solicita persistência quando disponível, mas a concessão depende do navegador. Não limpar dados nem trocar de aparelho antes de sincronizar. PDF, importação, financeiro, fotos/anexos e emissão PMOC continuam precisando de conexão; o checklist desta OS ainda não alimenta automaticamente as execuções do PMOC.

## Banco e implantação

Aplicar **somente** `supabase/migrations/20261031_operacao_offline.sql` no projeto `prazo-certo-sp`, depois das duas migrações de 30/10. A mesma definição está anexada em `supabase/schema.sql` para bancos novos. Não executar o schema completo na produção existente.

A migração adiciona versão aos itens e três tabelas (`operacao_registros`, `operacao_recibos`, `operacao_eventos`). Leitura por empresa ativa; financeiro somente para administradores. Escrita dos registros e recibos exclusivamente pelas funções autenticadas. Referências geradas impedem excluir clientes, responsáveis ou propostas ainda vinculados a registros da operação. Não remove dados existentes. Os drops recriam apenas gatilhos e políticas da própria migração.

APIs verificam sessão, empresa ativa, conta de origem e origem da requisição. O cliente não escolhe a empresa da gravação: a função deriva a empresa de `auth.uid()`. Valores são recalculados no Postgres em centavos, com arredondamento por linha. Alterações da operação são auditadas; demandas reutilizam o histórico existente.

As APIs precisam das mesmas variáveis Supabase que a aplicação já utiliza; não há nova credencial. HTTPS é necessário em produção para o service worker. A migração deve ser confirmada antes do merge/publicação da aplicação.

## Validação e limites desta etapa

- Testes em PGlite executam as migrações duas vezes, conferem isolamento/empresa suspensa, autorização, idempotência, conflitos, totais, aprovação, checklist, baixas e rollback da importação.
- Testes de IndexedDB com fake-indexeddb conferem separação de contas, recibo antigo, fila preservada e exclusão de financeiro do cache.
- Testes CSV/XLSX incluem acentos, zeros à esquerda, aspas/quebras de linha, duplicados e fórmulas. Limites ZIP são verificados antes do parser XLSX.
- Teste manual de navegador usou exclusivamente empresa fictícia via `tests/fixtures/servidor-operacao.ts` (proxy local na porta 3002, Next na 3001). O servidor foi desligado; `/operacao` reabriu pelo service worker; proposta e execução da OS foram salvas, preservadas ao recarregar e sincronizadas após reiniciar o servidor. Também foi executado um teste transacional com papel `authenticated` no Supabase real (`tests/fixtures/banco-real-rollback.sql`): orçamento, reenvio, aprovação, OS, recebível, baixa, demanda e importação passaram; as mudanças foram revertidas por rollback. Isso não substitui o piloto no navegador com uma conta real da aplicação.
- PDFs usam o mesmo timbrado A4 já existente; teste de paginação para orçamento e OS com conteúdo longo.
- Dependências auditadas; overrides de PostCSS, uuid e minimatch eliminam os avisos conhecidos do `npm audit` nesta instalação. Revalidar compatibilidade ao atualizar ExcelJS/Next.

Ainda fora desta etapa: catálogo próprio com custos/margem, parcelamento automático, recorrência financeira, estorno de baixas, assinatura/aceite externo de proposta, fotos offline, agenda completa offline e vínculo automático da OS com rotinas/execuções do PMOC. O financeiro é gerencial e não faz conciliação bancária.

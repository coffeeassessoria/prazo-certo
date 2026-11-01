# Relatório de manutenção e fotos

## Fluxo

Na OS de `/operacao`, selecionar cliente, unidade e aparelhos atendidos; informar data da execução, tipo (preventiva/corretiva/inspeção), horários opcionais, peças, medições efetivamente realizadas, pendências e recomendações. Agendamentos futuros podem ficar sem data de execução em rascunho. Para concluir, exige unidade, pelo menos um aparelho, data até hoje, checklist completo e resultado.

O cliente pode estar sem representante, recusar ciência ou tomar ciência. Neste último caso, nome e declaração do técnico são obrigatórios. É ciência informada pelo técnico, sem assinatura eletrônica nem aprovação técnica das atividades do PMOC.

Selecionar um PMOC da mesma unidade e associar etapas às rotinas existentes. A conclusão registra apenas as etapas vinculadas, para **todos os aparelhos selecionados**, em `pmoc_execucoes`, com referência à OS. Atendimentos diferentes por aparelho devem usar OS distintas. Concluir sem vínculo com PMOC não cria execuções no plano. A operação e as execuções compartilham a transação e o recibo idempotente existente.

Pode-se recomendar a próxima manutenção e marcar a criação de uma demanda para combinar o atendimento com o cliente. A data do retorno precisa ser atual/futura na conclusão; ela é uma ação de agendamento, não uma manutenção automaticamente executada.

Concluído, o relatório conserva os dados, fotos, identidade/logo, cliente, local, equipamentos e nome do técnico da visita em snapshot. Fica fechado para edição; outra visita ou correção exige nova OS. OS antigas sem relatório continuam consultáveis e com o PDF anterior; a edição pela nova interface permite preencher o relatório.

O PDF A4 usa o timbrado existente e inclui equipamentos, checklist, resultado, recomendações, ciência declarada e fotos com legenda. As fotos não tornam o documento um laudo de qualidade do ar nem substituem o PMOC ou documentos de responsabilidade técnica.

## Armazenamento e custo

- Originais aceitos no navegador: JPG/PNG/WebP até 12 MB; HEIC deve ser exportado em JPG. Compressão no aparelho antes de qualquer envio: maior lado até 1.600 px, JPEG até 600 KB. O original não é enviado nem arquivado pelo sistema.
- Servidor revalida conteúdo e pixels, corrige orientação EXIF, converte para JPEG e remove metadados (incluindo GPS). Não aceita SVG/animação. Gera somente a imagem otimizada e miniatura proporcional de até 320 px.
- Bucket **privado** `evidencias`; sem leitura/escrita direta para usuários. Somente a API autenticada, filtrando empresa, lê os arquivos. Escrita exige o servidor com service role após validação. Não há URLs públicas permanentes; respostas de fotos e PDFs usam `private, no-store`.
- Caminhos determinados pelo servidor: `empresa/OS/foto.jpg` e `empresa/OS/foto-mini.jpg`.
- Até **20 fotos anexadas por OS**, com classificação antes/depois/registro, aparelho e legenda. Reserva permite até 40 arquivos temporários por OS para substituir fotos de um rascunho sem perder as antigas durante o envio.
- Limite inicial **500 MiB por empresa**, incluindo miniaturas e reservas. UUID estável e SHA-256 impedem duplicação por reenvio e detectam a mesma imagem no mesmo serviço. Reserva de espaço serializada no Postgres impede ultrapassar a cota com envios concorrentes. A cota não é uma contratação de espaço adicional do provedor: o total disponível e os custos dependem do plano Supabase da plataforma.
- Somente administração da plataforma altera `evidencias_limites` pelo banco; clientes não podem aumentar a própria cota. O usuário vê o consumo na Operação. Não foi contratada ampliação paga nesta implementação.
- Uma cópia menor (até 140 KB por foto) entra no A4, limitando a soma das 20 imagens a 2,8 MB antes dos demais elementos do PDF. A foto de 1.600 px continua acessível separadamente.
- Remoção de foto de rascunho só libera o servidor após salvar a OS sem ela. Depois de responder ao usuário, a API tenta remover os arquivos sem vínculo; falhas são retomadas pela coleta diária. Relatórios concluídos conservam evidências.
- A tarefa diária já existente de lembretes também consulta até 100 fotos abandonadas há mais de 24 horas, processando-as com orçamento de cinco segundos entre arquivos, mesmo sem SMTP configurado. Consulta exclui arquivos referenciados; reserva de exclusão impede anexar durante a limpeza. Remoção usa a API de Storage, nunca `DELETE` direto em `storage.objects`. Registros de exclusão incompleta ficam para retry. Fotos vinculadas não têm expiração automática.

## Offline

Fotos de produção ficam temporariamente em IndexedDB, em partição de usuário/empresa, com limite total local de 60 MB. Para trabalhar sem internet, preparar o aparelho conectado e **salvar a OS** depois de adicionar as fotos. Campos ainda não salvos e fotos de um formulário abandonado não representam um atendimento confirmado.

A sincronização envia primeiro cada imagem, conserva a confirmação local e depois envia a OS com o mesmo UUID da operação. A fila e os blobs sobrevivem ao recarregamento. Após confirmar a OS, remove a cópia local da foto; a consulta posterior de fotos já sincronizadas requer conexão. Não baixa automaticamente todo o acervo do cliente para o aparelho.

A sincronização exige a conta de origem e a página aberta/reaberta. Sessão expirada pausa os envios. Falha conserva os dados locais. Sair considera fotos pendentes e limpar os dados também limpa os blobs. O navegador pode remover dados locais por falta de espaço ou limpeza manual; IndexedDB não é backup. Na demonstração, fotos ficam apenas na memória da página, sem enviar à empresa nem entrar nas pendências da conta real.

## Banco e publicação

Aplicar `supabase/migrations/20261031_relatorios_fotos.sql` após as três migrações anteriores, **antes de publicar a aplicação**. A mesma definição está em `supabase/schema.sql` para instalações novas. Não executar o schema completo na produção existente.

Adiciona `servico_fotos`, `evidencias_limites`, bucket privado e referência de OS em execuções PMOC. Escritas de foto/limpeza são funções exclusivamente `service_role`; o consumo pode ser consultado pelo usuário autenticado da própria empresa. Triggers validam relatório/vínculos, produzem snapshot e integram a execução. Não altera os relatórios antigos em massa. Não há nova variável de ambiente.

## Validação

Testes cobrem processamento de imagens, orientação/metadados, teto para imagens do PDF, IndexedDB/contas, migração reaplicável, autorização, quota e reenvio, referências entre clientes/unidades/equipamentos, ciência, preservação, limpeza sem vínculos, execução PMOC e retorno único, além do PDF A4 e evidência ausente.

Teste manual de navegador usa somente empresa fictícia em `tests/fixtures/servidor-relatorios.ts`: Next em 3001 e proxy em 3003. Servidor desligado, foto capturada e OS salva offline, página recarregada, foto/legenda recuperadas; reconexão confirmou exatamente um upload e um recibo. Foram inspecionados temas claro/escuro e layout desktop/mobile. Isso não substitui um piloto autenticado com conta real, câmera de celular e a rede usada pelos técnicos.

A verificação transacional no Supabase real também executou relatório, snapshot, reenvio, integração PMOC, retorno, bloqueio de alteração e reserva de foto, com papel `authenticated` no fluxo de OS. Todos os dados fictícios foram revertidos por rollback; roteiro em `tests/fixtures/relatorio-banco-real-rollback.sql`. O upload real de fotos pelo navegador continua como item do piloto autenticado.

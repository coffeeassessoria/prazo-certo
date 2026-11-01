# Demandas e retornos — climatização

Primeira etapa: acompanhar orçamentos, agendamento de visitas, peças, documentos do PMOC e pós-atendimento. A emissão de orçamento, a ordem de serviço completa, estoque, mensagens automáticas ao cliente e cadastro de equipamentos ficam fora desta entrega.

## Uso

1. Abra **Demandas e retornos → Nova demanda**, ou **Criar demanda relacionada** dentro de um vencimento.
2. Escolha um exemplo de climatização ou escreva a demanda. O usuário atual vem como responsável; é possível escolher outro membro da mesma empresa.
3. Defina a próxima ação e a data. Vincule cliente e vencimento quando fizer sentido.
4. Depois de um contato, registre o ocorrido e mantenha uma situação em aberto com próxima ação e data, ou conclua/cancele.
5. Para reabrir, registre o motivo e escolha uma situação em aberto e uma data atual ou futura.

Situações: a fazer, em andamento, aguardando cliente, aguardando fornecedor, concluída e cancelada. Aguardar não interrompe os lembretes. Encerrar uma demanda não conclui nem renova o vencimento vinculado.

A data de retorno continua em `itens.vencimento` **somente para itens de tipo acompanhamento**. O prazo técnico/contratual pertence ao outro item, indicado em `vinculo_item_id`, e nunca é atualizado pelo contato. O vínculo precisa ser da mesma empresa e do mesmo cliente.

## Banco e publicação

**Aplicar antes de publicar ou mesclar na main**, pois a Vercel publica a main automaticamente:

1. No projeto Supabase usado pela aplicação, executar `supabase/migrations/20261030_demandas_climatizacao.sql` no SQL Editor. A migração é uma transação aditiva e pode ser reaplicada. O mesmo SQL está registrado no fim de `supabase/schema.sql` para instalações novas; não é necessário rodar todo o schema numa instalação existente.
2. Conferir os acompanhamentos anteriores: o título vira a primeira ação e as datas são preservadas. O responsável será o criador, se ainda estiver na empresa; caso contrário, o membro mais antigo. Empresas sem membros ficam sem responsável até atribuição manual.
3. Publicar o código. No piloto, criar uma demanda vinculada a uma preventiva, registrar um retorno, concluir e reabrir. Conferir que o prazo da preventiva não mudou.
4. Testar o e-mail em Ajustes e validar uma execução do cron. Se Google Agenda estiver configurada, conferir criação, alteração e encerramento do evento.

**Estado atualizado em 31/10/2026:** a migração foi aplicada ao Supabase de produção `prazo-certo-sp` em 30/10/2026 e o código foi publicado no PR #1. Os testes locais continuam usando infraestrutura simulada; o piloto autenticado e o envio real de lembretes descritos acima ainda precisam ser concluídos. Veja `STATUS.md`.

## Histórico e isolamento

`demanda_eventos` registra autor, data, contato e mudanças de situação, responsável, próxima ação, cliente, categoria e vínculo. O usuário pode ler o histórico da sua empresa, mas não editar ou apagar registros isolados. Excluir a demanda, com confirmação, também exclui seu histórico; o vencimento relacionado é preservado.

A RPC `salvar_demanda` verifica sessão e empresa ativa, bloqueia a linha durante atualizações e grava contato e alterações na mesma transação. Triggers validam referências entre empresas e auditam alterações, incluindo caminhos legados de concluir/reabrir. O histórico é paginado; não há importação de contatos antigos que nunca foram registrados.

## Lembretes

Mantém o cron existente e o e-mail-resumo enviado aos destinatários definidos **pela empresa** em Ajustes. A atribuição de responsável não inscreve automaticamente o e-mail pessoal dele. O resumo agora mostra a próxima ação e o responsável.

Retornos entram no resumo a partir do dia definido e seguem a cadência existente para pendências. Não há garantia de aviso imediato para uma demanda cadastrada depois da execução diária. Uma nova data gera novos marcos de lembrete; demandas encerradas ficam fora da consulta de itens ativos.

Google Agenda continua opcional. A sincronização ocorre depois de salvar a demanda; uma indisponibilidade da agenda não desfaz o contato salvo. O envio externo de e-mail e a conexão Google não foram exercitados contra produção.

## Demonstração e validação

- `/demo/acompanhamentos`: lista com exemplos de climatização.
- `/demo/acompanhamentos/novo`: experimentação do formulário, sem gravar.
- `/demo/acompanhamentos/retorno`: contato, mudança de situação e histórico simulados em memória. Atualizar a página reinicia a simulação; a data original da manutenção permanece igual.
- `/design-system#demandas`: formulário e item de lista no catálogo do DS.

Verificações: `npm test`, `npm run typecheck`, `npm run build`. Os testes usam PostgreSQL em WASM (PGlite) para executar a migração e verificar isolamento, referências, histórico imutável, rollback, encerramento/reabertura e preservação do prazo. A infraestrutura Auth/RLS do Supabase é simulada nos testes; validar o piloto autenticado na instância real após a migração.

Inspeção visual da demonstração/formulário em 390px e 1366px, nos temas claro e escuro. O filtro e o histórico da operação autenticada dependem do banco configurado e precisam do teste de piloto descrito acima.

# PMOC e documentos timbrados em A4

## Escopo entregue

- Identidade da **empresa prestadora** em Ajustes → Logo e timbrado: nome/razão social, documento, endereço, telefone, e-mail e logo. O cliente final atendido não precisa de conta e não recebe acesso por esse cadastro.
- Carteira de clientes existente ampliada com unidades, representante (proprietário/locatário/preposto), ambientes e equipamentos. Cada ambiente registra atividade, área e ocupação; cada aparelho tem identificação, tipo, marca, modelo, série e capacidade em BTU/h.
- Planos por unidade com responsável técnico, referência ART/TRT ou justificativa, atividades e periodicidades editáveis, recomendações, projeto e observações.
- PDF de rascunho ou versão para assinatura. Rascunhos incluem pendências de cadastro; preparar para assinatura exige confirmação de revisão técnica e preenchimento dos campos de identificação e planejamento.
- Registro de execução separado do plano: atividade, aparelho quando aplicável, data, executor, aprovador informado e resultado. Emitir um plano não registra serviço automaticamente.
- Versões imutáveis com snapshot de dados, identidade e execuções, PDF privado e hash SHA-256. Os arquivos anteriores não mudam ao editar cadastros ou substituir o logo.

## Base técnica

A estrutura inicial segue os grupos do art. 6º e do Anexo I da Portaria GM/MS nº 3.523/1998 do Ministério da Saúde:

- https://bvsms.saude.gov.br/bvs/saudelegis/gm/1998/prt3523_28_08_1998.html
- https://bvsms.saude.gov.br/bvs/saudelegis/gm/1998/anexo/anexo_prt3523_28_08_1998.pdf

O sistema usa sugestões **parafraseadas e editáveis**, sem periodicidades técnicas universais pré-preenchidas. A lista inicial não pretende cobrir todos os componentes de sistemas centrais, torres ou instalações especiais. O profissional deve ajustar as atividades, a aplicação por aparelho/ambiente e as periodicidades à instalação, às normas vigentes e às instruções dos fabricantes.

Não há certificação de conformidade, assinatura eletrônica, emissão de ART/TRT, análise laboratorial nem verificação de habilitação profissional. A confirmação de revisão é uma declaração do usuário emissor, preservada no snapshot. Os campos de assinatura são para coleta posterior. A referência ART/TRT ou justificativa é um campo declarado pelo responsável, não um registro emitido pelo sistema.

A data de próxima revisão é opcional e definida pelo profissional; não equivale a uma validade anual automática do PMOC. O botão de cadastro de vencimento abre o fluxo existente para que o operador informe o prazo e os lembretes. O plano não agenda visitas automaticamente nem altera contratos ou manutenções vinculadas a demandas.

Carga cadastrada no PDF é a soma das capacidades nominais informadas em BTU/h e não substitui um cálculo de carga térmica.

## Arquitetura do PDF

`lib/documentos/timbrado.ts` é a base compartilhada para os próximos documentos: A4 (595,28 × 841,89 pt), margens, logo proporcional, identificação da prestadora, tabelas com cabeçalhos repetidos, rodapé e numeração em todas as páginas.

`lib/documentos/pmoc.ts` transforma o snapshot em PDF. O projeto de instalação opcional é anexado como arquivo PDF embutido, preservando seu formato original; pode exigir um leitor com painel de anexos. O documento principal permanece A4. O timbrado se aplica aos documentos gerados pelo sistema; arquivos de terceiros enviados pelo usuário não são reformatados.

O motor usa pdf-lib em Node.js para funcionar nas funções da Vercel. As fontes padrão suportam português; caracteres fora da codificação suportada são substituídos por `?`. A personalização futura pode incorporar uma fonte Unicode. Há limite de 250 páginas para impedir geração excessivamente grande.

## Logo e arquivos

O servidor decodifica a imagem com Sharp (PNG/JPG/WebP, até 2 MB e 12 milhões de pixels), remove metadados e normaliza para PNG de até 1000 × 400 px, mantendo proporção. SVG e imagens animadas não são aceitos. Os PDFs e projetos têm limite de 10 MB no bucket.

Somente administrador da prestadora pode salvar o timbrado. Os buckets `identidades` e `documentos` são privados. Consultas e downloads filtram a empresa autenticada; políticas de banco e storage isolam os objetos por empresa. Não há busca de logos ou projetos por URL externa.

Objetos de logo/projeto antigos são mantidos para preservar snapshots e emissões em andamento. Versões prontas não podem ser atualizadas ou apagadas pela conta autenticada; não há política de UPDATE/DELETE para os objetos novos. Uma falha de geração deixa uma versão com status de falha, e uma nova tentativa cria outra versão. Um encerramento abrupto do processo pode deixar uma reserva como aguardando; a tela orienta criar nova versão. Não há expurgo automático de arquivos órfãos nesta etapa.

Unidades com planos e clientes com unidades não são excluídos por cascata; o histórico é preservado. O cadastro anterior de clientes apresenta uma mensagem quando a exclusão está bloqueada por esses vínculos.

## Ativação

1. Aplicar primeiro `supabase/migrations/20261030_demandas_climatizacao.sql`, se ainda não aplicado.
2. Aplicar `supabase/migrations/20261030_pmoc_documentos.sql` no Supabase da aplicação. A migração é aditiva, transacional e pode ser reaplicada; também está consolidada no fim de `supabase/schema.sql`.
3. Publicar o código depois das migrações. A main é publicada automaticamente pela Vercel.
4. Com uma conta de administrador real, cadastrar o timbrado e enviar um logo; confirmar que salvar sem novo arquivo preserva o logo e que remover afeta somente novas emissões.
5. Cadastrar cliente, unidade, ambientes e aparelhos; preencher plano e emitir um rascunho. Completar as pendências, declarar revisão e preparar para assinatura.
6. Registrar uma execução e gerar outra versão; baixar as duas e conferir que a primeira não mudou. Testar o anexo de projeto e o download autenticado de outra empresa (deve ser negado).

As migrações não foram aplicadas ao Supabase de produção nesta implementação. O teste autenticado contra a instância real e o teste do storage real permanecem pendentes de acesso/configuração. O código permanece em PR de rascunho.

## Validação e demonstração

`npm test`, `npm run typecheck`, `npm run build` e `git diff --check`. Os testes usam PostgreSQL/PGlite com infraestrutura Auth/Storage simulada, validando referências entre empresas, papéis, revisão, snapshots, arquivo pronto apenas após armazenamento e proteção de versões/objetos. O motor de PDF é testado com logo, texto longo e anexo; o exemplo é renderizado e inspecionado visualmente com Poppler.

- `/demo/pmoc`: visão do módulo e download público de PDF **fictício**.
- `/demo/pmoc/identidade`: prévia de logo e formulário do timbrado, sem armazenamento.
- `/demo/pmoc/unidade`: inventário e formulários compartilhados com a operação, sem persistência.
- `/demo/pmoc/plano`: formulário e atividades editáveis, sem persistência.
- `/design-system#documentos`: catálogo dos novos componentes.

O exemplo fictício é produzido com o mesmo motor e uma marca ClimaTech de demonstração criada para o projeto. A identidade de cada prestadora será definida pelo próprio administrador. Para gerar um exemplar local: `npx tsx scripts/gerar-exemplo-pmoc.ts /caminho/de/saida.pdf`.

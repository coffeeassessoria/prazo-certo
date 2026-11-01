# Assinatura do atendimento na tela

O representante do cliente pode conferir e assinar o aceite da OS antes da conclusão. O técnico escolhe Concluída, preenche resultado/checklist, identifica o representante presente e confirma a ciência. O bloco ao final mostra um resumo para conferência, o termo de recebimento e a área para desenhar com dedo, caneta ou mouse. Assinar e concluir envia/salva a OS inteira; a assinatura é opcional, permitindo registrar ausência ou recusa.

## Vínculo e preservação

Os traços são coordenadas vetoriais (até 32 traços/800 pontos), não uma foto reutilizável nem um modelo biométrico. Permanecem no JSON privado da OS, com RLS por empresa. Não há bucket público, serviço externo de assinatura ou nova credencial. O conteúdo apresentado fica limitado a 35 KB; a operação completa mantém o limite existente de 100 KB do banco. Textos muito longos precisam ser reduzidos antes da coleta.

O aceite contém OS, empresa, versão anterior, conta coletora, dados completos sem o próprio aceite/snapshot, identificação apresentada, termo e horário declarado pelo dispositivo. Alterar dados ou identificação apresentada reinicia o desenho e o consentimento. Depois da captura, os campos ficam bloqueados: para editar antes do envio é necessário descartar o aceite com confirmação e coletar novamente.

O trigger `z_validar_assinatura_servico`, após a validação do relatório, confere formato, limites, OS, empresa, versão, conta autenticada e igualdade do conteúdo. Rejeita reaproveitamento após alterações. Na conclusão gera o recibo com relógio do servidor e SHA-256 do aceite, snapshot, hashes das fotos vinculadas, versão e coletor. O snapshot e a OS concluída mantêm a preservação existente. O reenvio usa o mesmo UUID de operação e retorna o recibo original. Não se adiciona assinatura a uma OS já concluída; correções e nova visita exigem outra OS.

## Offline

Com o offline previamente ativado, a operação assinada completa entra na fila IndexedDB da conta/empresa, em uma transação. Ela só deixa a fila após confirmação do servidor; tentativas incertas preservam o UUID e o conteúdo. O horário local é declarado e pode diferir do recebimento no servidor. Se a versão mudou em outro dispositivo, revisar o envio exige descartar a assinatura e coletá-la novamente na versão atual. A captura ainda não concluída não é um rascunho persistente; o botão Assinar e concluir efetiva a gravação local ou o envio.

Use aparelhos confiáveis, pois assinaturas e dados operacionais offline ficam no navegador. O fluxo de saída já avisa sobre pendências; limpar dados do navegador elimina o trabalho local não sincronizado.

## PDF e natureza do aceite

O relatório A4 reproduz os traços sem perda por compressão, nome/função, termo, coleta no aparelho, recebimento na plataforma, fuso, OS/versão, conta coletora, identificação apresentada e hash do conjunto preservado. O hash não certifica criptograficamente o arquivo PDF. A demonstração identifica explicitamente a simulação e não gera comprovante de servidor.

Trata-se de aceite desenhado na tela. A identificação é informada no atendimento, sem verificação automática da identidade, Gov.br ou certificado ICP-Brasil. Não comprova pagamento nem substitui assinatura/responsabilidade técnica, ART/TRT ou revisão do PMOC. A imagem visível sozinha não demonstra autoria; por isso preservamos o contexto e a vinculação do conteúdo. Sem promessa de validade jurídica automática.

Referências oficiais consultadas em 31/10/2026: [Governo Digital — assinaturas eletrônicas](https://www.gov.br/governodigital/pt-br/identidade/assinatura-eletronica/saiba-mais-sobre-a-assinatura-eletronica), [MP 2.200-2, art. 10](https://presidencia.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm) e [Serpro — dúvidas frequentes](https://www.serpro.gov.br/links-fixos-superiores/assinador-digital/assinador-serpro/duvidas-frequentes).

## Implantação e validação

Aplicar `supabase/migrations/20261101_assinatura_atendimento.sql` depois da migração de relatórios/fotos e antes do deploy. O schema consolidado inclui a migração. A alteração é aditiva e não modifica relatórios antigos.

Testes automatizados: limites do desenho/conteúdo, isolamento/retomada da fila, identificação do coletor/empresa/OS/versão, alteração de resultado/nome/termo, reenvio idempotente, reprodução do hash, PMOC/retorno e preservação após conclusão. Testar o fluxo em celular físico e com uma conta autenticada continua necessário antes do piloto com clientes.

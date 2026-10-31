import { test } from 'node:test'
import assert from 'node:assert/strict'
import { marcoDoDia, montarEmail } from '../lib/lembretes'

test('retornos seguem a data da próxima ação e uma nova data gera outro marco', () => {
  assert.equal(marcoDoDia(1,0,'acompanhamento','2035-12-01'),null)
  assert.equal(marcoDoDia(0,0,'acompanhamento','2035-12-01'),'ret-2035-12-01')
  assert.notEqual(marcoDoDia(0,0,'acompanhamento','2035-12-01'),marcoDoDia(0,0,'acompanhamento','2035-12-02'))
  assert.equal(marcoDoDia(-1,0,'acompanhamento','2035-12-01'),marcoDoDia(-2,0,'acompanhamento','2035-12-01'))
  assert.notEqual(marcoDoDia(-2,0,'acompanhamento','2035-12-01'),marcoDoDia(-3,0,'acompanhamento','2035-12-01'))
})

test('resumo inclui a próxima ação e o responsável com escape no HTML', () => {
  const email = montarEmail('ClimaTech',[{id:'teste',titulo:'Compressor',tipo:'acompanhamento',vencimento:'2035-12-01',antecedencia_dias:0,cliente_nome:'Hospital',proxima_acao:'Ligar <script>alert(1)</script>',responsavel_nome:'Ana & João'}], '2035-12-01','https://exemplo.com','Prazo Certo')
  assert.match(email.texto,/Próxima ação: Ligar/)
  assert.match(email.texto,/Responsável: Ana & João/)
  assert.match(email.html,/&lt;script&gt;/)
  assert.match(email.html,/Ana &amp; João/)
  assert.ok(!email.html.includes('<script>'))
})

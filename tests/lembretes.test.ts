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

test('vários avisos: avisa em cada dia escolhido e mantém os nomes antigos', () => {
  const av = [7, 5, 3, 1]
  assert.equal(marcoDoDia(8, 7, 'documento', undefined, av), null)
  assert.equal(marcoDoDia(7, 7, 'documento', undefined, av), '7d')
  assert.equal(marcoDoDia(6, 7, 'documento', undefined, av), '7d')
  assert.equal(marcoDoDia(5, 7, 'documento', undefined, av), 'aviso-5')
  assert.equal(marcoDoDia(3, 7, 'documento', undefined, av), 'aviso-3')
  assert.equal(marcoDoDia(1, 7, 'documento', undefined, av), '1d')
  assert.equal(marcoDoDia(0, 7, 'documento', undefined, av), 'hoje')
  assert.equal(marcoDoDia(-1, 7, 'documento', undefined, av), 'atraso-0')
  // Só 1 dia antes: nada antes disso
  assert.equal(marcoDoDia(2, 1, 'documento', undefined, [1]), null)
  assert.equal(marcoDoDia(1, 1, 'documento', undefined, [1]), '1d')
  // Lista migrada [30, 7, 1] gera os mesmos marcos da regra antiga
  for (const d of [40, 30, 20, 7, 4, 1, 0, -3]) assert.equal(marcoDoDia(d, 30, 'documento', undefined, [30, 7, 1]), marcoDoDia(d, 30, 'documento'))
})

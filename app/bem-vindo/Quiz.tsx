'use client'

import { useState, useTransition } from 'react'
import { CATALOGO, SEGMENTOS, modelosPadrao, type Modelo } from '@/lib/modelos'
import { TIPOS, rotuloRecorrencia } from '@/lib/datas'
import { concluirOnboarding, type DadosOnboarding } from './actions'

const ANTECEDENCIAS = [
  { dias: 7, rotulo: '7 dias antes', dica: 'Para itens simples, resolvidos rápido' },
  { dias: 15, rotulo: '15 dias antes', dica: 'Dá tempo de agendar a visita' },
  { dias: 30, rotulo: '30 dias antes', dica: 'Recomendado para laudos e PMOC' },
  { dias: 60, rotulo: '60 dias antes', dica: 'Para contratos e renovações longas' },
]

const PASSOS = ['Boas-vindas', 'Empresa', 'Área', 'O que controlar', 'Antecedência', 'Lembretes', 'Clientes', 'Revisão']

export function Quiz({ inicial, primeiroNome, podeConcluir }: { inicial: DadosOnboarding; primeiroNome: string; podeConcluir: boolean }) {
  const [passo, setPasso] = useState(0)
  const [d, setD] = useState<DadosOnboarding>(inicial)
  const [novoItem, setNovoItem] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, iniciar] = useTransition()
  const total = PASSOS.length - 1
  const set = <K extends keyof DadosOnboarding>(k: K, v: DadosOnboarding[K]) => setD((x) => ({ ...x, [k]: v }))

  function escolherSegmento(seg: string) {
    setD((x) => ({ ...x, segmento: seg, modelos: x.segmento === seg && x.modelos.length ? x.modelos : modelosPadrao(seg) }))
  }
  function alternarModelo(m: Modelo) {
    setD((x) => {
      const tem = x.modelos.some((y) => y.titulo === m.titulo)
      return { ...x, modelos: tem ? x.modelos.filter((y) => y.titulo !== m.titulo) : [...x.modelos, m] }
    })
  }
  function adicionarModelo() {
    const t = novoItem.trim()
    if (!t || d.modelos.some((m) => m.titulo.toLowerCase() === t.toLowerCase())) return
    set('modelos', [...d.modelos, { titulo: t, tipo: 'documento', recorrencia_meses: 12 }])
    setNovoItem('')
  }

  function validar(): string {
    if (passo === 1 && !d.nome.trim()) return 'Informe o nome da empresa.'
    if (passo === 2 && !d.segmento) return 'Escolha a área que mais se parece com a sua.'
    if (passo === 5 && !d.emails.some((e) => e.trim())) return 'Informe pelo menos um e-mail.'
    return ''
  }
  function avancar() {
    const e = validar()
    setErro(e)
    if (!e) setPasso((p) => Math.min(p + 1, total))
  }
  function concluir() {
    setErro('')
    iniciar(async () => {
      const r = await concluirOnboarding(d)
      if (r?.erro) setErro(r.erro)
    })
  }

  const sugestoes = [...(CATALOGO[d.segmento] ?? []), ...d.modelos].filter(
    (m, i, arr) => arr.findIndex((y) => y.titulo === m.titulo) === i
  )

  return (
    <div className="quiz">
      <div className="quiz-topo">
        <img src="/icon-192.png" alt="" />
        <span className="quiz-marca">{process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'}</span>
        {passo > 0 && <span className="quiz-contador">Passo {passo} de {total}</span>}
      </div>
      {passo > 0 && (
        <div className="quiz-progresso" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={passo}>
          <span style={{ width: `${(passo / total) * 100}%` }} />
        </div>
      )}

      <form
        className="quiz-corpo"
        onSubmit={(e) => {
          e.preventDefault()
          passo === total ? concluir() : avancar()
        }}
      >
        {passo === 0 && (
          <>
            <h1>Olá{primeiroNome ? `, ${primeiroNome}` : ''}! Vamos configurar sua conta</h1>
            <p className="quiz-sub">
              São 7 perguntas rápidas, cerca de 2 minutos. Com elas o sistema já fica pronto para avisar você
              antes de cada documento, contrato ou manutenção vencer.
            </p>
            <ul className="quiz-lista">
              <li>Dados da sua empresa</li>
              <li>O que você precisa controlar</li>
              <li>Quando e para quem mandar os lembretes</li>
            </ul>
          </>
        )}

        {passo === 1 && (
          <>
            <h1>Qual é a sua empresa?</h1>
            <p className="quiz-sub">Esse nome aparece no topo do sistema e nos e-mails de lembrete.</p>
            <div className="campo"><label htmlFor="q-nome">Nome da empresa</label>
              <input id="q-nome" autoFocus value={d.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Arenales Climatização" /></div>
            <div className="campo"><label htmlFor="q-resp">Seu nome</label>
              <input id="q-resp" value={d.responsavel} onChange={(e) => set('responsavel', e.target.value)} /></div>
            <div className="linha">
              <div className="campo"><label htmlFor="q-doc">CNPJ <span className="opcional">(opcional)</span></label>
                <input id="q-doc" inputMode="numeric" value={d.documento} onChange={(e) => set('documento', e.target.value)} /></div>
              <div className="campo"><label htmlFor="q-cid">Cidade <span className="opcional">(opcional)</span></label>
                <input id="q-cid" value={d.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Ex.: Sinop - MT" /></div>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <h1>Em qual área você trabalha?</h1>
            <p className="quiz-sub">Assim já sugerimos os documentos e manutenções mais comuns do seu ramo.</p>
            <div className="opcoes" role="radiogroup">
              {SEGMENTOS.map((s) => (
                <button type="button" role="radio" aria-checked={d.segmento === s.valor} key={s.valor}
                  className={`opcao ${d.segmento === s.valor ? 'marcada' : ''}`} onClick={() => escolherSegmento(s.valor)}>
                  <strong>{s.rotulo}</strong><span>{s.descricao}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <h1>O que você precisa controlar?</h1>
            <p className="quiz-sub">
              Marque o que você faz para seus clientes. Isso vira atalho na hora de cadastrar: um toque e o
              tipo e a repetição já vêm preenchidos. Dá para mudar depois.
            </p>
            <div className="chips">
              {sugestoes.map((m) => {
                const marcado = d.modelos.some((y) => y.titulo === m.titulo)
                return (
                  <button type="button" key={m.titulo} aria-pressed={marcado} className={`chip ${marcado ? 'marcado' : ''}`} onClick={() => alternarModelo(m)}>
                    <span className="chip-titulo">{m.titulo}</span>
                    <span className="chip-meta">{TIPOS[m.tipo]}, {rotuloRecorrencia(m.recorrencia_meses).toLowerCase()}</span>
                  </button>
                )
              })}
            </div>
            <div className="acoes" style={{ marginTop: 16 }}>
              <input aria-label="Outro item" value={novoItem} onChange={(e) => setNovoItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarModelo() } }}
                placeholder="Falta algum? Escreva aqui" style={{ flex: 1, minWidth: 200 }} />
              <button type="button" className="btn sec" onClick={adicionarModelo}>Adicionar</button>
            </div>
          </>
        )}

        {passo === 4 && (
          <>
            <h1>Com quanto tempo de antecedência quer ser avisado?</h1>
            <p className="quiz-sub">
              Esse é o padrão para novos cadastros. Além desse primeiro aviso, o sistema avisa de novo
              7 dias antes, 1 dia antes, no dia e, se vencer, uma vez por semana até ser renovado.
            </p>
            <div className="opcoes" role="radiogroup">
              {ANTECEDENCIAS.map((a) => (
                <button type="button" role="radio" aria-checked={d.antecedencia === a.dias} key={a.dias}
                  className={`opcao ${d.antecedencia === a.dias ? 'marcada' : ''}`} onClick={() => set('antecedencia', a.dias)}>
                  <strong>{a.rotulo}</strong><span>{a.dica}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {passo === 5 && (
          <>
            <h1>Quem deve receber os lembretes?</h1>
            <p className="quiz-sub">Os avisos chegam por e-mail, todo dia de manhã, só quando houver algo para resolver.</p>
            <div className="campo">
              <label htmlFor="q-emails">E-mails <span className="opcional">(um por linha)</span></label>
              <textarea id="q-emails" value={d.emails.join('\n')} onChange={(e) => set('emails', e.target.value.split(/\n|,|;/))}
                placeholder="voce@empresa.com.br" style={{ minHeight: 88 }} />
              <span className="dica">Você pode colocar o seu e-mail e o do escritório, por exemplo.</span>
            </div>
            <div className="campo">
              <label htmlFor="q-whats">WhatsApp <span className="opcional">(opcional)</span></label>
              <input id="q-whats" inputMode="tel" value={d.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(66) 99999-9999" />
              <span className="dica">Avisos e consultas pelo WhatsApp chegam em breve. Já deixamos seu número cadastrado.</span>
            </div>
          </>
        )}

        {passo === 6 && (
          <>
            <h1>Quais são seus principais clientes?</h1>
            <p className="quiz-sub">
              Escreva o nome das empresas que você atende, uma por linha. Pode ser só as principais
              agora; você adiciona outras quando quiser.
            </p>
            <div className="campo">
              <label htmlFor="q-cli">Clientes <span className="opcional">(opcional)</span></label>
              <textarea id="q-cli" value={d.clientes.join('\n')} onChange={(e) => set('clientes', e.target.value.split('\n'))}
                placeholder={'Frigorífico Boi Bom\nHospital Santa Clara\nSupermercado Central'} style={{ minHeight: 140 }} />
            </div>
          </>
        )}

        {passo === 7 && (
          <>
            <h1>Tudo certo? Confira antes de começar</h1>
            <dl className="revisao">
              <dt>Empresa</dt><dd>{d.nome}{d.cidade ? `, ${d.cidade}` : ''}</dd>
              <dt>Área</dt><dd>{SEGMENTOS.find((s) => s.valor === d.segmento)?.rotulo}</dd>
              <dt>Itens que você controla</dt><dd>{d.modelos.map((m) => m.titulo).join(', ') || 'Nenhum escolhido'}</dd>
              <dt>Primeiro aviso</dt><dd>{d.antecedencia} dias antes do vencimento</dd>
              <dt>Lembretes para</dt><dd>{d.emails.filter((e) => e.trim()).join(', ')}</dd>
              <dt>Clientes</dt><dd>{d.clientes.filter((c) => c.trim()).length || 'Nenhum'} {d.clientes.filter((c) => c.trim()).length === 1 ? 'cliente' : 'clientes'}</dd>
            </dl>
            <p className="quiz-sub">Ao concluir, você vai direto para o cadastro do seu primeiro vencimento.</p>
            {!podeConcluir && <div className="aviso erro">Só o administrador da empresa pode concluir esta configuração.</div>}
          </>
        )}

        {erro && <div className="aviso erro" role="alert" style={{ marginTop: 16 }}>{erro}</div>}

        <div className="quiz-rodape">
          {passo > 0 ? (
            <button type="button" className="btn sec" onClick={() => { setErro(''); setPasso((p) => p - 1) }} disabled={salvando}>Voltar</button>
          ) : <span />}
          {passo === 0 && <button className="btn" autoFocus>Começar</button>}
          {passo > 0 && passo < total && (
            <button className="btn">{(passo === 6 && !d.clientes.some((c) => c.trim())) ? 'Pular por enquanto' : 'Continuar'}</button>
          )}
          {passo === total && (
            <button className="btn sucesso" disabled={salvando || !podeConcluir} aria-busy={salvando}>
              {salvando ? 'Salvando…' : 'Concluir e cadastrar primeiro vencimento'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

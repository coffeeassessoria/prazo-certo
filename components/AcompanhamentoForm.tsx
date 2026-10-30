'use client'

import { useState } from 'react'
import { AlertCircle, BellRing, CalendarDays, Check, Save } from 'lucide-react'
import { fmtDiaSemana, hojeISO, LEMBRAR_EM, somarDias } from '@/lib/datas'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'

type Cliente = { id: string; nome: string }
export type AcompanhamentoEdicao = {
  id?: string
  titulo?: string
  descricao?: string | null
  vencimento?: string
  cliente_id?: string | null
}

/** Cadastro rápido de acompanhamento (DS 2.0): o que fazer, de qual cliente e quando lembrar. Uma tela só. */
export function AcompanhamentoForm({
  acao, clientes, item = {}, compacto = false,
}: {
  acao: (fd: FormData) => Promise<void>
  clientes: Cliente[]
  item?: AcompanhamentoEdicao
  compacto?: boolean
}) {
  const hoje = hojeISO()
  const atalhoInicial = item.vencimento ? LEMBRAR_EM.find((o) => somarDias(hoje, o.dias) === item.vencimento)?.dias ?? 0 : 3
  const [atalho, setAtalho] = useState<number>(atalhoInicial)
  const [data, setData] = useState(item.vencimento ?? '')
  const [titulo, setTitulo] = useState(item.titulo ?? '')
  const [novoCliente, setNovoCliente] = useState(false)
  const [erros, setErros] = useState<{ titulo?: string; data?: string }>({})

  const quando = atalho ? somarDias(hoje, atalho) : data
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(quando)

  function validar(e: React.FormEvent<HTMLFormElement>) {
    const novos: typeof erros = {}
    if (!titulo.trim()) novos.titulo = 'Escreva o que você precisa fazer para continuar'
    if (!valida) novos.data = 'Escolha quando quer ser lembrado'
    else if (quando < hoje) novos.data = 'Escolha hoje ou uma data futura'
    setErros(novos)
    if (Object.keys(novos).length) {
      e.preventDefault()
      document.getElementById(novos.titulo ? 'ac-titulo' : 'ac-data')?.focus()
    }
  }

  return (
    <form action={acao} onSubmit={validar} noValidate className="card">
      {item.id && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="vencimento" value={valida ? quando : ''} />
      {compacto && <h2 className="titulo-icone"><BellRing size={18} aria-hidden />Novo acompanhamento</h2>}

      <div className={`campo ${erros.titulo ? 'com-erro' : ''}`}>
        <label htmlFor="ac-titulo">O que você precisa lembrar?</label>
        <input id="ac-titulo" name="titulo" value={titulo} aria-invalid={!!erros.titulo} aria-describedby="ac-titulo-ajuda"
          onChange={(e) => { setTitulo(e.target.value); setErros((x) => ({ ...x, titulo: undefined })) }}
          placeholder="Ex.: Cobrar se compraram a peça do orçamento" />
        {erros.titulo
          ? <span id="ac-titulo-ajuda" className="erro-campo"><AlertCircle size={14} aria-hidden />{erros.titulo}</span>
          : <span id="ac-titulo-ajuda" className="dica">Escreva como você falaria: "voltar para ver se o ar foi arrumado".</span>}
      </div>

      <div className="campo">
        <label htmlFor="ac-cliente">Cliente <span className="opcional">(opcional)</span></label>
        {novoCliente || clientes.length === 0 ? (
          <input id="ac-cliente" name="cliente_novo" placeholder="Nome do cliente" />
        ) : (
          <select id="ac-cliente" name="cliente_id" defaultValue={item.cliente_id ?? ''}>
            <option value="">Sem cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        {clientes.length > 0 && (
          <button type="button" className="btn ghost peq" style={{ alignSelf: 'flex-start' }} onClick={() => setNovoCliente(!novoCliente)}>
            {novoCliente ? 'Escolher da lista de clientes' : 'É um cliente novo'}
          </button>
        )}
      </div>

      <fieldset className={`campo ${erros.data ? 'com-erro' : ''}`} style={{ border: 0, padding: 0, marginInline: 0, marginTop: 0, minWidth: 0 }}>
        <legend className="rotulo-campo">Lembrar em</legend>
        <div className="chips compactos" role="group" aria-label="Lembrar em">
          {LEMBRAR_EM.map((o) => (
            <button type="button" key={o.dias} className="chip" aria-pressed={atalho === o.dias}
              onClick={() => { setAtalho(o.dias); setErros((x) => ({ ...x, data: undefined })) }}>
              <span className="chip-titulo">{atalho === o.dias && <Check size={14} aria-hidden />}{o.rotulo}</span>
            </button>
          ))}
          <button type="button" className="chip" aria-pressed={atalho === 0}
            onClick={() => { setAtalho(0); setTimeout(() => document.getElementById('ac-data')?.focus(), 0) }}>
            <span className="chip-titulo">{atalho === 0 ? <Check size={14} aria-hidden /> : <CalendarDays size={14} aria-hidden />}Escolher data</span>
          </button>
        </div>
        {atalho === 0 && (
          <input id="ac-data" type="date" min={hoje} value={data} aria-label="Data do lembrete" aria-invalid={!!erros.data}
            style={{ marginTop: 8, maxWidth: 240 }}
            onChange={(e) => { setData(e.target.value); setErros((x) => ({ ...x, data: undefined })) }} />
        )}
        {erros.data
          ? <span className="erro-campo"><AlertCircle size={14} aria-hidden />{erros.data}</span>
          : valida && quando >= hoje
            ? <span className="dica" aria-live="polite">Lembrete {quando === hoje ? 'hoje' : `em ${fmtDiaSemana(quando)}`}, no e-mail das 7h{' '}e na Google Agenda, se estiver conectada.</span>
            : null}
      </fieldset>

      <div className="campo">
        <label htmlFor="ac-desc">Observação <span className="opcional">(opcional)</span></label>
        <textarea id="ac-desc" name="descricao" rows={2} defaultValue={item.descricao ?? ''}
          placeholder="Ex.: Orçamento nº 123, falar com o Sr. João do almoxarifado" />
      </div>

      <div className="acoes empilha">
        <BotaoEnviar className="btn grande"><Save size={16} />{item.id ? 'Salvar alterações' : 'Salvar acompanhamento'}</BotaoEnviar>
      </div>
    </form>
  )
}

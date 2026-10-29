'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, BellRing, Check, Paperclip, Save } from 'lucide-react'
import { fmtData, hojeISO, RECORRENCIAS, somarDias, somarMeses, TIPOS } from '@/lib/datas'
import type { Modelo } from '@/lib/modelos'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { Upload } from '@/components/ui/Upload'

type Cliente = { id: string; nome: string }
export type ItemEdicao = {
  id?: string
  titulo?: string
  tipo?: string
  descricao?: string | null
  vencimento?: string
  recorrencia_meses?: number | null
  antecedencia_dias?: number
  cliente_id?: string | null
  anexo_nome?: string | null
}

const AVISOS = [7, 15, 30, 60, 90]

/** Datas em que o sistema vai avisar (mesma regra do envio diário, ver lib/lembretes.ts). */
function datasDeAviso(venc: string, antecedencia: number, hoje: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(venc)) return []
  const marcos = [...new Set([antecedencia, 7, 1, 0])].filter((d) => d >= 0).sort((a, b) => b - a)
  return marcos.map((d) => somarDias(venc, -d)).filter((d) => d >= hoje)
}

/** Cadastro guiado de vencimento (DS 2.0): 4 perguntas + detalhes opcionais. */
export function ItemForm({
  acao, clientes, item = {}, clientePadrao, modelos = [], antecedenciaPadrao = 30,
}: {
  acao: (fd: FormData) => Promise<void>
  clientes: Cliente[]
  item?: ItemEdicao
  clientePadrao?: string
  modelos?: Modelo[]
  antecedenciaPadrao?: number
}) {
  const hoje = hojeISO()
  const [novoCliente, setNovoCliente] = useState(clientes.length === 0)
  const [titulo, setTitulo] = useState(item.titulo ?? '')
  const [tipo, setTipo] = useState(item.tipo ?? 'documento')
  const [recorrencia, setRecorrencia] = useState(item.recorrencia_meses ? String(item.recorrencia_meses) : '')
  const [vencimento, setVencimento] = useState(item.vencimento ?? '')
  const [antecedencia, setAntecedencia] = useState(item.antecedencia_dias ?? antecedenciaPadrao)
  const [mais, setMais] = useState(!!(item.descricao || item.anexo_nome))
  const [erros, setErros] = useState<{ titulo?: string; vencimento?: string }>({})

  function usarModelo(m: Modelo) {
    setTitulo(m.titulo)
    setTipo(m.tipo)
    setRecorrencia(m.recorrencia_meses ? String(m.recorrencia_meses) : '')
    setErros((e) => ({ ...e, titulo: undefined }))
  }

  function validar(e: React.FormEvent<HTMLFormElement>) {
    const novos: typeof erros = {}
    if (!titulo.trim()) novos.titulo = 'Informe o que vence para continuar'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) novos.vencimento = 'Informe a data de vencimento para continuar'
    setErros(novos)
    if (Object.keys(novos).length) {
      e.preventDefault()
      document.getElementById(novos.titulo ? 'titulo' : 'vencimento')?.focus()
    }
  }

  const avisos = useMemo(() => datasDeAviso(vencimento, antecedencia, hoje), [vencimento, antecedencia, hoje])
  const proximo = vencimento && recorrencia ? somarMeses(vencimento, Number(recorrencia)) : ''
  const opcoesAviso = AVISOS.includes(antecedencia) ? AVISOS : [...AVISOS, antecedencia].sort((a, b) => a - b)

  return (
    <form action={acao} onSubmit={validar} noValidate className="card">
      {item.id && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="tipo" value={tipo} />

      <section className="etapa">
        <h2><span className="num-etapa">1</span>O que vence?</h2>
        {modelos.length > 0 && !item.id && (
          <>
            <p className="dica" style={{ marginBottom: 8 }}>Toque em um atalho ou escreva abaixo.</p>
            <div className="chips compactos" style={{ marginBottom: 16 }}>
              {modelos.map((m) => {
                const marcado = titulo === m.titulo
                return (
                  <button type="button" key={m.titulo} className="chip" aria-pressed={marcado} onClick={() => usarModelo(m)}>
                    <span className="chip-titulo">{marcado && <Check size={14} aria-hidden />}{m.titulo}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
        <div className={`campo ${erros.titulo ? 'com-erro' : ''}`}>
          <label htmlFor="titulo">Nome do documento, contrato ou manutenção</label>
          <input id="titulo" name="titulo" value={titulo} aria-invalid={!!erros.titulo} aria-describedby="titulo-ajuda"
            onChange={(e) => { setTitulo(e.target.value); setErros((x) => ({ ...x, titulo: undefined })) }}
            placeholder="Ex.: PMOC - Hospital Santa Clara" />
          {erros.titulo
            ? <span id="titulo-ajuda" className="erro-campo"><AlertCircle size={14} aria-hidden />{erros.titulo}</span>
            : <span id="titulo-ajuda" className="dica">Use um nome que você reconheça em campo.</span>}
        </div>
      </section>

      <section className="etapa">
        <h2><span className="num-etapa">2</span>De qual cliente?</h2>
        <div className="campo">
          <label htmlFor="cliente">Cliente</label>
          {novoCliente ? (
            <input id="cliente" name="cliente_novo" placeholder="Nome do cliente" />
          ) : (
            <select id="cliente" name="cliente_id" defaultValue={item.cliente_id ?? clientePadrao ?? ''}>
              <option value="">Sem cliente (uso interno)</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
          {clientes.length > 0 && (
            <button type="button" className="btn ghost peq" style={{ alignSelf: 'flex-start' }} onClick={() => setNovoCliente(!novoCliente)}>
              {novoCliente ? 'Escolher da lista de clientes' : 'É um cliente novo'}
            </button>
          )}
        </div>
      </section>

      <section className="etapa">
        <h2><span className="num-etapa">3</span>Quando vence?</h2>
        <div className="linha">
          <div className={`campo ${erros.vencimento ? 'com-erro' : ''}`}>
            <label htmlFor="vencimento">Data de vencimento</label>
            <input id="vencimento" name="vencimento" type="date" value={vencimento} aria-invalid={!!erros.vencimento} aria-describedby="venc-ajuda"
              onChange={(e) => { setVencimento(e.target.value); setErros((x) => ({ ...x, vencimento: undefined })) }} />
            {erros.vencimento
              ? <span id="venc-ajuda" className="erro-campo"><AlertCircle size={14} aria-hidden />{erros.vencimento}</span>
              : <span id="venc-ajuda" className="dica">A data que está no documento ou combinada com o cliente.</span>}
          </div>
          <div className="campo">
            <label htmlFor="recorrencia">Precisa renovar de quanto em quanto tempo?</label>
            <select id="recorrencia" name="recorrencia_meses" value={recorrencia} onChange={(e) => setRecorrencia(e.target.value)}>
              {RECORRENCIAS.map((r) => <option key={r.valor} value={r.valor}>{r.valor ? r.rotulo : 'Só uma vez, não repete'}</option>)}
            </select>
            {proximo
              ? <span className="dica">Ao renovar, o próximo vencimento já fica para {fmtData(proximo)}.</span>
              : <span className="dica">Escolha a repetição para o sistema criar o próximo vencimento sozinho.</span>}
          </div>
        </div>
      </section>

      <section className="etapa">
        <h2><span className="num-etapa">4</span>Quando avisar?</h2>
        <div className="campo">
          <label htmlFor="antecedencia">Primeiro aviso</label>
          <select id="antecedencia" name="antecedencia_dias" value={antecedencia} onChange={(e) => setAntecedencia(Number(e.target.value))}>
            {opcoesAviso.map((d) => <option key={d} value={d}>{d} dias antes</option>)}
          </select>
        </div>
        <div className="previa" aria-live="polite">
          {avisos.length ? (
            <>
              <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BellRing size={16} aria-hidden />Você vai receber lembretes por e-mail em</strong>
              <span className="datas">{avisos.map((d) => <span key={d} className="selo peq info">{fmtData(d)}</span>)}</span>
              <span className="dica">E, se passar do prazo sem renovar, uma vez por semana até resolver.</span>
            </>
          ) : vencimento && vencimento < hoje ? (
            <><strong>Essa data já passou.</strong><span className="dica">O item entra como vencido e o aviso chega amanhã de manhã.</span></>
          ) : (
            <span className="dica">Escolha a data de vencimento para ver quando os lembretes chegam.</span>
          )}
        </div>
      </section>

      <section className="etapa">
        {!mais ? (
          <button type="button" className="btn ghost peq quebra" onClick={() => setMais(true)}><Paperclip size={16} />Anexar documento ou observações (opcional)</button>
        ) : (
          <>
            <h2><span className="num-etapa">5</span>Detalhes <span className="opcional">(opcional)</span></h2>
            <div className="campo">
              <label>Documento</label>
              <Upload name="anexo" atual={item.anexo_nome} />
            </div>
            <div className="linha">
              <div className="campo">
                <label htmlFor="tipo-sel">Categoria</label>
                <select id="tipo-sel" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="descricao">Observações</label>
              <textarea id="descricao" name="descricao" defaultValue={item.descricao ?? ''}
                placeholder="Detalhes que ajudam o técnico na próxima visita: nº do documento, responsável técnico, equipamentos" />
            </div>
          </>
        )}
      </section>

      <div className="acoes empilha">
        <BotaoEnviar className="btn grande"><Save size={16} />{item.id ? 'Salvar alterações' : 'Salvar e ativar lembretes'}</BotaoEnviar>
      </div>
    </form>
  )
}

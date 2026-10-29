'use client'

import { useMemo, useState } from 'react'
import { fmtData, hojeISO, RECORRENCIAS, somarDias, somarMeses, TIPOS } from '@/lib/datas'
import type { Modelo } from '@/lib/modelos'
import { BotaoConfirmar } from '@/components/BotaoConfirmar'

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

/** Datas em que o sistema vai avisar (mesma regra do envio diário). */
function datasDeAviso(venc: string, antecedencia: number, hoje: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(venc)) return []
  const marcos = [...new Set([antecedencia, 7, 1, 0])].filter((d) => d >= 0).sort((a, b) => b - a)
  const datas = marcos.map((d) => somarDias(venc, -d))
  return datas.filter((d) => d >= hoje)
}

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

  function usarModelo(m: Modelo) {
    setTitulo(m.titulo)
    setTipo(m.tipo)
    setRecorrencia(m.recorrencia_meses ? String(m.recorrencia_meses) : '')
  }

  const avisos = useMemo(() => datasDeAviso(vencimento, antecedencia, hoje), [vencimento, antecedencia, hoje])
  const proximo = vencimento && recorrencia ? somarMeses(vencimento, Number(recorrencia)) : ''
  const opcoesAviso = AVISOS.includes(antecedencia) ? AVISOS : [...AVISOS, antecedencia].sort((a, b) => a - b)

  return (
    <form action={acao} className="card form-guiado">
      {item.id && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="tipo" value={tipo} />

      <section className="etapa">
        <h2><span className="num-etapa">1</span>O que vence?</h2>
        {modelos.length > 0 && !item.id && (
          <>
            <p className="ajuda" style={{ marginBottom: 8 }}>Toque em um atalho ou escreva abaixo.</p>
            <div className="modelos-rapidos">
              {modelos.map((m) => (
                <button type="button" key={m.titulo} className={`chip ${titulo === m.titulo ? 'marcado' : ''}`} onClick={() => usarModelo(m)}>
                  <span className="chip-titulo">{m.titulo}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="campo">
          <label htmlFor="titulo">Nome do documento, contrato ou manutenção</label>
          <input id="titulo" name="titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: PMOC, Laudo de qualidade do ar, Manutenção preventiva" />
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
              <option value="">Sem cliente (é da minha própria empresa)</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
          {clientes.length > 0 && (
            <button type="button" className="btn peq sec" style={{ alignSelf: 'flex-start' }} onClick={() => setNovoCliente(!novoCliente)}>
              {novoCliente ? 'Escolher da lista' : 'É um cliente novo'}
            </button>
          )}
        </div>
      </section>

      <section className="etapa">
        <h2><span className="num-etapa">3</span>Quando vence?</h2>
        <div className="linha">
          <div className="campo">
            <label htmlFor="vencimento">Data de vencimento</label>
            <input id="vencimento" name="vencimento" type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            <span className="dica">A data que está no documento ou combinada com o cliente.</span>
          </div>
          <div className="campo">
            <label htmlFor="recorrencia">Precisa renovar de quanto em quanto tempo?</label>
            <select id="recorrencia" name="recorrencia_meses" value={recorrencia} onChange={(e) => setRecorrencia(e.target.value)}>
              {RECORRENCIAS.map((r) => <option key={r.valor} value={r.valor}>{r.valor ? r.rotulo : 'Só uma vez, não repete'}</option>)}
            </select>
            {proximo
              ? <span className="dica">Quando você marcar como renovado, o próximo vencimento já fica para {fmtData(proximo)}.</span>
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
        <div className="previa-avisos" aria-live="polite">
          {avisos.length ? (
            <>
              <strong>Você vai receber lembretes por e-mail em:</strong>
              <span>{avisos.map((d) => fmtData(d)).join(', ')}</span>
              <span className="ajuda">E, se passar do prazo sem renovar, uma vez por semana até resolver.</span>
            </>
          ) : vencimento && vencimento < hoje ? (
            <><strong>Essa data já passou.</strong><span className="ajuda">O item entra como vencido e você recebe o aviso amanhã de manhã.</span></>
          ) : (
            <span className="ajuda">Escolha a data de vencimento para ver quando os lembretes chegam.</span>
          )}
        </div>
      </section>

      <section className="etapa">
        {!mais ? (
          <button type="button" className="btn sec peq" onClick={() => setMais(true)}>Anexar documento ou anotar observações (opcional)</button>
        ) : (
          <>
            <h2><span className="num-etapa">5</span>Detalhes <span className="opcional">(opcional)</span></h2>
            <div className="linha">
              <div className="campo">
                <label htmlFor="anexo">Anexar o documento (PDF ou foto)</label>
                <input id="anexo" name="anexo" type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
                {item.anexo_nome && <span className="dica">Atual: {item.anexo_nome}. Enviar outro substitui.</span>}
              </div>
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
                placeholder="Nº do documento, responsável técnico, equipamentos, contato no cliente" />
            </div>
          </>
        )}
      </section>

      <div className="acoes empilha">
        <BotaoConfirmar>{item.id ? 'Salvar alterações' : 'Salvar e ativar lembretes'}</BotaoConfirmar>
      </div>
    </form>
  )
}

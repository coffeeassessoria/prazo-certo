'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, BellRing, Check, Paperclip, Plus, Save, UserPlus } from 'lucide-react'
import { fmtData, hojeISO, RECORRENCIAS, somarDias, somarMeses, TIPOS } from '@/lib/datas'
import { avisosDoItem, normalizarAvisos, type Modelo, type Resposta } from '@/lib/modelos'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { CampoData } from '@/components/ui/CampoData'
import { Upload } from '@/components/ui/Upload'

type Cliente = { id: string; nome: string }
type Colaborador = { id: string; nome: string; funcao?: string | null }
export type ItemEdicao = {
  id?: string
  titulo?: string
  tipo?: string
  descricao?: string | null
  vencimento?: string
  recorrencia_meses?: number | null
  antecedencia_dias?: number
  avisos_dias?: number[] | null
  cliente_id?: string | null
  colaborador_id?: string | null
  modelo?: string | null
  dados?: Resposta[] | null
  anexo_nome?: string | null
}

const OPCOES_AVISO = [90, 60, 30, 15, 7, 5, 3, 2, 1]

/** Datas em que o sistema vai avisar (mesma regra do envio diário, ver lib/lembretes.ts). */
function datasDeAviso(venc: string, avisos: number[], hoje: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(venc)) return []
  return [...avisos, 0].map((d) => somarDias(venc, -d)).filter((d) => d >= hoje)
}

/** Junta as perguntas do tipo com as respostas já gravadas (sem perder nenhuma). */
function mesclarRespostas(m: Modelo | undefined, atuais: Resposta[]): Resposta[] {
  const lista = [...atuais]
  for (const c of m?.campos ?? []) {
    if (!lista.some((r) => r.rotulo === c.rotulo)) lista.push({ ...c, valor: '' })
  }
  return lista
}

/** Cadastro guiado de vencimento (DS 2.0): 4 perguntas + detalhes opcionais. */
export function ItemForm({
  acao, clientes, colaboradores = [], item = {}, clientePadrao, modelos = [], modeloInicial, antecedenciaPadrao = 30, voltaTipo = '/itens/novo',
}: {
  acao: (fd: FormData) => Promise<void>
  clientes: Cliente[]
  colaboradores?: Colaborador[]
  item?: ItemEdicao
  clientePadrao?: string
  modelos?: Modelo[]
  /** Tipo já escolhido ao abrir (ex.: voltando do cadastro de um tipo novo). */
  modeloInicial?: string
  antecedenciaPadrao?: number
  voltaTipo?: string
}) {
  const hoje = hojeISO()
  const inicial = !item.id ? modelos.find((m) => m.titulo === modeloInicial) : undefined
  const modeloDoItem = modelos.find((m) => m.titulo === item.modelo)
  const [novoCliente, setNovoCliente] = useState(clientes.length === 0)
  const [novoColab, setNovoColab] = useState(false)
  const [modeloSel, setModeloSel] = useState(item.modelo ?? inicial?.titulo ?? '')
  const [titulo, setTitulo] = useState(item.titulo ?? inicial?.titulo ?? '')
  const [tipo, setTipo] = useState(item.tipo ?? inicial?.tipo ?? 'documento')
  const [recorrencia, setRecorrencia] = useState(
    item.recorrencia_meses ? String(item.recorrencia_meses) : inicial?.recorrencia_meses ? String(inicial.recorrencia_meses) : '')
  const [vencimento, setVencimento] = useState(item.vencimento ?? '')
  const [avisos, setAvisos] = useState<number[]>(
    item.id ? avisosDoItem(item) : inicial?.avisos?.length ? inicial.avisos : normalizarAvisos([antecedenciaPadrao, 7, 1]))
  const [outroAviso, setOutroAviso] = useState('')
  const [respostas, setRespostas] = useState<Resposta[]>(mesclarRespostas(modeloDoItem ?? inicial, item.dados ?? []))
  const [mais, setMais] = useState(!!(item.descricao || item.anexo_nome))
  const [erros, setErros] = useState<{ titulo?: string; vencimento?: string; avisos?: string }>({})
  const modeloAtual = modelos.find((m) => m.titulo === modeloSel)

  function usarModelo(m: Modelo) {
    setModeloSel(m.titulo)
    setTitulo(m.titulo)
    setTipo(m.tipo)
    setRecorrencia(m.recorrencia_meses ? String(m.recorrencia_meses) : '')
    if (m.avisos?.length) setAvisos(m.avisos)
    setRespostas((r) => mesclarRespostas(m, r.filter((x) => x.valor)))
    setErros((e) => ({ ...e, titulo: undefined, avisos: undefined }))
  }

  function alternarAviso(d: number) {
    setAvisos((a) => (a.includes(d) ? a.filter((x) => x !== d) : normalizarAvisos([...a, d])))
    setErros((e) => ({ ...e, avisos: undefined }))
  }

  function adicionarOutro() {
    const n = normalizarAvisos([outroAviso])
    if (n.length) { setAvisos((a) => normalizarAvisos([...a, ...n])); setOutroAviso(''); setErros((e) => ({ ...e, avisos: undefined })) }
  }

  function responder(rotulo: string, valor: string) {
    setRespostas((r) => r.map((x) => (x.rotulo === rotulo ? { ...x, valor } : x)))
  }

  function validar(e: React.FormEvent<HTMLFormElement>) {
    const novos: typeof erros = {}
    if (!titulo.trim()) novos.titulo = 'Informe o que vence para continuar'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) novos.vencimento = 'Digite a data de vencimento (dd/mm/aaaa) para continuar'
    if (!avisos.length) novos.avisos = 'Escolha pelo menos um dia para avisar'
    setErros(novos)
    if (Object.keys(novos).length) {
      e.preventDefault()
      document.getElementById(novos.titulo ? 'titulo' : novos.vencimento ? 'vencimento' : 'avisos')?.focus()
    }
  }

  const datas = useMemo(() => datasDeAviso(vencimento, avisos, hoje), [vencimento, avisos, hoje])
  const proximo = vencimento && recorrencia ? somarMeses(vencimento, Number(recorrencia)) : ''
  const opcoesAviso = [...new Set([...OPCOES_AVISO, ...avisos])].sort((a, b) => b - a)

  return (
    <form action={acao} onSubmit={validar} noValidate className="card">
      {item.id && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="modelo" value={modeloSel} />
      <input type="hidden" name="avisos" value={avisos.join(',')} />
      <input type="hidden" name="dados" value={JSON.stringify(respostas.filter((r) => r.valor.trim()))} />

      <section className="etapa">
        <h2><span className="num-etapa">1</span>O que vence?</h2>
        {modelos.length > 0 && !item.id && (
          <>
            <p className="dica" style={{ marginBottom: 8 }}>Toque em um atalho ou escreva abaixo.</p>
            <div className="chips compactos" style={{ marginBottom: 16 }}>
              {modelos.map((m) => {
                const marcado = modeloSel === m.titulo
                return (
                  <button type="button" key={m.titulo} className="chip" aria-pressed={marcado} onClick={() => usarModelo(m)}>
                    <span className="chip-titulo">{marcado && <Check size={14} aria-hidden />}{m.titulo}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
        {!item.id && (
          <p style={{ marginTop: -8, marginBottom: 16 }}>
            <Link href={`/config/tipos?novo=1&volta=${encodeURIComponent(voltaTipo)}`} className="btn ghost peq"><Plus size={14} />Cadastrar novo tipo de documento</Link>
          </p>
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
        {respostas.length > 0 && (
          <div className="linha" style={{ rowGap: 0 }}>
            {respostas.map((r, i) => (
              <div className="campo" key={r.rotulo}>
                <label htmlFor={`resp-${i}`}>{r.rotulo} <span className="opcional">(opcional)</span></label>
                {r.tipo === 'data' ? (
                  <CampoData id={`resp-${i}`} value={r.valor} onChange={(v) => responder(r.rotulo, v)} />
                ) : r.tipo === 'sim_nao' ? (
                  <select id={`resp-${i}`} value={r.valor} onChange={(e) => responder(r.rotulo, e.target.value)}>
                    <option value="">Não informado</option><option value="Sim">Sim</option><option value="Não">Não</option>
                  </select>
                ) : (
                  <input id={`resp-${i}`} value={r.valor} inputMode={r.tipo === 'numero' ? 'decimal' : undefined}
                    onChange={(e) => responder(r.rotulo, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="etapa">
        <h2><span className="num-etapa">2</span>De quem é?</h2>
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
        <div className="campo">
          <label htmlFor="colaborador">Colaborador vinculado <span className="opcional">(opcional)</span></label>
          {novoColab ? (
            <div className="linha" style={{ rowGap: 0 }}>
              <input id="colaborador" name="colaborador_novo" placeholder="Nome do colaborador" autoFocus />
              <input name="colaborador_funcao" placeholder="Função (ex.: técnico de refrigeração)" aria-label="Função do colaborador" />
            </div>
          ) : colaboradores.length > 0 ? (
            <select id="colaborador" name="colaborador_id" defaultValue={item.colaborador_id ?? ''}>
              <option value="">Sem vínculo com colaborador</option>
              {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.funcao ? ` · ${c.funcao}` : ''}</option>)}
            </select>
          ) : null}
          <span className="dica">
            {modeloAtual?.colaborador
              ? 'Este tipo costuma ser de um funcionário (ex.: seguro de vida nominal).'
              : 'Use para documentos de um funcionário, como seguro de vida, ASO ou certificado de NR.'}
          </span>
          <span className="acoes">
            <button type="button" className="btn ghost peq" onClick={() => setNovoColab(!novoColab)}>
              {novoColab ? (colaboradores.length ? 'Escolher da lista de colaboradores' : 'Deixar sem colaborador') : <><UserPlus size={14} />{colaboradores.length ? 'É um colaborador novo' : 'Cadastrar colaborador'}</>}
            </button>
            {novoColab && <Link href="/colaboradores?novo=1" className="btn ghost peq" target="_blank">Abrir cadastro completo</Link>}
          </span>
        </div>
      </section>

      <section className="etapa">
        <h2><span className="num-etapa">3</span>Quando vence?</h2>
        <div className="linha">
          <div className={`campo ${erros.vencimento ? 'com-erro' : ''}`}>
            <label htmlFor="vencimento">Data de vencimento</label>
            <CampoData id="vencimento" name="vencimento" value={vencimento} invalido={!!erros.vencimento} describedBy="venc-ajuda"
              onChange={(v) => { setVencimento(v); setErros((x) => ({ ...x, vencimento: undefined })) }} />
            {erros.vencimento
              ? <span id="venc-ajuda" className="erro-campo"><AlertCircle size={14} aria-hidden />{erros.vencimento}</span>
              : <span id="venc-ajuda" className="dica">Digite só os números (ex.: 06112026) ou toque no calendário.</span>}
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
        <fieldset className={`campo ${erros.avisos ? 'com-erro' : ''}`} style={{ border: 0, padding: 0, margin: '0 0 20px' }}>
          <legend className="rotulo-campo">Avisar quantos dias antes? Marque um ou mais</legend>
          <div className="chips compactos" id="avisos" tabIndex={-1}>
            {opcoesAviso.map((d) => (
              <button type="button" key={d} className="chip" aria-pressed={avisos.includes(d)} onClick={() => alternarAviso(d)}>
                <span className="chip-titulo">{avisos.includes(d) && <Check size={14} aria-hidden />}{d === 1 ? '1 dia' : `${d} dias`}</span>
              </button>
            ))}
          </div>
          <div className="avisos-outro">
            <input type="number" inputMode="numeric" min={1} max={365} value={outroAviso} aria-label="Outro número de dias"
              placeholder="Outro" onChange={(e) => setOutroAviso(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarOutro() } }} />
            <button type="button" className="btn sec peq" onClick={adicionarOutro} disabled={!outroAviso}>Adicionar</button>
          </div>
          {erros.avisos
            ? <span className="erro-campo"><AlertCircle size={14} aria-hidden />{erros.avisos}</span>
            : <span className="dica">Ex.: só 1 dia antes, para documentos que não podem ser entregues antes nem depois.</span>}
        </fieldset>
        <div className="previa" aria-live="polite">
          {datas.length ? (
            <>
              <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BellRing size={16} aria-hidden />Você vai receber lembretes por e-mail em</strong>
              <span className="datas">{datas.map((d) => <span key={d} className="selo peq info">{fmtData(d)}</span>)}</span>
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

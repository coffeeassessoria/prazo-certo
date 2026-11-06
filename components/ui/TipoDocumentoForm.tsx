'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Plus, Save, X } from 'lucide-react'
import { RECORRENCIAS, TIPOS } from '@/lib/datas'
import { normalizarAvisos, PERGUNTAS_SUGERIDAS, TIPOS_CAMPO, type Campo, type Modelo, type TipoCampo } from '@/lib/modelos'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'

const OPCOES = [90, 60, 30, 15, 7, 5, 3, 2, 1]

/** Cadastro de um tipo de documento da empresa, com avisos padrão e perguntas extras (DS 2.0). */
export function TipoDocumentoForm({ acao, inicial, volta, cancelar }: {
  acao: (fd: FormData) => Promise<void>
  inicial?: Modelo
  volta?: string
  cancelar: string
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [tipo, setTipo] = useState<Modelo['tipo']>(inicial?.tipo ?? 'documento')
  const [recorrencia, setRecorrencia] = useState(inicial?.recorrencia_meses ? String(inicial.recorrencia_meses) : '12')
  const [avisos, setAvisos] = useState<number[]>(inicial?.avisos ?? [])
  const [colaborador, setColaborador] = useState(!!inicial?.colaborador)
  const [campos, setCampos] = useState<Campo[]>(inicial?.campos ?? [])
  const [nova, setNova] = useState('')
  const [novaTipo, setNovaTipo] = useState<TipoCampo>('texto')
  const [erro, setErro] = useState('')

  const tem = (r: string) => campos.some((c) => c.rotulo.toLowerCase() === r.trim().toLowerCase())
  const adicionar = (c: Campo) => { if (c.rotulo.trim() && !tem(c.rotulo) && campos.length < 20) setCampos([...campos, { ...c, rotulo: c.rotulo.trim() }]) }
  const alterar = (i: number, p: Partial<Campo>) => setCampos(campos.map((c, j) => (j === i ? { ...c, ...p } : c)))
  const alternar = (d: number) => setAvisos((a) => (a.includes(d) ? a.filter((x) => x !== d) : normalizarAvisos([...a, d])))

  const dados: Modelo = {
    titulo: titulo.trim(), tipo, recorrencia_meses: recorrencia ? Number(recorrencia) : null,
    avisos, colaborador, campos: campos.filter((c) => c.rotulo.trim()),
  }

  return (
    <form action={acao} className="card" style={{ maxWidth: 880, marginBottom: 24 }} noValidate
      onSubmit={(e) => { if (!titulo.trim()) { e.preventDefault(); setErro('Informe o nome do tipo para continuar'); document.getElementById('tp-nome')?.focus() } }}>
      <input type="hidden" name="tipo" value={JSON.stringify(dados)} />
      {inicial && <input type="hidden" name="original" value={inicial.titulo} />}
      {volta && <input type="hidden" name="volta" value={volta} />}
      <div className="card-topo"><h2>{inicial ? `Editar ${inicial.titulo}` : 'Novo tipo de documento'}</h2></div>

      <div className={`campo ${erro ? 'com-erro' : ''}`}>
        <label htmlFor="tp-nome">Nome do tipo</label>
        <input id="tp-nome" value={titulo} maxLength={80} aria-invalid={!!erro} placeholder="Ex.: Seguro de vida"
          onChange={(e) => { setTitulo(e.target.value); setErro('') }} />
        {erro ? <span className="erro-campo">{erro}</span> : <span className="dica">Aparece como atalho no cadastro de vencimento.</span>}
      </div>
      <div className="linha">
        <div className="campo">
          <label htmlFor="tp-cat">Categoria</label>
          <select id="tp-cat" value={tipo} onChange={(e) => setTipo(e.target.value as Modelo['tipo'])}>
            {Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="tp-rec">Renova de quanto em quanto tempo?</label>
          <select id="tp-rec" value={recorrencia} onChange={(e) => setRecorrencia(e.target.value)}>
            {RECORRENCIAS.map((r) => <option key={r.valor} value={r.valor}>{r.valor ? r.rotulo : 'Só uma vez, não repete'}</option>)}
          </select>
        </div>
      </div>

      <fieldset className="campo" style={{ border: 0, padding: 0 }}>
        <legend className="rotulo-campo">Avisar quantos dias antes, por padrão? <span className="opcional">(opcional)</span></legend>
        <div className="chips compactos">
          {OPCOES.map((d) => (
            <button type="button" key={d} className="chip" aria-pressed={avisos.includes(d)} onClick={() => alternar(d)}>
              <span className="chip-titulo">{avisos.includes(d) && <Check size={14} aria-hidden />}{d === 1 ? '1 dia' : `${d} dias`}</span>
            </button>
          ))}
        </div>
        <span className="dica">{avisos.length ? 'Pode mudar em cada vencimento.' : 'Sem escolha, usa o padrão da empresa (configurado em Ajustes).'}</span>
      </fieldset>

      <label className="check campo">
        <input type="checkbox" checked={colaborador} onChange={(e) => setColaborador(e.target.checked)} />
        É de um colaborador (ex.: seguro de vida nominal, ASO, NR-35)
      </label>

      <fieldset className="campo" style={{ border: 0, padding: 0 }}>
        <legend className="rotulo-campo">Perguntas deste tipo <span className="opcional">(opcional)</span></legend>
        <p className="dica" style={{ marginBottom: 8 }}>O que você quer registrar em cada vencimento deste tipo. Toque em uma sugestão ou escreva a sua.</p>
        <div className="chips compactos" style={{ marginBottom: 16 }}>
          {PERGUNTAS_SUGERIDAS.filter((p) => !tem(p.rotulo)).map((p) => (
            <button type="button" key={p.rotulo} className="chip" onClick={() => adicionar(p)}>
              <span className="chip-titulo"><Plus size={14} aria-hidden />{p.rotulo}</span>
            </button>
          ))}
        </div>
        {campos.map((c, i) => (
          <div className="pergunta-linha" key={i}>
            <input value={c.rotulo} maxLength={80} aria-label={`Pergunta ${i + 1}`} onChange={(e) => alterar(i, { rotulo: e.target.value })} />
            <select value={c.tipo} aria-label={`Tipo da resposta ${i + 1}`} onChange={(e) => alterar(i, { tipo: e.target.value as TipoCampo })}>
              {Object.entries(TIPOS_CAMPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
            <button type="button" className="btn ghost icone" aria-label={`Remover ${c.rotulo || 'pergunta'}`} onClick={() => setCampos(campos.filter((_, j) => j !== i))}><X size={16} /></button>
          </div>
        ))}
        <div className="pergunta-linha">
          <input value={nova} maxLength={80} placeholder="Escreva outra pergunta" aria-label="Nova pergunta"
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar({ rotulo: nova, tipo: novaTipo }); setNova('') } }} />
          <select value={novaTipo} aria-label="Tipo da resposta" onChange={(e) => setNovaTipo(e.target.value as TipoCampo)}>
            {Object.entries(TIPOS_CAMPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
          <button type="button" className="btn sec" disabled={!nova.trim() || tem(nova)} onClick={() => { adicionar({ rotulo: nova, tipo: novaTipo }); setNova('') }}>Adicionar</button>
        </div>
      </fieldset>

      <div className="acoes empilha">
        <BotaoEnviar><Save size={16} />{inicial ? 'Salvar tipo' : volta ? 'Salvar e voltar ao vencimento' : 'Cadastrar tipo'}</BotaoEnviar>
        <Link href={cancelar} className="btn ghost">Cancelar</Link>
      </div>
    </form>
  )
}

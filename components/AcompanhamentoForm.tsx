'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Save } from 'lucide-react'
import { hojeISO, fmtData, somarDias } from '@/lib/datas'
import { CATEGORIAS, ETAPAS, MODELOS_CLIMATIZACAO, encerrada, type AcaoDemanda, type Categoria, type Etapa, type Responsavel, type Vinculo } from '@/lib/demandas'
import { BotaoEnviar } from '@/components/ui/BotaoEnviar'
import { Aviso } from '@/components/ui/Aviso'

export type AcompanhamentoEdicao = {
  id?: string; titulo?: string; descricao?: string | null; vencimento?: string; cliente_id?: string | null
  categoria_demanda?: Categoria; etapa_demanda?: Etapa; responsavel_id?: string | null
  proxima_acao?: string | null; vinculo_item_id?: string | null
}

/** Demanda de climatização: próximo passo e responsável, ou registro de contato. */
export function AcompanhamentoForm({ acao, clientes, responsaveis = [], vinculos = [], item = {},
  responsavelPadrao = '', compacto = false, modo = 'cadastro',
}: {
  acao: AcaoDemanda; clientes: { id: string; nome: string }[]; responsaveis?: Responsavel[]
  vinculos?: Vinculo[]; item?: AcompanhamentoEdicao; responsavelPadrao?: string; compacto?: boolean
  modo?: 'cadastro' | 'contato'
}) {
  const [resultado, enviar, pendente] = useActionState(acao, null)
  const [titulo, setTitulo] = useState(item.titulo ?? '')
  const [categoria, setCategoria] = useState<Categoria>(item.categoria_demanda ?? 'outro')
  const [etapa, setEtapa] = useState<Etapa>(item.etapa_demanda ?? 'a_fazer')
  const [cliente, setCliente] = useState(item.cliente_id ?? '')
  const [vinculo, setVinculo] = useState(item.vinculo_item_id ?? '')
  const [proxima, setProxima] = useState(item.proxima_acao ?? item.titulo ?? '')
  const hoje = hojeISO()
  const contato = modo === 'contato'
  const vencimento = item.vencimento && item.vencimento >= hoje ? item.vencimento : hoje
  const selecionado = vinculos.find(v => v.id === vinculo)

  return (
    <form action={enviar} className="card" aria-busy={pendente}>
      {compacto && <h2>Nova demanda de climatização</h2>}
      {contato && <><h2>Registrar contato ou andamento</h2><p className="muted">Conte o que aconteceu e deixe o próximo passo combinado.</p></>}
      {resultado && <Aviso tipo="erro" titulo={resultado.erro} />}
      <fieldset disabled={pendente} className="demanda-campos">
        {item.id && <input type="hidden" name="id" value={item.id} />}
        {!contato && <>
          {!item.id && <div className="campo">
            <label htmlFor="dem-modelo">Começar com um exemplo <span className="opcional">(opcional)</span></label>
            <select id="dem-modelo" defaultValue="" onChange={e => {
              const modelo = MODELOS_CLIMATIZACAO[Number(e.target.value)]
              if (e.target.value && modelo) { setTitulo(modelo.titulo); setCategoria(modelo.categoria); setProxima(modelo.acao) }
            }}>
              <option value="">Escrever minha demanda</option>
              {MODELOS_CLIMATIZACAO.map((m, i) => <option key={m.categoria} value={i}>{m.titulo}</option>)}
            </select>
          </div>}
          <div className="campo">
            <label htmlFor="dem-titulo">O que precisa ser resolvido?</label>
            <input id="dem-titulo" name="titulo" required maxLength={180} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Aprovar orçamento da troca do compressor" />
          </div>
          <div className="linha">
            <div className="campo"><label htmlFor="dem-cliente">Cliente <span className="opcional">(opcional)</span></label>
              <select id="dem-cliente" name="cliente_id" value={cliente} onChange={e => { setCliente(e.target.value); setVinculo('') }}>
                <option value="">Sem cliente</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {!clientes.length && <span className="dica"><Link href="/clientes?novo=1">Cadastrar um cliente</Link> para relacionar a demanda.</span>}
            </div>
            <div className="campo"><label htmlFor="dem-categoria">Tipo de demanda</label>
              <select id="dem-categoria" name="categoria_demanda" value={categoria} onChange={e => setCategoria(e.target.value as Categoria)}>
                {Object.entries(CATEGORIAS).map(([v,r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="campo"><label htmlFor="dem-responsavel">Quem vai cuidar disso?</label>
            <select id="dem-responsavel" name="responsavel_id" required defaultValue={item.responsavel_id ?? responsavelPadrao}>
              <option value="">Escolher responsável</option>{responsaveis.map(p => <option key={p.user_id} value={p.user_id}>{p.nome || p.email || 'Usuário'}</option>)}
            </select>
          </div>
          <div className="campo"><label htmlFor="dem-vinculo">Relacionar a um vencimento <span className="opcional">(opcional)</span></label>
            <select id="dem-vinculo" name="vinculo_item_id" value={vinculo} onChange={e => setVinculo(e.target.value)}>
              <option value="">Sem vínculo</option>{vinculos.filter(v => (v.cliente_id ?? '') === cliente).map(v => <option key={v.id} value={v.id}>{v.titulo} — {fmtData(v.vencimento)}</option>)}
            </select>
            <span className="dica">{selecionado ? `Prazo original: ${fmtData(selecionado.vencimento)}. O retorno abaixo não muda esse prazo.` : 'Manutenção, PMOC ou contrato do mesmo cliente. O prazo original será preservado.'}</span>
          </div>
        </>}
        {contato && <div className="campo"><label htmlFor="dem-nota">O que aconteceu?</label>
          <textarea id="dem-nota" name="nota" required maxLength={4000} rows={3} placeholder="Ex.: Falei com o João. Ele pediu para retornar na sexta com a proposta revisada." />
        </div>}
        <div className="campo"><label htmlFor="dem-etapa">Situação da demanda</label>
          <select id="dem-etapa" name="etapa_demanda" value={etapa} onChange={e => setEtapa(e.target.value as Etapa)}>
            {Object.entries(ETAPAS).map(([v,r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </div>
        {(!contato || !encerrada(etapa)) && <>
          <div className="campo"><label htmlFor="dem-acao">Qual é a próxima ação?</label>
            <input id="dem-acao" name="proxima_acao" required maxLength={240} value={proxima} onChange={e => setProxima(e.target.value)} placeholder="Ex.: Ligar para confirmar a aprovação" />
          </div>
          <div className="campo"><label htmlFor="dem-data">Quando fazer o próximo retorno?</label>
            <input id="dem-data" name="vencimento" type="date" required defaultValue={contato ? vencimento : (item.vencimento ?? somarDias(hoje, 3))}
              min={!contato && item.vencimento && item.vencimento < hoje ? item.vencimento : hoje} />
            <span className="dica">A demanda aparece na lista do dia. O resumo por e-mail segue os lembretes configurados em Ajustes.</span>
          </div>
        </>}
        {contato && encerrada(etapa) && <p className="muted">Ao encerrar, esta demanda sai da lista de pendências e para de gerar lembretes. O vencimento vinculado continua ativo.</p>}
        {!contato && <div className="campo"><label htmlFor="dem-desc">Observação <span className="opcional">(opcional)</span></label>
          <textarea id="dem-desc" name="descricao" rows={2} maxLength={8000} defaultValue={item.descricao ?? ''} placeholder="Ex.: Orçamento 123, ar da recepção, falar com o João." />
        </div>}
        <BotaoEnviar className="btn grande cheio"><Save size={16} />{contato ? 'Registrar andamento' : item.id ? 'Salvar alterações' : 'Salvar demanda'}</BotaoEnviar>
      </fieldset>
    </form>
  )
}

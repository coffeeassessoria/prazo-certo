'use client'

import { useState } from 'react'
import { AcompanhamentoForm } from '@/components/AcompanhamentoForm'
import { ETAPAS, encerrada, type Etapa, type ResultadoDemanda } from '@/lib/demandas'
import { fmtData, hojeISO, somarDias } from '@/lib/datas'

export function SimularContato() {
  const [item,setItem] = useState({ id:'demo',etapa_demanda:'aguardando_cliente' as Etapa, vencimento:hojeISO(),proxima_acao:'Ligar para o João e confirmar a aprovação' })
  const [historico,setHistorico] = useState<string[]>(['Vanderlei enviou o orçamento 123 e combinou um retorno.'])
  const [chave,setChave] = useState(0)
  async function registrar(_prev: ResultadoDemanda, fd: FormData): Promise<ResultadoDemanda> {
    const etapa = String(fd.get('etapa_demanda')) as Etapa
    const nova = { ...item,etapa_demanda:etapa,vencimento:String(fd.get('vencimento') || item.vencimento),proxima_acao:String(fd.get('proxima_acao') || item.proxima_acao) }
    setItem(nova)
    setHistorico(h => [`Vanderlei: ${fd.get('nota')} — ${ETAPAS[etapa]}${encerrada(etapa) ? '' : ` · próximo retorno em ${fmtData(nova.vencimento)}`}`, ...h])
    setChave(k => k+1)
    return null
  }
  return <>
    <div className="grade-2">
      <div className="card"><h2>Próximo passo</h2><dl className="detalhes">
        <dt>Responsável</dt><dd>Vanderlei</dd><dt>Situação</dt><dd>{ETAPAS[item.etapa_demanda]}</dd>
        <dt>Próxima ação</dt><dd>{item.proxima_acao}</dd><dt>Retorno</dt><dd>{fmtData(item.vencimento)}</dd>
        <dt>Manutenção vinculada</dt><dd>Troca do compressor — prazo original {fmtData(somarDias(hojeISO(),14))}. Esse prazo permanece igual ao registrar um novo retorno.</dd>
      </dl></div>
      <AcompanhamentoForm key={chave} acao={registrar} clientes={[]} item={item} modo="contato" />
    </div>
    <section className="card demanda-historico"><h2>Histórico da simulação</h2><ol className="demanda-eventos">{historico.map((h,i) => <li key={i}>{h}</li>)}</ol></section>
  </>
}

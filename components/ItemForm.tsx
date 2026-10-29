'use client'

import { useState } from 'react'
import { RECORRENCIAS, TIPOS } from '@/lib/datas'
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

export function ItemForm({
  acao, clientes, item = {}, clientePadrao,
}: {
  acao: (fd: FormData) => Promise<void>
  clientes: Cliente[]
  item?: ItemEdicao
  clientePadrao?: string
}) {
  const [novoCliente, setNovoCliente] = useState(clientes.length === 0)

  return (
    <form action={acao} className="card">
      {item.id && <input type="hidden" name="id" value={item.id} />}

      <div className="campo">
        <label htmlFor="titulo">O que vence? *</label>
        <input id="titulo" name="titulo" required defaultValue={item.titulo}
          placeholder="Ex.: PMOC, Laudo de qualidade do ar, Manutenção preventiva…" />
      </div>

      <div className="linha">
        <div className="campo">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" defaultValue={item.tipo ?? 'documento'}>
            {Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="cliente">Cliente</label>
          {novoCliente ? (
            <input id="cliente" name="cliente_novo" placeholder="Nome do cliente (novo)" />
          ) : (
            <select id="cliente" name="cliente_id" defaultValue={item.cliente_id ?? clientePadrao ?? ''}>
              <option value="">— Sem cliente —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
          {clientes.length > 0 && (
            <button type="button" className="btn peq sec" style={{ alignSelf: 'flex-start' }}
              onClick={() => setNovoCliente(!novoCliente)}>
              {novoCliente ? 'Escolher cliente existente' : 'Cadastrar cliente novo'}
            </button>
          )}
        </div>
      </div>

      <div className="linha">
        <div className="campo">
          <label htmlFor="vencimento">Data de vencimento *</label>
          <input id="vencimento" name="vencimento" type="date" required defaultValue={item.vencimento} />
        </div>
        <div className="campo">
          <label htmlFor="recorrencia">Repete a cada</label>
          <select id="recorrencia" name="recorrencia_meses" defaultValue={item.recorrencia_meses ? String(item.recorrencia_meses) : ''}>
            {RECORRENCIAS.map((r) => <option key={r.valor} value={r.valor}>{r.rotulo}</option>)}
          </select>
          <span className="dica">Ao marcar como renovado, o próximo vencimento é sugerido automaticamente.</span>
        </div>
      </div>

      <div className="linha">
        <div className="campo">
          <label htmlFor="antecedencia">Avisar com quantos dias de antecedência</label>
          <input id="antecedencia" name="antecedencia_dias" type="number" min={0} max={365}
            defaultValue={item.antecedencia_dias ?? 15} />
          <span className="dica">A agenda do Google avisa no máximo 28 dias antes.</span>
        </div>
        <div className="campo">
          <label htmlFor="anexo">Anexo (PDF ou foto)</label>
          <input id="anexo" name="anexo" type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" />
          {item.anexo_nome && <span className="dica">Atual: {item.anexo_nome} (enviar outro substitui)</span>}
        </div>
      </div>

      <div className="campo">
        <label htmlFor="descricao">Observações</label>
        <textarea id="descricao" name="descricao" defaultValue={item.descricao ?? ''}
          placeholder="Nº do documento, responsável técnico, equipamentos, contato no cliente…" />
      </div>

      <div className="acoes">
        <BotaoConfirmar>{item.id ? 'Salvar alterações' : 'Cadastrar vencimento'}</BotaoConfirmar>
      </div>
    </form>
  )
}

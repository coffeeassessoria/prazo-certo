import Link from 'next/link'
import { FormResultado } from '@/components/FormResultado'
import { BotaoEnviar } from './BotaoEnviar'
import { TIPOS_EQUIPAMENTO } from '@/lib/pmoc'
import type { Resultado } from '@/lib/usuarios'

type Ambiente = {
  id: string
  nome: string
  atividade?: string
  area_m2?: number | null
  ocupantes_fixos?: number | null
  ocupantes_flutuantes?: number | null
}
type Equipamento = {
  id: string
  ambiente_id: string
  tag: string
  tipo: string
  marca?: string
  modelo?: string
  serie?: string
  capacidade_btu?: number | null
  observacoes?: string
}
type Acao = (prev: Resultado, fd: FormData) => Promise<Resultado>
/** Inventário compartilhado pela operação e pela demonstração, com edição no mesmo padrão. */
export function InventarioUnidade({
  id,
  ambientes,
  equipamentos,
  ambienteEditando,
  equipamentoEditando,
  salvarAmbiente,
  salvarEquipamento,
  baseHref = `/unidades/${id}`,
}: {
  id: string
  ambientes: Ambiente[]
  equipamentos: Equipamento[]
  ambienteEditando?: string
  equipamentoEditando?: string
  salvarAmbiente: Acao
  salvarEquipamento: Acao
  baseHref?: string
}) {
  const a = ambientes.find((x) => x.id === ambienteEditando),
    e = equipamentos.find((x) => x.id === equipamentoEditando)
  const campo = (
    nome: string,
    rotulo: string,
    dado: unknown,
    tipo = 'text',
    min?: number,
    step?: string,
  ) => (
    <div className="campo">
      <label htmlFor={`inv-${nome}`}>{rotulo}</label>
      <input
        id={`inv-${nome}`}
        name={nome}
        type={tipo}
        min={min}
        step={step}
        defaultValue={String(dado ?? '')}
        maxLength={nome === 'nome' || nome === 'modelo' ? 160 : 300}
        required={['nome', 'tag'].includes(nome)}
      />
    </div>
  )
  return (
    <div className="grade-2 documento-secao">
      <div>
        <h2>Ambientes climatizados</h2>
        <div className="lista">
          {ambientes?.map((x) => (
            <Link
              className="item"
              key={x.id}
              href={`${baseHref}?ambiente=${x.id}`}
            >
              <span className="item-corpo">
                <span className="item-titulo">{x.nome}</span>
                <span className="item-meta">
                  {x.atividade || 'Atividade a completar'} · {x.area_m2 ?? '-'}{' '}
                  m² · ocupação {x.ocupantes_fixos ?? '-'} /{' '}
                  {x.ocupantes_flutuantes ?? '-'}
                </span>
              </span>
              <span>Editar</span>
            </Link>
          ))}
        </div>
        <h2 className="documento-secao">Equipamentos</h2>
        <div className="lista">
          {equipamentos?.map((x) => (
            <Link
              className="item"
              key={x.id}
              href={`${baseHref}?equipamento=${x.id}`}
            >
              <span className="item-corpo">
                <span className="item-titulo">
                  {x.tag} · {x.marca} {x.modelo}
                </span>
                <span className="item-meta">
                  {ambientes?.find((y) => y.id === x.ambiente_id)?.nome} ·{' '}
                  {x.capacidade_btu ?? 'Capacidade a definir'} BTU/h
                </span>
              </span>
              <span>Editar</span>
            </Link>
          ))}
        </div>
      </div>
      <div>
        <FormResultado acao={salvarAmbiente} key={`a-${a?.id ?? 'novo'}`}>
          <h2>{a ? 'Editar ambiente' : 'Adicionar ambiente'}</h2>
          <input type="hidden" name="unidade_id" value={id} />
          {a && <input type="hidden" name="id" value={a.id} />}
          {campo('nome', 'Nome do ambiente', a?.nome)}
          {campo('atividade', 'Atividade desenvolvida no local', a?.atividade)}
          {campo(
            'area_m2',
            'Área climatizada (m²)',
            a?.area_m2,
            'number',
            0.01,
            '0.01',
          )}
          <div className="linha">
            {campo(
              'ocupantes_fixos',
              'Ocupantes fixos',
              a?.ocupantes_fixos,
              'number',
              0,
              '1',
            )}
            {campo(
              'ocupantes_flutuantes',
              'Ocupantes flutuantes',
              a?.ocupantes_flutuantes,
              'number',
              0,
              '1',
            )}
          </div>
          <BotaoEnviar className="btn sec">Salvar ambiente</BotaoEnviar>
          {a && (
            <Link className="btn ghost" href={baseHref}>
              Cancelar edição
            </Link>
          )}
        </FormResultado>
        <FormResultado acao={salvarEquipamento} key={`e-${e?.id ?? 'novo'}`}>
          <h2>{e ? 'Editar equipamento' : 'Adicionar equipamento'}</h2>
          <input type="hidden" name="unidade_id" value={id} />
          {e && <input type="hidden" name="id" value={e.id} />}
          <div className="campo">
            <label htmlFor="inv-ambiente">Ambiente</label>
            <select
              id="inv-ambiente"
              name="ambiente_id"
              required
              defaultValue={e?.ambiente_id ?? ''}
            >
              <option value="">Escolher ambiente</option>
              {ambientes?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </div>
          {campo('tag', 'Identificação do aparelho (ex.: AC-01)', e?.tag)}
          <div className="campo">
            <label htmlFor="inv-tipo">Tipo</label>
            <select id="inv-tipo" name="tipo" defaultValue={e?.tipo ?? 'split'}>
              {Object.entries(TIPOS_EQUIPAMENTO).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="linha">
            {campo('marca', 'Marca', e?.marca)}
            {campo('modelo', 'Modelo', e?.modelo)}
          </div>
          {campo('serie', 'Número de série', e?.serie)}
          {campo(
            'capacidade_btu',
            'Capacidade nominal (BTU/h)',
            e?.capacidade_btu,
            'number',
            0.01,
            '0.01',
          )}
          {campo('observacoes', 'Observações do equipamento', e?.observacoes)}
          <BotaoEnviar className="btn sec">Salvar equipamento</BotaoEnviar>
          {e && (
            <Link className="btn ghost" href={baseHref}>
              Cancelar edição
            </Link>
          )}
        </FormResultado>
      </div>
    </div>
  )
}

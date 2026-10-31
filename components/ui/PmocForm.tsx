'use client'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { FormResultado } from '@/components/FormResultado'
import { BotaoEnviar } from './BotaoEnviar'
import { Upload } from './Upload'
import { PLANO_VAZIO, type DadosPlano, type RotinaPmoc } from '@/lib/pmoc'
import type { Resultado } from '@/lib/usuarios'

export function PmocForm({
  acao,
  plano,
  unidades,
  unidadePadrao = '',
}: {
  acao: (prev: Resultado, fd: FormData) => Promise<Resultado>
  plano?: { id: string; unidade_id: string; dados: DadosPlano }
  unidades: { id: string; nome: string }[]
  unidadePadrao?: string
}) {
  const d = plano?.dados ?? PLANO_VAZIO
  const [rotinas, setRotinas] = useState<RotinaPmoc[]>(
    d.rotinas.map((r) => ({ ...r })),
  )
  function mudar(id: string, chave: keyof RotinaPmoc, valor: string) {
    setRotinas((rs) =>
      rs.map((r) => (r.id === id ? { ...r, [chave]: valor } : r)),
    )
  }
  const campo = (
    nome: keyof Omit<DadosPlano, 'rotinas'>,
    rotulo: string,
    tipo = 'text',
    max = 300,
  ) => (
    <div className="campo">
      <label htmlFor={`pm-${nome}`}>{rotulo}</label>
      <input
        id={`pm-${nome}`}
        name={nome}
        type={tipo}
        maxLength={max}
        defaultValue={String(d[nome] ?? '')}
      />
    </div>
  )
  return (
    <FormResultado acao={acao}>
      {plano && <input type="hidden" name="id" value={plano.id} />}
      <div className="campo">
        <label htmlFor="pm-unidade">Unidade atendida</label>
        {plano ? (
          <>
            <input type="hidden" name="unidade_id" value={plano.unidade_id} />
            <input
              id="pm-unidade"
              readOnly
              value={
                unidades.find((u) => u.id === plano.unidade_id)?.nome ??
                'Unidade do plano'
              }
            />
          </>
        ) : (
          <select
            id="pm-unidade"
            name="unidade_id"
            required
            defaultValue={unidadePadrao}
          >
            <option value="">Escolher unidade</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        )}
      </div>
      {campo('titulo', 'Título do plano', 'text', 180)}
      <div className="linha">
        {campo('inicio', 'Início de referência do plano', 'date')}
        {campo(
          'revisao_em',
          'Próxima revisão definida pelo responsável técnico (opcional)',
          'date',
        )}
      </div>
      <h2 className="documento-secao">Responsável técnico</h2>
      <p className="muted">
        Preencha conforme os dados do profissional. O sistema não emite ART/TRT
        nem assina pelo responsável.
      </p>
      <div className="linha">
        {campo('tecnico_nome', 'Nome / razão social')}
        {campo('tecnico_documento', 'CNPJ / CPF')}
      </div>
      <div className="linha">
        {campo('tecnico_conselho', 'Conselho profissional')}
        {campo('tecnico_registro', 'Número do registro')}
      </div>
      {campo('tecnico_endereco', 'Endereço completo', 'text', 500)}
      {campo('tecnico_contato', 'Telefone / e-mail')}
      {campo(
        'responsabilidade',
        'ART / TRT / referência ou justificativa técnica',
        'text',
        1000,
      )}
      <h2 className="documento-secao">Atividades de manutenção e controle</h2>
      <p className="muted">
        Os exemplos são editáveis. Defina a aplicação e a periodicidade para
        esta instalação antes de preparar o documento para assinatura.
      </p>
      <input type="hidden" name="rotinas" value={JSON.stringify(rotinas)} />
      {rotinas.map((r, i) => (
        <fieldset key={r.id} className="pmoc-rotina">
          <legend>Atividade {i + 1}</legend>
          <div className="campo">
            <label htmlFor={`ap-${r.id}`}>Aplicação / equipamentos</label>
            <input
              id={`ap-${r.id}`}
              value={r.aplicacao}
              onChange={(e) => mudar(r.id, 'aplicacao', e.target.value)}
              required
              maxLength={300}
              placeholder="Ex.: Splits da recepção - AC-01 e AC-02"
            />
          </div>
          <div className="campo">
            <label htmlFor={`at-${r.id}`}>Atividade</label>
            <textarea
              id={`at-${r.id}`}
              value={r.atividade}
              onChange={(e) => mudar(r.id, 'atividade', e.target.value)}
              required
              maxLength={1500}
            />
          </div>
          <div className="campo">
            <label htmlFor={`pe-${r.id}`}>
              Periodicidade definida pelo responsável técnico
            </label>
            <input
              id={`pe-${r.id}`}
              value={r.periodicidade}
              onChange={(e) => mudar(r.id, 'periodicidade', e.target.value)}
              maxLength={200}
              placeholder="Definir conforme o plano e a instalação"
            />
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setRotinas((rs) => rs.filter((x) => x.id !== r.id))}
          >
            <Trash2 size={16} />
            Retirar esta atividade do rascunho
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn sec"
        disabled={rotinas.length >= 100}
        onClick={() =>
          setRotinas((rs) => [
            ...rs,
            {
              id: crypto.randomUUID(),
              aplicacao: '',
              atividade: '',
              periodicidade: '',
            },
          ])
        }
      >
        <Plus size={16} />
        Adicionar atividade
      </button>
      <h2 className="documento-secao">Falhas, emergências e projeto</h2>
      <div className="campo">
        <label htmlFor="pm-recomendacoes">
          Recomendações aos usuários para falhas e emergências
        </label>
        <textarea
          id="pm-recomendacoes"
          name="recomendacoes"
          rows={4}
          maxLength={12000}
          defaultValue={d.recomendacoes}
          placeholder="Orientações definidas pelo responsável técnico para este local."
        />
      </div>
      <div className="campo">
        <label htmlFor="pm-projeto">
          Referência do projeto de instalação / justificativa
        </label>
        <textarea
          id="pm-projeto"
          name="projeto_referencia"
          rows={2}
          maxLength={4000}
          defaultValue={d.projeto_referencia}
        />
      </div>
      <div className="campo">
        <label>Projeto de instalação em PDF (opcional)</label>
        <Upload
          name="projeto"
          accept="application/pdf"
          titulo="Envie o projeto de instalação"
          ajuda="PDF sem senha, até 10 MB. O arquivo original será preservado como anexo."
          atual={d.projeto_path ? 'Projeto já anexado' : undefined}
        />
        <span className="dica">
          O arquivo será anexado ao PDF emitido. Enviar outro preserva as
          versões anteriores.
        </span>
      </div>
      <div className="campo">
        <label htmlFor="pm-observacoes">Observações do plano</label>
        <textarea
          id="pm-observacoes"
          name="observacoes"
          rows={3}
          maxLength={12000}
          defaultValue={d.observacoes}
        />
      </div>
      <BotaoEnviar className="btn grande">Salvar plano</BotaoEnviar>
    </FormResultado>
  )
}

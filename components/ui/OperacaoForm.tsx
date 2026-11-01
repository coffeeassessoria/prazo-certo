"use client";
import { RelatorioServico } from "./RelatorioServico";
import { relatorioVazio, type Relatorio } from "@/lib/relatorios/modelo";
import { useRef, useState } from "react";
import { AssinaturaAtendimento } from "./AssinaturaAtendimento";
import {
  conteudoAceite,
  podeColetarAssinatura,
  criarAssinatura,
  semAssinatura,
} from "@/lib/relatorios/assinatura";
import { BotaoEnviar } from "./BotaoEnviar";
import { Aviso } from "./Aviso";
import { Confirmar } from "./Confirmar";
import {
  hoje,
  decimalBR,
  dinheiro,
  ESTADOS,
  totalOrcamento,
  type Base,
  type Dados,
  type Registro,
} from "@/lib/operacao/modelo";
const numero = (n: number, casas = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(n / 10 ** casas);
export function OperacaoForm({
  registro,
  base,
  salvar,
  cancelar,
  conflito,
  revisando = false,
  demo = false,
  offlineAtivo = false,
}: {
  registro: Registro;
  base: Base;
  salvar: (d: Dados) => Promise<void>;
  cancelar: () => void;
  conflito?: Registro;
  revisando?: boolean;
  demo?: boolean;
  offlineAtivo?: boolean;
}) {
  const [d, setD] = useState<Dados>({
      ...registro.dados,
      ...(registro.tipo === "servico" && !registro.dados.relatorio
        ? {
            relatorio: relatorioVazio(
              registro.dados.estado === "agendada" ? "" : hoje(),
            ),
          }
        : {}),
    }),
    [erro, setErro] = useState(""),
    [fotosOcupadas, setFotosOcupadas] = useState(false),
    [assinando, setAssinando] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);
  const preservado = !!registro.dados.relatorio?.snapshot;
  const alterarRelatorio = (
    patch: Partial<Relatorio> | ((a: Relatorio) => Relatorio),
  ) =>
    setD((a) => ({
      ...a,
      checklist:
        typeof patch !== "function" &&
        ("plano_id" in patch || "unidade_id" in patch)
          ? a.checklist?.map((c) => ({ ...c, rotina_id: null }))
          : a.checklist,
      relatorio:
        typeof patch === "function"
          ? patch(a.relatorio!)
          : { ...a.relatorio!, ...patch },
    }));
  const tipo = registro.tipo;
  const congelado =
    tipo === "orcamento" && registro.dados.estado === "aprovado";
  const campo = <K extends keyof Dados>(k: K, v: Dados[K]) =>
    setD((a) => ({ ...a, [k]: v }));
  const itens = d.itens || [];
  const [chaves, setChaves] = useState(() =>
    itens.map(() => crypto.randomUUID()),
  );
  let total = 0;
  try {
    total = totalOrcamento(itens, d.desconto_centavos);
  } catch {}
  async function enviar(f: FormData) {
    setErro("");
    try {
      if (fotosOcupadas) throw new Error("Aguarde a preparação das fotos.");
      const novo = { ...d };
      if (tipo === "servico" && novo.relatorio && novo.estado === "concluida") {
        const r = novo.relatorio;
        if (!r.unidade_id || !r.equipamento_ids.length || !r.executada_em)
          throw new Error("Informe unidade, equipamentos e data da execução.");
        if (
          r.ciencia.situacao === "presente" &&
          (!r.ciencia.nome.trim() || !r.ciencia.confirmada)
        )
          throw new Error(
            "Identifique o representante e confirme a ciência do cliente.",
          );
      }
      if (tipo === "orcamento" && !congelado) {
        novo.itens = itens.map((item, i) => ({
          ...item,
          quantidade_mil: decimalBR(String(f.get(`q-${i}`)), 3),
          preco_centavos: decimalBR(String(f.get(`p-${i}`))),
        }));
        novo.desconto_centavos = decimalBR(String(f.get("desconto")));
        novo.total_centavos = totalOrcamento(
          novo.itens,
          novo.desconto_centavos,
        );
      }
      if (tipo === "financeiro")
        novo.valor_centavos = decimalBR(String(f.get("valor")));
      await salvar(novo);
    } catch (e) {
      setErro((e as Error).message);
    }
  }
  return (
    <form
      ref={formulario}
      action={enviar}
      className="card operacao-pilha"
      aria-label="Editar registro"
    >
      <div className="card-topo">
        <h2>{registro.versao ? "Editar registro" : "Novo registro"}</h2>
        <button
          type="button"
          className="btn ghost"
          disabled={fotosOcupadas || assinando}
          onClick={cancelar}
        >
          Voltar à lista
        </button>
      </div>
      {erro && (
        <Aviso tipo="erro" titulo="Revise antes de salvar">
          {erro}
        </Aviso>
      )}
      {revisando &&
        (conflito ? (
          <>
            <Aviso
              tipo="atencao"
              titulo="Compare as duas versões antes de salvar"
            >
              Os dados abaixo são os que sua equipe salvou na plataforma. Seu
              rascunho está nos campos de edição. Ao salvar, os campos editados
              substituirão a versão atual.
            </Aviso>
            <details open className="operacao-item">
              <summary>Dados atuais na plataforma</summary>
              <dl className="operacao-comparacao">
                {[
                  ["Título", conflito.dados.titulo],
                  [
                    "Cliente",
                    base.clientes.find(
                      (c) => c.id === conflito.dados.cliente_id,
                    )?.nome || "Sem cliente",
                  ],
                  [
                    "Responsável",
                    base.equipe.find(
                      (p) => p.id === conflito.dados.responsavel_id,
                    )?.nome || "Sem responsável",
                  ],
                  ["Situação", ESTADOS[conflito.tipo][conflito.dados.estado]],
                  ["Data", conflito.dados.data.split("-").reverse().join("/")],
                  ["Próxima ação", conflito.dados.proxima_acao],
                  [
                    "Serviços e materiais",
                    conflito.dados.itens
                      ?.map(
                        (i) =>
                          `${i.descricao} · ${i.quantidade_mil / 1000} × ${dinheiro(i.preco_centavos)}`,
                      )
                      .join("\n"),
                  ],
                  [
                    "Desconto",
                    conflito.tipo === "orcamento"
                      ? dinheiro(conflito.dados.desconto_centavos)
                      : "",
                  ],
                  [
                    "Total",
                    conflito.tipo === "orcamento"
                      ? dinheiro(conflito.dados.total_centavos)
                      : "",
                  ],
                  ["Condições de pagamento", conflito.dados.condicoes],
                  [
                    "Etapas",
                    conflito.dados.checklist
                      ?.map(
                        (c) =>
                          `${c.feito ? "Concluída" : "Pendente"}: ${c.descricao}`,
                      )
                      .join("\n"),
                  ],
                  ["Resultado", conflito.dados.resultado],
                  [
                    "Unidade do relatório",
                    conflito.dados.relatorio?.snapshot?.unidade.nome ||
                      base.campo?.unidades.find(
                        (u) => u.id === conflito.dados.relatorio?.unidade_id,
                      )?.nome,
                  ],
                  [
                    "Equipamentos do relatório",
                    conflito.dados.relatorio?.equipamento_ids
                      .map(
                        (id) =>
                          base.campo?.equipamentos.find((e) => e.id === id)
                            ?.tag || id,
                      )
                      .join(", "),
                  ],
                  ["Data da execução", conflito.dados.relatorio?.executada_em],
                  ["Peças e materiais", conflito.dados.relatorio?.pecas],
                  ["Medições", conflito.dados.relatorio?.medicoes],
                  ["Recomendações", conflito.dados.relatorio?.recomendacoes],
                  [
                    "Próxima manutenção",
                    conflito.dados.relatorio?.proxima_manutencao,
                  ],
                  [
                    "Ciência do cliente",
                    conflito.dados.relatorio
                      ? `${conflito.dados.relatorio.ciencia.situacao} · ${conflito.dados.relatorio.ciencia.nome} · ${conflito.dados.relatorio.ciencia.cargo}`
                      : "",
                  ],
                  [
                    "Fotos",
                    conflito.dados.relatorio?.fotos
                      .map(
                        (f) =>
                          `${f.etapa} · ${f.legenda || "Sem legenda"} · ${f.id}`,
                      )
                      .join("\n"),
                  ],
                  [
                    "Observações",
                    conflito.dados.observacoes || "Sem observações",
                  ],
                ]
                  .filter(([, v]) => !!v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
            </details>
            <label className="operacao-consentimento">
              <input type="checkbox" required />
              Conferi os dados atuais e quero salvar a revisão nos campos
              abaixo.
            </label>
          </>
        ) : (
          <Aviso tipo="erro" titulo="Versão atual indisponível">
            Este registro não apareceu na consulta da plataforma. O rascunho
            permanece salvo neste aparelho. Atualize a lista e confirme se o
            registro ainda existe antes de revisar.
          </Aviso>
        ))}
      {congelado && (
        <Aviso titulo="Orçamento aprovado">
          Os valores estão preservados. Você pode atualizar as observações.
        </Aviso>
      )}
      <fieldset
        disabled={
          preservado || fotosOcupadas || assinando || !!d.relatorio?.assinatura
        }
        className="relatorio-campos operacao-pilha"
      >
        <div className="campo">
          <label htmlFor="op-titulo">Título</label>
          <input
            id="op-titulo"
            required
            maxLength={180}
            value={d.titulo}
            disabled={congelado}
            onChange={(e) => campo("titulo", e.target.value)}
          />
        </div>
        <div className="linha">
          <div className="campo">
            <label htmlFor="op-cliente">
              Cliente{tipo === "financeiro" ? " (opcional)" : ""}
            </label>
            <select
              id="op-cliente"
              value={d.cliente_id || ""}
              disabled={congelado || !!d.orcamento_id}
              required={tipo === "orcamento" || tipo === "servico"}
              onChange={(e) => {
                campo("cliente_id", e.target.value || null);
                if (tipo === "servico")
                  alterarRelatorio({
                    unidade_id: null,
                    equipamento_ids: [],
                    plano_id: null,
                    fotos: d.relatorio!.fotos.map((f) => ({
                      ...f,
                      equipamento_id: null,
                    })),
                  });
              }}
            >
              <option value="">Selecionar cliente</option>
              {base.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {preservado && c.id === d.cliente_id
                    ? d.relatorio!.snapshot!.cliente.nome
                    : c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="op-data">
              {tipo === "orcamento"
                ? "Válido até"
                : tipo === "servico"
                  ? "Agendamento"
                  : tipo === "demanda"
                    ? "Próximo retorno"
                    : "Vencimento"}
            </label>
            <input
              id="op-data"
              type="date"
              required
              value={d.data}
              disabled={congelado}
              onChange={(e) => campo("data", e.target.value)}
            />
          </div>
        </div>
        <div className="linha">
          <div className="campo">
            <label htmlFor="op-estado">Situação</label>
            <select
              id="op-estado"
              value={d.estado}
              disabled={congelado}
              onChange={(e) => campo("estado", e.target.value)}
            >
              {Object.entries(ESTADOS[tipo]).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          {tipo !== "financeiro" && (
            <div className="campo">
              <label htmlFor="op-responsavel">Responsável</label>
              <select
                id="op-responsavel"
                value={d.responsavel_id || ""}
                required={tipo !== "orcamento"}
                disabled={congelado}
                onChange={(e) =>
                  campo("responsavel_id", e.target.value || null)
                }
              >
                <option value="">Selecionar responsável</option>
                {base.equipe.map((p) => (
                  <option key={p.id} value={p.id}>
                    {preservado && p.id === d.responsavel_id
                      ? d.relatorio!.snapshot!.tecnico
                      : p.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {tipo === "demanda" && (
          <div className="campo">
            <label htmlFor="op-acao">Próxima ação</label>
            <input
              id="op-acao"
              required
              maxLength={240}
              value={d.proxima_acao || ""}
              onChange={(e) => campo("proxima_acao", e.target.value)}
              placeholder="Ex.: Ligar para confirmar a aprovação"
            />
          </div>
        )}
        {tipo === "orcamento" && (
          <>
            <h3>Serviços e materiais</h3>
            {itens.map((item, i) => (
              <fieldset
                className="operacao-item"
                key={chaves[i]}
                disabled={congelado}
              >
                <legend>Item {i + 1}</legend>
                <div className="campo">
                  <label htmlFor={`op-desc-${i}`}>Descrição</label>
                  <input
                    id={`op-desc-${i}`}
                    list="servicos-sugeridos"
                    required
                    maxLength={240}
                    value={item.descricao}
                    onChange={(e) =>
                      campo(
                        "itens",
                        itens.map((a, j) =>
                          j === i ? { ...a, descricao: e.target.value } : a,
                        ),
                      )
                    }
                  />
                </div>
                <div className="operacao-valores">
                  <div className="campo">
                    <label htmlFor={`op-tipo-${i}`}>Tipo</label>
                    <select
                      id={`op-tipo-${i}`}
                      value={item.tipo}
                      onChange={(e) =>
                        campo(
                          "itens",
                          itens.map((a, j) =>
                            j === i
                              ? {
                                  ...a,
                                  tipo: e.target.value as
                                    | "servico"
                                    | "material",
                                }
                              : a,
                          ),
                        )
                      }
                    >
                      <option value="servico">Serviço</option>
                      <option value="material">Material</option>
                    </select>
                  </div>
                  <div className="campo">
                    <label htmlFor={`op-q-${i}`}>Quantidade</label>
                    <input
                      key={`${registro.id}-q-${i}`}
                      id={`op-q-${i}`}
                      name={`q-${i}`}
                      inputMode="decimal"
                      required
                      defaultValue={numero(item.quantidade_mil, 3)}
                      onBlur={(e) => {
                        try {
                          campo(
                            "itens",
                            itens.map((a, j) =>
                              j === i
                                ? {
                                    ...a,
                                    quantidade_mil: decimalBR(
                                      e.target.value,
                                      3,
                                    ),
                                  }
                                : a,
                            ),
                          );
                        } catch {}
                      }}
                    />
                  </div>
                  <div className="campo">
                    <label htmlFor={`op-p-${i}`}>Preço unitário (R$)</label>
                    <input
                      id={`op-p-${i}`}
                      name={`p-${i}`}
                      inputMode="decimal"
                      required
                      defaultValue={numero(item.preco_centavos)}
                      onBlur={(e) => {
                        try {
                          campo(
                            "itens",
                            itens.map((a, j) =>
                              j === i
                                ? {
                                    ...a,
                                    preco_centavos: decimalBR(e.target.value),
                                  }
                                : a,
                            ),
                          );
                        } catch {}
                      }}
                    />
                  </div>
                </div>
                {itens.length > 1 && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setChaves((a) => a.filter((_, j) => j !== i));
                      campo(
                        "itens",
                        itens.filter((_, j) => j !== i),
                      );
                    }}
                  >
                    Remover item {i + 1}
                  </button>
                )}
              </fieldset>
            ))}
            <datalist id="servicos-sugeridos">
              {[
                "Higienização de split até 12.000 BTU",
                "Instalação de ar-condicionado split",
                "Visita técnica",
                "Manutenção preventiva",
                "Troca de capacitor",
              ].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {!congelado && itens.length < 50 && (
              <button
                type="button"
                className="btn sec"
                onClick={() => {
                  setChaves((a) => [...a, crypto.randomUUID()]);
                  campo("itens", [
                    ...itens,
                    {
                      descricao: "",
                      quantidade_mil: 1000,
                      preco_centavos: 0,
                      tipo: "servico",
                    },
                  ]);
                }}
              >
                Adicionar serviço ou material
              </button>
            )}
            <div className="linha">
              <div className="campo">
                <label htmlFor="op-desconto">Desconto (R$)</label>
                <input
                  id="op-desconto"
                  name="desconto"
                  inputMode="decimal"
                  readOnly={congelado}
                  defaultValue={numero(d.desconto_centavos || 0)}
                  onBlur={(e) => {
                    try {
                      campo("desconto_centavos", decimalBR(e.target.value));
                    } catch {}
                  }}
                />
              </div>
              <div className="operacao-total">
                <span>Total da proposta</span>
                <strong>{dinheiro(total)}</strong>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="op-condicoes">Condições de pagamento</label>
              <textarea
                id="op-condicoes"
                disabled={congelado}
                maxLength={4000}
                value={d.condicoes || ""}
                onChange={(e) => campo("condicoes", e.target.value)}
              />
            </div>
          </>
        )}
        {tipo === "servico" && (
          <>
            <RelatorioServico
              r={d.relatorio!}
              registro={{ ...registro, dados: d }}
              base={base}
              cliente={d.cliente_id}
              servico={registro.id}
              alterar={alterarRelatorio}
              ocupado={setFotosOcupadas}
              offlineAtivo={offlineAtivo}
              demo={demo}
              preservado={preservado}
            />
            <h3>Etapas do serviço</h3>
            {(d.checklist || []).map((c, i) => (
              <div className="operacao-check" key={i}>
                <input
                  aria-label={`Concluir etapa ${i + 1}`}
                  type="checkbox"
                  checked={c.feito}
                  onChange={(e) =>
                    campo(
                      "checklist",
                      d.checklist!.map((a, j) =>
                        i === j ? { ...a, feito: e.target.checked } : a,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Descrição da etapa ${i + 1}`}
                  required
                  maxLength={240}
                  value={c.descricao}
                  onChange={(e) =>
                    campo(
                      "checklist",
                      d.checklist!.map((a, j) =>
                        i === j ? { ...a, descricao: e.target.value } : a,
                      ),
                    )
                  }
                />
                {d.relatorio?.plano_id && (
                  <select
                    aria-label={`Rotina PMOC da etapa ${i + 1}`}
                    value={c.rotina_id || ""}
                    onChange={(e) =>
                      campo(
                        "checklist",
                        d.checklist!.map((a, j) =>
                          i === j
                            ? { ...a, rotina_id: e.target.value || null }
                            : a,
                        ),
                      )
                    }
                  >
                    <option value="">Sem registro no PMOC</option>
                    {base.campo?.planos
                      .find((p) => p.id === d.relatorio?.plano_id)
                      ?.rotinas.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.aplicacao} · {r.atividade}
                        </option>
                      ))}
                  </select>
                )}
                {d.checklist!.length > 1 && (
                  <button
                    type="button"
                    className="btn ghost"
                    aria-label={`Remover etapa ${i + 1}`}
                    onClick={() =>
                      campo(
                        "checklist",
                        d.checklist!.filter((_, j) => i !== j),
                      )
                    }
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            {(d.checklist?.length || 0) < 30 && (
              <button
                type="button"
                className="btn sec"
                onClick={() =>
                  campo("checklist", [
                    ...(d.checklist || []),
                    { descricao: "", feito: false },
                  ])
                }
              >
                Adicionar etapa
              </button>
            )}
            <div className="campo">
              <label htmlFor="op-resultado">Resultado do serviço</label>
              <textarea
                id="op-resultado"
                maxLength={8000}
                required={d.estado === "concluida"}
                value={d.resultado || ""}
                onChange={(e) => campo("resultado", e.target.value)}
                placeholder="Descreva o que foi realizado e as recomendações ao cliente."
              />
            </div>
          </>
        )}
        {tipo === "financeiro" && (
          <>
            <div className="linha">
              <div className="campo">
                <label htmlFor="op-natureza">Natureza</label>
                <select
                  id="op-natureza"
                  value={d.natureza}
                  disabled={!!d.orcamento_id}
                  onChange={(e) =>
                    campo("natureza", e.target.value as "receita" | "despesa")
                  }
                >
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              <div className="campo">
                <label htmlFor="op-valor">Valor previsto (R$)</label>
                <input
                  id="op-valor"
                  name="valor"
                  inputMode="decimal"
                  required
                  readOnly={!!d.orcamento_id}
                  defaultValue={numero(d.valor_centavos || 0)}
                />
              </div>
            </div>
            <p className="dica">
              O lançamento é uma previsão. Registre as baixas quando o dinheiro
              entrar ou sair.
            </p>
          </>
        )}
        <div className="campo">
          <label htmlFor="op-observacoes">Observações</label>
          <textarea
            id="op-observacoes"
            maxLength={8000}
            value={d.observacoes}
            onChange={(e) => campo("observacoes", e.target.value)}
          />
        </div>
      </fieldset>
      {tipo === "servico" && (
        <AssinaturaAtendimento
          key={conteudoAceite({ ...registro, dados: d }, base)}
          registro={{ ...registro, dados: d }}
          base={base}
          bloqueado={fotosOcupadas || assinando || (revisando && !conflito)}
          limpar={() => setD(semAssinatura(d))}
          assinar={async (tracos) => {
            if (!formulario.current?.reportValidity())
              throw new Error(
                "Preencha os campos indicados antes de coletar o aceite.",
              );
            const assinatura = criarAssinatura(
              { ...registro, dados: d },
              base,
              tracos,
            );
            const novo = { ...d, relatorio: { ...d.relatorio!, assinatura } };
            setErro("");
            setAssinando(true);
            setD(novo);
            try {
              await salvar(novo);
            } catch (e) {
              setErro((e as Error).message);
              throw e;
            } finally {
              setAssinando(false);
            }
          }}
        />
      )}
      <div className="acoes empilha">
        {!preservado && (
          <BotaoEnviar
            className={
              tipo === "servico" &&
              !d.relatorio?.assinatura &&
              podeColetarAssinatura(d)
                ? "btn sec"
                : "btn"
            }
            disabled={fotosOcupadas || assinando || (revisando && !conflito)}
          >
            {tipo === "servico"
              ? d.estado === "concluida"
                ? d.relatorio?.assinatura
                  ? "Enviar OS assinada"
                  : "Concluir OS sem assinatura"
                : "Salvar ordem de serviço"
              : `Salvar ${tipo === "demanda" ? "demanda" : tipo === "financeiro" ? "lançamento" : "orçamento"}`}
          </BotaoEnviar>
        )}
        <button
          type="button"
          className="btn ghost"
          disabled={fotosOcupadas || assinando}
          onClick={cancelar}
        >
          {preservado ? "Voltar à lista" : "Cancelar edição"}
        </button>
      </div>
    </form>
  );
}

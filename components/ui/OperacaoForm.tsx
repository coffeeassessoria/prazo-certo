"use client";
import { useState } from "react";
import { BotaoEnviar } from "./BotaoEnviar";
import { Aviso } from "./Aviso";
import { Confirmar } from "./Confirmar";
import {
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
}: {
  registro: Registro;
  base: Base;
  salvar: (d: Dados) => Promise<void>;
  cancelar: () => void;
}) {
  const [d, setD] = useState<Dados>(registro.dados),
    [erro, setErro] = useState("");
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
      const novo = { ...d };
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
      action={enviar}
      className="card operacao-pilha"
      aria-label="Editar registro"
    >
      <div className="card-topo">
        <h2>{registro.versao ? "Editar registro" : "Novo registro"}</h2>
        <button type="button" className="btn ghost" onClick={cancelar}>
          Voltar à lista
        </button>
      </div>
      {erro && (
        <Aviso tipo="erro" titulo="Revise antes de salvar">
          {erro}
        </Aviso>
      )}
      {congelado && (
        <Aviso titulo="Orçamento aprovado">
          Os valores estão preservados. Você pode atualizar as observações.
        </Aviso>
      )}
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
            onChange={(e) => campo("cliente_id", e.target.value || null)}
          >
            <option value="">Selecionar cliente</option>
            {base.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
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
              onChange={(e) => campo("responsavel_id", e.target.value || null)}
            >
              <option value="">Selecionar responsável</option>
              {base.equipe.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
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
                                tipo: e.target.value as "servico" | "material",
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
                                  quantidade_mil: decimalBR(e.target.value, 3),
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
      <div className="acoes empilha">
        <BotaoEnviar>
          Salvar{" "}
          {tipo === "servico"
            ? "ordem de serviço"
            : tipo === "demanda"
              ? "demanda"
              : tipo === "financeiro"
                ? "lançamento"
                : "orçamento"}
        </BotaoEnviar>
        <button type="button" className="btn ghost" onClick={cancelar}>
          Cancelar edição
        </button>
      </div>
    </form>
  );
}

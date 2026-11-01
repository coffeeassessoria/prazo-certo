"use client";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import type { Base, Registro } from "@/lib/operacao/modelo";
import { MAX_FOTOS, type Relatorio, type Foto } from "@/lib/relatorios/modelo";
import { comprimirFoto } from "@/lib/relatorios/fotos-cliente";
import {
  guardarFoto,
  lerFotoLocal,
  removerFotoLocal,
  listarFotosLocais,
} from "@/lib/relatorios/fotos-offline";
import { Aviso } from "./Aviso";
import { Confirmar } from "./Confirmar";
import { baseDemo } from "@/lib/operacao/demo";
import { relatorioVazio } from "@/lib/relatorios/modelo";
function FotoImagem({
  foto,
  chave,
  demo,
}: {
  foto: Foto;
  chave: string;
  demo: boolean;
}) {
  const [src, setSrc] = useState(""),
    [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let ativo = true,
      url = "";
    void lerFotoLocal(chave, foto.id)
      .then((f) => {
        if (!ativo) return;
        url = f
          ? URL.createObjectURL(f.blob)
          : demo
            ? ""
            : `/api/operacao/fotos?id=${foto.id}&mini=1`;
        setSrc(url);
      })
      .catch(() => setFalhou(true));
    return () => {
      ativo = false;
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [chave, foto.id, demo]);
  return src && !falhou ? (
    <>
      <img
        className="relatorio-foto-imagem"
        src={src}
        alt={
          foto.legenda ||
          `Foto ${foto.etapa === "antes" ? "antes do serviço" : foto.etapa === "depois" ? "depois do serviço" : "do atendimento"}`
        }
        onError={() => setFalhou(true)}
      />
      <a
        href={
          src.startsWith("blob:") ? src : `/api/operacao/fotos?id=${foto.id}`
        }
        target="_blank"
        rel="noreferrer"
      >
        Abrir foto maior
      </a>
    </>
  ) : (
    <p className="dica">
      {falhou
        ? "Prévia indisponível. Fotos já sincronizadas precisam de conexão para abrir."
        : "Preparando prévia…"}
    </p>
  );
}
export function RelatorioServico({
  r,
  registro,
  base,
  cliente,
  servico,
  alterar,
  ocupado,
  offlineAtivo,
  demo = false,
  preservado = false,
}: {
  r: Relatorio;
  registro?: Registro;
  base: Base;
  cliente: string | null;
  servico: string;
  alterar: (p: Partial<Relatorio> | ((a: Relatorio) => Relatorio)) => void;
  ocupado: (b: boolean) => void;
  offlineAtivo: boolean;
  demo?: boolean;
  preservado?: boolean;
}) {
  const [erro, setErro] = useState(""),
    [preparando, setPreparando] = useState(false);
  const catalogo =
    preservado && r.snapshot
      ? {
          unidades: [
            { id: r.unidade_id!, cliente_id: cliente!, ...r.snapshot.unidade },
          ],
          equipamentos: r.snapshot.equipamentos.map((e) => ({
            ...e,
            unidade_id: r.unidade_id!,
          })),
          planos: base.campo?.planos || [],
        }
      : base.campo;
  const chave = `${base.usuario.id}:${base.usuario.empresa_id}`;
  const equipamentos =
    catalogo?.equipamentos.filter((e) => e.unidade_id === r.unidade_id) || [];
  const atendidos = equipamentos.filter((e) =>
    r.equipamento_ids.includes(e.id),
  );
  async function adicionar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro("");
    setPreparando(true);
    ocupado(true);
    try {
      if (!demo && !offlineAtivo && !navigator.onLine)
        throw new Error(
          "Prepare o aparelho conectado antes de registrar fotos sem internet.",
        );
      if (r.fotos.length + arquivos.length > MAX_FOTOS)
        throw new Error("Use até 20 fotos por atendimento.");
      // Persiste cada foto antes de incluí-la no formulário. Um erro mantém as anteriores.
      for (const arquivo of Array.from(arquivos)) {
        const blob = await comprimirFoto(arquivo),
          id = crypto.randomUUID();
        await guardarFoto({
          id,
          chave,
          servico_id: servico,
          blob,
          enviada: false,
          rascunho: registro ? structuredClone(registro) : undefined,
        });
        alterar((a) => ({
          ...a,
          fotos: [
            ...a.fotos,
            {
              id,
              etapa: "evidencia",
              legenda: "",
              equipamento_id:
                a.equipamento_ids.length === 1 ? a.equipamento_ids[0] : null,
            },
          ],
        }));
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setPreparando(false);
      ocupado(false);
    }
  }
  const fotoCampo = (id: string, p: Partial<Foto>) =>
    alterar((a) => ({
      ...a,
      fotos: a.fotos.map((f) => (f.id === id ? { ...f, ...p } : f)),
    }));
  return (
    <section className="operacao-pilha" aria-label="Relatório de manutenção">
      <h3>Relatório de manutenção</h3>
      {preservado && (
        <Aviso titulo="Relatório concluído e preservado">
          Os dados desta visita estão fechados. Para registrar outra visita ou
          uma correção, crie outra OS.
        </Aviso>
      )}
      <fieldset
        disabled={preservado || preparando}
        className="relatorio-campos operacao-pilha"
      >
        <div className="campo">
          <label htmlFor="rel-unidade">Unidade atendida</label>
          <select
            id="rel-unidade"
            value={r.unidade_id || ""}
            onChange={(e) =>
              alterar({
                unidade_id: e.target.value || null,
                equipamento_ids: [],
                plano_id: null,
                fotos: r.fotos.map((f) => ({ ...f, equipamento_id: null })),
              })
            }
          >
            <option value="">Selecione a unidade</option>
            {catalogo?.unidades
              .filter((u) => u.cliente_id === cliente)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
          </select>
          <p className="dica">
            {!demo && (
              <a href="/clientes" target="_blank" rel="noreferrer">
                Cadastrar unidade e equipamentos nos clientes
              </a>
            )}
          </p>
        </div>
        <fieldset className="operacao-item">
          <legend>Equipamentos atendidos</legend>
          {equipamentos.length ? (
            equipamentos.map((e) => (
              <label className="operacao-consentimento" key={e.id}>
                <input
                  type="checkbox"
                  checked={r.equipamento_ids.includes(e.id)}
                  onChange={(ev) =>
                    alterar((a) => ({
                      ...a,
                      equipamento_ids: ev.target.checked
                        ? [...a.equipamento_ids, e.id]
                        : a.equipamento_ids.filter((id) => id !== e.id),
                      fotos: a.fotos.map((f) =>
                        f.equipamento_id === e.id && !ev.target.checked
                          ? { ...f, equipamento_id: null }
                          : f,
                      ),
                    }))
                  }
                />
                {e.tag} · {e.ambiente} · {e.marca} {e.modelo}
              </label>
            ))
          ) : (
            <p className="dica">
              Selecione uma unidade com equipamentos cadastrados.
            </p>
          )}
        </fieldset>
        <div className="linha">
          <div className="campo">
            <label htmlFor="rel-tipo">Tipo de atendimento</label>
            <select
              id="rel-tipo"
              value={r.tipo_manutencao}
              onChange={(e) =>
                alterar({
                  tipo_manutencao: e.target
                    .value as Relatorio["tipo_manutencao"],
                })
              }
            >
              <option value="preventiva">Manutenção preventiva</option>
              <option value="corretiva">Manutenção corretiva</option>
              <option value="inspecao">Inspeção</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="rel-data">Data da execução</label>
            <input
              id="rel-data"
              type="date"
              value={r.executada_em}
              onChange={(e) => alterar({ executada_em: e.target.value })}
            />
          </div>
        </div>
        <div className="linha">
          {(["inicio", "fim"] as const).map((k) => (
            <div className="campo" key={k}>
              <label htmlFor={`rel-${k}`}>
                {k === "inicio" ? "Horário de início" : "Horário de término"}{" "}
                (opcional)
              </label>
              <input
                id={`rel-${k}`}
                type="time"
                value={r[k]}
                onChange={(e) => alterar({ [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="campo">
          <label htmlFor="rel-plano">Vincular ao PMOC (opcional)</label>
          <select
            id="rel-plano"
            value={r.plano_id || ""}
            onChange={(e) => alterar({ plano_id: e.target.value || null })}
          >
            <option value="">Sem vínculo com PMOC</option>
            {catalogo?.planos
              .filter((p) => p.unidade_id === r.unidade_id)
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.titulo}
                </option>
              ))}
          </select>
          <p className="dica">
            Associe as etapas abaixo às rotinas do plano. Ao concluir, somente
            as rotinas vinculadas serão registradas para todos os aparelhos
            selecionados. Se a execução for diferente por aparelho, registre
            outra OS.
          </p>
        </div>
        {(
          [
            ["pecas", "Peças e materiais utilizados"],
            ["medicoes", "Medições realizadas (opcional)"],
            ["recomendacoes", "Pendências e recomendações ao cliente"],
          ] as const
        ).map(([k, titulo]) => (
          <div className="campo" key={k}>
            <label htmlFor={`rel-${k}`}>{titulo}</label>
            <textarea
              id={`rel-${k}`}
              maxLength={4000}
              value={r[k]}
              onChange={(e) => alterar({ [k]: e.target.value })}
              placeholder={
                k === "medicoes"
                  ? "Informe aparelho, grandeza, unidade e valor efetivamente medido."
                  : undefined
              }
            />
          </div>
        ))}
        <div className="campo">
          <label htmlFor="rel-proxima">
            Próxima manutenção recomendada (opcional)
          </label>
          <input
            id="rel-proxima"
            type="date"
            value={r.proxima_manutencao}
            onChange={(e) => alterar({ proxima_manutencao: e.target.value })}
          />
        </div>
        <label className="operacao-consentimento">
          <input
            type="checkbox"
            checked={r.criar_retorno}
            onChange={(e) => alterar({ criar_retorno: e.target.checked })}
          />
          Criar retorno na data recomendada para combinar a próxima manutenção
          com o cliente.
        </label>
        <fieldset className="operacao-item operacao-pilha">
          <legend>Ciência do cliente</legend>
          <div className="campo">
            <label htmlFor="rel-ciencia">Como ocorreu o acompanhamento?</label>
            <select
              id="rel-ciencia"
              value={r.ciencia.situacao}
              onChange={(e) =>
                alterar({
                  ciencia: {
                    ...r.ciencia,
                    situacao: e.target
                      .value as Relatorio["ciencia"]["situacao"],
                    confirmada: false,
                  },
                })
              }
            >
              <option value="ausente">Sem representante disponível</option>
              <option value="presente">Representante tomou ciência</option>
              <option value="recusou">
                Representante não quis confirmar ciência
              </option>
            </select>
          </div>
          {r.ciencia.situacao !== "ausente" && (
            <div className="linha">
              {(["nome", "cargo"] as const).map((k) => (
                <div className="campo" key={k}>
                  <label htmlFor={`ciencia-${k}`}>
                    {k === "nome"
                      ? "Nome do representante"
                      : "Cargo / função (opcional)"}
                  </label>
                  <input
                    id={`ciencia-${k}`}
                    maxLength={160}
                    value={r.ciencia[k]}
                    onChange={(e) =>
                      alterar({
                        ciencia: { ...r.ciencia, [k]: e.target.value },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
          {r.ciencia.situacao === "presente" && (
            <label className="operacao-consentimento">
              <input
                type="checkbox"
                checked={r.ciencia.confirmada}
                onChange={(e) =>
                  alterar({
                    ciencia: { ...r.ciencia, confirmada: e.target.checked },
                  })
                }
              />
              Confirmo que o representante identificado tomou ciência do
              atendimento e das observações registradas.
            </label>
          )}
          <p className="dica">
            Registro informado pelo técnico. Para coletar a assinatura do
            representante, use o aceite ao final da OS antes de concluir.
          </p>
        </fieldset>
      </fieldset>
      <h3>
        Fotos do atendimento · {r.fotos.length}/{MAX_FOTOS}
      </h3>
      <p className="dica">
        Fotos privadas, otimizadas antes do envio. Guardamos a versão otimizada
        e uma miniatura. O original não é enviado. Salve a OS para manter o
        vínculo com as fotos; os envios aguardam conexão.
      </p>
      {erro && (
        <Aviso tipo="erro" titulo="Não foi possível preparar a foto">
          {erro}
        </Aviso>
      )}
      {!preservado && (
        <div className="campo">
          <label htmlFor="rel-fotos">
            <Camera size={18} aria-hidden /> Adicionar fotos ou usar a câmera
          </label>
          <input
            id="rel-fotos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={preparando || r.fotos.length >= MAX_FOTOS}
            onChange={(e) => {
              void adicionar(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="dica">
            JPG, PNG ou WebP até 12 MB cada.{" "}
            {preparando ? "Otimizando e guardando no aparelho…" : ""}
          </p>
        </div>
      )}
      <div className="relatorio-galeria">
        {r.fotos.map((f, i) => (
          <article key={f.id} className="operacao-item operacao-pilha">
            <FotoImagem foto={f} chave={chave} demo={demo} />
            <fieldset
              className="relatorio-campos operacao-pilha"
              disabled={preservado || preparando}
            >
              <div className="campo">
                <label htmlFor={`foto-etapa-${f.id}`}>
                  Foto {i + 1} · momento
                </label>
                <select
                  id={`foto-etapa-${f.id}`}
                  value={f.etapa}
                  onChange={(e) =>
                    fotoCampo(f.id, { etapa: e.target.value as Foto["etapa"] })
                  }
                >
                  <option value="antes">Antes do serviço</option>
                  <option value="depois">Depois do serviço</option>
                  <option value="evidencia">Registro do atendimento</option>
                </select>
              </div>
              <div className="campo">
                <label htmlFor={`foto-eq-${f.id}`}>Equipamento da foto</label>
                <select
                  id={`foto-eq-${f.id}`}
                  value={f.equipamento_id || ""}
                  onChange={(e) =>
                    fotoCampo(f.id, { equipamento_id: e.target.value || null })
                  }
                >
                  <option value="">Visão geral do atendimento</option>
                  {atendidos.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.tag} · {e.ambiente}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor={`foto-leg-${f.id}`}>Legenda</label>
                <input
                  id={`foto-leg-${f.id}`}
                  maxLength={240}
                  value={f.legenda}
                  onChange={(e) => fotoCampo(f.id, { legenda: e.target.value })}
                />
              </div>
            </fieldset>
            {!preservado && (
              <Confirmar
                titulo="Remover esta foto do relatório?"
                texto="A foto sairá deste atendimento ao salvar. Evidências já usadas em relatórios concluídos são preservadas."
                aoConfirmar={async () => {
                  await removerFotoLocal(chave, f.id);
                  alterar((a) => ({
                    ...a,
                    fotos: a.fotos.filter((x) => x.id !== f.id),
                  }));
                }}
              >
                Remover foto {i + 1}
              </Confirmar>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function DemoRelatorioServico() {
  const [base] = useState(baseDemo);
  const [r, setR] = useState(() =>
    relatorioVazio(new Date().toISOString().slice(0, 10)),
  );
  return (
    <div className="card">
      <RelatorioServico
        r={r}
        base={base}
        cliente={base.clientes[0].id}
        servico="00000000-0000-4000-8000-000000000099"
        alterar={(p) =>
          setR((a) => (typeof p === "function" ? p(a) : { ...a, ...p }))
        }
        ocupado={() => undefined}
        offlineAtivo={false}
        demo
      />
    </div>
  );
}

/** Recupera fotos cujo formulário foi fechado antes de salvar a OS. Nunca apaga a fila. */
export function FotosRecuperaveis({
  base,
  registros,
  editando,
  recuperar,
}: {
  base: Base;
  registros: Registro[];
  editando?: string;
  recuperar: (r: Registro) => void;
}) {
  const [grupos, setGrupos] = useState<Registro[]>([]);
  useEffect(() => {
    let ativo = true;
    void listarFotosLocais(`${base.usuario.id}:${base.usuario.empresa_id}`)
      .then((fotos) => {
        const usados = new Set(
          registros.flatMap(
            (r) => r.dados.relatorio?.fotos.map((f) => f.id) || [],
          ),
        );
        const porServico = new Map<string, Registro>();
        for (const f of fotos) {
          if (usados.has(f.id) || !f.rascunho) continue;
          let r = porServico.get(f.servico_id);
          if (!r) {
            const atual = registros.find((r) => r.id === f.servico_id);
            if (atual?.dados.relatorio?.snapshot) continue;
            r = structuredClone(atual || f.rascunho);
            r.dados.relatorio ||= relatorioVazio("");
            r.dados.relatorio.fotos = structuredClone(
              atual?.dados.relatorio?.fotos || [],
            );
            porServico.set(f.servico_id, r);
          }
          r.dados.relatorio!.fotos.push({
            id: f.id,
            etapa: "evidencia",
            legenda: "Foto recuperada do aparelho",
            equipamento_id: null,
          });
        }
        if (ativo) setGrupos([...porServico.values()]);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [base, registros]);
  const visiveis = grupos.filter((r) => r.id !== editando);
  return visiveis.length ? (
    <div className="card operacao-pilha">
      <h2>Fotos de atendimentos ainda não salvos</h2>
      <p className="dica">
        Estas fotos continuam neste aparelho. Recupere-as e salve a OS para
        entrar na fila de sincronização. Confira os dados e as legendas antes de
        concluir.
      </p>
      {visiveis.map((r) => (
        <div key={r.id} className="operacao-registro-topo">
          <span>
            {r.dados.titulo || "Atendimento sem título"} ·{" "}
            {r.dados.relatorio!.fotos.length} foto(s)
          </span>
          <button
            type="button"
            className="btn sec"
            onClick={() => recuperar(r)}
          >
            Recuperar fotos do atendimento
          </button>
        </div>
      ))}
    </div>
  ) : null;
}

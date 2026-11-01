"use client";
import { FotosRecuperaveis } from "./RelatorioServico";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Wrench,
  BellRing,
  Wallet,
  RefreshCw,
  WifiOff,
  Download,
} from "lucide-react";
import { Casca } from "@/components/Casca";
import { Cabecalho } from "./Cabecalho";
import { Aviso } from "./Aviso";
import { Vazio } from "./Vazio";
import { Confirmar } from "./Confirmar";
import { Metrica } from "./Metrica";
import { OperacaoForm } from "./OperacaoForm";
import { baseDemo } from "@/lib/operacao/demo";
import {
  dinheiro,
  ESTADOS,
  hoje,
  NOMES,
  totalOrcamento,
  vazio,
  type Base,
  type Dados,
  type Operacao as Envio,
  type Pendente,
  type Registro,
  type Tipo,
} from "@/lib/operacao/modelo";
import {
  lerFotoLocal,
  guardarFoto,
  removerFotoLocal,
} from "@/lib/relatorios/fotos-offline";
import * as dispositivo from "@/lib/operacao/offline";
class ErroEnvio extends Error {
  constructor(
    m: string,
    public status: number,
  ) {
    super(m);
  }
}
async function buscar(): Promise<Base> {
  const r = await fetch("/api/operacao", { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new ErroEnvio(j.erro, r.status);
  return j;
}
async function publicar(
  o: Envio | Record<string, unknown>,
  usuario: Base["usuario"],
): Promise<Registro> {
  const envio = o as Envio;
  for (const foto of envio.dados?.relatorio?.fotos || []) {
    const chaveFoto = `${usuario.id}:${usuario.empresa_id}`;
    const local = await lerFotoLocal(chaveFoto, foto.id);
    if (!local) continue;
    if (local.servico_id !== envio.id)
      throw new Error("A foto não pertence a este atendimento.");
    if (local.enviada) {
      const existente = await fetch(
        `/api/operacao/fotos?id=${foto.id}&servico=${envio.id}`,
        { method: "HEAD", cache: "no-store" },
      );
      if (existente.ok) continue;
      if ([401, 403].includes(existente.status))
        throw new ErroEnvio(
          "Entre novamente na conta de origem para sincronizar as fotos.",
          existente.status,
        );
      if (existente.status !== 404)
        throw new Error(
          "Não foi possível confirmar a foto. Tente sincronizar novamente.",
        );
      // A coleta de arquivos abandonados pode ter ocorrido enquanto a OS estava offline.
      // O blob local permanece até confirmar a OS e permite restaurar o mesmo UUID.
    }
    const resposta = await fetch(
      `/api/operacao/fotos?id=${foto.id}&servico=${envio.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": local.blob.type,
          "x-pc-usuario": usuario.id,
          "x-pc-empresa": usuario.empresa_id,
        },
        body: local.blob,
      },
    );
    if (!resposta.ok) {
      const j = await resposta.json();
      if (resposta.status >= 500) throw new Error(j.erro);
      throw new ErroEnvio(j.erro, resposta.status);
    }
    await guardarFoto({ ...local, enviada: true });
  }
  const r = await fetch("/api/operacao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...o,
      empresa_id: usuario.empresa_id,
      usuario_id: usuario.id,
    }),
  });
  const j = await r.json();
  if (!r.ok) {
    if (r.status >= 500) throw new Error(j.erro);
    throw new ErroEnvio(j.erro, r.status);
  }
  for (const foto of envio.dados?.relatorio?.fotos || [])
    await removerFotoLocal(
      `${usuario.id}:${usuario.empresa_id}`,
      foto.id,
    ).catch(() => undefined);
  return j;
}
const icones = {
  orcamento: FileText,
  servico: Wrench,
  demanda: BellRing,
  financeiro: Wallet,
};
export function Operacao({ demo = false }: { demo?: boolean }) {
  const [base, setBase] = useState<Base | null>(null),
    [fila, setFila] = useState<Pendente[]>([]),
    [chave, setChave] = useState(""),
    [conectado, setConectado] = useState(true),
    [erro, setErro] = useState(""),
    [aviso, setAviso] = useState(""),
    [bloqueado, setBloqueado] = useState(false),
    [ocupado, setOcupado] = useState(false),
    [tipo, setTipo] = useState<Tipo>("orcamento"),
    [editar, setEditar] = useState<Registro | null>(null),
    [revisao, setRevisao] = useState(""),
    [consentiu, setConsentiu] = useState(false),
    [pronto, setPronto] = useState(false);
  const trava = useRef(false),
    montado = useRef(true),
    baseRef = useRef<Base | null>(null),
    chaveRef = useRef("");
  const atualizar = useCallback((b: Base) => {
    baseRef.current = b;
    setBase(b);
  }, []);
  const adotarChave = useCallback((k: string) => {
    chaveRef.current = k;
    setChave(k);
  }, []);
  const sincronizar = useCallback(async () => {
    if (demo || trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try {
      const b = await buscar();
      if (!montado.current) return;
      let k = chaveRef.current;
      const local = await dispositivo.carregar().catch(() => undefined);
      if (
        !k &&
        local &&
        dispositivo.particao(local.base) === dispositivo.particao(b)
      ) {
        k = dispositivo.particao(b);
        adotarChave(k);
      }
      if (k && k !== dispositivo.particao(b)) {
        adotarChave("");
        setFila([]);
        setEditar(null);
        setAviso(
          "Você está em outra conta. Os envios anteriores estão preservados e só serão enviados pela conta de origem.",
        );
        k = "";
      }
      if (local && dispositivo.particao(local.base) === dispositivo.particao(b))
        dispositivo.confirmarSessao();
      if (local && dispositivo.particao(local.base) !== dispositivo.particao(b))
        document.cookie =
          "pc_offline_encerrado=1; Path=/; SameSite=Lax; Max-Age=31536000";
      atualizar(b);
      setConectado(true);
      setBloqueado(false);
      if (k) {
        await dispositivo.atualizarBase(k, b);
        let localAtual = await dispositivo.carregar(k);
        setFila(localAtual?.fila || []);
        for (const p of localAtual?.fila || []) {
          if (p.erro) continue;
          try {
            const reservado = await dispositivo.reservarEnvio(k, p);
            if (!reservado) continue;
            setFila((await dispositivo.carregar(k))?.fila || []);
            const registro = await publicar(reservado, b.usuario);
            localAtual = await dispositivo.acusar(k, p, registro);
            if (montado.current) setFila(localAtual?.fila || []);
          } catch (e) {
            if (e instanceof ErroEnvio) {
              if (e.status === 401 || e.status === 403) {
                setBloqueado(true);
                throw e;
              }
              await dispositivo.marcarErro(k, p, e.message, e.status === 409);
            } else throw e;
          }
        }
        const novo = await buscar();
        if (dispositivo.particao(novo) !== k) {
          setBloqueado(true);
          throw new Error(
            "A sessão mudou. Entre novamente na conta de origem.",
          );
        }
        await dispositivo.atualizarBase(k, novo);
        if (montado.current) {
          atualizar(novo);
          setFila((await dispositivo.carregar(k))?.fila || []);
        }
      }
    } catch (e) {
      if (!montado.current) return;
      if (e instanceof ErroEnvio) {
        setErro(e.message);
        if (e.status === 401 || e.status === 403) setBloqueado(true);
      } else {
        setConectado(false);
        const local = await dispositivo.carregar().catch(() => undefined);
        if (local && !dispositivo.sessaoEncerrada()) {
          adotarChave(dispositivo.particao(local.base));
          atualizar(local.base);
          setFila(local.fila);
        } else
          setErro(
            "Sem conexão. Conecte-se e ative o offline neste aparelho antes de sair para o atendimento.",
          );
      }
    } finally {
      trava.current = false;
      if (montado.current) setOcupado(false);
    }
  }, [demo, adotarChave, atualizar]);
  useEffect(() => {
    montado.current = true;
    if (demo) {
      atualizar(baseDemo());
      return;
    }
    void sincronizar();
    const online = () => void sincronizar(),
      offline = () => {
        setConectado(false);
        setBase((b) => (b ? dispositivo.semFinanceiro(b) : b));
      };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", online);
    const intervalo = setInterval(online, 30000);
    return () => {
      montado.current = false;
      clearInterval(intervalo);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", online);
    };
  }, [demo, sincronizar, atualizar]);
  async function ativarOffline() {
    if (!base || !consentiu) return;
    setOcupado(true);
    setErro("");
    try {
      if (!("serviceWorker" in navigator))
        throw new Error(
          "Este navegador não oferece o offline. Use uma versão atual do Chrome, Edge ou Safari.",
        );
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const worker = reg.active;
      if (!worker) throw new Error("Aguarde a preparação e tente novamente.");
      await new Promise<void>((resolve, reject) => {
        const canal = new MessageChannel();
        const timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Não foi possível preparar os arquivos. Tente novamente conectado.",
              ),
            ),
          30000,
        );
        canal.port1.onmessage = (e) => {
          clearTimeout(timeout);
          e.data.ok
            ? resolve()
            : reject(
                new Error(
                  "Não foi possível preparar os arquivos. Tente novamente.",
                ),
              );
        };
        worker.postMessage("PREPARAR", [canal.port2]);
      });
      const k = await dispositivo.ativar(base);
      dispositivo.confirmarSessao();
      adotarChave(k);
      setPronto(true);
      setAviso(
        "Offline pronto neste aparelho. Abra Operação para trabalhar sem conexão. Mantenha a página aberta ao reconectar para sincronizar.",
      );
      void navigator.storage?.persist?.();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }
  async function salvar(d: Dados) {
    if (!base || !editar) return;
    if (
      editar.tipo === "servico" &&
      d.estado === "concluida" &&
      (!d.resultado?.trim() || d.checklist?.some((c) => !c.feito))
    )
      throw new Error(
        "Marque todas as etapas e descreva o resultado para concluir.",
      );
    const o: Envio = {
      operacao: crypto.randomUUID(),
      id: editar.id,
      tipo: editar.tipo,
      versao: editar.versao,
      dados: d,
    };
    if (demo) {
      d = structuredClone(d);
      if (
        editar.tipo === "servico" &&
        d.relatorio &&
        d.estado === "concluida"
      ) {
        const rel = d.relatorio,
          uni = base.campo?.unidades.find((u) => u.id === rel.unidade_id);
        rel.snapshot = {
          identidade: {
            nome: base.usuario.empresa,
            documento: "",
            endereco: "Endereço fictício",
            telefone: "",
            email: "",
          },
          cliente: {
            nome:
              base.clientes.find((c) => c.id === d.cliente_id)?.nome ||
              "Cliente fictício",
          },
          unidade: {
            nome: uni?.nome || "Unidade fictícia",
            endereco: uni?.endereco || "",
          },
          equipamentos: (
            base.campo?.equipamentos.filter((e) =>
              rel.equipamento_ids.includes(e.id),
            ) || []
          ).map((e) => ({ ...e, serie: "DEMONSTRAÇÃO" })),
          tecnico:
            base.equipe.find((e) => e.id === d.responsavel_id)?.nome ||
            "Técnico fictício",
          emitido_em: new Date().toISOString(),
          registrado_por: base.usuario.id,
        };
      }
      const registro = { ...editar, dados: d, versao: editar.versao + 1 };
      atualizar({
        ...base,
        registros: [
          registro,
          ...base.registros.filter((r) => r.id !== registro.id),
        ],
      });
      setEditar(null);
      setAviso("Exemplo salvo apenas nesta demonstração.");
      return;
    }
    if (chave && o.tipo !== "financeiro") {
      const local = revisao
        ? await dispositivo.substituirEnvio(chave, revisao, o)
        : await dispositivo.enfileirar(chave, o);
      setFila(local.fila);
      setEditar(null);
      setRevisao("");
      setAviso(
        "Salvo neste aparelho. O envio será confirmado quando houver conexão.",
      );
      void sincronizar();
    } else {
      if (!conectado)
        throw new Error(
          "Ative o offline enquanto estiver conectado para salvar neste aparelho.",
        );
      const registro = await publicar(o, base.usuario);
      atualizar({
        ...base,
        registros: [registro, ...base.registros.filter((r) => r.id !== o.id)],
      });
      setEditar(null);
      setAviso("Registro salvo na empresa.");
    }
  }
  function novo(t: Tipo, d?: Dados) {
    setTipo(t);
    setRevisao("");
    setEditar({
      id: crypto.randomUUID(),
      tipo: t,
      versao: 0,
      dados: d || vazio(t, base!.usuario.id),
    });
    setErro("");
  }
  function derivar(r: Registro, t: Tipo) {
    const d = {
      ...vazio(t, base!.usuario.id),
      titulo:
        t === "demanda" ? `Retornar sobre ${r.dados.titulo}` : r.dados.titulo,
      cliente_id: r.dados.cliente_id,
      ...(t === "servico" || t === "financeiro" ? { orcamento_id: r.id } : {}),
      ...(t === "demanda"
        ? { proxima_acao: "Entrar em contato para confirmar a aprovação." }
        : {}),
      ...(t === "financeiro" ? { valor_centavos: r.dados.total_centavos } : {}),
      ...(t === "servico"
        ? {
            checklist: (r.dados.itens || [])
              .filter((i) => i.tipo === "servico")
              .map((i) => ({ descricao: i.descricao, feito: false })),
          }
        : {}),
    };
    if (t === "servico" && !d.checklist?.length)
      d.checklist = [
        {
          descricao: "Executar serviço aprovado e registrar resultado",
          feito: false,
        },
      ];
    novo(t, d);
  }
  async function pdfDemo(r: Registro) {
    setErro("");
    try {
      const { gerarDocumentoOperacao } = await import(
        "@/lib/documentos/operacao"
      );
      const fotos: { id: string; bytes: Uint8Array }[] = [];
      for (const foto of r.dados.relatorio?.fotos || []) {
        const local = await lerFotoLocal(dispositivo.particao(base!), foto.id);
        if (!local)
          throw new Error(
            "A foto da demonstração não está neste aparelho. Adicione novamente.",
          );
        fotos.push({
          id: foto.id,
          bytes: new Uint8Array(await local.blob.arrayBuffer()),
        });
      }
      const snap = r.dados.relatorio?.snapshot;
      const bytes = await gerarDocumentoOperacao(
        r,
        snap?.identidade || {
          nome: base!.usuario.empresa,
          documento: "",
          endereco: "Endereço fictício",
          telefone: "",
          email: "",
        },
        snap?.cliente ||
          base!.clientes.find((c) => c.id === r.dados.cliente_id) ||
          null,
        undefined,
        fotos,
      );
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "relatorio-demonstracao.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setErro((e as Error).message);
    }
  }
  async function baixar(r: Registro, f: FormData) {
    setErro("");
    try {
      const valor = Number(String(f.get("centavos")));
      const dados = { valor_centavos: valor, data: String(f.get("data")) };
      if (demo) {
        const novo = {
          ...r,
          versao: r.versao + 1,
          dados: {
            ...r.dados,
            baixas: [
              ...(r.dados.baixas || []),
              { id: crypto.randomUUID(), ...dados },
            ],
          },
        };
        atualizar({
          ...base!,
          registros: base!.registros.map((a) => (a.id === r.id ? novo : a)),
        });
      } else {
        await publicar(
          {
            operacao: crypto.randomUUID(),
            tipo: "baixa",
            id: r.id,
            versao: r.versao,
            dados,
          },
          base!.usuario,
        );
        await sincronizar();
      }
      setAviso("Baixa registrada.");
    } catch (e) {
      setErro((e as Error).message);
    }
  }
  async function revisar(p: Pendente) {
    if (!base || !conectado) {
      setErro("Conecte-se para conferir a versão atual antes de revisar.");
      return;
    }
    try {
      const b = await buscar();
      if (dispositivo.particao(b) !== chave)
        throw new Error("Entre na conta de origem para revisar.");
      atualizar(b);
      const remoto = b.registros.find((r) => r.id === p.id);
      setEditar({ ...p, versao: remoto?.versao || 0 });
      setRevisao(p.operacao);
      setTipo(p.tipo);
    } catch (e) {
      setErro((e as Error).message);
    }
  }
  const visiveis = base ? dispositivo.visiveis(base, fila) : [],
    registros = visiveis.filter((r) => r.tipo === tipo);
  const caixa = visiveis.filter(
    (r) => r.tipo === "financeiro" && r.dados.estado !== "cancelado",
  );
  const recebidos = caixa
      .filter((r) => r.dados.natureza === "receita")
      .reduce(
        (s, r) =>
          s + (r.dados.baixas || []).reduce((a, b) => a + b.valor_centavos, 0),
        0,
      ),
    pagos = caixa
      .filter((r) => r.dados.natureza === "despesa")
      .reduce(
        (s, r) =>
          s + (r.dados.baixas || []).reduce((a, b) => a + b.valor_centavos, 0),
        0,
      );
  return (
    <Casca
      empresa={base?.usuario.empresa || "Operação"}
      nome={base?.usuario.nome}
      temEmpresa={!!base && !bloqueado}
      superadmin={false}
    >
      <Cabecalho
        titulo="Sua operação, em dia"
        sub="Da proposta ao serviço concluído, com cada retorno no lugar."
        acao={
          base && !bloqueado && !editar ? (
            <button
              className="btn"
              disabled={ocupado || (tipo === "financeiro" && !conectado)}
              onClick={() => novo(tipo)}
            >
              Novo{" "}
              {tipo === "orcamento"
                ? "orçamento"
                : tipo === "servico"
                  ? "serviço"
                  : tipo === "demanda"
                    ? "retorno"
                    : "lançamento"}
            </button>
          ) : undefined
        }
      />
      <div className="operacao-pilha">
        {demo && (
          <Aviso titulo="Demonstração interativa">
            Dados fictícios. Experimente os fluxos; nada é enviado à empresa. O
            offline e os PDFs reais ficam disponíveis após entrar na plataforma.
          </Aviso>
        )}
        {erro && (
          <Aviso tipo="erro" titulo="Precisamos da sua atenção">
            {erro}
          </Aviso>
        )}
        {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
        {!base && !erro && (
          <p role="status" aria-busy>
            Carregando sua operação…
          </p>
        )}
        {bloqueado && (
          <Aviso tipo="atencao" titulo="Entre para continuar">
            Os envios pendentes estão preservados no aparelho.{" "}
            <a href="/login">Entrar na plataforma</a>
          </Aviso>
        )}
        {base && !bloqueado && (
          <>
            {!demo && (
              <div className="card operacao-conexao">
                <div>
                  <strong>
                    {conectado ? (
                      "Conectado à plataforma"
                    ) : (
                      <>
                        <WifiOff size={16} /> Trabalhando sem conexão
                      </>
                    )}
                  </strong>
                  <p className="dica">
                    {base.usuario.nome} · {base.usuario.empresa}
                    <br />
                    {fila.length
                      ? `${fila.length} envio(s) aguardando confirmação.`
                      : "Nenhum envio pendente."}{" "}
                    Última consulta:{" "}
                    {new Date(base.sincronizado).toLocaleString("pt-BR")}.
                  </p>
                </div>
                <button
                  className="btn sec"
                  disabled={ocupado}
                  onClick={() => void sincronizar()}
                >
                  <RefreshCw size={16} />
                  {ocupado ? "Sincronizando…" : "Sincronizar agora"}
                </button>
              </div>
            )}
            {!demo && !chave && (
              <details className="card">
                <summary>Preparar este aparelho para usar sem internet</summary>
                <p>
                  Orçamentos, demandas e OS serão armazenados neste navegador,
                  incluindo os clientes consultados. Ative somente em um
                  aparelho de confiança. O financeiro, os PDFs e a importação
                  precisam de conexão.
                </p>
                <label className="operacao-consentimento">
                  <input
                    type="checkbox"
                    checked={consentiu}
                    onChange={(e) => setConsentiu(e.target.checked)}
                  />
                  Autorizo salvar os dados desta empresa neste aparelho.
                </label>
                <button
                  className="btn sec"
                  disabled={!consentiu || ocupado || !conectado}
                  onClick={() => void ativarOffline()}
                >
                  Preparar uso offline
                </button>
              </details>
            )}
            {!demo && chave && (
              <p className="dica">
                {pronto ? "Arquivos preparados. " : ""}Offline ativo para os
                registros consultados (até 500 registros comerciais e 500
                demandas recentes). Sincronização com a página aberta ou ao
                reabrir conectado. Evite limpar os dados do navegador antes de
                sincronizar.
              </p>
            )}
            {!demo && (
              <FotosRecuperaveis
                base={base}
                registros={visiveis}
                editando={editar?.id}
                recuperar={(r) => {
                  setTipo("servico");
                  setEditar(r);
                  setRevisao("");
                }}
              />
            )}
            {base.armazenamento && (
              <p className="dica">
                Fotos:{" "}
                {(base.armazenamento.usado / 1048576).toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}{" "}
                MB de{" "}
                {(base.armazenamento.limite / 1048576).toLocaleString("pt-BR")}{" "}
                MB utilizados. Inclui miniaturas e envios em confirmação.
              </p>
            )}
            {fila
              .filter((p) => p.erro)
              .map((p) => (
                <div className="card operacao-pilha" key={p.operacao}>
                  <Aviso
                    tipo="atencao"
                    titulo={
                      p.conflito
                        ? "Alterações para revisar"
                        : "Envio precisa de correção"
                    }
                  >
                    <b>{p.dados.titulo}</b>: {p.erro} Seu trabalho continua
                    salvo aqui.
                  </Aviso>
                  <div className="acoes empilha">
                    <button className="btn sec" onClick={() => void revisar(p)}>
                      Revisar meu envio
                    </button>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void dispositivo
                          .removerEnvio(chave, p.operacao)
                          .then(async () => {
                            setFila(
                              (await dispositivo.carregar(chave))?.fila || [],
                            );
                          });
                      }}
                    >
                      <Confirmar
                        aoConfirmar={async () => {
                          await dispositivo.removerEnvio(chave, p.operacao);
                          setFila(
                            (await dispositivo.carregar(chave))?.fila || [],
                          );
                        }}
                        titulo="Descartar este envio local?"
                        texto="Suas alterações neste aparelho serão descartadas. A versão da plataforma será mantida."
                        confirmar="Descartar envio"
                      >
                        Manter versão da plataforma
                      </Confirmar>
                    </form>
                  </div>
                </div>
              ))}
            <nav className="operacao-abas" aria-label="Áreas da operação">
              {(Object.keys(NOMES) as Tipo[])
                .filter((t) => t !== "financeiro" || base.usuario.admin)
                .map((t) => {
                  const Icone = icones[t];
                  return (
                    <button
                      key={t}
                      className={`btn ${tipo === t ? "operacao-selecionado" : "ghost"}`}
                      aria-pressed={tipo === t}
                      onClick={() => {
                        setTipo(t);
                        setEditar(null);
                        setRevisao("");
                      }}
                    >
                      <Icone size={18} />
                      {NOMES[t]}
                    </button>
                  );
                })}
            </nav>
            {tipo === "financeiro" && !conectado ? (
              <Aviso titulo="Financeiro disponível com conexão">
                Conecte-se para consultar valores e registrar as baixas. Nenhum
                dado financeiro é armazenado no offline.
              </Aviso>
            ) : editar ? (
              <OperacaoForm
                key={`${editar.id}-${revisao}`}
                registro={editar}
                revisando={!!revisao}
                conflito={
                  revisao
                    ? base.registros.find((r) => r.id === editar.id)
                    : undefined
                }
                base={base}
                demo={demo}
                offlineAtivo={!!chave}
                salvar={salvar}
                cancelar={() => {
                  setEditar(null);
                  setRevisao("");
                }}
              />
            ) : (
              <>
                {tipo === "financeiro" && (
                  <>
                    <div className="metricas">
                      <Metrica
                        valor={dinheiro(recebidos)}
                        rotulo="Recebido"
                        apoio="Baixas de receitas consultadas"
                      />
                      <Metrica
                        valor={dinheiro(pagos)}
                        rotulo="Pago"
                        apoio="Baixas de despesas consultadas"
                      />
                      <Metrica
                        valor={dinheiro(recebidos - pagos)}
                        rotulo="Saldo realizado"
                        apoio="Recebido menos pago"
                      />
                    </div>
                    <p className="dica">
                      Controle gerencial básico dos registros consultados, sem
                      conciliação bancária ou apuração contábil. Valores
                      previstos só entram no saldo após uma baixa.
                    </p>
                  </>
                )}
                {!registros.length ? (
                  <Vazio
                    titulo={`Comece por ${tipo === "orcamento" ? "uma proposta" : tipo === "servico" ? "uma ordem de serviço" : tipo === "demanda" ? "um retorno" : "um lançamento"}`}
                    texto="Cadastre no botão acima. Os próximos passos ficam organizados por cliente."
                  />
                ) : (
                  registros.map((r) => {
                    const pendente = fila.some((p) => p.id === r.id);
                    const pago = (r.dados.baixas || []).reduce(
                        (s, b) => s + b.valor_centavos,
                        0,
                      ),
                      saldo = (r.dados.valor_centavos || 0) - pago;
                    return (
                      <article className="card operacao-registro" key={r.id}>
                        <div className="operacao-registro-topo">
                          <div>
                            <span className="dica">
                              {ESTADOS[r.tipo][r.dados.estado] ||
                                r.dados.estado}
                              {pendente ? " · Salvo no aparelho" : ""}
                            </span>
                            <h2>{r.dados.titulo}</h2>
                            <p className="muted">
                              {base.clientes.find(
                                (c) => c.id === r.dados.cliente_id,
                              )?.nome || "Sem cliente"}{" "}
                              · {r.dados.data.split("-").reverse().join("/")}
                            </p>
                          </div>
                          {r.tipo === "orcamento" && (
                            <strong className="operacao-preco">
                              {dinheiro(
                                r.dados.total_centavos ??
                                  totalOrcamento(
                                    r.dados.itens || [],
                                    r.dados.desconto_centavos,
                                  ),
                              )}
                            </strong>
                          )}
                          {r.tipo === "financeiro" && (
                            <strong className="operacao-preco">
                              {dinheiro(saldo)}
                              <span className="dica">
                                {" "}
                                {r.dados.natureza === "receita"
                                  ? "a receber"
                                  : "a pagar"}
                              </span>
                            </strong>
                          )}
                        </div>
                        {r.tipo === "demanda" && (
                          <p>
                            <b>Próxima ação:</b> {r.dados.proxima_acao}
                          </p>
                        )}
                        {r.tipo === "servico" && (
                          <p>
                            {r.dados.checklist?.filter((c) => c.feito).length}/
                            {r.dados.checklist?.length} etapas concluídas
                          </p>
                        )}
                        <div className="acoes empilha">
                          <button
                            className="btn sec"
                            disabled={fila.some(
                              (p) => p.id === r.id && (p.tentado || !!p.erro),
                            )}
                            onClick={() => {
                              setEditar(r);
                              setRevisao("");
                            }}
                          >
                            Abrir{" "}
                            {r.tipo === "servico"
                              ? "serviço"
                              : r.tipo === "demanda"
                                ? "retorno"
                                : r.tipo === "financeiro"
                                  ? "lançamento"
                                  : "orçamento"}
                          </button>
                          {r.tipo === "orcamento" && (
                            <button
                              className="btn ghost"
                              onClick={() => derivar(r, "demanda")}
                            >
                              Agendar retorno
                            </button>
                          )}
                          {r.tipo === "orcamento" &&
                            r.dados.estado === "aprovado" &&
                            !pendente && (
                              <>
                                <button
                                  className="btn ghost"
                                  onClick={() => derivar(r, "servico")}
                                >
                                  Gerar OS
                                </button>
                                {base.usuario.admin && (
                                  <button
                                    className="btn ghost"
                                    disabled={!conectado}
                                    onClick={() => derivar(r, "financeiro")}
                                  >
                                    Criar recebível
                                  </button>
                                )}
                              </>
                            )}
                          {demo &&
                            r.tipo === "servico" &&
                            r.dados.relatorio?.snapshot && (
                              <button
                                className="btn ghost"
                                onClick={() => void pdfDemo(r)}
                              >
                                <Download size={16} /> Baixar relatório de
                                exemplo
                              </button>
                            )}
                          {(r.tipo === "orcamento" || r.tipo === "servico") &&
                            !demo &&
                            !pendente &&
                            conectado && (
                              <a
                                className="btn ghost"
                                href={`/api/operacao/pdf?id=${r.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download size={16} />
                                Baixar PDF A4
                              </a>
                            )}
                        </div>
                        {r.tipo === "financeiro" && (
                          <>
                            <p className="dica">
                              Previsto: {dinheiro(r.dados.valor_centavos)} ·
                              Baixado: {dinheiro(pago)}.{" "}
                              {r.dados.estado === "cancelado"
                                ? "Lançamento cancelado."
                                : ""}
                            </p>
                            {!!r.dados.baixas?.length && (
                              <details>
                                <summary>Consultar baixas</summary>
                                {r.dados.baixas.map((b) => (
                                  <p key={b.id}>
                                    {b.data.split("-").reverse().join("/")} ·{" "}
                                    {dinheiro(b.valor_centavos)}
                                  </p>
                                ))}
                              </details>
                            )}
                            {saldo > 0 && r.dados.estado !== "cancelado" && (
                              <details>
                                <summary>
                                  Registrar pagamento{" "}
                                  {r.dados.natureza === "receita"
                                    ? "recebido"
                                    : "realizado"}
                                </summary>
                                <form
                                  onSubmit={(e) => e.preventDefault()}
                                  className="operacao-baixa"
                                >
                                  <div className="campo">
                                    <label htmlFor={`baixa-${r.id}`}>
                                      Valor da baixa (R$)
                                    </label>
                                    <input
                                      id={`baixa-${r.id}`}
                                      name="valor"
                                      inputMode="decimal"
                                      required
                                      placeholder="0,00"
                                    />
                                  </div>
                                  <div className="campo">
                                    <label htmlFor={`data-${r.id}`}>Data</label>
                                    <input
                                      id={`data-${r.id}`}
                                      name="data"
                                      type="date"
                                      defaultValue={hoje()}
                                      max={hoje()}
                                      required
                                    />
                                  </div>
                                  <Confirmar
                                    aoConfirmar={async (form) => {
                                      if (!form?.reportValidity()) return;
                                      const f = new FormData(form);
                                      try {
                                        const { decimalBR } = await import(
                                          "@/lib/operacao/modelo"
                                        );
                                        f.set(
                                          "centavos",
                                          String(
                                            decimalBR(String(f.get("valor"))),
                                          ),
                                        );
                                        await baixar(r, f);
                                      } catch (e) {
                                        setErro((e as Error).message);
                                      }
                                    }}
                                    tom="info"
                                    className="btn sec"
                                    titulo="Confirmar esta baixa?"
                                    texto="O valor será somado às baixas e preservado no histórico deste lançamento."
                                    confirmar="Registrar baixa"
                                  >
                                    Registrar baixa
                                  </Confirmar>
                                </form>
                              </details>
                            )}
                          </>
                        )}
                      </article>
                    );
                  })
                )}
              </>
            )}
            <div className="operacao-rodape">
              <a href={demo ? "/demo" : "/"}>Voltar ao painel</a>
              <a href={demo ? "/login" : "/clientes/importar"}>
                {demo
                  ? "Entrar na plataforma"
                  : "Importar clientes de uma planilha"}
              </a>
            </div>
          </>
        )}
      </div>
    </Casca>
  );
}

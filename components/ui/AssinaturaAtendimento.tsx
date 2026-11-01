"use client";
import { useRef, useState, type PointerEvent } from "react";
import { baseDemo } from "@/lib/operacao/demo";
import {
  podeColetarAssinatura,
  criarAssinatura,
  semAssinatura,
} from "@/lib/relatorios/assinatura";
import { PenLine } from "lucide-react";
import { Aviso } from "./Aviso";
import { Confirmar } from "./Confirmar";
import {
  TERMO_ACEITE,
  validarTracos,
  type Tracos,
  type Ponto,
} from "@/lib/relatorios/assinatura";
import type { Base, Registro } from "@/lib/operacao/modelo";

export function DesenhoAssinatura({ tracos }: { tracos: Tracos }) {
  return (
    <svg
      viewBox="0 0 600 300"
      preserveAspectRatio="none"
      role="img"
      aria-label="Assinatura desenhada pelo representante"
      className="assinatura-desenho"
    >
      {tracos.map((t, i) => (
        <polyline
          key={i}
          points={t.map(([x, y]) => `${x * 0.6},${y * 0.3}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
export function AssinaturaAtendimento({
  registro,
  base,
  bloqueado,
  assinar,
  limpar,
}: {
  registro: Registro;
  base: Base;
  bloqueado: boolean;
  assinar: (tracos: Tracos) => Promise<void>;
  limpar: () => void;
}) {
  const [tracos, setTracos] = useState<Tracos>([]),
    [consentiu, setConsentiu] = useState(false),
    [erro, setErro] = useState(""),
    [enviando, setEnviando] = useState(false);
  const atual = useRef<Tracos>([]),
    ativo = useRef<number | null>(null);
  const d = registro.dados,
    r = d.relatorio!,
    assinatura = r.assinatura,
    recibo = r.snapshot?.aceite;
  const hora = (v: string) => new Date(v).toLocaleString("pt-BR");
  if (assinatura)
    return (
      <section
        className="operacao-item operacao-pilha"
        aria-label="Assinatura do atendimento"
      >
        <h3>
          <PenLine size={20} aria-hidden /> Aceite do atendimento
        </h3>
        <DesenhoAssinatura tracos={assinatura.tracos} />
        <p>
          <strong>{r.ciencia.nome}</strong>
          {r.ciencia.cargo && ` · ${r.ciencia.cargo}`}
        </p>
        <p className="dica">
          Coletada no aparelho em {hora(assinatura.capturada_em)}. Horário
          informado pelo dispositivo.
        </p>
        <p className="dica">{assinatura.termo}</p>
        <Aviso
          tipo={recibo?.demonstracao ? "info" : recibo ? "ok" : "atencao"}
          titulo={
            recibo?.demonstracao
              ? "Exemplo de aceite concluído"
              : recibo
                ? "Aceite recebido pela plataforma"
                : "Assinatura aguardando confirmação"
          }
        >
          {recibo?.demonstracao
            ? "Exemplo fictício; nenhum aceite foi enviado à plataforma."
            : recibo
              ? `Recebido em ${hora(recibo.recebido_em)} · OS ${registro.id.slice(0, 8).toUpperCase()} · versão ${recibo.versao}.`
              : "Conclua o envio da OS. A confirmação aparece somente após a sincronização; os dados assinados ficam bloqueados para edição."}
        </Aviso>
        {recibo && !recibo.demonstracao && (
          <p className="dica assinatura-hash">
            Registro SHA-256: {recibo.sha256}
          </p>
        )}
        {erro && (
          <Aviso tipo="erro" titulo="O envio ainda não foi confirmado">
            {erro} Use o botão de salvar a OS para tentar novamente.
          </Aviso>
        )}
        {!r.snapshot && (
          <fieldset
            className="relatorio-campos"
            disabled={bloqueado || enviando}
          >
            <Confirmar
              className="btn sec"
              titulo="Descartar esta assinatura?"
              texto="Para alterar o atendimento, descarte este aceite e peça ao cliente para conferir e assinar novamente."
              aoConfirmar={async () => {
                limpar();
                setTracos([]);
                atual.current = [];
                setConsentiu(false);
              }}
            >
              Descartar assinatura e editar
            </Confirmar>
          </fieldset>
        )}
        <p className="dica">
          Aceite desenhado na tela. A identidade do signatário é informada na
          coleta; não há verificação por certificado digital.
        </p>
      </section>
    );
  if (r.snapshot) return null;
  const pronta = podeColetarAssinatura(d);
  const ponto = (e: PointerEvent<SVGSVGElement>): Ponto => {
    const b = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(
        0,
        Math.min(1000, Math.round(((e.clientX - b.left) / b.width) * 1000)),
      ),
      Math.max(
        0,
        Math.min(1000, Math.round(((e.clientY - b.top) / b.height) * 1000)),
      ),
    ];
  };
  function iniciar(e: PointerEvent<SVGSVGElement>) {
    if (
      !pronta ||
      bloqueado ||
      enviando ||
      ativo.current !== null ||
      (e.pointerType === "mouse" && e.button !== 0)
    )
      return;
    if (atual.current.length >= 32 || atual.current.flat().length >= 800) {
      setErro("O desenho chegou ao limite. Limpe e assine novamente.");
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    ativo.current = e.pointerId;
    atual.current = [...atual.current, [ponto(e)]];
    setTracos(atual.current);
    setErro("");
  }
  function mover(e: PointerEvent<SVGSVGElement>) {
    if (ativo.current !== e.pointerId) return;
    const p = ponto(e),
      ultimo = atual.current.at(-1)!.at(-1)!;
    if (Math.abs(p[0] - ultimo[0]) + Math.abs(p[1] - ultimo[1]) < 4) return;
    if (atual.current.flat().length >= 800) {
      ativo.current = null;
      setErro("O desenho chegou ao limite. Limpe e assine novamente.");
      return;
    }
    atual.current = [
      ...atual.current.slice(0, -1),
      [...atual.current.at(-1)!, p],
    ];
    setTracos(atual.current);
  }
  function terminar(e: PointerEvent<SVGSVGElement>) {
    if (ativo.current !== e.pointerId) return;
    mover(e);
    ativo.current = null;
    atual.current = atual.current.filter((t) => t.length >= 2);
    setTracos(atual.current);
  }
  async function confirmar() {
    setErro("");
    if (!consentiu || ativo.current !== null || !validarTracos(tracos)) {
      setErro(
        "Confira o resumo, marque o aceite e desenhe sua assinatura antes de concluir.",
      );
      return;
    }
    setEnviando(true);
    try {
      await assinar(tracos);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <section
      className="operacao-item operacao-pilha"
      aria-label="Assinatura do atendimento"
    >
      <h3>
        <PenLine size={20} aria-hidden /> Assinatura do cliente
      </h3>
      <p>
        Ao concluir, entregue o celular ao representante para conferir o
        atendimento e assinar abaixo.
      </p>
      {!pronta && (
        <Aviso titulo="Prepare a OS para o aceite">
          Selecione a situação Concluída, preencha o resultado, conclua as
          etapas e identifique o representante em Ciência do cliente. A
          assinatura é opcional; ausência ou recusa podem ser registradas.
        </Aviso>
      )}
      {pronta && (
        <>
          <details open className="assinatura-resumo">
            <summary>Conferir o atendimento antes de assinar</summary>
            <dl className="operacao-comparacao">
              {[
                ["Prestadora", base.usuario.empresa],
                [
                  "OS",
                  `${registro.id.slice(0, 8).toUpperCase()} · ${d.titulo}`,
                ],
                [
                  "Cliente",
                  base.clientes.find((c) => c.id === d.cliente_id)?.nome,
                ],
                [
                  "Unidade",
                  base.campo?.unidades.find((u) => u.id === r.unidade_id)?.nome,
                ],
                [
                  "Local do atendimento",
                  base.campo?.unidades.find((u) => u.id === r.unidade_id)
                    ?.endereco,
                ],
                [
                  "Equipamentos",
                  r.equipamento_ids
                    .map((id) => {
                      const e = base.campo?.equipamentos.find(
                        (e) => e.id === id,
                      );
                      return [e?.tag, e?.marca, e?.modelo, e?.ambiente]
                        .filter(Boolean)
                        .join(" · ");
                    })
                    .join("\n"),
                ],
                [
                  "Técnico",
                  base.equipe.find((e) => e.id === d.responsavel_id)?.nome,
                ],
                [
                  "Execução",
                  `${r.executada_em.split("-").reverse().join("/")} · ${r.inicio || "Horário não informado"}${r.fim ? ` até ${r.fim}` : ""}`,
                ],
                [
                  "Etapas concluídas",
                  d.checklist?.map((c) => c.descricao).join("\n"),
                ],
                ["Resultado", d.resultado],
                ["Peças e materiais", r.pecas],
                ["Medições", r.medicoes],
                ["Recomendações", r.recomendacoes],
                [
                  "Próxima manutenção",
                  r.proxima_manutencao
                    ? r.proxima_manutencao.split("-").reverse().join("/")
                    : "Não informada",
                ],
                ["Observações", d.observacoes],
                [
                  "Fotos do relatório",
                  r.fotos.length
                    ? r.fotos
                        .map(
                          (f, i) =>
                            `${i + 1}. ${f.etapa} · ${f.legenda || "Sem legenda"}`,
                        )
                        .join("\n")
                    : "Sem fotos",
                ],
                [
                  "Representante",
                  `${r.ciencia.nome}${r.ciencia.cargo ? ` · ${r.ciencia.cargo}` : ""}`,
                ],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            <p className="dica">
              As fotos podem ser conferidas na galeria acima. Qualquer ajuste
              deve ser feito antes da assinatura.
            </p>
          </details>
          <label className="operacao-consentimento">
            <input
              type="checkbox"
              checked={consentiu}
              onChange={(e) => setConsentiu(e.target.checked)}
              disabled={enviando || bloqueado}
            />
            {TERMO_ACEITE}
          </label>
          <div className="assinatura-area">
            <svg
              viewBox="0 0 600 300"
              preserveAspectRatio="none"
              role="img"
              aria-label="Área para desenhar a assinatura com o dedo ou mouse"
              aria-describedby="assinatura-instrucao"
              onPointerDown={iniciar}
              onPointerMove={mover}
              onPointerUp={terminar}
              onPointerCancel={(e) => {
                if (ativo.current === e.pointerId) {
                  ativo.current = null;
                  atual.current = atual.current.slice(0, -1);
                  setTracos(atual.current);
                  setErro(
                    "O traço foi interrompido. Continue a assinatura ou limpe para recomeçar.",
                  );
                }
              }}
              onLostPointerCapture={(e) => {
                if (ativo.current === e.pointerId) terminar(e);
              }}
              className="assinatura-desenho assinatura-captura"
            >
              {tracos.map((t, i) => (
                <polyline
                  key={i}
                  points={t.map(([x, y]) => `${x * 0.6},${y * 0.3}`).join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
            {!tracos.length && <span aria-hidden>Assine aqui</span>}
          </div>
          <p className="dica" id="assinatura-instrucao">
            Desenhe com o dedo, caneta ou mouse. A assinatura será enviada junto
            com a OS. Sem conexão, o aceite aguarda sincronização neste aparelho
            com offline ativado.
          </p>
          <div className="acoes empilha">
            <Confirmar
              className="btn ghost"
              titulo="Limpar o desenho?"
              texto="A assinatura ainda não foi concluída. Você poderá desenhar novamente."
              aoConfirmar={async () => {
                atual.current = [];
                setTracos([]);
                setErro("");
              }}
            >
              Limpar desenho
            </Confirmar>
            <button
              className="btn"
              type="button"
              onClick={confirmar}
              disabled={
                bloqueado || enviando || !consentiu || !validarTracos(tracos)
              }
              aria-busy={enviando}
            >
              {enviando ? "Registrando aceite…" : "Assinar e concluir OS"}
            </button>
          </div>
        </>
      )}
      {erro && (
        <Aviso tipo="erro" titulo="Revise o aceite">
          {erro}
        </Aviso>
      )}
      <p className="dica">
        Aceite desenhado na tela, sem certificado digital e sem verificação
        automática da identidade. Não substitui a assinatura do responsável
        técnico.
      </p>
    </section>
  );
}

/** Exemplo isolado do catálogo, com dados fictícios e sem envio à API. */
export function DemoAssinaturaAtendimento() {
  const [base] = useState(() => baseDemo());
  const [registro, setRegistro] = useState<Registro>(() => {
    const r = structuredClone(
      base.registros.find((r) => r.tipo === "servico")!,
    );
    r.dados.estado = "concluida";
    r.dados.resultado =
      "Filtros higienizados e drenagem conferida. Equipamento funcionando após o teste.";
    r.dados.checklist = r.dados.checklist!.map((c) => ({ ...c, feito: true }));
    r.dados.relatorio!.ciencia = {
      situacao: "presente",
      nome: "Ana Oliveira · exemplo fictício",
      cargo: "Administradora",
      confirmada: true,
    };
    r.dados.relatorio!.recomendacoes =
      "Manter a limpeza periódica e acompanhar a drenagem.";
    return r;
  });
  return (
    <AssinaturaAtendimento
      registro={registro}
      base={base}
      bloqueado={false}
      limpar={() =>
        setRegistro((r) => ({ ...r, dados: semAssinatura(r.dados) }))
      }
      assinar={async (tracos) => {
        const assinatura = criarAssinatura(registro, base, tracos);
        setRegistro((r) => ({
          ...r,
          dados: {
            ...r.dados,
            relatorio: { ...r.dados.relatorio!, assinatura },
          },
        }));
      }}
    />
  );
}

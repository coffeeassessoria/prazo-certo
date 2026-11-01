"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info } from "lucide-react";

/**
 * Botão que pede confirmação num modal do DS antes de enviar o formulário onde está.
 * Uso: <form action={acao}><Confirmar titulo="Excluir vencimento?" ...>Excluir</Confirmar></form>
 */
export function Confirmar({
  children,
  titulo,
  texto,
  destaque,
  confirmar,
  className = "btn perigo",
  tom = "perigo",
  aoConfirmar,
}: {
  children: React.ReactNode;
  titulo: string;
  texto?: string;
  destaque?: string;
  confirmar?: string;
  className?: string;
  tom?: "perigo" | "info";
  aoConfirmar?: (form: HTMLFormElement | null) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const gatilho = useRef<HTMLButtonElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);
  const modal = useRef<HTMLDivElement>(null);
  const enviandoAtual = useRef(enviando);
  enviandoAtual.current = enviando;
  const tituloId = useId();

  useEffect(() => {
    if (!aberto) return;
    cancelar.current?.focus();
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviandoAtual.current) setAberto(false);
      if (e.key !== "Tab") return;
      const botoes = Array.from(
        modal.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ) || [],
      );
      if (!botoes.length) {
        e.preventDefault();
        return;
      }
      const primeiro = botoes[0],
        ultimo = botoes[botoes.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("keydown", teclado);
      gatilho.current?.focus();
    };
  }, [aberto]);

  async function confirmarAcao() {
    setEnviando(true);
    if (aoConfirmar) {
      try {
        await aoConfirmar(gatilho.current?.closest("form") || null);
        setAberto(false);
      } catch {
        setAberto(false);
      } finally {
        setEnviando(false);
      }
    } else gatilho.current?.closest("form")?.requestSubmit();
  }

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        className={className}
        onClick={() => setAberto(true)}
      >
        {children}
      </button>
      {aberto &&
        createPortal(
          <div
            className="modal-fundo"
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            onClick={() => !enviando && setAberto(false)}
          >
            <div
              className="modal"
              ref={modal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`modal-icone ${tom === "info" ? "info" : ""}`}>
                {tom === "info" ? (
                  <Info size={20} />
                ) : (
                  <AlertTriangle size={20} />
                )}
              </div>
              <h3 id={tituloId}>{titulo}</h3>
              {(texto || destaque) && (
                <p>
                  {texto}
                  {destaque && (
                    <>
                      <br />
                      <strong>{destaque}</strong>
                    </>
                  )}
                </p>
              )}
              <div className="modal-acoes">
                <button
                  ref={cancelar}
                  type="button"
                  className="btn sec"
                  onClick={() => setAberto(false)}
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={tom === "info" ? "btn" : "btn perigo"}
                  onClick={confirmarAcao}
                  disabled={enviando}
                  aria-busy={enviando}
                >
                  {enviando ? (
                    <>
                      <span className="spinner" aria-hidden />
                      Aguarde…
                    </>
                  ) : (
                    (confirmar ?? children)
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

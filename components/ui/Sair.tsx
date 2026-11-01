"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { pendentesTotais, limpar } from "@/lib/operacao/offline";
import { Confirmar } from "./Confirmar";
export function Sair() {
  const [pendentes, setPendentes] = useState(false),
    [erro, setErro] = useState(""),
    [ocupado, setOcupado] = useState(false);
  function encerrar() {
    document.cookie =
      "pc_offline_encerrado=1; Path=/; SameSite=Lax; Max-Age=31536000";
    const f = document.createElement("form");
    f.method = "post";
    f.action = "/sair";
    document.body.append(f);
    f.submit();
  }
  async function sair() {
    setOcupado(true);
    try {
      if (await pendentesTotais()) {
        setPendentes(true);
        return;
      }
      await limpar();
      encerrar();
    } catch {
      setErro(
        "Não foi possível conferir os envios. Sua sessão pode ser encerrada mantendo os dados locais.",
      );
      setPendentes(true);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        className="btn ghost icone peq"
        disabled={ocupado}
        aria-label="Sair do sistema"
        title="Sair"
        onClick={() => void sair()}
      >
        <LogOut size={16} />
      </button>
      {pendentes && (
        <div className="sair-aviso" role="status">
          <p>
            {erro ||
              "Há envios neste aparelho. Sincronize antes de sair ou mantenha-os para a próxima entrada na conta de origem."}
          </p>
          <a href="/operacao" className="btn sec">
            Abrir operação
          </a>
          <Confirmar
            tom="info"
            className="btn ghost"
            titulo="Encerrar a sessão e manter os envios?"
            texto="Os envios serão preservados neste aparelho e só poderão ser retomados após entrar conectado na conta de origem. O acesso offline ficará bloqueado."
            confirmar="Sair e manter envios"
            aoConfirmar={async () => encerrar()}
          >
            Sair mantendo os envios
          </Confirmar>
          <button className="btn ghost" onClick={() => setPendentes(false)}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import { Aviso } from "./Aviso";
import type { LinhaImportada } from "@/lib/operacao/importacao";
export function ImportarClientes() {
  const [linhas, setLinhas] = useState<LinhaImportada[]>([]),
    [erro, setErro] = useState(""),
    [ocupado, setOcupado] = useState(false),
    [resultado, setResultado] = useState(""),
    [operacao, setOperacao] = useState("");
  async function enviar(dados: unknown) {
    const r = await fetch("/api/importacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erro);
    return j;
  }
  async function prever(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro("");
    setResultado("");
    setLinhas([]);
    setOcupado(true);
    try {
      if (arquivo.size > 2_000_000)
        throw new Error("Escolha um arquivo de até 2 MB.");
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      const j = await enviar({
        acao: "prever",
        nome: arquivo.name,
        arquivo: btoa(bin),
      });
      setLinhas(j.linhas);
      setOperacao(crypto.randomUUID());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }
  async function importar() {
    setOcupado(true);
    setErro("");
    try {
      const j = await enviar({
        acao: "confirmar",
        operacao,
        clientes: linhas.filter((l) => !l.duplicado).map((l) => l.cliente),
      });
      setResultado(
        `${j.inseridos} clientes cadastrados. ${j.ignorados} já existentes foram ignorados.`,
      );
      setLinhas([]);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }
  function modelo() {
    const b = new Blob(
      [
        "\uFEFFNome;Documento;Contato;Telefone;Email;Endereco;Observacoes\r\nCliente de exemplo;12.345.678/0001-90;Ana;(66) 99999-9999;ana@exemplo.com;Rua Exemplo 100;Agendar com a portaria\r\n",
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = "modelo-clientes-prazo-certo.csv";
    a.click();
    URL.revokeObjectURL(u);
  }
  return (
    <div className="operacao-pilha">
      <div className="card">
        <h2>Traga sua carteira de clientes</h2>
        <p>
          Use CSV em UTF-8 ou XLSX, com até 500 clientes e 2 MB. No XLSX, usamos
          a primeira aba visível. A primeira linha deve conter os nomes das
          colunas.
        </p>
        <button className="btn sec" onClick={modelo}>
          Baixar modelo CSV
        </button>
        <div className="campo">
          <label htmlFor="planilha-clientes">Selecionar planilha</label>
          <input
            id="planilha-clientes"
            type="file"
            accept=".csv,.xlsx"
            disabled={ocupado}
            onChange={(e) => void prever(e.target.files?.[0])}
          />
        </div>
        <p className="dica">
          Precisamos de conexão para conferir e importar. Nenhum cadastro é
          alterado antes da sua confirmação.
        </p>
      </div>
      {erro && (
        <Aviso tipo="erro" titulo="Não foi possível importar">
          {erro}
        </Aviso>
      )}
      {resultado && (
        <Aviso tipo="ok" titulo="Importação concluída">
          {resultado} <a href="/clientes">Ver clientes</a>
        </Aviso>
      )}
      {ocupado && (
        <p role="status" aria-busy>
          Conferindo os dados…
        </p>
      )}
      {!!linhas.length && (
        <div className="card">
          <h2>Confira {linhas.length} linhas</h2>
          <p>
            Documentos repetidos são ignorados. Sem documento, usamos o nome.
            Cadastros existentes são preservados; o resultado informa quantos já
            estavam na plataforma.
          </p>
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Cliente</th>
                  <th>Documento / contato</th>
                  <th>Conferência</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.linha}>
                    <td>{l.linha}</td>
                    <td>{l.cliente.nome}</td>
                    <td>
                      {l.cliente.documento}
                      <br />
                      {l.cliente.email || l.cliente.telefone}
                    </td>
                    <td>
                      {l.erros.join(" ") ||
                        (l.duplicado
                          ? "Repetido no arquivo: será ignorado"
                          : "Pronto para conferir no cadastro")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {linhas.some((l) => l.erros.length > 0) ? (
            <Aviso tipo="atencao" titulo="Corrija a planilha">
              Revise as linhas indicadas e selecione o arquivo novamente.
            </Aviso>
          ) : (
            <button
              className="btn"
              disabled={ocupado}
              onClick={() => void importar()}
            >
              Confirmar importação
            </button>
          )}
        </div>
      )}
    </div>
  );
}

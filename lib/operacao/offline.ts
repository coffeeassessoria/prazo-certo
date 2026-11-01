import {
  limparFotosLocais,
  fotosPendentes,
} from "@/lib/relatorios/fotos-offline";
import type { Base, Operacao, Pendente, Registro } from "./modelo";
export type Dispositivo = { base: Base; fila: Pendente[] };
const BANCO = "prazo-certo-operacao-v1",
  TABELA = "empresas",
  PONTEIRO = "pc-operacao-ativa";
export const particao = (base: Base) =>
  `${base.usuario.id}:${base.usuario.empresa_id}`;
function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const p = indexedDB.open(BANCO, 1);
    p.onupgradeneeded = () => p.result.createObjectStore(TABELA);
    p.onsuccess = () => resolve(p.result);
    p.onerror = () => reject(p.error);
  });
}
async function transacao<T>(
  chave: string,
  modo: IDBTransactionMode,
  fn: (atual: Dispositivo | undefined) => { valor?: Dispositivo; resultado: T },
): Promise<T> {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TABELA, modo),
      store = tx.objectStore(TABELA),
      p = store.get(chave);
    let resultado: T;
    p.onsuccess = () => {
      try {
        const r = fn(p.result);
        resultado = r.resultado;
        if (r.valor) store.put(r.valor, chave);
      } catch (e) {
        tx.abort();
        reject(e);
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(resultado);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Não foi possível salvar neste aparelho."));
    };
    tx.onerror = () => reject(tx.error);
  });
}
export async function carregar(chave?: string) {
  const k = chave || localStorage.getItem(PONTEIRO);
  if (!k) return undefined;
  return transacao(k, "readonly", (valor) => ({ resultado: valor }));
}
export async function ativar(base: Base) {
  const chave = particao(base);
  await transacao(chave, "readwrite", (atual) => ({
    valor: { base: semFinanceiro(base), fila: atual?.fila || [] },
    resultado: undefined,
  }));
  localStorage.setItem(PONTEIRO, chave);
  return chave;
}
export const semFinanceiro = (base: Base): Base => ({
  ...base,
  registros: base.registros.filter((r) => r.tipo !== "financeiro"),
});
export async function atualizarBase(chave: string, base: Base) {
  if (particao(base) !== chave)
    throw new Error(
      "A conta conectada mudou. Entre na conta que possui os envios pendentes.",
    );
  await transacao(chave, "readwrite", (atual) => ({
    valor: atual ? { ...atual, base: semFinanceiro(base) } : undefined,
    resultado: undefined,
  }));
}
/** Rascunhos nunca enviados podem ser editados; tentativas incertas mantêm seu UUID até receber confirmação. */
export async function enfileirar(chave: string, o: Operacao) {
  if (o.tipo === "financeiro")
    throw new Error("O financeiro precisa de conexão.");
  return transacao(chave, "readwrite", (atual) => {
    if (!atual) throw new Error("Ative o uso offline primeiro.");
    const anterior = atual.fila.find((p) => p.id === o.id);
    if (anterior?.tentado || anterior?.erro)
      throw new Error(
        "Esse registro tem um envio em confirmação. Sincronize ou revise o envio antes de editar novamente.",
      );
    const valor = {
      ...atual,
      fila: [...atual.fila.filter((p) => p.id !== o.id), o],
    };
    return { valor, resultado: valor };
  });
}
/** A reserva é durável e atômica com a edição local, inclusive entre abas. */
export async function reservarEnvio(chave: string, o: Operacao) {
  return transacao<Operacao | undefined>(chave, "readwrite", (a) => {
    const atual = a?.fila.find((p) => p.operacao === o.operacao);
    if (!a || !atual || atual.erro) return { resultado: undefined };
    return {
      valor: {
        ...a,
        fila: a.fila.map((p) =>
          p.operacao === o.operacao ? { ...p, tentado: true } : p,
        ),
      },
      resultado: atual,
    };
  });
}
export async function acusar(chave: string, o: Operacao, registro: Registro) {
  return transacao(chave, "readwrite", (atual) => {
    if (!atual) return { resultado: undefined };
    const fila = atual.fila.filter((p) => p.operacao !== o.operacao);
    const base = {
      ...atual.base,
      registros: [
        registro,
        ...atual.base.registros.filter(
          (r) => r.id !== o.id && r.id !== registro.id,
        ),
      ],
    };
    const valor = { base, fila };
    return { valor, resultado: valor };
  });
}
export async function marcarErro(
  chave: string,
  o: Operacao,
  erro: string,
  conflito: boolean,
) {
  await transacao(chave, "readwrite", (a) => ({
    valor: a
      ? {
          ...a,
          fila: a.fila.map((p) =>
            p.operacao === o.operacao ? { ...p, erro, conflito } : p,
          ),
        }
      : undefined,
    resultado: undefined,
  }));
}
export async function removerEnvio(chave: string, operacao: string) {
  await transacao(chave, "readwrite", (a) => ({
    valor: a
      ? { ...a, fila: a.fila.filter((p) => p.operacao !== operacao) }
      : undefined,
    resultado: undefined,
  }));
}
export function visiveis(base: Base, fila: Pendente[]): Registro[] {
  const pendentes = new Set(fila.map((p) => p.id));
  return [
    ...fila.map((p) => ({
      id: p.id,
      tipo: p.tipo,
      dados: p.dados,
      versao: p.versao,
    })),
    ...base.registros.filter((r) => !pendentes.has(r.id)),
  ];
}
export async function limpar() {
  const db = await abrir();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(TABELA, "readwrite");
    tx.objectStore(TABELA).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await limparFotosLocais();
  localStorage.removeItem(PONTEIRO);
}
export async function substituirEnvio(
  chave: string,
  anterior: string,
  o: Operacao,
) {
  return transacao(chave, "readwrite", (a) => {
    if (!a || !a.fila.some((p) => p.operacao === anterior))
      throw new Error("O envio já foi resolvido. Atualize a lista.");
    const valor = {
      ...a,
      fila: a.fila.map((p) => (p.operacao === anterior ? o : p)),
    };
    return { valor, resultado: valor };
  });
}
export async function pendentesTotais() {
  const db = await abrir();
  const fotos = await fotosPendentes();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(TABELA, "readonly"),
      p = tx.objectStore(TABELA).getAll();
    p.onsuccess = () =>
      resolve(
        (p.result as Dispositivo[]).reduce((n, d) => n + d.fila.length, fotos),
      );
    p.onerror = () => reject(p.error);
    tx.oncomplete = () => db.close();
  });
}
export const sessaoEncerrada = () =>
  typeof document !== "undefined" &&
  document.cookie.split(";").some((c) => c.trim() === "pc_offline_encerrado=1");
export function confirmarSessao() {
  document.cookie = "pc_offline_encerrado=; Max-Age=0; Path=/; SameSite=Lax";
}

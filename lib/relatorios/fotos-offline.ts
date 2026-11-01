import type { Registro } from "@/lib/operacao/modelo";
import { MAX_LOCAL_BYTES } from "./modelo";
export type FotoLocal = {
  id: string;
  chave: string;
  servico_id: string;
  blob: Blob;
  enviada: boolean;
  rascunho?: Registro;
};
const BANCO = "pc-fotos-v1";
const demonstracao = new Map<string, FotoLocal>();
const ehDemo = (chave: string) => chave.endsWith(":demo");
async function banco() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const p = indexedDB.open(BANCO, 1);
    p.onupgradeneeded = () =>
      p.result.createObjectStore("fotos", { keyPath: "id" });
    p.onsuccess = () => resolve(p.result);
    p.onerror = () => reject(p.error);
  });
}
async function executar<T>(
  modo: IDBTransactionMode,
  fn: (store: IDBObjectStore, ok: (v: T) => void) => void,
): Promise<T> {
  const db = await banco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("fotos", modo);
    let resultado: T;
    try {
      fn(tx.objectStore("fotos"), (v) => {
        resultado = v;
      });
    } catch (e) {
      tx.abort();
      db.close();
      reject(e);
      return;
    }
    tx.oncomplete = () => {
      db.close();
      resolve(resultado);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        tx.error ||
          new Error(
            "Não foi possível guardar a foto. Libere espaço neste aparelho.",
          ),
      );
    };
  });
}
export const lerFotoLocal = (chave: string, id: string) =>
  ehDemo(chave)
    ? Promise.resolve(demonstracao.get(id))
    : executar<FotoLocal | undefined>("readonly", (s, ok) => {
        const p = s.get(id);
        p.onsuccess = () =>
          ok(p.result?.chave === chave ? p.result : undefined);
      });
export async function guardarFoto(f: FotoLocal) {
  if (ehDemo(f.chave)) {
    if (
      [...demonstracao.values()]
        .filter((a) => a.id !== f.id)
        .reduce((n, a) => n + a.blob.size, f.blob.size) > MAX_LOCAL_BYTES
    )
      throw new Error(
        "Limite local de fotos atingido. Remova uma foto e tente novamente.",
      );
    demonstracao.set(f.id, f);
    return;
  }
  return executar<void>("readwrite", (s, ok) => {
    const p = s.getAll();
    p.onsuccess = () => {
      const fotos = p.result as FotoLocal[];
      if (
        fotos.some((a) => a.id === f.id && a.chave !== f.chave) ||
        fotos
          .filter((a) => a.id !== f.id)
          .reduce((n, a) => n + a.blob.size, f.blob.size) > MAX_LOCAL_BYTES
      ) {
        s.transaction.abort();
        return;
      }
      s.put(f);
      ok(undefined);
    };
  });
}
export const removerFotoLocal = (chave: string, id: string) =>
  ehDemo(chave)
    ? Promise.resolve(void demonstracao.delete(id))
    : executar<void>("readwrite", (s, ok) => {
        const p = s.get(id);
        p.onsuccess = () => {
          if (p.result?.chave === chave) s.delete(id);
          ok(undefined);
        };
      });
export const limparFotosLocais = () =>
  executar<void>("readwrite", (s, ok) => {
    s.clear();
    ok(undefined);
  });
export const fotosPendentes = () =>
  executar<number>("readonly", (s, ok) => {
    const p = s.getAll();
    p.onsuccess = () =>
      ok((p.result as FotoLocal[]).filter((f) => !f.enviada).length);
  });

export const listarFotosLocais = (chave: string) =>
  ehDemo(chave)
    ? Promise.resolve(
        [...demonstracao.values()].filter((f) => f.chave === chave),
      )
    : executar<FotoLocal[]>("readonly", (s, ok) => {
        const p = s.getAll();
        p.onsuccess = () =>
          ok((p.result as FotoLocal[]).filter((f) => f.chave === chave));
      });

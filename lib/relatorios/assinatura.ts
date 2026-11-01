import type { Base, Dados, Registro } from "@/lib/operacao/modelo";
export const TERMO_ACEITE =
  "Li o resumo deste atendimento, incluindo as observações e recomendações, e confirmo o recebimento do relatório. Este aceite não comprova pagamento nem substitui a responsabilidade técnica.";
export type Ponto = [number, number];
export type Tracos = Ponto[][];
export type Assinatura = {
  formato: 1;
  conteudo: string;
  tracos: Tracos;
  capturada_em: string;
  termo: string;
};
export type ReciboAceite = {
  demonstracao?: boolean;
  sha256: string;
  recebido_em: string;
  registrado_por: string;
  versao: number;
};
export function semAssinatura(dados: Dados): Dados {
  const d = structuredClone(dados);
  if (d.relatorio) {
    delete d.relatorio.assinatura;
    delete d.relatorio.snapshot;
  }
  return d;
}
export function conteudoAceite(
  registro: Registro,
  base: Base,
  dados = registro.dados,
) {
  const r = dados.relatorio!;
  return JSON.stringify({
    os: registro.id,
    empresa: base.usuario.empresa_id,
    versao: registro.versao,
    coletor: base.usuario.id,
    dados: semAssinatura(dados),
    apresentado: {
      empresa: base.usuario.empresa,
      cliente: base.clientes.find((c) => c.id === dados.cliente_id)?.nome || "",
      unidade:
        base.campo?.unidades.find((u) => u.id === r.unidade_id)?.nome || "",
      unidade_endereco:
        base.campo?.unidades.find((u) => u.id === r.unidade_id)?.endereco || "",
      equipamentos: r.equipamento_ids.map((id) => {
        const e = base.campo?.equipamentos.find((e) => e.id === id);
        return [e?.tag, e?.marca, e?.modelo, e?.ambiente]
          .filter(Boolean)
          .join(" · ");
      }),
      tecnico:
        base.equipe.find((e) => e.id === dados.responsavel_id)?.nome || "",
    },
  });
}
export function validarTracos(tracos: Tracos) {
  if (!Array.isArray(tracos) || tracos.length < 1 || tracos.length > 32)
    return false;
  let n = 0,
    minX = 1000,
    maxX = 0,
    minY = 1000,
    maxY = 0;
  for (const t of tracos) {
    if (!Array.isArray(t) || t.length < 2) return false;
    for (const ponto of t) {
      if (
        !Array.isArray(ponto) ||
        ponto.length !== 2 ||
        ponto.some((v) => !Number.isInteger(v) || v < 0 || v > 1000)
      )
        return false;
      n++;
      minX = Math.min(minX, ponto[0]);
      maxX = Math.max(maxX, ponto[0]);
      minY = Math.min(minY, ponto[1]);
      maxY = Math.max(maxY, ponto[1]);
    }
  }
  return n >= 6 && n <= 800 && maxX - minX + maxY - minY >= 80;
}
export function criarAssinatura(
  registro: Registro,
  base: Base,
  tracos: Tracos,
): Assinatura {
  if (!validarTracos(tracos))
    throw new Error(
      "Desenhe sua assinatura no espaço indicado. Um toque isolado não é suficiente.",
    );
  const conteudo = conteudoAceite(registro, base);
  if (new TextEncoder().encode(conteudo).length > 35000)
    throw new Error(
      "O relatório está muito extenso para o aceite nesta tela. Reduza os textos e tente novamente.",
    );
  return {
    formato: 1,
    conteudo,
    tracos: structuredClone(tracos),
    capturada_em: new Date().toISOString(),
    termo: TERMO_ACEITE,
  };
}

export function podeColetarAssinatura(d: Dados) {
  if (!d.relatorio) return false;
  return;
  d.estado === "concluida" &&
    !!d.titulo.trim() &&
    !!d.cliente_id &&
    !!d.responsavel_id &&
    !!d.relatorio!.unidade_id &&
    d.relatorio!.equipamento_ids.length > 0 &&
    !!d.relatorio!.executada_em &&
    !!d.resultado?.trim() &&
    !!d.checklist?.length &&
    d.checklist.every((c) => c.feito) &&
    d.relatorio!.ciencia.situacao === "presente" &&
    d.relatorio!.ciencia.nome.trim().length >= 2 &&
    d.relatorio!.ciencia.confirmada;
}

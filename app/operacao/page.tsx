import { Suspense } from "react";
import { Operacao } from "@/components/ui/Operacao";
import { RegistroUso } from "@/components/RegistroUso";
// Estrutura pública sem dados pessoais; toda leitura e escrita passa pela API autenticada.
export const dynamic = "force-static";
export const metadata = {
  title: "Operação · Prazo Certo",
  robots: { index: false, follow: false },
};
export default function Pagina() {
  return <><Operacao /><Suspense><RegistroUso /></Suspense></>;
}

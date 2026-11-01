import { exigirEmpresa } from "@/lib/contexto";
import { Cabecalho } from "@/components/ui/Cabecalho";
import { ImportarClientes } from "@/components/ui/ImportarClientes";
export default async function Pagina() {
  await exigirEmpresa();
  return (
    <>
      <Cabecalho
        titulo="Importar clientes"
        sub="Comece a organizar sua operação com os cadastros que você já tem."
        voltar={{ href: "/clientes", rotulo: "Clientes" }}
      />
      <ImportarClientes />
    </>
  );
}

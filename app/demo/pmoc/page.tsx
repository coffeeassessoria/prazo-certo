import Link from 'next/link'
import { Download, Building2, FileText } from 'lucide-react'
import { Casca } from '@/components/Casca'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Aviso } from '@/components/ui/Aviso'
import { Selo } from '@/components/ui/Selo'
import { Metrica } from '@/components/ui/Metrica'
import { exemploPmoc } from '@/lib/pmoc-demo'
import { fmtData } from '@/lib/datas'
export const dynamic = 'force-dynamic'
export default function DemoPmoc() {
  const s = exemploPmoc()
  return (
    <Casca
      empresa="ClimaTech (demonstração)"
      email="contato@exemplo.invalid"
      nome="Vanderlei"
      temEmpresa
      superadmin={false}
    >
      <Aviso titulo="PMOC com identidade da sua empresa">
        Dados fictícios. Experimente os cadastros e baixe um exemplo gerado pelo
        mesmo motor de PDF da plataforma.
      </Aviso>
      <Cabecalho
        titulo="PMOC e documentos"
        sub="Clientes, ambientes, equipamentos e manutenção organizados em um só lugar."
        acao={
          <a className="btn" href="/demo/pmoc/pdf">
            <Download size={16} />
            Baixar exemplo em A4
          </a>
        }
      />
      <div className="metricas">
        <Metrica valor={1} rotulo="Cliente" apoio="com unidade cadastrada" />
        <Metrica
          valor={s.ambientes.length}
          rotulo="Ambientes"
          apoio="com área e ocupação"
        />
        <Metrica
          valor={s.equipamentos.length}
          rotulo="Equipamentos"
          apoio="identificados no inventário"
        />
        <Metrica
          valor={s.plano.rotinas.length}
          rotulo="Atividades"
          apoio="periodicidade a definir"
        />
      </div>
      <div className="grade-2">
        <section className="card">
          <h2 className="titulo-icone">
            <Building2 size={18} />
            Clínica Boa Vista · Unidade Centro
          </h2>
          <p className="muted">{s.unidade.endereco}</p>
          <dl className="detalhes">
            <dt>Representante</dt>
            <dd>{s.unidade.representante_nome}</dd>
            <dt>Ambientes</dt>
            <dd>Recepção e administrativo</dd>
            <dt>Equipamentos</dt>
            <dd>AC-01 · AC-02 · AC-03</dd>
            <dt>Próxima revisão</dt>
            <dd>{fmtData(s.plano.revisao_em)} (exemplo)</dd>
          </dl>
          <div className="acoes documento-secao">
            <Link className="btn sec" href="/demo/pmoc/unidade">
              Conferir ambientes e aparelhos
            </Link>
            <Link className="btn sec" href="/demo/pmoc/plano">
              Experimentar edição do plano
            </Link>
          </div>
        </section>
        <section className="card">
          <h2 className="titulo-icone">
            <FileText size={18} />
            Timbrado da prestadora
          </h2>
          <div className="documento-logo-preview">
            <img
              src="/demo/logo-climatech.png"
              alt="Logo fictício da ClimaTech"
            />
          </div>
          <p>
            Cabeçalho com logo proporcional e contatos. Rodapé com versão e
            número da página, em todas as folhas A4.
          </p>
          <Selo peq>PDF com versão preservada</Selo>
          <div className="acoes documento-secao">
            <Link className="btn sec" href="/demo/pmoc/identidade">
              Experimentar envio do logo
            </Link>
          </div>
        </section>
      </div>
      <section className="card documento-secao">
        <h2>Do cadastro ao documento</h2>
        <ol>
          <li>
            Cadastre o cliente, a unidade, os ambientes e os equipamentos.
          </li>
          <li>
            Defina o responsável técnico, atividades, periodicidades e
            orientações.
          </li>
          <li>
            Gere um rascunho para conferência ou prepare a versão revisada para
            assinatura.
          </li>
          <li>
            Registre as execuções e emita novas versões, preservando as
            anteriores.
          </li>
        </ol>
        <p className="muted">
          A geração não assina o documento nem emite ART/TRT. O exemplo segue a
          estrutura inicial do Anexo I da Portaria GM/MS nº 3.523/1998.
        </p>
      </section>
    </Casca>
  )
}

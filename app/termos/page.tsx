import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { LogoMarca } from '@/components/ui/Logo'

export const metadata: Metadata = { title: 'Termos de uso · Prazo Certo' }

/** Termos de uso (públicos). Referenciados na tela de permissão do Google. */
export default function Termos() {
  return (
    <div className="entrada" style={{ alignItems: 'flex-start' }}>
      <div className="card texto-legal" style={{ maxWidth: 760 }}>
        <div className="topo-entrada">
          <LogoMarca grande />
          <div>
            <h1>Termos de uso</h1>
            <p className="sub">Prazo Certo · atualizados em 30 de outubro de 2026</p>
          </div>
        </div>

        <p>O Prazo Certo é um sistema de controle de vencimentos e acompanhamentos oferecido pela Coffee Assessoria, de Sinop-MT, para empresas de serviço técnico. Ao usar o sistema, a empresa e seus usuários concordam com estes termos.</p>

        <h2>Acesso</h2>
        <ul>
          <li>O acesso é criado pela Coffee Assessoria para cada empresa contratante. Cada usuário é responsável pela própria senha.</li>
          <li>A empresa é responsável pelos dados que cadastra e por quem ela autoriza a usar o sistema.</li>
        </ul>

        <h2>Mensalidade</h2>
        <ul>
          <li>O uso é cobrado por mensalidade, no valor e na forma combinados com a Coffee Assessoria.</li>
          <li>Em caso de atraso, o acesso pode ser suspenso até a regularização. Nenhum dado é apagado durante a suspensão.</li>
          <li>A empresa pode cancelar quando quiser, avisando a Coffee Assessoria.</li>
        </ul>

        <h2>Lembretes</h2>
        <p>Os lembretes por e-mail, Google Agenda e WhatsApp são uma ajuda para não perder prazos. Eles dependem de serviços de terceiros (provedores de e-mail, Google, WhatsApp) e da internet. A responsabilidade final por renovar documentos, contratos e manutenções continua sendo da empresa.</p>

        <h2>Dados</h2>
        <p>O tratamento de dados segue a nossa <Link href="/privacidade">política de privacidade</Link> e a LGPD. Cada empresa só vê os próprios dados.</p>

        <h2>Mudanças</h2>
        <p>Estes termos podem ser atualizados. Mudanças importantes serão avisadas por e-mail aos administradores das empresas.</p>

        <h2>Contato</h2>
        <p>Coffee Assessoria · <a href="mailto:lembretes@coffeeassessoria.com.br">lembretes@coffeeassessoria.com.br</a></p>

        <Link href="/login" className="btn sec" style={{ marginTop: 16 }}><ArrowLeft size={16} />Ir para o login</Link>
      </div>
    </div>
  )
}

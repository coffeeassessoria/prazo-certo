import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { LogoMarca } from '@/components/ui/Logo'

export const metadata: Metadata = { title: 'Política de privacidade · Prazo Certo' }

/** Política de privacidade (pública). Exigida pelo Google para a conexão com a Google Agenda. */
export default function Privacidade() {
  return (
    <div className="entrada" style={{ alignItems: 'flex-start' }}>
      <div className="card texto-legal" style={{ maxWidth: 760 }}>
        <div className="topo-entrada">
          <LogoMarca grande />
          <div>
            <h1>Política de privacidade</h1>
            <p className="sub">Prazo Certo · atualizada em 30 de outubro de 2026</p>
          </div>
        </div>

        <p>O Prazo Certo é um sistema de controle de vencimentos (documentos, contratos, manutenções e acompanhamentos) operado pela Coffee Assessoria, de Sinop-MT. Esta página explica quais dados usamos e para quê.</p>

        <h2>Dados que guardamos</h2>
        <ul>
          <li>Nome e e-mail de quem usa o sistema, para o login e o envio de lembretes.</li>
          <li>Dados da empresa cliente: nome, CNPJ, telefone e e-mails que recebem os lembretes.</li>
          <li>O que cada empresa cadastra: clientes, vencimentos, acompanhamentos, observações e documentos anexados.</li>
        </ul>
        <p>Cada empresa só vê os próprios dados. O banco fica no Supabase, em São Paulo, com acesso separado por empresa.</p>

        <h2>Google Agenda</h2>
        <p>Se a empresa conectar a Google Agenda, o Prazo Certo pede permissão apenas para <b>criar, alterar e remover os eventos que ele mesmo cria</b> (escopo <code>calendar.events</code>) e para saber o e-mail da conta conectada. Usamos isso só para colocar na agenda os vencimentos e retornos cadastrados no sistema, com alertas.</p>
        <ul>
          <li>Não lemos, copiamos nem guardamos outros eventos da sua agenda.</li>
          <li>Não vendemos nem compartilhamos dados do Google com terceiros, nem usamos para publicidade.</li>
          <li>Guardamos apenas o token de acesso da conexão, protegido no servidor.</li>
          <li>Você pode desconectar a qualquer momento em Ajustes, ou em <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>. Ao desconectar, apagamos o token.</li>
        </ul>
        <p>O uso de dados recebidos das APIs do Google segue a <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Política de dados do usuário dos serviços de API do Google</a>, incluindo os requisitos de uso limitado.</p>

        <h2>E-mail e WhatsApp</h2>
        <p>Os lembretes são enviados para os e-mails e números que a própria empresa cadastrou. Não enviamos propaganda.</p>

        <h2>Seus direitos</h2>
        <p>Você pode pedir a correção ou a exclusão dos seus dados a qualquer momento, como prevê a LGPD. Quando uma empresa encerra o uso, os dados dela são apagados a pedido.</p>

        <h2>Contato</h2>
        <p>Coffee Assessoria · <a href="mailto:lembretes@coffeeassessoria.com.br">lembretes@coffeeassessoria.com.br</a></p>

        <Link href="/login" className="btn sec" style={{ marginTop: 16 }}><ArrowLeft size={16} />Ir para o login</Link>
      </div>
    </div>
  )
}

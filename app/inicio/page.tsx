import Link from 'next/link'
import type { Metadata } from 'next'
import {
  BellRing, BookOpen, CalendarDays, Camera, Check, ClipboardCheck, ClipboardList, FileSpreadsheet, FileText, LogIn,
  Mail, MessageCircle, PenLine, Receipt, Repeat, Smartphone, Users, WifiOff, Wrench,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { TemaToggle } from '@/components/ui/TemaToggle'
import { Aviso } from '@/components/ui/Aviso'
import { codigoValido, stripeConfigurado } from '@/lib/stripe'

export const metadata: Metadata = {
  title: 'Prazo Certo · PMOC, ordens de serviço e vencimentos para climatização',
  description: 'Lembretes de vencimento, orçamentos, ordens de serviço com fotos e aceite do cliente, relatórios e PMOC em PDF timbrado para empresas de climatização.',
}

const PRECO = process.env.NEXT_PUBLIC_PRECO_MENSAL || '119,90'
const WHATS = process.env.NEXT_PUBLIC_WHATSAPP_VENDAS
const CONTATO = WHATS
  ? `https://wa.me/${WHATS}?text=${encodeURIComponent('Olá! Quero conhecer o Prazo Certo para a minha empresa.')}`
  : 'mailto:lembretes@coffeeassessoria.com.br?subject=Quero%20conhecer%20o%20Prazo%20Certo'

function CtaPrincipal({ grande = true, assinar }: { grande?: boolean; assinar: string | null }) {
  return assinar
    ? <a href={assinar} className={`btn ${grande ? 'grande' : ''}`}><Check size={18} />Assinar por R$ {PRECO}/mês</a>
    : <a href={CONTATO} className={`btn ${grande ? 'grande' : ''}`} target="_blank" rel="noreferrer"><MessageCircle size={18} />Quero usar na minha empresa</a>
}

const GRUPOS = [
  {
    t: 'Prazos', d: 'Nada vence sem aviso.',
    itens: [
      { i: ClipboardList, t: 'Painel por situação', d: 'Vencidos, vencem logo e em dia, separados por cor.' },
      { i: Mail, t: 'E-mail às 7h e Google Agenda', d: 'No prazo de aviso, 7 dias antes, 1 dia antes e no dia.' },
      { i: BellRing, t: 'Demandas e retornos', d: '"Cobrar o orçamento em 3 dias", "voltar para conferir o conserto".' },
      { i: Repeat, t: 'Renovação em 1 toque', d: 'Fecha o vencimento atual e já programa o próximo.' },
    ],
  },
  {
    t: 'Campo', d: 'O técnico registra tudo no celular.',
    itens: [
      { i: ClipboardCheck, t: 'Ordem de serviço com checklist', d: 'Equipamentos atendidos, etapas, medições, peças e pendências.' },
      { i: Camera, t: 'Fotos do atendimento', d: 'Até 20 fotos por OS, otimizadas e privadas da sua empresa.' },
      { i: PenLine, t: 'Aceite do cliente na tela', d: 'O representante confere o resumo e assina com o dedo.' },
      { i: WifiOff, t: 'Funciona sem sinal', d: 'Com o modo offline ativado, a OS é enviada quando a conexão volta.' },
    ],
  },
  {
    t: 'Documentos', d: 'Com a cara da sua empresa.',
    itens: [
      { i: FileText, t: 'PMOC em PDF A4', d: 'Plano por unidade, com ambientes, aparelhos, atividades e versões.' },
      { i: Wrench, t: 'Relatório de manutenção', d: 'PDF com checklist, fotos, recomendações e aceite do cliente.' },
      { i: Receipt, t: 'Orçamento em PDF', d: 'Serviços, materiais, desconto e condições, com o seu logo.' },
      { i: Repeat, t: 'Histórico guardado', d: 'Cada versão e cada relatório ficam preservados como foram emitidos.' },
    ],
  },
  {
    t: 'Gestão', d: 'A empresa inteira no mesmo lugar.',
    itens: [
      { i: Users, t: 'Equipe com acesso próprio', d: 'Cada funcionário entra com o seu login. Cada empresa só vê os próprios dados.' },
      { i: FileSpreadsheet, t: 'Importar clientes', d: 'Traga a sua carteira de uma planilha CSV ou Excel, com prévia antes de salvar.' },
      { i: CalendarDays, t: 'Financeiro básico', d: 'Recebíveis dos orçamentos aprovados, receitas, despesas e baixas.' },
      { i: Smartphone, t: 'No celular e no PC', d: 'Funciona no navegador e pode ser instalado como aplicativo.' },
    ],
  },
]

const CICLO = [
  { n: 1, t: 'Orçamento com a sua marca', d: 'Monte a proposta com serviços e materiais, gere o PDF com o seu logo e agende o retorno para cobrar a aprovação.', img: '/inicio/orcamento.jpg', w: 1187, h: 1290, alt: 'Orçamento de higienização de 12 aparelhos split com total da proposta' },
  { n: 2, t: 'Ordem de serviço no celular', d: 'Aprovou? A OS já nasce preenchida. Em campo, o técnico marca os equipamentos, o checklist e tira as fotos, mesmo sem sinal.', img: '/inicio/os-celular.jpg', w: 780, h: 1688, alt: 'Ordem de serviço no celular com unidade e equipamentos atendidos', celular: true },
  { n: 3, t: 'Aceite do cliente na tela', d: 'Ao concluir, o representante confere o resumo do atendimento e assina com o dedo no próprio celular do técnico.', img: '/inicio/assinatura.jpg', w: 860, h: 747, alt: 'Área de assinatura do cliente com um desenho de assinatura', celular: true },
  { n: 4, t: 'Relatório e PMOC em PDF', d: 'Relatório de manutenção com fotos e o PMOC da unidade em A4, timbrados com os dados da sua empresa.', img: '/inicio/pmoc-pdf.jpg', w: 910, h: 1287, alt: 'Primeira página de um PMOC em PDF com logo e dados da empresa' },
  { n: 5, t: 'Lembrete da próxima vez', d: 'O vencimento do PMOC, do contrato e da próxima manutenção entram no e-mail das 7h e na Google Agenda. A renovação não escapa.', img: '/inicio/email.png', w: 800, h: 1205, alt: 'E-mail diário com vencidos, vencendo e retornos' },
]

const PERGUNTAS = [
  { p: 'Preciso instalar alguma coisa?', r: 'Não. O Prazo Certo funciona no navegador do computador e do celular. Se quiser, adicione à tela inicial do celular e ele abre como um aplicativo.' },
  { p: 'Funciona sem internet?', r: 'A parte de orçamentos, ordens de serviço, demandas e fotos funciona sem sinal depois que você ativa o modo offline no aparelho, com internet. O que for feito offline é enviado quando a conexão volta, com a página aberta. PDFs, importação e financeiro precisam de conexão.' },
  { p: 'Serve só para PMOC?', r: 'Não. Controla tudo que vence (PMOC, ART, laudos, contratos, alvarás, manutenções preventivas) e também orçamentos, ordens de serviço, relatórios e retornos combinados com clientes.' },
  { p: 'O sistema emite ART ou assina o PMOC pelo responsável técnico?', r: 'Não. O sistema organiza e gera o documento do PMOC; a ART/TRT e a assinatura do responsável técnico continuam sendo feitas por ele, nos órgãos competentes.' },
  { p: 'A assinatura do cliente na tela vale como documento?', r: 'É um aceite do atendimento desenhado na tela, guardado junto com o conteúdo da OS, a data e um código de verificação. Não é certificado digital nem verifica a identidade de quem assina.' },
  { p: 'Consigo trazer meus clientes de uma planilha?', r: 'Sim. Importe até 500 clientes de um arquivo CSV ou Excel, com prévia e aviso de erro por linha antes de confirmar.' },
  { p: 'Quantas pessoas da empresa podem usar?', r: 'O administrador cria um acesso para cada funcionário. Todos trabalham na mesma base da empresa; o financeiro fica só para administradores.' },
  { p: 'Meus dados ficam seguros?', r: 'Os dados ficam em servidor no Brasil, separados por empresa: um cliente do sistema nunca vê os dados de outro. Fotos e PDFs são privados. Veja a política de privacidade.' },
  { p: 'Tem fidelidade?', r: 'Não. A mensalidade é mensal e você pode cancelar quando quiser.' },
]

export default async function Inicio({ searchParams }: { searchParams: Promise<{ ref?: string; erro?: string }> }) {
  const sp = await searchParams
  const ref = codigoValido(sp.ref)
  // Stripe configurada: Checkout próprio (com indicação). Senão, link de pagamento avulso, se houver.
  const assinar = stripeConfigurado() ? `/assinar${ref ? `?ref=${ref}` : ''}` : process.env.NEXT_PUBLIC_LINK_ASSINATURA || null
  return (
    <div className="lp">
      <header className="lp-topo">
        <div className="lp-in lp-topo-in">
          <Link href="/" className="marca" aria-label="Prazo Certo"><Logo /></Link>
          <nav className="lp-links" aria-label="Página">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#preco">Preço</a>
            <a href="/guia">Guia do usuário</a>
          </nav>
          <div className="lp-topo-acoes">
            <TemaToggle />
            <Link href="/login" className="btn sec"><LogIn size={16} />Entrar</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-in lp-hero-in">
            <div className="lp-hero-texto">
              <span className="lp-eyebrow">Para empresas de climatização e manutenção</span>
              <h1>Nenhum PMOC vencido. Nenhum serviço sem registro.</h1>
              <p className="lp-sub">
                Lembretes de vencimento, orçamentos, ordens de serviço com fotos e aceite do cliente, e PMOC em PDF com a sua marca.
                Tudo num sistema só, no celular do técnico e no computador do escritório.
              </p>
              <div className="lp-ctas">
                <CtaPrincipal assinar={assinar} />
                <a href="#como-funciona" className="btn sec grande">Ver como funciona</a>
              </div>
              <ul className="lp-garantias">
                <li><Check size={16} aria-hidden />R$ {PRECO} por mês, sem fidelidade</li>
                <li><Check size={16} aria-hidden />Pronto para usar no mesmo dia</li>
              </ul>
            </div>
            <div className="lp-hero-telas" aria-hidden>
              <div className="lp-janela">
                <div className="lp-janela-barra"><i /><i /><i /><span>prazo certo · painel</span></div>
                <img src="/inicio/painel.png" alt="" width={1360} height={796} />
              </div>
              <div className="lp-celular"><img src="/inicio/retornos-celular.png" alt="" width={384} height={748} /></div>
            </div>
          </div>
        </section>

        <section className="lp-faixa">
          <div className="lp-in lp-dores">
            <div>
              <b>PMOC é obrigação</b>
              <p>A Lei 13.589/2018 exige PMOC em ambientes climatizados de uso público e coletivo. Vencido, quem responde é o seu cliente, e o problema volta para você.</p>
            </div>
            <div>
              <b>Planilha não avisa</b>
              <p>Datas espalhadas em planilha, agenda de papel e WhatsApp só aparecem quando alguém lembra de olhar.</p>
            </div>
            <div>
              <b>Serviço sem registro vira discussão</b>
              <p>Sem checklist, foto e aceite do cliente, fica a palavra do técnico contra a do cliente. E a próxima manutenção se perde.</p>
            </div>
          </div>
        </section>

        <section className="lp-secao" id="como-funciona">
          <div className="lp-in">
            <span className="lp-eyebrow">Como funciona</span>
            <h2>Do orçamento à renovação, sem perder nada no caminho</h2>
            <ol className="lp-ciclo">
              {CICLO.map((c) => (
                <li key={c.n} className={c.celular ? 'lp-ciclo-celular' : undefined}>
                  <div className="lp-ciclo-texto">
                    <span className="lp-passo-n">{c.n}</span>
                    <h3>{c.t}</h3>
                    <p>{c.d}</p>
                  </div>
                  <figure className="lp-ciclo-img">
                    <img src={c.img} alt={c.alt} width={c.w} height={c.h} loading="lazy" />
                  </figure>
                </li>
              ))}
            </ol>
            <p className="lp-guia-link"><BookOpen size={18} aria-hidden />Imagens com dados fictícios. Quer ver o passo a passo de cada tela? <a href="/guia">Abra o guia do usuário</a>.</p>
          </div>
        </section>

        <section className="lp-secao lp-alt" id="recursos">
          <div className="lp-in">
            <span className="lp-eyebrow">Recursos</span>
            <h2>Prazos, campo, documentos e gestão num só lugar</h2>
            <div className="lp-grupos">
              {GRUPOS.map((g) => (
                <div key={g.t} className="lp-grupo">
                  <h3>{g.t}</h3>
                  <p className="lp-grupo-d">{g.d}</p>
                  <ul>
                    {g.itens.map(({ i: I, t, d }) => (
                      <li key={t}>
                        <span className="lp-recurso-ico"><I size={18} aria-hidden /></span>
                        <span><b>{t}</b><span>{d}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-secao" id="preco">
          <div className="lp-in lp-preco-in">
            <div>
              {sp.erro === 'assinatura' && <Aviso tipo="erro" titulo="Não foi possível abrir o pagamento">Tente de novo em alguns minutos ou fale com a gente pelo WhatsApp.</Aviso>}
              <span className="lp-eyebrow">Preço</span>
              <h2>Um plano, tudo incluso</h2>
              <p className="lp-sub">Sem taxa de adesão e sem fidelidade. Criamos o seu acesso e você começa no mesmo dia.</p>
              <p className="lp-guia-link"><BookOpen size={18} aria-hidden />Quer ver cada tela antes? <a href="/guia">Abra o guia do usuário</a>.</p>
            </div>
            <div className="lp-preco card">
              <div className="lp-preco-nome">Prazo Certo</div>
              <div className="lp-preco-valor"><span>R$</span>{PRECO}<small>/mês por empresa</small></div>
              <ul>
                {['Vencimentos, lembretes e Google Agenda', 'Orçamentos e ordens de serviço', 'Relatórios com fotos e aceite do cliente', 'PMOC com inventário e PDF timbrado', 'Modo offline para o técnico', 'Financeiro básico e importação de clientes', 'Acesso para a sua equipe'].map((x) => (
                  <li key={x}><Check size={16} aria-hidden />{x}</li>
                ))}
              </ul>
              <CtaPrincipal assinar={assinar} />
              {assinar && <a href={CONTATO} className="btn ghost cheio" target="_blank" rel="noreferrer"><MessageCircle size={16} />Tirar dúvidas antes</a>}
            </div>
          </div>
        </section>

        <section className="lp-secao lp-alt" id="duvidas">
          <div className="lp-in lp-estreito">
            <span className="lp-eyebrow">Dúvidas</span>
            <h2>Perguntas frequentes</h2>
            <div className="lp-faq">
              {PERGUNTAS.map((q) => (
                <details key={q.p}>
                  <summary>{q.p}</summary>
                  <p>{q.r}{q.p.startsWith('Meus dados') && <> <Link href="/privacidade">Política de privacidade</Link>.</>}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-in lp-final-in">
            <FileText size={28} aria-hidden />
            <h2>Seu próximo vencimento já está chegando.</h2>
            <p>Organize hoje os seus clientes e serviços. O primeiro lembrete chega amanhã às 7h.</p>
            <CtaPrincipal assinar={assinar} />
          </div>
        </section>
      </main>

      <footer className="lp-rodape">
        <div className="lp-in lp-rodape-in">
          <Logo />
          <span>Um produto da Coffee Assessoria · Sinop-MT</span>
          <nav aria-label="Rodapé">
            <a href="/guia">Guia do usuário</a>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Termos de uso</Link>
            <Link href="/login">Entrar</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

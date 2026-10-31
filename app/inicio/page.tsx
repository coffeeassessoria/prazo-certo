import Link from 'next/link'
import type { Metadata } from 'next'
import {
  BellRing, BookOpen, CalendarDays, Check, ClipboardList, FileText, LogIn, Mail, MessageCircle, Paperclip,
  Repeat, Smartphone, Users,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { TemaToggle } from '@/components/ui/TemaToggle'

export const metadata: Metadata = {
  title: 'Prazo Certo · Controle de PMOC, laudos, contratos e manutenções',
  description: 'Lembretes automáticos de vencimento de PMOC, ART, laudos, contratos e manutenções para empresas de climatização. Por e-mail e na Google Agenda.',
}

const PRECO = process.env.NEXT_PUBLIC_PRECO_MENSAL || '119,90'
const WHATS = process.env.NEXT_PUBLIC_WHATSAPP_VENDAS
const ASSINAR = process.env.NEXT_PUBLIC_LINK_ASSINATURA
const CONTATO = WHATS
  ? `https://wa.me/${WHATS}?text=${encodeURIComponent('Olá! Quero conhecer o Prazo Certo para a minha empresa.')}`
  : 'mailto:lembretes@coffeeassessoria.com.br?subject=Quero%20conhecer%20o%20Prazo%20Certo'

function CtaPrincipal({ grande = true }: { grande?: boolean }) {
  return ASSINAR
    ? <a href={ASSINAR} className={`btn ${grande ? 'grande' : ''}`}><Check size={18} />Assinar por R$ {PRECO}/mês</a>
    : <a href={CONTATO} className={`btn ${grande ? 'grande' : ''}`} target="_blank" rel="noreferrer"><MessageCircle size={18} />Quero usar na minha empresa</a>
}

const RECURSOS = [
  { i: ClipboardList, t: 'Painel por situação', d: 'Vencidos, vencem logo e em dia, separados por cor. Você abre e já sabe o que resolver hoje.' },
  { i: Mail, t: 'Lembrete por e-mail', d: 'Um resumo às 7h, só quando há algo para fazer: no prazo de aviso, 7 dias antes, 1 dia antes e no dia.' },
  { i: CalendarDays, t: 'Google Agenda', d: 'Cada vencimento vira um evento com alerta no celular. Renovou, o evento se atualiza sozinho.' },
  { i: BellRing, t: 'Acompanhamentos', d: '"Cobrar o orçamento em 3 dias", "voltar para conferir o conserto". Retornos curtos que não caem no esquecimento.' },
  { i: Repeat, t: 'Renovação em 1 toque', d: 'Renovou o PMOC? Um toque fecha o atual e cria o próximo, com a data sugerida pela repetição.' },
  { i: Paperclip, t: 'Documento anexado', d: 'Guarde o PDF ou a foto do laudo junto do vencimento, com o histórico de todas as renovações.' },
  { i: Users, t: 'Equipe junta', d: 'Cada funcionário com o próprio acesso. Cada empresa só vê os próprios dados.' },
  { i: Smartphone, t: 'No celular e no PC', d: 'Funciona no navegador e pode ser instalado na tela inicial do celular, como um aplicativo.' },
]

const PERGUNTAS = [
  { p: 'Preciso instalar alguma coisa?', r: 'Não. O Prazo Certo funciona no navegador do computador e do celular. Se quiser, adicione à tela inicial do celular e ele abre como um aplicativo.' },
  { p: 'Serve só para PMOC?', r: 'Não. Serve para tudo que vence: PMOC, ART, laudos de qualidade do ar, contratos de manutenção, alvarás, manutenções preventivas e retornos combinados com clientes.' },
  { p: 'Quantas pessoas da empresa podem usar?', r: 'O administrador cria um acesso para cada funcionário. Todos veem os mesmos vencimentos da empresa.' },
  { p: 'Meus dados ficam seguros?', r: 'Os dados ficam em servidor no Brasil, separados por empresa: um cliente do sistema nunca vê os dados de outro. Veja a política de privacidade.' },
  { p: 'Tem fidelidade?', r: 'Não. A mensalidade é mensal e você pode cancelar quando quiser.' },
  { p: 'Como começo?', r: 'Fale com a gente. Criamos o seu acesso no mesmo dia; no primeiro login você responde 7 perguntas e já cadastra o primeiro vencimento.' },
]

export default function Inicio() {
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
              <h1>Nenhum PMOC vencido. Nenhum cliente esquecido.</h1>
              <p className="lp-sub">
                O Prazo Certo avisa sua empresa antes de vencer PMOC, ART, laudos, contratos e manutenções dos seus clientes.
                Por e-mail, na Google Agenda e no celular.
              </p>
              <div className="lp-ctas">
                <CtaPrincipal />
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
              <b>Renovação é venda</b>
              <p>Cada PMOC, laudo ou contrato renovado no prazo é um serviço que a sua empresa não deixa escapar.</p>
            </div>
          </div>
        </section>

        <section className="lp-secao" id="como-funciona">
          <div className="lp-in">
            <span className="lp-eyebrow">Como funciona</span>
            <h2>Cadastre uma vez. O sistema lembra por você.</h2>
            <ol className="lp-passos">
              <li>
                <span className="lp-passo-n">1</span>
                <h3>Cadastre em 2 minutos</h3>
                <p>Quatro perguntas: o que vence, de qual cliente, quando vence e quando avisar. Atalhos prontos para PMOC, ART, laudos e manutenções.</p>
              </li>
              <li>
                <span className="lp-passo-n">2</span>
                <h3>Receba o aviso na hora certa</h3>
                <p>Um e-mail-resumo às 7h e o alerta na Google Agenda: no prazo de aviso, 7 dias antes, 1 dia antes e no dia.</p>
              </li>
              <li>
                <span className="lp-passo-n">3</span>
                <h3>Renove em 1 toque</h3>
                <p>Fechou a renovação com o cliente? Um toque fecha o vencimento atual e já programa o próximo.</p>
              </li>
            </ol>
            <div className="lp-prints">
              <figure>
                <img src="/inicio/cadastro.png" alt="Cadastro de vencimento em 4 perguntas" width={1360} height={1389} loading="lazy" />
                <figcaption>O cadastro guiado mostra as datas exatas dos lembretes antes de salvar.</figcaption>
              </figure>
              <figure>
                <img src="/inicio/email.png" alt="Exemplo do e-mail diário de lembretes" width={800} height={1205} loading="lazy" />
                <figcaption>O e-mail das 7h: vencidos, vencendo e retornos do dia.</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="lp-secao lp-alt" id="recursos">
          <div className="lp-in">
            <span className="lp-eyebrow">Recursos</span>
            <h2>Tudo o que a sua empresa precisa para não perder prazo</h2>
            <div className="lp-recursos">
              {RECURSOS.map(({ i: I, t, d }) => (
                <div key={t} className="lp-recurso">
                  <span className="lp-recurso-ico"><I size={20} aria-hidden /></span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-secao" id="preco">
          <div className="lp-in lp-preco-in">
            <div>
              <span className="lp-eyebrow">Preço</span>
              <h2>Um plano, tudo incluso</h2>
              <p className="lp-sub">Sem taxa de adesão e sem fidelidade. Criamos o seu acesso e você começa no mesmo dia.</p>
              <p className="lp-guia-link"><BookOpen size={18} aria-hidden />Quer ver cada tela antes? <a href="/guia">Abra o guia do usuário</a>.</p>
            </div>
            <div className="lp-preco card">
              <div className="lp-preco-nome">Prazo Certo</div>
              <div className="lp-preco-valor"><span>R$</span>{PRECO}<small>/mês por empresa</small></div>
              <ul>
                {['Vencimentos e clientes sem limite', 'Lembretes por e-mail todo dia', 'Google Agenda com alerta no celular', 'Acompanhamentos de retorno', 'Anexos e histórico de renovações', 'Acesso para a sua equipe'].map((x) => (
                  <li key={x}><Check size={16} aria-hidden />{x}</li>
                ))}
              </ul>
              <CtaPrincipal />
              {ASSINAR && <a href={CONTATO} className="btn ghost cheio" target="_blank" rel="noreferrer"><MessageCircle size={16} />Tirar dúvidas antes</a>}
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
            <p>Comece hoje e receba o primeiro lembrete amanhã às 7h.</p>
            <CtaPrincipal />
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

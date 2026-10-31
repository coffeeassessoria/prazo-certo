import Link from 'next/link'
import {
  AlertTriangle, Building2, Calendar, CheckCircle2, Clock3, FileText, History, LayoutDashboard, Plus,
  Search, Settings, ShieldCheck, Upload as IcoUpload, Users, XCircle,
} from 'lucide-react'
import { Casca } from '@/components/Casca'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Metrica } from '@/components/ui/Metrica'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Selo } from '@/components/ui/Selo'
import { Aviso } from '@/components/ui/Aviso'
import { Vazio } from '@/components/ui/Vazio'
import { LogoMarca } from '@/components/ui/Logo'
import { ItemLinha } from '@/components/ItemLinha'
import { InventarioUnidade } from '@/components/ui/InventarioUnidade'
import { IdentidadeForm } from '@/components/ui/IdentidadeForm'
import { PmocForm } from '@/components/ui/PmocForm'
import { exemploPmoc } from '@/lib/pmoc-demo'
import { AcompanhamentoForm } from '@/components/AcompanhamentoForm'
import { hojeISO, somarDias } from '@/lib/datas'
import { DemoModalToast, DemoUpload } from './Interativo'

export const metadata = { title: 'Design System 2.0 · Prazo Certo' }

const CORES: { grupo: string; uso: string; tokens: [string, string][] }[] = [
  { grupo: 'Brand · azul profundo', uso: 'Marca, links e informação; preservado junto ao champanhe', tokens: [['50', 'fundo info'], ['100', 'borda info'], ['300', 'apoio'], ['500', 'apoio'], ['700', 'links e foco'], ['800', 'apoio'], ['900', 'texto escuro']].map(([n, u]) => [`--pc-brand-${n}`, u] as [string, string]) },
  { grupo: 'Destaque · champanhe fosco', uso: 'Ações principais e seleção; texto escuro sobre o botão nos dois temas', tokens: [['--pc-accent', 'ação principal'], ['--pc-accent-hover', 'hover'], ['--pc-accent-active', 'pressionado'], ['--pc-accent-ink', 'texto do botão'], ['--pc-accent-text', 'texto selecionado'], ['--pc-accent-soft', 'fundo selecionado'], ['--pc-accent-border', 'borda selecionada']] },
  { grupo: 'Neutros · leitura longa', uso: 'Superfícies, bordas e texto', tokens: [['0', 'superfície'], ['50', 'hover'], ['100', 'fundo do app'], ['200', 'separador'], ['300', 'borda'], ['400', 'ícone desabilitado'], ['500', 'texto secundário'], ['700', 'título suave'], ['900', 'texto']].map(([n, u]) => [`--pc-neutral-${n}`, u] as [string, string]) },
]

function Secao({ id, titulo, children, sub }: { id: string; titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 80, marginBottom: 48 }}>
      <h2 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, marginBottom: 4 }}>{titulo}</h2>
      {sub && <p className="muted" style={{ marginBottom: 16, maxWidth: '70ch' }}>{sub}</p>}
      {children}
    </section>
  )
}

async function demonstrarDocumento(){'use server';return {ok:true,msg:'Exemplo do catálogo. Nenhum dado foi salvo.'}}

async function demonstrarDemanda() { 'use server'; return { erro: 'Exemplo do catálogo. Nenhum dado foi salvo.' } }

export default function DesignSystem() {
  const hoje = hojeISO()
  return (
    <Casca empresa="Design System 2.0" email="referência para novas telas" temEmpresa={false} superadmin>
      <Cabecalho titulo="Design System 2.0" sub="Catálogo vivo dos componentes do Prazo Certo. Toda tela nova usa estas peças. Guia completo em docs/design-system/README.md." />

      <nav className="chips compactos" style={{ marginBottom: 32 }} aria-label="Seções">
        {[['conceito', 'Conceito'], ['tokens', 'Tokens'], ['componentes', 'Componentes'], ['layout', 'Layout'], ['icones', 'Ícones e logo'], ['voz', 'Tom de voz'], ['documentos', 'Documentos'], ['demandas', 'Demandas'], ['checklist', 'Checklist']].map(([id, r]) => (
          <a key={id} href={`#${id}`} className="chip" style={{ textDecoration: 'none' }}><span className="chip-titulo">{r}</span></a>
        ))}
      </nav>

      <Secao id="documentos" titulo="Timbrado e plano PMOC" sub="Logo proporcional, campos do plano e rotinas editáveis. O PDF usa uma base compartilhada em A4.">
        <div className="documento-form-wrap"><IdentidadeForm acao={demonstrarDocumento} identidade={exemploPmoc().identidade} logoUrl="/demo/logo-climatech.png" />
          <details className="card"><summary>Formulário do plano PMOC</summary><PmocForm acao={demonstrarDocumento} unidades={[{id:'demo',nome:'Unidade de exemplo'}]} unidadePadrao="demo" /></details>
          <details className="card"><summary>Inventário da unidade</summary><InventarioUnidade id="demo" ambientes={exemploPmoc().ambientes} equipamentos={exemploPmoc().equipamentos} salvarAmbiente={demonstrarDocumento} salvarEquipamento={demonstrarDocumento} baseHref="/demo/pmoc/unidade" /></details>
        </div>
      </Secao>

      <Secao id="demandas" titulo="Demandas de climatização" sub="Item com situação, responsável e próxima ação. O prazo do vencimento vinculado é independente do retorno.">
        <div className="lista demanda-grupo"><ItemLinha hoje={hoje} item={{ id:'catalogo', href:'/demo/acompanhamentos/retorno', titulo:'Aprovar troca do compressor', tipo:'acompanhamento', vencimento:hoje, antecedencia_dias:0, status:'ativo', recorrencia_meses:null, cliente_nome:'Hospital Santa Clara', etapa_demanda:'aguardando_cliente', categoria_demanda:'orcamento', responsavel_nome:'Vanderlei', proxima_acao:'Ligar para confirmar a aprovação do orçamento' }} /></div>
        <div className="demanda-form-wrap"><AcompanhamentoForm acao={demonstrarDemanda} clientes={[]} responsaveis={[{ user_id:'exemplo',nome:'Vanderlei' }]} responsavelPadrao="exemplo" /></div>
      </Secao>

      <Secao id="conceito" titulo="Conceito">
        <div className="card">
          <p style={{ fontSize: 18, lineHeight: '32px', maxWidth: '70ch', color: 'var(--pc-text)' }}>
            O Prazo Certo é a ferramenta que tira peso da cabeça do gestor. Visual calmo, sólido e técnico, como um painel de controle de hospital:
            nada pisca, tudo informa. A etiqueta com furo é o coração — transforma data abstrata em objeto físico, fácil de reconhecer em campo.
            Azul profundo é a âncora da marca, neutros para leitura longa e champanhe fosco para ações principais e seleção.
            Vermelho, amarelo e verde continuam reservados aos status.
          </p>
          <div className="grade-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 24 }}>
            {[['Confiável', 'Azul profundo, sem ruído, sem gradiente. Bordas suaves, sombras sutis.'], ['Óbvio', 'Hierarquia forte, toque grande, rótulos que dizem o que fazem. Ícone sempre com texto.'], ['Calmo', 'Muito espaço, pouca cor. A cor fala só quando importa: vencido, vence logo, em dia.']].map(([t, d]) => (
              <div key={t} className="metrica"><span className="metrica-r" style={{ fontSize: 16 }}>{t}</span><span className="muted" style={{ display: 'block', marginTop: 4 }}>{d}</span></div>
            ))}
          </div>
        </div>
      </Secao>

      <Secao id="tokens" titulo="Tokens" sub="Fonte única: styles/tokens.css. Use sempre var(--pc-*). O tema escuro troca os valores automaticamente.">
        <div className="grade">
          {CORES.map((g) => (
            <div key={g.grupo} className="card">
              <div className="card-topo"><h2>{g.grupo}</h2><span className="dica">{g.uso}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12 }}>
                {g.tokens.map(([t, u]) => (
                  <div key={t} style={{ border: '1px solid var(--pc-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ height: 56, background: `var(${t})`, borderBottom: '1px solid var(--pc-border)' }} />
                    <div style={{ padding: 8 }}><div style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>{t.replace('--pc-', '')}</div><div className="dica">{u}</div></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="grade-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {([['vencido', 'Vencido · danger', XCircle], ['atencao', 'Vence logo · warning', Clock3], ['ok', 'Em dia · success', CheckCircle2]] as const).map(([k, t, I]) => (
              <div key={k} className={`aviso ${k === 'vencido' ? 'erro' : k}`} style={{ margin: 0 }}>
                <I size={18} aria-hidden />
                <div><b>{t}</b>Uso exclusivo para status. Nunca decoração. No escuro o fundo também é escuro.</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-topo"><h2>Tipografia · Work Sans</h2><span className="dica">400 · 500 · 600 · 700</span></div>
            {[['xs 12/16', 12, 16, 400], ['sm 14/20', 14, 20, 400], ['base 16/24', 16, 24, 400], ['md 18/28', 18, 28, 400], ['lg 20/28', 20, 28, 600], ['xl 24/32', 24, 32, 600], ['2xl 30/36', 30, 36, 700], ['3xl 36/40', 36, 40, 700]].map(([n, f, l, w]) => (
              <div key={n as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, padding: '10px 0', borderBottom: '1px dashed var(--pc-border)' }}>
                <span style={{ fontSize: f as number, lineHeight: `${l}px`, fontWeight: w as number }}>PMOC do Hospital Santa Clara</span>
                <span className="dica" style={{ whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace' }}>{n}</span>
              </div>
            ))}
          </div>
          <div className="grade-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Espaçamento · base 4</h3>
              {[4, 8, 12, 16, 20, 24, 32, 40, 48, 64].map((n) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span className="dica" style={{ width: 24, fontFamily: 'ui-monospace, monospace' }}>{n}</span>
                  <span style={{ height: 12, width: n * 2, borderRadius: 4, background: 'var(--pc-brand-100)', border: '1px solid var(--pc-brand-300)' }} />
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Raios e sombras</h3>
              <div className="acoes" style={{ gap: 12 }}>
                {[['xs', 6], ['sm', 8], ['md', 12], ['lg', 16], ['xl', 24], ['pill', 999]].map(([n, r]) => (
                  <div key={n} style={{ textAlign: 'center' }}><div style={{ width: 48, height: 48, background: 'var(--pc-surface-2)', border: '1px solid var(--pc-border)', borderRadius: r as number }} /><div className="dica">{n}</div></div>
                ))}
              </div>
              <div className="acoes" style={{ gap: 12, marginTop: 20 }}>
                {['sm', 'md', 'lg'].map((s) => <div key={s} style={{ width: 64, height: 40, borderRadius: 8, background: 'var(--pc-surface)', border: '1px solid var(--pc-border)', boxShadow: `var(--pc-shadow-${s})`, display: 'grid', placeItems: 'center' }} className="dica">{s}</div>)}
              </div>
              <p className="dica" style={{ marginTop: 16 }}>Movimento: 150ms rápido · 250ms base · 350ms lento · cubic-bezier(.16,1,.3,1). Respeita "reduzir movimento".</p>
            </div>
          </div>
        </div>
      </Secao>

      <Secao id="componentes" titulo="Componentes" sub="Estados: padrão, hover, foco com anel, ativo, desabilitado, carregando, erro. Toque mínimo de 44px no celular.">
        <div className="grade">
          <div className="card">
            <div className="card-topo"><h2>Botão</h2><span className="dica">.peq 32px · padrão 40px · .grande 44px · um primário por tela</span></div>
            <div className="acoes">
              <button className="btn">Renovar vencimento</button>
              <button className="btn sec">Concluir sem renovar</button>
              <button className="btn ghost">Cancelar</button>
              <button className="btn perigo">Excluir vencimento</button>
              <button className="btn" disabled>Desabilitado</button>
              <button className="btn" aria-busy="true"><span className="spinner" aria-hidden />Carregando</button>
              <button className="btn sec peq"><Search size={14} />Pequeno</button>
            </div>
            <pre className="pre-codigo" style={{ marginTop: 16 }}>{`<button className="btn">Primário</button>
<button className="btn sec">Secundário</button>   <button className="btn ghost">Ghost</button>
<button className="btn perigo">Perigo</button>     <BotaoEnviar>Salvar</BotaoEnviar>  // com carregando`}</pre>
          </div>

          <div className="card">
            <div className="card-topo"><h2>Campos</h2><span className="dica">label 14 · campo 16px · altura 44</span></div>
            <div className="linha">
              <div>
                <div className="campo"><label htmlFor="ds1">Título do vencimento</label><input id="ds1" placeholder="Ex.: PMOC - Hospital Santa Clara" /><span className="dica">Use um nome que você reconheça em campo.</span></div>
                <div className="campo"><label htmlFor="ds2">Cliente</label><select id="ds2"><option>Frigorífico Boi Bom</option><option>Hospital Santa Clara</option></select></div>
                <div className="campo"><label htmlFor="ds3">Observações</label><textarea id="ds3" placeholder="Detalhes que ajudam o técnico na próxima visita" /></div>
              </div>
              <div>
                <div className="campo com-erro"><label htmlFor="ds4">Data de vencimento</label><input id="ds4" aria-invalid="true" placeholder="Selecione a data" /><span className="erro-campo"><AlertTriangle size={14} aria-hidden />Informe a data de vencimento para continuar</span></div>
                <div className="campo"><label htmlFor="ds5">CNPJ (desabilitado)</label><input id="ds5" disabled defaultValue="12.345.678/0001-90" /></div>
                <label className="check"><input type="checkbox" defaultChecked />Enviar lembretes por e-mail</label>
              </div>
            </div>
          </div>

          <div className="grade-2">
            <div className="card"><div className="card-topo"><h2>Upload de arquivo</h2></div><DemoUpload /></div>
            <div className="card">
              <div className="card-topo"><h2>Card de métrica</h2></div>
              <div className="metricas" style={{ gridTemplateColumns: '1fr 1fr', margin: 0 }}>
                <Metrica ativo tom="vencido" valor={12} rotulo="Vencidos" apoio="3 clientes" />
                <Metrica tom="atencao" valor={8} rotulo="Vencem logo" apoio="em 7 dias" />
                <Metrica tom="ok" valor={47} rotulo="Em dia" apoio="tudo certo" />
                <Metrica valor={67} rotulo="Ativos" apoio="total" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-topo"><h2>Etiqueta de vencimento · componente-assinatura</h2><span className="dica">52×52 · raio 8 · furo 12 · dia 20 + mês 10</span></div>
            <div className="acoes" style={{ gap: 24, alignItems: 'flex-start' }}>
              {([['vencido', -9, 'Vencido'], ['atencao', 3, 'Vence logo'], ['ok', 30, 'Em dia'], ['neutro', 44, 'Padrão'], ['renovado', -40, 'Renovado']] as const).map(([st, d, r]) => (
                <div key={st} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Etiqueta data={somarDias(hoje, d)} status={st} />
                  <Selo peq tom={st === 'renovado' ? 'neutro' : st}>{r}</Selo>
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Etiqueta data={somarDias(hoje, -9)} status="vencido" grande />
                <span className="dica">.grande (detalhe)</span>
              </div>
            </div>
            <pre className="pre-codigo" style={{ marginTop: 16 }}>{`<Etiqueta data="2026-11-09" status="vencido" />   // status: vencido | atencao | ok | neutro | renovado | concluido`}</pre>
          </div>

          <div className="grade-2">
            <div className="card">
              <div className="card-topo"><h2>Item da lista</h2></div>
              <div className="lista">
                <ItemLinha hoje={hoje} item={{ id: 'a', titulo: 'PMOC - Frigorífico Boi Bom', tipo: 'documento', vencimento: somarDias(hoje, -9), antecedencia_dias: 30, status: 'ativo', recorrencia_meses: 12, cliente_nome: 'Frigorífico Boi Bom' }} />
                <ItemLinha hoje={hoje} item={{ id: 'b', titulo: 'Laudo de qualidade do ar', tipo: 'documento', vencimento: somarDias(hoje, 3), antecedencia_dias: 15, status: 'ativo', recorrencia_meses: 6, cliente_nome: 'Hospital Santa Clara' }} />
                <ItemLinha hoje={hoje} item={{ id: 'c', titulo: 'ART - Shopping Center Norte', tipo: 'documento', vencimento: somarDias(hoje, 40), antecedencia_dias: 30, status: 'ativo', recorrencia_meses: 12, cliente_nome: 'Shopping Center Norte' }} />
              </div>
            </div>
            <div className="grade">
              <div className="card">
                <div className="card-topo"><h2>Selo de status</h2></div>
                <div className="acoes"><Selo tom="vencido">Vencido</Selo><Selo tom="atencao">Vence logo</Selo><Selo tom="ok">Em dia</Selo><Selo>Arquivado</Selo><Selo tom="info">Em breve</Selo></div>
              </div>
              <div className="card">
                <div className="card-topo"><h2>Aviso</h2></div>
                <Aviso titulo="Você está no ambiente de demonstração">Todos os dados são fictícios. <Link href="/login">Entrar no sistema</Link></Aviso>
                <Aviso tipo="erro" titulo="Não foi possível salvar">Confira a data de vencimento e tente de novo.</Aviso>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-topo"><h2>Cabeçalho de página</h2><span className="dica">desktop: ação à direita · mobile: ação abaixo, largura total</span></div>
            <div style={{ background: 'var(--pc-surface-2)', border: '1px solid var(--pc-border)', borderRadius: 12, padding: 24 }}>
              <Cabecalho titulo="Vencimentos" subIcone={<Calendar size={14} aria-hidden />} sub="Hoje, 12 de novembro de 2026 • 67 itens ativos" acao={<button className="btn"><Plus size={16} />Novo vencimento</button>} />
            </div>
          </div>

          <div className="grade-2">
            <div className="card">
              <div className="card-topo"><h2>Tabela</h2><span className="dica">cabeçalho 12px · linha 44px</span></div>
              <div className="tabela-wrap">
                <table>
                  <thead><tr><th>Empresa</th><th>Plano</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr><td>ClimaTech Sul</td><td className="sec">Pro • R$149/mês</td><td><Selo peq tom="ok">Ativa</Selo></td></tr>
                    <tr><td>Ar Frio Hospitalar</td><td className="sec">Base • R$79/mês</td><td><Selo peq tom="vencido">Suspensa</Selo></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <Vazio titulo="Nenhum vencimento por aqui" texto="Que bom — ou cadastre o primeiro para começar a controlar.">
              <button className="btn">Cadastrar primeiro vencimento</button>
            </Vazio>
          </div>

          <div className="card">
            <div className="card-topo"><h2>Modal de confirmação e toast</h2></div>
            <DemoModalToast />
          </div>
        </div>
      </Secao>

      <Secao id="layout" titulo="Layout responsivo">
        <div className="grade-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[['Mobile', '< 768px', 'Sem sidebar, padding 16px, barra de abas 72px + safe-area, botão Novo ao centro'], ['Tablet', '768–1024', 'Sidebar vira gaveta, aberta pelo botão de menu no topo'], ['Desktop', '> 1024', 'Sidebar fixa 280px, conteúdo até 1280px, padding 32px'], ['Wide', '> 1280', 'Mesmo layout, grid de 12 colunas com gap 24px']].map(([n, r, d]) => (
            <div key={n} className="metrica"><span className="metrica-r" style={{ fontSize: 15 }}>{n}</span><span className="dica" style={{ display: 'block', color: 'var(--pc-brand-700)', fontFamily: 'ui-monospace, monospace' }}>{r}</span><span className="muted" style={{ display: 'block', marginTop: 8 }}>{d}</span></div>
          ))}
        </div>
      </Secao>

      <Secao id="icones" titulo="Ícones e logo" sub="Lucide, traço 2px. 20px padrão, 16px em meta, 24px na navegação mobile. Sempre acompanhado de texto.">
        <div className="grade-2">
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 12 }}>
              {([[LayoutDashboard, 'Painel'], [Users, 'Clientes'], [FileText, 'Documento'], [Calendar, 'Data'], [Search, 'Busca'], [Settings, 'Ajustes'], [Building2, 'Empresa'], [Clock3, 'Tempo'], [CheckCircle2, 'Em dia'], [AlertTriangle, 'Aviso'], [XCircle, 'Vencido'], [IcoUpload, 'Upload'], [History, 'Histórico'], [ShieldCheck, 'Admin']] as const).map(([I, r]) => (
                <div key={r} className="metrica" style={{ textAlign: 'center', padding: 12 }}><I size={20} aria-hidden /><span className="dica" style={{ display: 'block', marginTop: 6 }}>{r}</span></div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="acoes" style={{ gap: 24 }}>
              <LogoMarca grande />
              <p className="muted" style={{ flex: 1, minWidth: 200 }}>Etiqueta com furo e visto verde. Manter proporção, não rotacionar, visto sempre verde #15803d, sem sombra colorida. Versões: colorida (padrão), mono (PWA) e branca sobre azul.</p>
            </div>
          </div>
        </div>
      </Secao>

      <Secao id="voz" titulo="Tom de voz" sub="Direto, humano, sem tecnicês. Como um supervisor experiente que já viu tudo vencer.">
        <div className="tabela-wrap">
          <table>
            <thead><tr><th>Contexto</th><th>Evitar</th><th>Usar</th></tr></thead>
            <tbody>
              <tr><td>Botões</td><td className="sec">Salvar, Finalizar</td><td>Renovar e criar próximo vencimento · Concluir sem renovar</td></tr>
              <tr><td>Erros</td><td className="sec">Campo obrigatório</td><td>Informe a data de vencimento para continuar</td></tr>
              <tr><td>Vazios</td><td className="sec">Nenhum dado encontrado</td><td>Nenhum vencimento por aqui. Que bom — ou cadastre o primeiro para começar a controlar.</td></tr>
              <tr><td>Toasts</td><td className="sec">Operação realizada com sucesso</td><td>PMOC do Frigorífico Boi Bom renovado. Próximo vencimento em 30/11/2026.</td></tr>
            </tbody>
          </table>
        </div>
      </Secao>

      <Secao id="checklist" titulo="Checklist de qualidade" sub="Toda tela nova passa por esta lista antes de publicar.">
        <ul className="checklist duas">
          {['Contraste AA verificado em todos os textos e status', 'Foco visível com Tab em todos os interativos', 'Alvos de toque com mínimo 44px no mobile', 'Campos com fonte 16px para evitar zoom no iPhone', 'Labels associadas aos inputs (for/id)', 'Estados de erro com texto explicativo, não só cor', 'Loading com aria-busy e texto', 'Safe-area aplicada no topo e nas abas', 'Respeita "reduzir movimento"', 'Cores de status não usadas como decoração', 'Etiqueta com data legível a 1 m de distância', 'Apenas um botão primário por tela', 'Testado no tema claro e no escuro'].map((t, i) => (
            <li key={t} className="checklist-item"><span className="checklist-caixa">{i + 1}</span>{t}</li>
          ))}
        </ul>
      </Secao>
    </Casca>
  )
}

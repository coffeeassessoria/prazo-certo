import Link from 'next/link'
import { Activity, Building2, MonitorSmartphone, Users } from 'lucide-react'
import { exigirSuperadmin } from '@/lib/contexto'
import { createAdminClient } from '@/lib/supabase/admin'
import { TZ, hojeISO, somarDias } from '@/lib/datas'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Metrica } from '@/components/ui/Metrica'
import { Selo } from '@/components/ui/Selo'
import { Vazio } from '@/components/ui/Vazio'

export const dynamic = 'force-dynamic'

const PERIODOS = [7, 30, 90]
const TELAS = ['Painel', 'Novo vencimento', 'Detalhe do vencimento', 'Demandas e retornos', 'Nova demanda', 'Orçamentos e serviços', 'Planos PMOC', 'Unidades e equipamentos', 'Clientes', 'Histórico', 'Ajustes', 'Logo e timbrado']

const dia = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
const quando = (iso?: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
}
const diasDesde = (iso?: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null)

export default async function UsoDoSistema({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  await exigirSuperadmin()
  const sp = await searchParams
  const periodo = PERIODOS.includes(Number(sp.d)) ? Number(sp.d) : 30
  const hoje = hojeISO()
  const inicio = somarDias(hoje, -(periodo - 1))
  const admin = createAdminClient()

  const [{ data: perfis }, { data: empresas }, usuariosAuth, { data: acessosBrutos }] = await Promise.all([
    admin.from('perfis').select('user_id, nome, email, papel, empresa_id, is_superadmin'),
    admin.from('empresas').select('id, nome, ativo, plano'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('acessos').select('user_id, empresa_id, secao, dispositivo, criado_em')
      .gte('criado_em', `${inicio}T00:00:00-04:00`).order('criado_em', { ascending: false }).limit(20000),
  ])

  const donos = new Set((perfis ?? []).filter((p) => p.is_superadmin).map((p) => p.user_id))
  const acessos = (acessosBrutos ?? []).filter((a) => !donos.has(a.user_id))
  const clientes = (perfis ?? []).filter((p) => !p.is_superadmin)
  const nomeEmpresa = new Map((empresas ?? []).map((e) => [e.id, e.nome]))
  const ultimoLogin = new Map((usuariosAuth.data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]))

  // Por usuário
  const porUsuario = new Map<string, { n: number; ultimo: string | null; celular: number }>()
  for (const a of acessos) {
    const u = porUsuario.get(a.user_id) ?? { n: 0, ultimo: null, celular: 0 }
    u.n++
    if (!u.ultimo || a.criado_em > u.ultimo) u.ultimo = a.criado_em
    if (a.dispositivo === 'celular') u.celular++
    porUsuario.set(a.user_id, u)
  }
  const linhasUsuarios = clientes.map((p) => ({ ...p, uso: porUsuario.get(p.user_id), login: ultimoLogin.get(p.user_id) ?? null }))
    .sort((a, b) => (b.uso?.ultimo ?? b.login ?? '').localeCompare(a.uso?.ultimo ?? a.login ?? ''))

  // Telas
  const telas = new Map<string, number>()
  for (const a of acessos) telas.set(a.secao, (telas.get(a.secao) ?? 0) + 1)
  const rankTelas = [...telas.entries()].sort((a, b) => b[1] - a[1])
  const maxTela = rankTelas[0]?.[1] ?? 1
  const naoUsadas = TELAS.filter((t) => !telas.has(t))

  // Por dia
  const porDia = new Map<string, number>()
  for (const a of acessos) { const k = dia(a.criado_em); porDia.set(k, (porDia.get(k) ?? 0) + 1) }
  const dias = Array.from({ length: periodo }, (_, i) => somarDias(inicio, i))
  const maxDia = Math.max(1, ...dias.map((d) => porDia.get(d) ?? 0))

  // Por empresa
  const linhasEmpresas = (empresas ?? []).map((e) => {
    const us = clientes.filter((p) => p.empresa_id === e.id)
    const doEmp = acessos.filter((a) => a.empresa_id === e.id)
    const ativos = new Set(doEmp.map((a) => a.user_id)).size
    return { ...e, usuarios: us.length, ativos, acessos: doEmp.length, ultimo: doEmp[0]?.criado_em ?? null }
  }).sort((a, b) => b.acessos - a.acessos)

  const ativos = new Set(acessos.map((a) => a.user_id)).size
  const celular = acessos.filter((a) => a.dispositivo === 'celular').length
  const pctCelular = acessos.length ? Math.round((celular / acessos.length) * 100) : 0
  const nuncaEntraram = linhasUsuarios.filter((u) => !u.login).length

  return (
    <>
      <Cabecalho
        voltar={{ href: '/admin', rotulo: 'Admin' }}
        titulo="Uso do sistema"
        subIcone={<Activity size={14} aria-hidden />}
        sub={`Últimos ${periodo} dias • sem contar os acessos da Coffee Assessoria`}
      />
      <div className="chips compactos" role="group" aria-label="Período" style={{ marginBottom: 20 }}>
        {PERIODOS.map((d) => (
          <Link key={d} href={`/admin/uso?d=${d}`} className="chip" aria-pressed={d === periodo}><span className="chip-titulo">{d} dias</span></Link>
        ))}
      </div>

      <div className="metricas">
        <Metrica valor={`${ativos} de ${clientes.length}`} rotulo="Usuários ativos" apoio={`abriram o sistema em ${periodo} dias`} />
        <Metrica valor={acessos.length} rotulo="Telas abertas" apoio={`média de ${(acessos.length / periodo).toFixed(1).replace('.', ',')} por dia`} />
        <Metrica valor={`${pctCelular}%`} rotulo="No celular" apoio={`${100 - pctCelular}% no computador`} />
        <Metrica valor={nuncaEntraram} rotulo="Nunca entraram" tom={nuncaEntraram ? 'atencao' : undefined} apoio="acesso criado, sem login" />
      </div>

      {!acessos.length ? (
        <Vazio icone={Activity} titulo="Nenhum acesso registrado neste período"
          texto="O registro começou em 03/11/2026. Os números aparecem assim que os clientes usarem o sistema." />
      ) : (
        <div className="grade-2">
          <div className="card">
            <div className="card-topo"><h2><Activity size={18} aria-hidden />Uso por dia</h2><span className="dica">telas abertas</span></div>
            <div className="uso-dias" role="img" aria-label={`Telas abertas por dia nos últimos ${periodo} dias; máximo de ${maxDia} em um dia`}>
              {dias.map((d) => {
                const n = porDia.get(d) ?? 0
                return <span key={d} className="uso-dia" style={{ height: `${Math.max(n ? 6 : 2, (n / maxDia) * 100)}%` }} title={`${d.slice(8, 10)}/${d.slice(5, 7)}: ${n}`} data-vazio={n ? undefined : ''} />
              })}
            </div>
            <div className="uso-eixo"><span>{inicio.slice(8, 10)}/{inicio.slice(5, 7)}</span><span>máx. {maxDia}/dia</span><span>hoje</span></div>
          </div>

          <div className="card">
            <div className="card-topo"><h2><MonitorSmartphone size={18} aria-hidden />Telas mais usadas</h2></div>
            <ol className="uso-telas">
              {rankTelas.slice(0, 10).map(([t, n]) => (
                <li key={t}>
                  <span className="uso-tela-nome">{t}</span>
                  <span className="uso-barra"><i style={{ width: `${(n / maxTela) * 100}%` }} /></span>
                  <span className="uso-tela-n">{n}</span>
                </li>
              ))}
            </ol>
            {naoUsadas.length > 0 && (
              <p className="dica" style={{ marginTop: 12 }}>Ninguém abriu no período: {naoUsadas.join(', ')}. Vale entender por quê.</p>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-topo"><h2><Users size={18} aria-hidden />Usuários</h2><span className="dica">mais recentes primeiro</span></div>
        <div className="tabela-wrap">
          <table>
            <thead><tr><th>Usuário</th><th>Empresa</th><th>Último login</th><th>Último uso</th><th>Telas no período</th><th>Mais usa</th></tr></thead>
            <tbody>
              {linhasUsuarios.map((u) => {
                const parado = diasDesde(u.uso?.ultimo ?? u.login)
                return (
                  <tr key={u.user_id}>
                    <td><strong style={{ fontWeight: 500 }}>{u.nome}</strong><div className="dica">{u.email}</div></td>
                    <td className="sec">{u.empresa_id ? nomeEmpresa.get(u.empresa_id) ?? '—' : '—'}</td>
                    <td>{u.login ? quando(u.login) : <Selo peq tom="atencao">Nunca entrou</Selo>}</td>
                    <td>{u.uso?.ultimo ? <>{quando(u.uso.ultimo)}{parado != null && parado >= 7 && <div className="dica">parado há {parado} dias</div>}</> : <span className="sec">—</span>}</td>
                    <td className="num">{u.uso?.n ?? 0}</td>
                    <td className="sec">{u.uso ? (u.uso.celular * 2 >= u.uso.n ? 'Celular' : 'Computador') : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-topo"><h2><Building2 size={18} aria-hidden />Empresas</h2></div>
        <div className="tabela-wrap">
          <table>
            <thead><tr><th>Empresa</th><th>Usuários ativos</th><th>Telas no período</th><th>Último uso</th></tr></thead>
            <tbody>
              {linhasEmpresas.map((e) => (
                <tr key={e.id}>
                  <td><strong style={{ fontWeight: 500 }}>{e.nome}</strong>{!e.ativo && <> <Selo peq tom="vencido">Suspensa</Selo></>}{e.plano === 'cortesia' && <> <Selo peq tom="info">Cortesia</Selo></>}</td>
                  <td className="num">{e.ativos} de {e.usuarios}</td>
                  <td className="num">{e.acessos}</td>
                  <td className="sec">{quando(e.ultimo) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

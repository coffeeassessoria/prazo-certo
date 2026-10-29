export default async function SemAcesso({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { motivo } = await searchParams
  return (
    <div className="entrada">
      <div className="card" style={{ textAlign: 'center' }}>
        <img src="/icon-192.png" alt="" />
        <h1>{motivo === 'bloqueado' ? 'Acesso suspenso' : 'Sem empresa vinculada'}</h1>
        <p className="muted">
          {motivo === 'bloqueado'
            ? 'O acesso desta empresa está temporariamente suspenso. Fale com o suporte para regularizar.'
            : 'Seu usuário ainda não está vinculado a uma empresa. Fale com o suporte.'}
        </p>
        <form action="/sair" method="post" style={{ marginTop: 16 }}>
          <button className="btn sec">Sair</button>
        </form>
      </div>
    </div>
  )
}

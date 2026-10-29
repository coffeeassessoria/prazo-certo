/** E-mail de redefinição de senha no padrão visual do DS 2.0 (cores do tema claro). */
export function montarEmailRecuperacao(nome: string | null, link: string, appNome: string) {
  const ola = nome ? `Olá, ${nome.split(' ')[0]}` : 'Olá'
  const assunto = `Redefina sua senha do ${appNome}`
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f5f6;font-family:'Work Sans',Segoe UI,Roboto,Arial,sans-serif;color:#16181d">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border:1px solid #dddfe4;border-radius:16px;padding:28px 24px">
      <div style="font-size:13px;color:#6a7181">${appNome}</div>
      <h1 style="font-size:20px;margin:6px 0 12px">${ola}! Vamos criar uma nova senha</h1>
      <p style="font-size:14px;line-height:22px;color:#6a7181;margin:0 0 20px">Recebemos um pedido para redefinir a senha da sua conta. Toque no botão abaixo para escolher a nova senha. O link vale por 1 hora e só pode ser usado uma vez.</p>
      <a href="${link}" style="display:inline-block;background:#155179;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:6px">Criar nova senha</a>
      <p style="font-size:12px;line-height:18px;color:#6a7181;margin:24px 0 0">Não foi você? Pode ignorar este e-mail: sua senha atual continua valendo.</p>
    </div>
    <p style="font-size:11px;color:#6a7181;text-align:center;margin-top:16px;word-break:break-all">Se o botão não abrir, copie este endereço no navegador:<br>${link}</p>
  </div></body></html>`
  const texto = `${ola}!\n\nPara criar uma nova senha no ${appNome}, abra o link abaixo (vale por 1 hora):\n${link}\n\nNão foi você? Ignore este e-mail.`
  return { assunto, html, texto }
}

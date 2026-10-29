import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const nome = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'
  return {
    name: nome,
    short_name: nome,
    description: 'Vencimentos de documentos, contratos e manutenções',
    start_url: '/',
    display: 'standalone',
    background_color: '#edf2f5',
    theme_color: '#2c4a5e',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

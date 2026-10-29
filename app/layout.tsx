import type { Metadata, Viewport } from 'next'
import '@fontsource/work-sans/400.css'
import '@fontsource/work-sans/500.css'
import '@fontsource/work-sans/600.css'
import './globals.css'

const nome = process.env.NEXT_PUBLIC_APP_NOME || 'Prazo Certo'

export const metadata: Metadata = {
  title: nome,
  description: 'Vencimentos de documentos, contratos e manutenções',
  appleWebApp: { capable: true, title: nome, statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agenda',
  description: 'La tua agenda personale',
  manifest: '/manifest.json',
  themeColor: '#0d1b3e',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Agenda' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}

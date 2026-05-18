import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nine Calls Admin',
  description: 'Plataforma interna de gestão Nine Calls',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" className={`${geist.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body
        className="h-full antialiased"
        suppressHydrationWarning
        style={{
          fontFamily: 'var(--font-geist), system-ui, sans-serif',
          backgroundColor: 'var(--bg-base)',
          color: 'var(--text-primary)',
        }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableColorScheme={false}>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}

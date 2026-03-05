import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { IframeLoggerInit } from '@/components/IframeLoggerInit'
import ErrorBoundary from '@/components/ErrorBoundary'
import { AgentInterceptorProvider } from '@/components/AgentInterceptorProvider'
import { AuthProvider } from '@/lib/auth-context'
import LayoutWrapper from '@/components/LayoutWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Park Sync - NOLA City Park Inventory',
  description: 'Inventory and operations management for New Orleans City Park',
  icons: {
    icon: '/lyzr.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <IframeLoggerInit />
        <ErrorBoundary>
          <AuthProvider>
            <AgentInterceptorProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </AgentInterceptorProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

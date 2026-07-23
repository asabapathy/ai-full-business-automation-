import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Kanavu AI — AI Business Operating System', template: '%s | Kanavu AI' },
  description: 'An AI-powered Business Operating System that runs your business automatically. CRM, Marketing, Finance, Operations — all in one intelligent platform.',
  keywords: ['AI business', 'business automation', 'CRM', 'marketing automation', 'AI receptionist'],
  authors: [{ name: 'Kanavu AI' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Kanavu AI — AI Business Operating System',
    description: 'Let AI run your business. Get more customers, increase revenue, and automate operations.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}

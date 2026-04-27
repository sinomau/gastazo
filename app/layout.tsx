import { Metadata, Viewport } from 'next';
import './globals.css';
import { DM_Sans, Syne } from 'next/font/google';
import { ToastProvider } from '@/lib/ToastContext';
import { QueryProvider } from '@/lib/QueryProvider';
import { ThemeProvider } from '@/lib/ThemeContext';

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300','400','500'], variable: '--font-sans' });
const syne = Syne({ subsets: ['latin'], weight: ['400','600','700','800'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Gastazo',
  description: 'Control de gastos compartidos para parejas',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gastazo',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1a24',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${syne.variable} font-sans bg-bg text-text min-h-screen`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
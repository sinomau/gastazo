'use client'

import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { monthLabel } from '@/types'
import { MonthProvider, useMonth } from '@/lib/MonthContext'
import { useCouple } from '@/lib/useCouple'
import Link from 'next/link'
import { ThemeToggleSimple } from '@/components/ThemeToggle'
import { Menu, X, Home, Wallet, Repeat, CreditCard, BarChart3, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: Home, short: '🏠' },
  { href: '/dashboard/gastos', label: 'Gastos', icon: Wallet, short: '💸' },
  { href: '/dashboard/fijos', label: 'Fijos', icon: Repeat, short: '🔄' },
  { href: '/dashboard/tarjetas', label: 'Tarjetas', icon: CreditCard, short: '💳' },
  { href: '/dashboard/estadisticas', label: 'Stats', icon: BarChart3, short: '📊' },
  { href: '/dashboard/configuracion', label: 'Config', icon: Settings, short: '⚙️' },
]

function Header() {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const { month, setMonth } = useMonth()
  const { soloMode, partnerJoined } = useCouple()
  const [userName, setUserName] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserName(data.user.user_metadata?.name || data.user.email || '')
    })
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (e) {
      console.error('Logout error:', e)
    }
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const monthOptions = []
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    for (let m = 1; m <= 12; m++) {
      const mk = `${year}-${String(m).padStart(2, '0')}`
      monthOptions.push({ value: mk, label: monthLabel(mk) })
    }
  }

  return (
    <>
      <header className="bg-surface border-b border-border sticky top-0 z-50 h-14 flex items-center gap-2 px-3 sm:px-4">
        {/* Logo */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-a inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent-b inline-block -ml-1" />
          <span className="font-display font-extrabold text-sm ml-1.5">Gastazo</span>
        </div>

        {/* Nav Desktop */}
        <nav className="hidden sm:flex gap-1 flex-1 overflow-x-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                pathname === item.href ? 'bg-surface2 text-text' : 'text-muted hover:bg-surface2 hover:text-text'
              }`}
            >
              {item.short} {item.label}
            </Link>
          ))}
        </nav>

        {/* Nav Mobile - Botón menú */}
        <div className="flex sm:hidden flex-1" />

        {/* Selector mes + Acciones */}
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="bg-surface2 border border-border text-text text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer shrink-0 max-w-[100px]"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <ThemeToggleSimple />
          </div>
          <span className="text-xs text-muted hidden lg:block truncate max-w-[120px]">{userName}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-muted hover:text-text bg-surface2 border border-border px-2.5 py-1.5 rounded-lg transition-colors hidden sm:block"
          >
            Salir
          </button>
          {/* Botón menú mobile */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="sm:hidden p-2 text-muted hover:text-text transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-72 bg-surface border-l border-border z-50 sm:hidden flex flex-col">
            {/* Header del drawer */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-display font-bold">Menú</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-muted hover:text-text transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items del menú */}
            <nav className="flex-1 p-4 space-y-1">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-accent-b/10 text-accent-b border border-accent-b/20'
                        : 'text-muted hover:bg-surface2 hover:text-text'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{item.label}</span>
                    {isActive && <span className="ml-auto text-accent-b">●</span>}
                  </Link>
                )
              })}
            </nav>

            {/* Footer del drawer */}
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Tema</span>
                <ThemeToggleSimple />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted truncate">{userName}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-accent-a hover:underline"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MonthProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-5 max-w-screen-xl mx-auto w-full">
          {children}
        </main>
      </div>
    </MonthProvider>
  )
}

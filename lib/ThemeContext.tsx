'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  // Calcular tema resuelto
  const calculateResolvedTheme = (currentTheme: Theme): 'dark' | 'light' => {
    if (currentTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return currentTheme
  }

  // Cargar tema guardado
  useEffect(() => {
    const saved = localStorage.getItem('gastazo-theme') as Theme
    if (saved) {
      setThemeState(saved)
      const resolved = saved === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : saved
      setResolvedTheme(resolved)
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setResolvedTheme(systemDark ? 'dark' : 'light')
    }
    setMounted(true)
  }, [])

  // Aplicar tema al documento
  useEffect(() => {
    if (!mounted) return
    
    const resolved = calculateResolvedTheme(theme)
    setResolvedTheme(resolved)
    
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(resolved)
    
    localStorage.setItem('gastazo-theme', theme)
  }, [theme, mounted])

  // Escuchar cambios en preferencia del sistema
  useEffect(() => {
    if (!mounted || theme !== 'system') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolved = e.matches ? 'dark' : 'light'
      setResolvedTheme(newResolved)
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(newResolved)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setThemeState(newTheme)
  }

  // Prevenir flash de contenido no montado
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

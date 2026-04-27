'use client'

import { useTheme } from '@/lib/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'light' 
            ? 'bg-accent-b text-[#001a1a]' 
            : 'text-muted hover:text-text'
        }`}
        title="Modo claro"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'dark' 
            ? 'bg-accent-b text-[#001a1a]' 
            : 'text-muted hover:text-text'
        }`}
        title="Modo oscuro"
      >
        <Moon size={16} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'system' 
            ? 'bg-accent-b text-[#001a1a]' 
            : 'text-muted hover:text-text'
        }`}
        title="Sistema"
      >
        <Monitor size={16} />
      </button>
    </div>
  )
}

// Versión simple con un solo botón que alterna
export function ThemeToggleSimple() {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-muted hover:text-text transition-colors"
      title={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {resolvedTheme === 'dark' ? (
        <>
          <Sun size={16} className="text-accent-s" />
          <span className="hidden sm:inline">Claro</span>
        </>
      ) : (
        <>
          <Moon size={16} className="text-accent-b" />
          <span className="hidden sm:inline">Oscuro</span>
        </>
      )}
    </button>
  )
}

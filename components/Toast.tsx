'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  id: string
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Pequeño delay para la animación de entrada
    const enterTimeout = setTimeout(() => setIsVisible(true), 10)

    // Auto-cerrar
    const closeTimeout = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, duration)

    return () => {
      clearTimeout(enterTimeout)
      clearTimeout(closeTimeout)
    }
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle size={18} className="text-accent-b" />,
    error: <AlertCircle size={18} className="text-accent-a" />,
    info: <Info size={18} className="text-accent-s" />,
  }

  const bgColors = {
    success: 'bg-accent-b/10 border-accent-b/30',
    error: 'bg-accent-a/10 border-accent-a/30',
    info: 'bg-accent-s/10 border-accent-s/30',
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bgColors[type]} backdrop-blur-sm shadow-lg transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      {icons[type]}
      <span className="text-sm font-medium flex-1">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(onClose, 300)
        }}
        className="text-muted hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

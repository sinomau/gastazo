'use client'

import { createClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('signOut error:', error)
    
    setTimeout(async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })
    }, 300)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1 mb-4">
            <span className="w-4 h-4 rounded-full bg-accent-a inline-block" />
            <span className="w-4 h-4 rounded-full bg-accent-b inline-block -ml-1" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Gastazo</h1>
          <p className="text-muted text-sm mt-2">Control de gastos compartidos</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8">
          {error === 'unauthorized' && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm mb-6">
              Tu cuenta no está autorizada para acceder a esta app.
            </div>
          )}

          <h2 className="font-display font-bold text-lg mb-1">Bienvenidos</h2>
          <p className="text-muted text-sm mb-6">Ingresá con tu cuenta de Google para continuar.</p>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold rounded-xl py-3 px-4 hover:bg-gray-100 transition-colors text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Continuar con Google
          </button>
        </div>

        <p className="text-center text-muted text-xs mt-6">
          Solo usuarios autorizados pueden acceder
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

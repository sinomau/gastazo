'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Step = 'choose' | 'create' | 'solo' | 'join' | 'done_couple' | 'done_solo'

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState<Step>('choose')
  const [userName, setUserName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [googleName, setGoogleName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserEmail(data.user.email || '')
      const name = data.user.user_metadata?.name || ''
      setGoogleName(name)
      setUserName(name)
      setReady(true)
    })
  }, [])

  const handleCreate = async () => {
    if (!userName.trim()) { setError('Ingresá tu nombre'); return }
    setLoading(true); setError('')
    const { data, error: err } = await supabase.rpc('create_couple', {
      user_email: userEmail, user_name: userName.trim(), user_person: 'A',
    })
    if (err || data?.error) { setError(err?.message || data?.error); setLoading(false); return }
    setGeneratedCode(data.invite_code)
    setStep('done_couple')
    setLoading(false)
  }

  const handleSolo = async () => {
    if (!userName.trim()) { setError('Ingresá tu nombre'); return }
    setLoading(true); setError('')
    const { data, error: err } = await supabase.rpc('create_solo', {
      user_email: userEmail, user_name: userName.trim(),
    })
    if (err || data?.error) { setError(err?.message || data?.error); setLoading(false); return }
    setStep('done_solo')
    setLoading(false)
  }

  const handleJoin = async () => {
    if (!userName.trim()) { setError('Ingresá tu nombre'); return }
    if (!inviteCode.trim()) { setError('Ingresá el código'); return }
    setLoading(true); setError('')
    const { data, error: err } = await supabase.rpc('join_couple', {
      user_email: userEmail, user_name: userName.trim(),
      invite_code_input: inviteCode.trim().toUpperCase(),
    })
    if (err || data?.error) { setError(err?.message || data?.error); setLoading(false); return }
    router.push('/dashboard')
  }

  const inputClass = "w-full bg-surface2 border border-border text-text px-3 py-2 rounded-lg text-sm outline-none focus:border-accent-b"
  const btnPrimary = "w-full bg-accent-b text-[#001a1a] font-semibold rounded-xl py-2.5 text-sm hover:opacity-85 transition-opacity disabled:opacity-50"

  // Always render the outer shell identically on server and client
  // Only the inner content changes after mount
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4" suppressHydrationWarning>
      <div suppressHydrationWarning>
        {!ready ? (
          <div className="text-muted text-sm">Cargando…</div>
        ) : (
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-1 mb-3">
                <span className="w-4 h-4 rounded-full bg-accent-a inline-block" />
                <span className="w-4 h-4 rounded-full bg-accent-b inline-block -ml-1" />
              </div>
              <h1 className="font-display text-2xl font-extrabold">Gastazo</h1>
              <p className="text-muted text-sm mt-1">Configurá tu cuenta</p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6">
              {step === 'choose' && (
                <div>
                  <h2 className="font-display font-bold text-lg mb-1">
                    {googleName ? `Hola, ${googleName} 👋` : 'Hola 👋'}
                  </h2>
                  <p className="text-muted text-sm mb-5">¿Cómo querés usar la app?</p>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => { setError(''); setStep('create') }}
                      className="bg-surface2 border border-border hover:border-accent-a rounded-xl p-4 text-left transition-colors">
                      <div className="font-semibold mb-0.5">💑 Usar en pareja</div>
                      <div className="text-xs text-muted">Compartís gastos y balance con tu pareja</div>
                    </button>
                    <button onClick={() => { setError(''); setStep('solo') }}
                      className="bg-surface2 border border-border hover:border-accent-b rounded-xl p-4 text-left transition-colors">
                      <div className="font-semibold mb-0.5">👤 Usar solo</div>
                      <div className="text-xs text-muted">Manejás tus propios gastos. Podés invitar a alguien después.</div>
                    </button>
                    <button onClick={() => { setError(''); setStep('join') }}
                      className="bg-surface2 border border-border hover:border-accent-b rounded-xl p-4 text-left transition-colors">
                      <div className="font-semibold mb-0.5">🔗 Unirme a una pareja</div>
                      <div className="text-xs text-muted">Tu pareja ya creó una cuenta y te dio un código</div>
                    </button>
                  </div>
                </div>
              )}

              {step === 'create' && (
                <div>
                  <button onClick={() => setStep('choose')} className="text-muted text-xs mb-4 hover:text-text transition-colors">← Volver</button>
                  <h2 className="font-display font-bold text-lg mb-1">Crear pareja</h2>
                  <p className="text-muted text-sm mb-5">Vas a ser la <strong className="text-accent-a">Persona A</strong>. Tu pareja va a ser la Persona B.</p>
                  <div className="mb-4">
                    <label className="block text-xs text-muted mb-1.5 font-medium">Tu nombre</label>
                    <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Ej: Mauro" className={inputClass} />
                  </div>
                  {error && <p className="text-accent-a text-xs mb-3">{error}</p>}
                  <button onClick={handleCreate} disabled={loading} className={btnPrimary}>{loading ? 'Creando…' : 'Crear pareja →'}</button>
                </div>
              )}

              {step === 'solo' && (
                <div>
                  <button onClick={() => setStep('choose')} className="text-muted text-xs mb-4 hover:text-text transition-colors">← Volver</button>
                  <h2 className="font-display font-bold text-lg mb-1">Usar solo</h2>
                  <p className="text-muted text-sm mb-5">Vas a poder invitar a alguien desde Configuración cuando quieras.</p>
                  <div className="mb-4">
                    <label className="block text-xs text-muted mb-1.5 font-medium">Tu nombre</label>
                    <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Ej: Mauro" className={inputClass} />
                  </div>
                  {error && <p className="text-accent-a text-xs mb-3">{error}</p>}
                  <button onClick={handleSolo} disabled={loading} className={btnPrimary}>{loading ? 'Creando…' : 'Empezar →'}</button>
                </div>
              )}

              {step === 'join' && (
                <div>
                  <button onClick={() => setStep('choose')} className="text-muted text-xs mb-4 hover:text-text transition-colors">← Volver</button>
                  <h2 className="font-display font-bold text-lg mb-1">Unirme a una pareja</h2>
                  <p className="text-muted text-sm mb-5">Pedile el código de 6 caracteres a tu pareja.</p>
                  <div className="mb-4">
                    <label className="block text-xs text-muted mb-1.5 font-medium">Tu nombre</label>
                    <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Ej: Laura" className={inputClass} />
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs text-muted mb-1.5 font-medium">Código de invitación</label>
                    <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="Ej: ABC-123" maxLength={7}
                      className={`${inputClass} font-display font-bold tracking-widest text-center text-lg uppercase`} />
                  </div>
                  {error && <p className="text-accent-a text-xs mb-3">{error}</p>}
                  <button onClick={handleJoin} disabled={loading} className={btnPrimary}>{loading ? 'Uniéndome…' : 'Unirme →'}</button>
                </div>
              )}

              {step === 'done_couple' && (
                <div className="text-center">
                  <div className="text-4xl mb-3">🎉</div>
                  <h2 className="font-display font-bold text-lg mb-1">¡Pareja creada!</h2>
                  <p className="text-muted text-sm mb-5">Compartí este código con tu pareja:</p>
                  <div className="bg-surface2 border border-accent-b rounded-xl p-4 mb-5">
                    <div className="font-display font-extrabold text-3xl text-accent-b tracking-widest">{generatedCode}</div>
                    <button onClick={() => navigator.clipboard.writeText(generatedCode)} className="text-xs text-muted mt-2 hover:text-text transition-colors">📋 Copiar código</button>
                  </div>
                  <p className="text-xs text-muted mb-5">Tu pareja entra a la app, elige "Unirme" e ingresa este código.</p>
                  <button onClick={() => router.push('/dashboard')} className={btnPrimary}>Ir al dashboard →</button>
                </div>
              )}

              {step === 'done_solo' && (
                <div className="text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <h2 className="font-display font-bold text-lg mb-1">¡Todo listo!</h2>
                  <p className="text-muted text-sm mb-5">Podés invitar a alguien desde Configuración cuando quieras.</p>
                  <button onClick={() => router.push('/dashboard')} className={btnPrimary}>Ir al dashboard →</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

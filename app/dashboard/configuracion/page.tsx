'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useCouple } from '@/lib/useCouple'
import { useMonth } from '@/lib/MonthContext'
import { monthLabel } from '@/types'
import { Copy, Check, UserPlus, DollarSign, Home } from 'lucide-react'

export default function ConfiguracionPage() {
  const supabase = createClient()
  const { coupleId, soloMode, partnerJoined, inviteCode, ready } = useCouple()
  const { month, setMonth } = useMonth()
  const [names, setNames] = useState({ A: '', B: '' })
  const [myName, setMyName] = useState('')
  const [myPerson, setMyPerson] = useState<'A'|'B'>('A')
  const [copied, setCopied] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [saved, setSaved] = useState(false)

  const [salaryA, setSalaryA] = useState('')
  const [salaryB, setSalaryB] = useState('')
  const [savingSalary, setSavingSalary] = useState(false)
  const [salarySaved, setSalarySaved] = useState(false)

  const [rentAmount, setRentAmount] = useState('')
  const [savingRent, setSavingRent] = useState(false)
  const [rentSaved, setRentSaved] = useState(false)

  useEffect(() => {
    if (!coupleId || !ready) return
    supabase.from('config').select('*').eq('couple_id', coupleId).then(({ data: cfg }) => {
      if (cfg) setNames({
        A: cfg.find(r => r.key === 'name_a')?.value || '',
        B: cfg.find(r => r.key === 'name_b')?.value || '',
      })
      setRentAmount(cfg?.find(r => r.key === 'rent_amount')?.value || '')
    })
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: au } = await supabase.from('authorized_users').select('person, name').eq('email', data.user.email).single()
      if (au) { setMyPerson(au.person as 'A'|'B'); setMyName(au.name || '') }
    })
  }, [coupleId, ready])

  useEffect(() => {
    if (!coupleId || !ready) return
    supabase.from('salaries').select('person, amount').eq('couple_id', coupleId).eq('month', month)
      .then(({ data }) => {
        setSalaryA(data?.find(s => s.person === 'A')?.amount?.toString() || '')
        setSalaryB(data?.find(s => s.person === 'B')?.amount?.toString() || '')
      })
  }, [coupleId, ready, month])

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveName = async () => {
    if (!myName.trim() || !coupleId) return
    setSavingName(true)
    const configKey = myPerson === 'A' ? 'name_a' : 'name_b'
    await Promise.all([
      supabase.from('authorized_users').update({ name: myName.trim() }).eq('couple_id', coupleId).eq('person', myPerson),
      supabase.from('config').update({ value: myName.trim() }).eq('couple_id', coupleId).eq('key', configKey),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSavingName(false)
  }

  const saveSalaries = async () => {
    if (!coupleId) return
    setSavingSalary(true)
    const salaries = []
    if (salaryA) salaries.push({ couple_id: coupleId, month, person: 'A', amount: parseFloat(salaryA) })
    if (salaryB) salaries.push({ couple_id: coupleId, month, person: 'B', amount: parseFloat(salaryB) })
    
    for (const s of salaries) {
      await supabase.from('salaries').upsert(s, { onConflict: 'couple_id,month,person' })
    }
    setSalarySaved(true)
    setTimeout(() => setSalarySaved(false), 2000)
    setSavingSalary(false)
  }

  const saveRent = async () => {
    if (!coupleId) return
    setSavingRent(true)
    await supabase.from('config').upsert(
      { couple_id: coupleId, key: 'rent_amount', value: rentAmount },
      { onConflict: 'couple_id,key' }
    )
    setRentSaved(true)
    setTimeout(() => setRentSaved(false), 2000)
    setSavingRent(false)
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const monthOptions = []
  for (let m = 1; m <= 12; m++) {
    const mk = `${currentYear}-${String(m).padStart(2,'0')}`
    monthOptions.push({ value: mk, label: monthLabel(mk) })
  }

  if (!ready) return <div className="text-center py-16 text-muted text-sm animate-pulse">Cargando…</div>

  return (
    <div className="max-w-lg">
      <h1 className="font-display font-bold text-xl mb-6">Configuración</h1>

      {/* My name */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4">
        <h2 className="font-display font-bold text-sm mb-3">Tu nombre</h2>
        <div className="flex gap-2">
          <input value={myName} onChange={e => setMyName(e.target.value)}
            className="flex-1 bg-surface2 border border-border text-text px-3 py-2 rounded-lg text-sm outline-none focus:border-accent-b" />
          <button onClick={saveName} disabled={savingName}
            className="bg-accent-b text-[#001a1a] font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-85 transition-opacity disabled:opacity-50 flex items-center gap-1.5">
            {saved ? <><Check size={13} /> Guardado</> : savingName ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Couple status */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4">
        <h2 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
          <UserPlus size={14} className="text-muted" />
          {soloMode ? 'Invitar a tu pareja' : 'Tu pareja'}
        </h2>

        {partnerJoined ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              <span className="text-sm text-green-400 font-medium">Pareja conectada</span>
            </div>
            <p className="text-xs text-muted">
              {myPerson === 'A' ? names.B || 'Tu pareja' : names.A || 'Tu pareja'} ya está en la app.
              Están viendo los gastos compartidos juntos.
            </p>
          </div>
        ) : (
          <div>
            {soloMode && (
              <p className="text-sm text-muted mb-4">
                Estás usando la app en modo solo. Cuando quieras, podés compartir este código con tu pareja para que se una:
              </p>
            )}
            {!soloMode && (
              <p className="text-sm text-muted mb-4">
                Tu pareja todavía no se unió. Compartile este código:
              </p>
            )}
            <div className="bg-surface2 border border-border rounded-xl p-4 flex items-center justify-between">
              <span className="font-display font-extrabold text-2xl tracking-widest text-accent-b">{inviteCode}</span>
              <button onClick={copyCode} className="flex items-center gap-1.5 text-sm text-muted hover:text-accent-b transition-colors">
                {copied ? <><Check size={14} className="text-accent-b" /> Copiado</> : <><Copy size={14} /> Copiar</>}
              </button>
            </div>
            <p className="text-xs text-muted mt-3">
              Tu pareja entra a la app con Google, elige "Unirme a una pareja" e ingresa este código.
              Cuando se una, se van a habilitar las secciones de gastos personales y compartidos.
            </p>
          </div>
        )}
      </div>

      {/* Couple mode info */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="font-display font-bold text-sm mb-2">Modo actual</h2>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          partnerJoined ? 'bg-accent-b/10 text-accent-b border border-accent-b/20' : 'bg-surface2 border border-border text-muted'
        }`}>
          {partnerJoined ? '💑 Modo pareja' : '👤 Modo solo'}
        </div>
        <p className="text-xs text-muted mt-2">
          {partnerJoined
            ? 'Tenés acceso a gastos personales separados, gastos compartidos y balance.'
            : 'Solo ves tus propios gastos. Las secciones de pareja se habilitan cuando alguien se una con tu código.'}
        </p>
      </div>

      {/* Salaries */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
          <DollarSign size={14} className="text-muted" />
          Sueldos
        </h2>
        
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="w-full bg-surface2 border border-border text-text px-3 py-2 rounded-lg text-sm outline-none focus:border-accent-b mb-4">
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted block mb-1">{names.A || 'Persona A'}</label>
            <input type="number" value={salaryA} onChange={e => setSalaryA(e.target.value)}
              placeholder="0" className="w-full bg-surface2 border border-border text-text px-3 py-2 rounded-lg text-sm outline-none focus:border-accent-a" />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">{names.B || 'Persona B'}</label>
            <input type="number" value={salaryB} onChange={e => setSalaryB(e.target.value)}
              placeholder="0" className="w-full bg-surface2 border border-border text-text px-3 py-2 rounded-lg text-sm outline-none focus:border-accent-b" />
          </div>
        </div>

        <button onClick={saveSalaries} disabled={savingSalary}
          className="w-full bg-accent-b text-[#001a1a] font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-85 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5">
          {salarySaved ? <><Check size={13} /> Guardado</> : savingSalary ? 'Guardando…' : 'Guardar sueldos'}
        </button>
      </div>

      {/* Rent */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
          <Home size={14} className="text-muted" />
          Alquiler mensual
        </h2>
        
        <p className="text-xs text-muted mb-3">
          Configurá el monto total del alquiler. Se divide en 50/50 automáticamente cada mes.
        </p>

        <div className="mb-3">
          <input type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)}
            placeholder="Ej: 300000" className="w-full bg-surface2 border border-border text-text px-3 py-2 rounded-lg text-sm outline-none focus:border-accent-s" />
        </div>

        {rentAmount && (
          <div className="bg-surface2 border border-border rounded-lg p-3 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{names.A || 'Persona A'} paga</span>
              <span className="text-accent-a font-medium">${(parseFloat(rentAmount) / 2).toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted">{names.B || 'Persona B'} paga</span>
              <span className="text-accent-b font-medium">${(parseFloat(rentAmount) / 2).toLocaleString('es-AR')}</span>
            </div>
          </div>
        )}

        <button onClick={saveRent} disabled={savingRent}
          className="w-full bg-accent-s text-[#1a1a00] font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-85 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5">
          {rentSaved ? <><Check size={13} /> Guardado</> : savingRent ? 'Guardando…' : 'Guardar alquiler'}
        </button>
      </div>
    </div>
  )
}

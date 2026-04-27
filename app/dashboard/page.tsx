'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, Gasto, fmt, monthLabel } from '@/types'
import { useMonth } from '@/lib/MonthContext'
import { useCouple } from '@/lib/useCouple'
import { ArrowRightLeft, TrendingUp, Users, CreditCard, Wallet, PiggyBank, Eye } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const supabase = createClient()
  const { month } = useMonth()
  const { coupleId, soloMode, partnerJoined, myPerson, ready } = useCouple()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [names, setNames] = useState({ A: 'Yo', B: 'Pareja' })
  const [sueldoA, setSueldoA] = useState(0)
  const [sueldoB, setSueldoB] = useState(0)
  const [rentAmount, setRentAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'both' | 'mine'>('both')

  const load = useCallback(async (mk: string, cid: string) => {
    setLoading(true)
    const [{ data: g }, { data: c }, { data: cfg }, { data: salaries }] = await Promise.all([
      supabase.from('gastos').select('*, card:cards(*)').eq('couple_id', cid).order('month'),
      supabase.from('cards').select('*').eq('couple_id', cid).order('created_at'),
      supabase.from('config').select('*').eq('couple_id', cid),
      supabase.from('salaries').select('person, amount').eq('month', mk).eq('couple_id', cid),
    ])
    setGastos(g || [])
    setCards(c || [])
    if (cfg) setNames({
      A: cfg.find((r: any) => r.key === 'name_a')?.value || 'Yo',
      B: cfg.find((r: any) => r.key === 'name_b')?.value || 'Pareja',
    })
    const salA = salaries?.find((s: any) => s.person === 'A')?.amount || 0
    const salB = salaries?.find((s: any) => s.person === 'B')?.amount || 0
    const rentCfg = cfg?.find((r: any) => r.key === 'rent_amount')?.value
    setSueldoA(salA)
    setSueldoB(salB)
    setRentAmount(rentCfg ? parseFloat(rentCfg) : 0)
    setLoading(false)
  }, [])

  useEffect(() => { if (ready && coupleId) load(month, coupleId) }, [month, coupleId, ready, load])

  const gastosDelMes = gastos.filter(g => g.month === month)
  const personalA = gastosDelMes.filter(g => g.person === 'A' && !g.shared)
  const personalB = gastosDelMes.filter(g => g.person === 'B' && !g.shared)
  const compartidos = gastosDelMes.filter(g => g.shared)
  
  // El alquiler se configura una vez en configuración, no como gasto
  const rentTotal = rentAmount
  
  const totalMes = gastosDelMes.reduce((s, g) => s + g.monto, 0) + rentTotal
  const sharedOther = compartidos.filter(g => g.category !== 'Alquiler')
  const sharedByA = sharedOther.filter(g => g.person === 'A').reduce((s, g) => s + g.monto, 0)
  const sharedByB = sharedOther.filter(g => g.person === 'B').reduce((s, g) => s + g.monto, 0)
  const sharedTotal = sharedOther.reduce((s, g) => s + g.monto, 0)
  
  const totalA = personalA.reduce((s, g) => s + g.monto, 0) + sharedTotal / 2 + rentTotal / 2
  const totalB = personalB.reduce((s, g) => s + g.monto, 0) + sharedTotal / 2 + rentTotal / 2

  const balance = sharedByA - sharedTotal / 2
  const absBalance = Math.abs(balance)

  const myGastos = viewMode === 'mine' 
    ? gastosDelMes.filter(g => g.person === myPerson)
    : gastos
  const myPersonal = myGastos.filter(g => g.person === myPerson && !g.shared)
  const mySharedTotal = viewMode === 'mine' ? compartidos.reduce((s, g) => s + g.monto, 0) : myGastos.filter(g => g.shared).reduce((s, g) => s + g.monto, 0)
  const myTotal = myPersonal.reduce((s, g) => s + g.monto, 0) + mySharedTotal / 2 + rentTotal / 2
  const mySalary = myPerson === 'A' ?sueldoA :sueldoB
  const myDisponible = mySalary > 0 ? mySalary - myTotal : null

  // ── SOLO MODE ──────────────────────────────────────────────────────────────
  if (soloMode || !partnerJoined) {
    const myCards = cards.filter(c => c.owner === 'A')
    const disponible = sueldoA - totalMes
    
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display font-bold text-xl">Resumen — {monthLabel(month)}</h1>
          {loading && <span className="text-xs text-muted animate-pulse">Cargando…</span>}
        </div>

        {/* Card Principal */}
        <div className="bg-gradient-to-br from-surface to-surface2 border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="text-accent-b" size={20} />
            <span className="text-sm text-muted">Total gastado este mes</span>
          </div>
          <div className="font-display font-bold text-4xl mb-4">${fmt(totalMes)}</div>
          
          {sueldoA > 0 && (
            <>
              <div className="bg-bg rounded-full h-3 mb-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${totalMes > disponible ? 'bg-accent-a' : 'bg-accent-b'}`}
                  style={{ width: `${Math.min((totalMes / disponible) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">{Math.round((totalMes / disponible) * 100)}% de tu ingreso</span>
                <span className={disponible >= 0 ? 'text-accent-b' : 'text-accent-a'}>
                  {disponible >= 0 ? `Te sobran $${fmt(disponible)}` : `Te faltan $${fmt(Math.abs(disponible))}`}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Por categoría */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <h2 className="font-display font-bold text-sm mb-3">Por categoría</h2>
          <div className="space-y-2">
            {Object.entries(gastosDelMes.reduce((acc, g) => { acc[g.category] = (acc[g.category] || 0) + g.monto; return acc }, {} as Record<string, number>))
              .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amount]) => (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-muted">{cat}</span>
                <span className="font-semibold">${fmt(amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Por tarjeta */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="font-display font-bold text-sm mb-3">Por tarjeta</h2>
          {myCards.length === 0 ? <p className="text-sm text-muted">Sin tarjetas</p> : (
            <div className="space-y-2">
              {myCards.map(card => {
                const t = gastosDelMes.filter(g => g.card_id === card.id).reduce((s, g) => s + g.monto, 0)
                return (
                  <div key={card.id} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: card.color }} />
                    <span className="flex-1 text-sm">{card.name}</span>
                    <span className="font-semibold">${fmt(t)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── COUPLE MODE ────────────────────────────────────────────────────────────
  
  // Si está en modo "mío", mostrar vista personal
  if (viewMode === 'mine' && partnerJoined) {
    const color = myPerson === 'A' ? 'text-accent-a' : 'text-accent-b'
    const bgBadge = myPerson === 'A' ? 'bg-accent-a text-[#1a0000]' : 'bg-accent-b text-[#001a1a]'
    const theirPerson = myPerson === 'A' ? 'B' : 'A'
    const theirName = myPerson === 'A' ? names.B : names.A
    const theirSalary = myPerson === 'A' ? sueldoB : sueldoA
    
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display font-bold text-xl">Mi resumen — {monthLabel(month)}</h1>
          {loading && <span className="text-xs text-muted animate-pulse">Cargando…</span>}
        </div>

              {/* Toggle */}
              <div className="flex gap-2 mb-6">
                <button onClick={() => setViewMode('both')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    (viewMode as string) === 'both' ? 'bg-accent-b text-[#001a1a]' : 'bg-surface border border-border text-muted'
                  }`}>
                  Ambos
                </button>
                <button onClick={() => setViewMode('mine')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    (viewMode as string) === 'mine' ? 'bg-accent-b text-[#001a1a]' : 'bg-surface border border-border text-muted'
                  }`}>
                  Solo mí
                </button>
              </div>

        {/* Mi gasto total */}
        <div className="bg-gradient-to-br from-surface to-surface2 border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className={color} size={20} />
            <span className="text-sm text-muted">Mis gastos este mes</span>
          </div>
          <div className="font-display font-bold text-4xl mb-4">${fmt(myTotal)}</div>
          
          {sueldoA > 0 && (
            <>
              <div className="bg-bg rounded-full h-3 mb-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${myTotal > (myDisponible || 0) ? 'bg-accent-a' : 'bg-accent-b'}`}
                  style={{ width: `${Math.min(((myTotal || 0) / mySalary) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">{Math.round(((myTotal || 0) / mySalary) * 100)}% de mi ingreso</span>
                <span className={(myDisponible || 0) >= 0 ? 'text-accent-b' : 'text-accent-a'}>
                  {(myDisponible || 0) >= 0 ? `Me sobran $${fmt(myDisponible || 0)}` : `Me faltan $${fmt(Math.abs(myDisponible || 0))}`}
                </span>
              </div>
            </>
          )}
        </div>

      {/* Mi desglose */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-1">Gastos personales</div>
          <div className={`font-display font-bold text-2xl ${color}`}>${fmt(myPersonal.reduce((s, g) => s + g.monto, 0))}</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-1">Compartidos + alquiler</div>
          <div className="font-display font-bold text-2xl text-accent-s">${fmt(mySharedTotal / 2 + rentTotal / 2)}</div>
        </div>
      </div>

        {/* Mi balance detallado */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <h2 className="font-display font-bold text-sm mb-3">Tu cuenta</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Sueldo</span>
              <span className="font-medium">+${fmt(mySalary)}</span>
            </div>
            {absBalance > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">{theirName} me debe</span>
                <span className="text-accent-b font-medium">+${fmt(absBalance)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">Mis gastos personales</span>
              <span className="font-medium text-accent-a">-${fmt(myPersonal.reduce((s, g) => s + g.monto, 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Mi parte compartidos</span>
              <span className="font-medium text-accent-a">-${fmt(mySharedTotal / 2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Mi parte alquiler</span>
              <span className="font-medium text-accent-a">-${fmt(rentTotal / 2)}</span>
            </div>
            <div className="border-t border-border pt-2 mt-2 flex justify-between">
              <span className="text-muted font-medium">Te queda</span>
              <span className={`font-display font-bold text-xl ${(myDisponible || 0) >= 0 ? 'text-accent-b' : 'text-accent-a'}`}>
                ${fmt(myDisponible || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Mi balance con la pareja */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="font-display font-bold text-sm mb-3">Balance con {theirName}</h2>
          {absBalance < 1 ? (
            <div className="text-center py-2">
              <div className="text-lg">🤝 Estamos mano a mano</div>
            </div>
          ) : myPerson === 'A' ? (
            balance > 0 ? (
              <div className="text-center py-2">
                <div className="text-sm text-muted mb-1">{theirName} me debe</div>
                <div className="font-display font-bold text-3xl text-accent-b">${fmt(absBalance)}</div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="text-sm text-muted mb-1">Le debo a {theirName}</div>
                <div className="font-display font-bold text-3xl text-accent-a">${fmt(absBalance)}</div>
              </div>
            )
          ) : (
            balance < 0 ? (
              <div className="text-center py-2">
                <div className="text-sm text-muted mb-1">{theirName} me debe</div>
                <div className="font-display font-bold text-3xl text-accent-b">${fmt(absBalance)}</div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="text-sm text-muted mb-1">Le debo a {theirName}</div>
                <div className="font-display font-bold text-3xl text-accent-a">${fmt(absBalance)}</div>
              </div>
            )
          )}
        </div>
      </div>
    )
  }

  // ── COUPLE MODE VISTA COMBINADA ────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-bold text-xl">Resumen — {monthLabel(month)}</h1>
        {loading && <span className="text-xs text-muted animate-pulse">Cargando…</span>}
      </div>

      {/* Toggle vista */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('both')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            (viewMode as string) === 'both' ? 'bg-accent-b text-[#001a1a]' : 'bg-surface border border-border text-muted'
          }`}>
          Ambos
        </button>
        <button onClick={() => setViewMode('mine')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            (viewMode as string) === 'mine' ? 'bg-accent-b text-[#001a1a]' : 'bg-surface border border-border text-muted'
          }`}>
          Solo mí
        </button>
      </div>

      {/* Balance Principal - LO MÁS IMPORTANTE */}
      <div className="bg-gradient-to-br from-accent-b/10 to-surface border border-accent-b/30 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="text-accent-b" size={20} />
            <span className="text-sm text-muted">Balance</span>
          </div>
        </div>
        {absBalance < 1 ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">✅</div>
            <div className="font-display font-bold text-xl">¡Están mano a mano!</div>
            <div className="text-sm text-muted mt-1">Ninguno le debe al otro</div>
          </div>
        ) : balance > 0 ? (
          <div className="text-center py-4">
            <div className="text-sm text-muted mb-1">{names.B} le debe a {names.A}</div>
            <div className="font-display font-bold text-4xl text-accent-b">${fmt(absBalance)}</div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-sm text-muted mb-1">{names.A} le debe a {names.B}</div>
            <div className="font-display font-bold text-4xl text-accent-a">${fmt(absBalance)}</div>
          </div>
        )}
      </div>

      {/* Alquiler - siempre dividido en 2 */}
      {rentTotal > 0 && (
        <div className="bg-gradient-to-br from-accent-s/10 to-surface border border-accent-s/30 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">🏠 Alquiler</span>
            </div>
            <span className="font-display font-bold text-lg">${fmt(rentTotal)}</span>
          </div>
          <div className="text-xs text-muted text-center">
            Cada uno aporta <span className="text-accent-s font-medium">${fmt(rentTotal / 2)}</span>
          </div>
        </div>
      )}

      {/* Balance de otros gastos compartidos */}
      {sharedTotal > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <h2 className="font-display font-bold text-sm mb-3">Balance otros compartidos</h2>
          {absBalance < 1 ? (
            <div className="text-center py-2">
              <div className="text-lg">🤝 Mano a mano</div>
            </div>
          ) : balance > 0 ? (
            <div className="text-center py-2">
              <div className="text-sm text-muted mb-1">{names.B} le debe a {names.A}</div>
              <div className="font-display font-bold text-2xl text-accent-b">${fmt(absBalance)}</div>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="text-sm text-muted mb-1">{names.A} le debe a {names.B}</div>
              <div className="font-display font-bold text-2xl text-accent-a">${fmt(absBalance)}</div>
            </div>
          )}
        </div>
      )}

      {/* Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-1">Total pareja</div>
          <div className="font-display font-bold text-2xl">${fmt(totalMes)}</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-xs text-muted mb-1">Compartido</div>
          <div className="font-display font-bold text-2xl text-accent-s">${fmt(sharedTotal)}</div>
        </div>
      </div>

      {/* Por persona */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {(['A', 'B'] as const).map(person => {
          const pGastos = person === 'A' ? personalA : personalB
          const pCards = cards.filter(c => c.owner === person)
          const color = person === 'A' ? 'text-accent-a' : 'text-accent-b'
          const bgBadge = person === 'A' ? 'bg-accent-a text-[#1a0000]' : 'bg-accent-b text-[#001a1a]'
          const salary = person === 'A' ? sueldoA : sueldoB
          const disponible = salary > 0 ? salary - (person === 'A' ? totalA : totalB) : null
          
          const personalTotal = pGastos.reduce((s, g) => s + g.monto, 0)
          const sharedPorcion = sharedTotal / 2
          const rentPorcion = rentTotal / 2
          
          return (
            <div key={person} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${bgBadge}`}>{names[person]}</span>
              </div>
              <div className={`font-display font-bold text-2xl ${color}`}>${fmt(person === 'A' ? totalA : totalB)}</div>
              <div className="text-xs text-muted mt-1">Gastado</div>
              
              {/* Desglose */}
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Personal</span>
                  <span>${fmt(personalTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Compartido</span>
                  <span>${fmt(sharedPorcion)}</span>
                </div>
                {rentTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">Alquiler</span>
                    <span>${fmt(rentPorcion)}</span>
                  </div>
                )}
              </div>
              
              {disponible !== null && (
                <div className={`text-xs mt-2 ${disponible >= 0 ? 'text-accent-b' : 'text-accent-a'}`}>
                  {disponible >= 0 ? `Le sobra $${fmt(disponible)}` : `Le falta $${fmt(Math.abs(disponible))}`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Detalle compartido */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h2 className="font-display font-bold text-sm mb-3">Gastos Compartidos</h2>
        
        {/* Alquiler siempre 50/50 */}
        {rentTotal > 0 && (
          <div className="mb-4 pb-4 border-b border-border">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted">Alquiler (50/50)</span>
              <span className="font-medium">${fmt(rentTotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">{names.A}</span>
              <span className="text-accent-a">${fmt(rentTotal / 2)}</span>
              <span className="text-muted">{names.B}</span>
              <span className="text-accent-b">${fmt(rentTotal / 2)}</span>
            </div>
          </div>
        )}
        
        {/* Otros compartidos */}
        {sharedTotal > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-center">
                <div className="text-xs text-muted">{names.A} pagó</div>
                <div className="font-display font-bold text-lg text-accent-a">${fmt(sharedByA)}</div>
              </div>
              <div className="text-muted">⇄</div>
              <div className="text-center">
                <div className="text-xs text-muted">{names.B} pagó</div>
                <div className="font-display font-bold text-lg text-accent-b">${fmt(sharedByB)}</div>
              </div>
            </div>
            <div className="text-xs text-muted text-center">Split 50/50</div>
          </>
        )}
        
        {rentTotal === 0 && sharedTotal === 0 && (
          <p className="text-sm text-muted text-center">Sin gastos compartidos este mes</p>
        )}
      </div>
    </div>
  )
}

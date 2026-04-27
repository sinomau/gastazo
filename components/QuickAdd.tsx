'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useCouple } from '@/lib/useCouple'
import { CATEGORIES, Card, uid } from '@/types'
import { Plus, X, Zap } from 'lucide-react'

// Fallback hints if no history yet
const CATEGORY_HINTS: Record<string, string> = {
  'supermercado': 'Supermercado', 'jumbo': 'Supermercado', 'carrefour': 'Supermercado',
  'nafta': 'Transporte', 'ypf': 'Transporte', 'shell': 'Transporte', 'uber': 'Transporte',
  'taxi': 'Transporte', 'peaje': 'Transporte', 'subte': 'Transporte',
  'farmacia': 'Salud', 'doctor': 'Salud', 'médico': 'Salud',
  'restaurant': 'Gastronomía', 'café': 'Gastronomía', 'delivery': 'Gastronomía',
  'netflix': 'Suscripciones', 'spotify': 'Suscripciones', 'disney': 'Suscripciones',
  'gym': 'Deportes', 'gimnasio': 'Deportes',
  'alquiler': 'Vivienda', 'expensas': 'Vivienda',
}

function fallbackCategory(desc: string): string {
  const lower = desc.toLowerCase()
  for (const [keyword, cat] of Object.entries(CATEGORY_HINTS)) {
    if (lower.includes(keyword)) return cat
  }
  return CATEGORIES[0]
}

interface Props {
  onAdded?: () => void
}

export default function QuickAdd({ onAdded }: Props) {
  const supabase = createClient()
  const { coupleId, myPerson, ready } = useCouple()
  const [open, setOpen] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [names, setNames] = useState({ A: 'Yo', B: 'Mi pareja' })
  const [splitMethod, setSplitMethod] = useState('50/50')
  const [splitPctA, setSplitPctA] = useState(50)
  const [splitPctB, setSplitPctB] = useState(50)

  // Historical descriptions: [{ descripcion, category }]
  const [history, setHistory] = useState<{ descripcion: string; category: string }[]>([])

  // Form
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [cardId, setCardId] = useState('')
  const [shared, setShared] = useState(false)
  const [splitOverride, setSplitOverride] = useState<string | null>(null)
  const [cuotasExpanded, setCuotasExpanded] = useState(false)
  const [cuotasTotal, setCuotasTotal] = useState("1")
  const [saving, setSaving] = useState(false)
  const cuotas = parseInt(cuotasTotal) || 1
  const montoNum = parseFloat(monto) || 0
  const montoCuota = cuotas > 1 ? montoNum / cuotas : montoNum
  const [suggestions, setSuggestions] = useState<{ descripcion: string; category: string }[]>([])

  const montoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !coupleId) return

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const [{ data: c }, { data: cfg }, { data: couple }] = await Promise.all([
        supabase.from('cards').select('*').eq('couple_id', coupleId).order('created_at'),
        supabase.from('config').select('*').eq('couple_id', coupleId),
        supabase.from('couples').select('split_method, split_pct_a, split_pct_b').eq('id', coupleId).single(),
      ])

      // Load last card + history from user_prefs
      let lastCardId: string | null = null
      if (user?.email) {
        const { data: prefs } = await supabase
          .from('user_prefs').select('last_card_id, quick_categories').eq('email', user.email).maybeSingle()
        lastCardId = prefs?.last_card_id || null
      }

      // Load recent unique descriptions from gastos (couple-wide so both learn from each other)
      const { data: recentGastos } = await supabase
        .from('gastos')
        .select('descripcion, category')
        .eq('couple_id', coupleId)
        .not('descripcion', 'eq', 'Sin descripción')
        .order('fecha', { ascending: false })
        .limit(200)

      // Deduplicate: keep most recent category per description
      const seen = new Map<string, string>()
      for (const g of (recentGastos || [])) {
        const key = g.descripcion.toLowerCase()
        if (!seen.has(key)) seen.set(key, g.category)
      }
      const hist = Array.from(seen.entries()).map(([d, cat]) => ({
        descripcion: (recentGastos || []).find(g => g.descripcion.toLowerCase() === d)?.descripcion || d,
        category: cat,
      }))
      setHistory(hist)

      setCards(c || [])
      if (cfg) setNames({ A: cfg.find((r: any) => r.key === 'name_a')?.value || 'Yo', B: cfg.find((r: any) => r.key === 'name_b')?.value || 'Mi pareja' })
      if (couple) { setSplitMethod(couple.split_method); setSplitPctA(couple.split_pct_a); setSplitPctB(couple.split_pct_b) }

      const myCards = (c || []).filter((card: Card) => card.owner === myPerson)
      const defaultCard = lastCardId && (c || []).find((card: Card) => card.id === lastCardId)
        ? lastCardId
        : myCards[0]?.id || (c || [])[0]?.id || ''
      setCardId(defaultCard)
    }

    fetchData()
    setTimeout(() => montoRef.current?.focus(), 100)
  }, [open, coupleId])

  // Dynamic suggestions: history first, fallback to static hints
  useEffect(() => {
    if (descripcion.length < 2) { setSuggestions([]); return }
    const lower = descripcion.toLowerCase()

    // Search history
    const fromHistory = history
      .filter(h => h.descripcion.toLowerCase().includes(lower) && h.descripcion.toLowerCase() !== lower)
      .slice(0, 4)

    if (fromHistory.length > 0) {
      setSuggestions(fromHistory)
      // Auto-suggest category from most recent match
      setCategory(fromHistory[0].category)
    } else {
      // Fallback to static hints
      const staticMatches = Object.entries(CATEGORY_HINTS)
        .filter(([kw]) => kw.includes(lower))
        .slice(0, 4)
        .map(([kw, cat]) => ({ descripcion: kw.charAt(0).toUpperCase() + kw.slice(1), category: cat }))
      setSuggestions(staticMatches)
      if (staticMatches.length > 0) setCategory(staticMatches[0].category)
      else setCategory(fallbackCategory(descripcion))
    }
  }, [descripcion, history])

  const getSplitLabel = () => {
    const method = splitOverride || splitMethod
    if (method === '50/50') return '50/50'
    if (method === 'percentage') return `${splitPctA}/${splitPctB}`
    if (method === 'per_expense') return 'Manual'
    if (method === 'pool') return 'Fondo común'
    if (method === 'visibility_only') return 'Solo visibilidad'
    return '50/50'
  }

  const handleSave = async () => {
    if (!monto || !cardId || !coupleId) return
    setSaving(true)
    const fecha = new Date().toISOString().split('T')[0]
    const card = cards.find(c => c.id === cardId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('gastos').insert({
      id: uid(), fecha,
      monto: montoCuota,
      descripcion: descripcion || 'Sin descripción',
      category,
      card_id: cardId,
      person: card?.owner || myPerson,
      shared,
      split_override: shared ? (splitOverride || null) : null,
      cuotas_total: cuotas, cuota_actual: 1, purchase_id: uid(),
      month: fecha.substring(0, 7),
      from_fijo: false,
      couple_id: coupleId,
      tags: [],
      comment: '',
    })

    // Save last card preference
    if (user) {
      await supabase.from('user_prefs').upsert({
        email: user.email,
        couple_id: coupleId,
        last_card_id: cardId,
        updated_at: new Date().toISOString(),
      })
    }

    setMonto('')
    setDescripcion('')
    setShared(false)
    setSplitOverride(null)
    setSaving(false)
    setOpen(false)
    onAdded?.()
  }

  const myCards = cards.filter(c => c.owner === myPerson)
  const allCards = [...myCards, ...cards.filter(c => c.owner !== myPerson)]

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
      )}

      {/* Quick Add Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[340px] bg-surface border border-border rounded-2xl shadow-2xl p-5 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-base flex items-center gap-2">
              <Zap size={15} className="text-accent-s" /> Registro rápido
            </h3>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-white transition-colors"><X size={16} /></button>
          </div>

          {/* Monto — big input */}
          <div className="mb-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-display text-xl">$</span>
              <input
                ref={montoRef}
                type="number" value={monto} onChange={e => setMonto(e.target.value)}
                placeholder="0"
                className="w-full bg-surface2 border border-border text-white pl-8 pr-3 py-3 rounded-xl font-display font-bold text-2xl outline-none focus:border-accent-b"
              />
            </div>
          </div>

          {/* Description with suggestions */}
          <div className="mb-3 relative">
            <input
              type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción (opcional)"
              className="w-full bg-surface2 border border-border text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-accent-b"
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg overflow-hidden z-10">
                {suggestions.map(s => (
                  <button key={s.descripcion} onClick={() => { setDescripcion(s.descripcion); setCategory(s.category); setSuggestions([]) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface2 transition-colors flex items-center justify-between">
                    <span>{s.descripcion}</span>
                    <span className="text-xs text-muted">{s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category — auto suggested */}
          <div className="mb-3">
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.slice(0, 6).map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${category === cat ? 'bg-accent-b text-[#001a1a] font-semibold' : 'bg-surface2 border border-border text-muted hover:text-white'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Card selector */}
          <div className="mb-3">
            <div className="flex gap-1.5 flex-wrap">
              {allCards.map(card => (
                <button key={card.id} onClick={() => setCardId(card.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${cardId === card.id ? 'bg-surface2 border border-accent-b text-white' : 'bg-surface2 border border-border text-muted hover:text-white'}`}>
                  <span className="w-2 h-2 rounded-full" style={{ background: card.color }} />
                  {card.name}
                  {card.owner !== myPerson && <span className="text-muted">(pareja)</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Cuotas — collapsed by default */}
          <div className="mb-3">
            <button
              onClick={() => setCuotasExpanded(e => !e)}
              className="flex items-center gap-2 text-xs text-muted hover:text-white transition-colors w-full"
            >
              <span className={`transition-transform ${cuotasExpanded ? 'rotate-90' : ''}`}>▶</span>
              <span>Cuotas</span>
              {cuotas > 1 && (
                <span className="ml-auto bg-accent-b/20 text-accent-b border border-accent-b/30 px-2 py-0.5 rounded-full font-semibold">
                  {cuotas}x · ${(montoCuota).toLocaleString('es-AR', { maximumFractionDigits: 0 })} c/u
                </span>
              )}
            </button>
            {cuotasExpanded && (
              <div className="mt-2 bg-surface2 border border-border rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted shrink-0">Cantidad</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {[1, 2, 3, 6, 9, 12, 18, 24].map(n => (
                      <button key={n} onClick={() => setCuotasTotal(String(n))}
                        className={`w-9 h-9 rounded-lg text-sm font-display font-bold transition-colors ${cuotas === n ? 'bg-accent-b text-[#001a1a]' : 'bg-surface border border-border text-muted hover:text-white'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                {cuotas > 1 && montoNum > 0 && (
                  <div className="mt-2.5 flex justify-between text-xs">
                    <span className="text-muted">{cuotas} cuotas de</span>
                    <span className="font-display font-bold text-accent-b">${(montoCuota).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                    <span className="text-muted">= ${montoNum.toLocaleString('es-AR', { maximumFractionDigits: 0 })} total</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shared toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div onClick={() => setShared(s => !s)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${shared ? 'bg-accent-s' : 'bg-surface2 border border-border'}`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${shared ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm">Compartido</span>
              {shared && <span className="text-xs text-muted">({getSplitLabel()})</span>}
            </label>

            {/* Split override when shared */}
            {shared && splitMethod !== '50/50' && (
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {[null, '50/50', 'percentage'].map(opt => (
                  <button key={String(opt)} onClick={() => setSplitOverride(opt)}
                    className={`px-2 py-1 rounded-lg text-xs transition-colors ${splitOverride === opt ? 'bg-accent-b/20 border border-accent-b text-accent-b' : 'bg-surface2 border border-border text-muted hover:text-white'}`}>
                    {opt === null ? 'Default' : opt === '50/50' ? '50/50' : `${splitPctA}/${splitPctB}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSave} disabled={saving || !monto}
            className="w-full bg-accent-b text-[#001a1a] font-semibold rounded-xl py-2.5 text-sm hover:opacity-85 transition-opacity disabled:opacity-40">
            {saving ? 'Guardando…' : '+ Agregar gasto'}
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 ${open ? 'bg-surface2 border border-border rotate-45' : 'bg-accent-b hover:scale-110'}`}
      >
        <Plus size={24} className={open ? 'text-white' : 'text-[#001a1a]'} strokeWidth={2.5} />
      </button>
    </>
  )
}

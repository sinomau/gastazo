'use client'

import { useEffect, useState, useCallback, Fragment, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, Gasto, CATEGORIES, fmt, uid } from '@/types'
import { useMonth } from '@/lib/MonthContext'
import { useCouple } from '@/lib/useCouple'
import GastoModal, { GastoFormData } from '@/components/GastoModal'
import { Btn } from '@/components/FormComponents'
import { MobileGastoCard } from '@/components/MobileGastoCard'
import { Plus, Trash2, Search, Pencil, MessageSquare, Filter, X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { useToast } from '@/lib/ToastContext'

interface FilterChip {
  id: string
  label: string
  type: 'search' | 'card' | 'category' | 'person' | 'tag' | 'amount' | 'date'
  onRemove: () => void
}

interface PresetFilter {
  id: string
  name: string
  filters: Partial<FilterState>
}

interface FilterState {
  search: string
  filterCard: string
  filterCategories: string[]
  filterPerson: '' | 'A' | 'B'
  filterTag: string
  filterShared: 'all' | 'shared' | 'personal'
  minAmount: string
  maxAmount: string
  dateFrom: string
  dateTo: string
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  filterCard: '',
  filterCategories: [],
  filterPerson: '',
  filterTag: '',
  filterShared: 'all',
  minAmount: '',
  maxAmount: '',
  dateFrom: '',
  dateTo: '',
}

const PRESETS: PresetFilter[] = [
  { id: 'alto', name: '💰 Gastos altos (> $50k)', filters: { minAmount: '50000' } },
  { id: 'compartidos', name: '🤝 Solo compartidos', filters: { filterShared: 'shared' } },
  { id: 'personales', name: '👤 Solo personales', filters: { filterShared: 'personal' } },
  { id: 'personal-a', name: 'Persona A', filters: { filterPerson: 'A' } },
  { id: 'personal-b', name: 'Persona B', filters: { filterPerson: 'B' } },
]

export default function GastosPage() {
  const supabase = createClient()
  const { showError, showSuccess } = useToast()
  const { month } = useMonth()
  const { coupleId, ready } = useCouple()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [names, setNames] = useState({ A: 'Persona A', B: 'Persona B' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Filters state
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [tempCategory, setTempCategory] = useState('')

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const addCategory = () => {
    if (tempCategory && !filters.filterCategories.includes(tempCategory)) {
      setFilters(prev => ({ ...prev, filterCategories: [...prev.filterCategories, tempCategory] }))
      setTempCategory('')
    }
  }

  const removeCategory = (cat: string) => {
    setFilters(prev => ({ ...prev, filterCategories: prev.filterCategories.filter(c => c !== cat) }))
  }

  const clearFilters = () => setFilters(DEFAULT_FILTERS)

const applyPreset = (preset: PresetFilter) => {
  setFilters({ ...DEFAULT_FILTERS, ...preset.filters })
}

  const load = useCallback(async (mk: string, cid: string) => {
    setLoading(true)
    const [{ data: g }, { data: c }, { data: cfg }] = await Promise.all([
      supabase.from('gastos').select('*, card:cards(*)').eq('couple_id', cid).order('fecha', { ascending: false }),
      supabase.from('cards').select('*').eq('couple_id', cid).order('created_at'),
      supabase.from('config').select('*').eq('couple_id', cid),
    ])
    setGastos(g || [])
    setCards(c || [])
    if (cfg) setNames({
      A: cfg.find(r => r.key === 'name_a')?.value || 'Persona A',
      B: cfg.find(r => r.key === 'name_b')?.value || 'Persona B',
    })
    setLoading(false)
  }, [])

  useEffect(() => { if (ready && coupleId) load(month, coupleId) }, [month, coupleId, ready, load])

  // Filter gastos by selected month (client-side after loading all)
  const gastosFiltrados = gastos.filter(g => g.month === month)

  const openAdd = () => { setEditingGasto(null); setModalOpen(true) }
  const openEdit = (g: Gasto) => { setEditingGasto(g); setModalOpen(true) }

  const saveGasto = async (data: GastoFormData) => {
    if (!coupleId) return
    setSaving(true)

    const mesInicio = parseInt(data.fecha.substring(5, 7))
    const anioInicio = parseInt(data.fecha.substring(0, 4))
    const purchaseId = uid()

    if (data.cuotas_total > 1) {
      if (editingGasto?.purchase_id) {
        await supabase.from('gastos').delete().eq('purchase_id', editingGasto.purchase_id)
      }
      const cuotaInicial = data.cuota_actual || 1
      const cuotasRestantes = data.cuotas_total - cuotaInicial + 1
      const gastosACrear = []
      for (let i = 0; i < cuotasRestantes; i++) {
        let mes = mesInicio + i
        let anio = anioInicio
        while (mes > 12) { mes -= 12; anio += 1 }
        const fechaCuota = `${anio}-${String(mes).padStart(2, '0')}-01`

        gastosACrear.push({
          id: uid(),
          fecha: fechaCuota,
          monto: data.montoCuota,
          descripcion: data.descripcion,
          category: data.category,
          card_id: data.card_id,
          person: data.person,
          shared: data.shared,
          cuotas_total: data.cuotas_total,
          cuota_actual: cuotaInicial + i,
          month: `${anio}-${String(mes).padStart(2, '0')}`,
          from_fijo: false,
          couple_id: coupleId,
          purchase_id: purchaseId,
          comment: data.comment || '',
          tags: data.tags || [],
        })
      }

      const { error } = await supabase.from('gastos').insert(gastosACrear)
      if (!error) {
        await load(month, coupleId)
        setModalOpen(false)
        showSuccess('Gasto guardado correctamente')
      } else {
        showError('Error: ' + error.message)
      }
    } else {
      const payload = {
        fecha: data.fecha,
        monto: data.montoCuota,
        descripcion: data.descripcion,
        category: data.category,
        card_id: data.card_id,
        person: data.person,
        shared: data.shared,
        cuotas_total: 1,
        cuota_actual: 1,
        month: data.fecha.substring(0, 7),
        comment: data.comment || '',
        tags: data.tags || [],
      }

      if (editingGasto) {
        const { error } = await supabase.from('gastos').update(payload).eq('id', editingGasto.id)
        if (!error) {
          await load(month, coupleId)
          setModalOpen(false)
          showSuccess('Gasto actualizado correctamente')
        } else {
          showError('Error: ' + error.message)
        }
      } else {
        const { error } = await supabase.from('gastos').insert({
          id: uid(), ...payload,
          purchase_id: purchaseId, from_fijo: false, couple_id: coupleId,
        })
        if (!error) {
          await load(month, coupleId)
          setModalOpen(false)
          showSuccess('Gasto guardado correctamente')
        } else {
          showError('Error: ' + error.message)
        }
      }
    }
    setSaving(false)
  }

  const deleteGasto = async (gasto: Gasto) => {
    if (!confirm('¿Eliminar este gasto?')) return
    if (gasto.purchase_id) {
      const { error } = await supabase.from('gastos').delete().eq('purchase_id', gasto.purchase_id)
      if (!error) {
        setGastos(g => g.filter(x => x.purchase_id !== gasto.purchase_id))
        showSuccess('Gasto eliminado')
      } else {
        showError('Error: ' + error.message)
      }
    } else {
      const { error } = await supabase.from('gastos').delete().eq('id', gasto.id)
      if (!error) {
        setGastos(g => g.filter(x => x.id !== gasto.id))
        showSuccess('Gasto eliminado')
      } else {
        showError('Error: ' + error.message)
      }
    }
  }

  // All unique tags for filter (from all gastos, not just filtered)
  const allTags = useMemo(() => Array.from(new Set(gastos.flatMap(g => g.tags || []))), [gastos])

  // Apply all filters
  const filtered = gastosFiltrados.filter(g => {
    // Search (description or comment)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesDesc = g.descripcion.toLowerCase().includes(searchLower)
      const matchesComment = (g.comment || '').toLowerCase().includes(searchLower)
      const matchesTag = (g.tags || []).some(t => t.toLowerCase().includes(searchLower))
      if (!matchesDesc && !matchesComment && !matchesTag) return false
    }
    
    // Card
    if (filters.filterCard && g.card_id !== filters.filterCard) return false
    
    // Categories (OR logic - any selected category matches)
    if (filters.filterCategories.length > 0 && !filters.filterCategories.includes(g.category)) return false
    
    // Person
    if (filters.filterPerson && g.person !== filters.filterPerson) return false

    // Shared (compartido/personal)
    if (filters.filterShared === 'shared' && !g.shared) return false
    if (filters.filterShared === 'personal' && g.shared) return false

    // Tag
    if (filters.filterTag && !(g.tags || []).includes(filters.filterTag)) return false
    
    // Amount range
    if (filters.minAmount && g.monto < parseFloat(filters.minAmount)) return false
    if (filters.maxAmount && g.monto > parseFloat(filters.maxAmount)) return false
    
    // Date range
    if (filters.dateFrom && g.fecha < filters.dateFrom) return false
    if (filters.dateTo && g.fecha > filters.dateTo) return false
    
    return true
  })

const activeFiltersCount = Object.entries(filters).filter(([k, v]) => {
  if (k === 'filterCategories') return (v as string[]).length > 0
  if (k === 'filterShared') return v !== 'all'
  return v !== '' && v !== 'filterCategories'
}).length

// Build chips
const chips: FilterChip[] = []
if (filters.search) chips.push({ id: 'search', label: `🔍 "${filters.search}"`, type: 'search', onRemove: () => updateFilter('search', '') })
if (filters.filterCard) {
  const cardName = cards.find(c => c.id === filters.filterCard)?.name || 'Tarjeta'
  chips.push({ id: 'card', label: `💳 ${cardName}`, type: 'card', onRemove: () => updateFilter('filterCard', '') })
}
filters.filterCategories.forEach(cat => {
  chips.push({ id: `cat-${cat}`, label: `📁 ${cat}`, type: 'category', onRemove: () => removeCategory(cat) })
})
if (filters.filterPerson) chips.push({ id: 'person', label: `👤 ${names[filters.filterPerson]}`, type: 'person', onRemove: () => updateFilter('filterPerson', '') })
if (filters.filterShared === 'shared') chips.push({ id: 'shared', label: '🤝 Compartidos', type: 'search', onRemove: () => updateFilter('filterShared', 'all') })
if (filters.filterShared === 'personal') chips.push({ id: 'personal', label: '👤 Personales', type: 'search', onRemove: () => updateFilter('filterShared', 'all') })
if (filters.filterTag) chips.push({ id: 'tag', label: `🏷️ #${filters.filterTag}`, type: 'tag', onRemove: () => updateFilter('filterTag', '') })
if (filters.minAmount || filters.maxAmount) {
  const min = filters.minAmount ? `$${fmt(parseFloat(filters.minAmount))}` : '$0'
  const max = filters.maxAmount ? `$${fmt(parseFloat(filters.maxAmount))}` : '∞'
  chips.push({ id: 'amount', label: `💰 ${min} - ${max}`, type: 'amount', onRemove: () => { updateFilter('minAmount', ''); updateFilter('maxAmount', '') } })
}
if (filters.dateFrom || filters.dateTo) {
  const from = filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString('es-AR') : '...'
  const to = filters.dateTo ? new Date(filters.dateTo).toLocaleDateString('es-AR') : '...'
  chips.push({ id: 'date', label: `📅 ${from} → ${to}`, type: 'date', onRemove: () => { updateFilter('dateFrom', ''); updateFilter('dateTo', '') } })
}

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-bold text-xl">
          Todos los Gastos <span className="text-sm text-muted font-sans font-normal ml-2">{filtered.length} · ${fmt(filtered.reduce((s,g) => s+g.monto, 0))}</span>
        </h1>
        <Btn variant="primary" onClick={openAdd}><Plus size={14} className="inline mr-1" />Agregar</Btn>
      </div>

      {/* Search & Filter Toggle */}
      <div className="flex gap-2 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            placeholder="Buscar en descripción, comentario o tags..."
            className="w-full bg-surface border border-border text-text pl-7 pr-3 py-1.5 rounded-lg text-sm outline-none focus:border-accent-b"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showFilters ? 'bg-accent-b text-[#001a1a]' : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-1 bg-accent-s/30 text-accent-s text-xs px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>
          )}
        </button>
      </div>

      {/* Preset Filters */}
      <div className="flex gap-2 flex-wrap mb-3">
        {PRESETS.map(preset => {
          // Mostrar nombres reales en los presets de persona
          let displayName = preset.name
          if (preset.id === 'personal-a') displayName = `👤 ${names.A}`
          if (preset.id === 'personal-b') displayName = `👤 ${names.B}`
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="text-xs bg-surface2 border border-border hover:border-accent-b/50 px-2.5 py-1 rounded-full text-muted hover:text-text transition-colors"
            >
              {displayName}
            </button>
          )
        })}
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-accent-a hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4 space-y-3">
          {/* Quick Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={filters.filterCard}
              onChange={e => updateFilter('filterCard', e.target.value)}
              className="bg-surface2 border border-border text-text px-2.5 py-1.5 rounded-lg text-sm outline-none cursor-pointer"
            >
              <option value="">Todas las tarjetas</option>
              {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={filters.filterPerson}
              onChange={e => updateFilter('filterPerson', e.target.value as '' | 'A' | 'B')}
              className="bg-surface2 border border-border text-text px-2.5 py-1.5 rounded-lg text-sm outline-none cursor-pointer"
            >
              <option value="">Ambas personas</option>
              <option value="A">{names.A}</option>
              <option value="B">{names.B}</option>
            </select>
            <select
              value={filters.filterTag}
              onChange={e => updateFilter('filterTag', e.target.value)}
              className="bg-surface2 border border-border text-text px-2.5 py-1.5 rounded-lg text-sm outline-none cursor-pointer"
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
            </select>
          </div>

          {/* Categories Multi-select */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Categorías</label>
            <div className="flex gap-2 flex-wrap">
              <select
                value={tempCategory}
                onChange={e => setTempCategory(e.target.value)}
                className="bg-surface2 border border-border text-text px-2.5 py-1 rounded-lg text-sm outline-none cursor-pointer"
              >
                <option value="">Agregar categoría...</option>
                {CATEGORIES.filter(c => !filters.filterCategories.includes(c)).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button onClick={addCategory} className="text-xs bg-accent-b/20 text-accent-b px-2 py-1 rounded-lg hover:bg-accent-b/30 transition-colors">
                + Agregar
              </button>
              {filters.filterCategories.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1 text-xs bg-accent-b/10 text-accent-b border border-accent-b/30 px-2 py-1 rounded-full">
                  {cat}
                  <button onClick={() => removeCategory(cat)} className="hover:text-text"><X size={10} /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1.5 block">Monto mínimo ($)</label>
              <input
                type="number"
                value={filters.minAmount}
                onChange={e => updateFilter('minAmount', e.target.value)}
                placeholder="0"
                className="w-full bg-surface2 border border-border text-text px-3 py-1.5 rounded-lg text-sm outline-none focus:border-accent-b"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Monto máximo ($)</label>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={e => updateFilter('maxAmount', e.target.value)}
                placeholder="Sin límite"
                className="w-full bg-surface2 border border-border text-text px-3 py-1.5 rounded-lg text-sm outline-none focus:border-accent-b"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1.5 block">Desde</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => updateFilter('dateFrom', e.target.value)}
                className="w-full bg-surface2 border border-border text-text px-3 py-1.5 rounded-lg text-sm outline-none focus:border-accent-b"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Hasta</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => updateFilter('dateTo', e.target.value)}
                className="w-full bg-surface2 border border-border text-text px-3 py-1.5 rounded-lg text-sm outline-none focus:border-accent-b"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Chips */}
      {chips.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {chips.map(chip => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 text-xs bg-surface2 border border-accent-b/30 text-text px-2.5 py-1 rounded-full"
            >
              {chip.label}
              <button onClick={chip.onRemove} className="text-muted hover:text-accent-a transition-colors">
                <X size={12} />
              </button>
            </span>
          ))}
          <button onClick={clearFilters} className="text-xs text-accent-b hover:underline">
            Limpiar todo
          </button>
        </div>
      )}

      {loading ? <div className="text-center py-16 text-muted text-sm animate-pulse">Cargando…</div> : (
        <>
          {/* Vista Mobile: Cards */}
          <div className="block sm:hidden space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted">Sin gastos este mes.</div>
            ) : (
              filtered.map(g => (
                <MobileGastoCard
                  key={g.id}
                  gasto={g}
                  names={names}
                  onEdit={openEdit}
                  onDelete={deleteGasto}
                  isExpanded={expandedId === g.id}
                  onToggleExpand={() => setExpandedId(expandedId === g.id ? null : g.id)}
                />
              ))
            )}
          </div>

          {/* Vista Desktop: Tabla */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                {['Fecha','Descripción','Categoría','Tarjeta','Quién','Cuota','Total','Cuotas','Tipo',''].map((h,i) => (
                  <th key={i} className="px-3 py-2.5 text-left text-xs text-muted uppercase tracking-wide font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-muted">Sin gastos este mes.</td></tr>
                ) : filtered.map(g => {
                  const card = g.card as Card
                  const d = g.fecha.split('-')
                  const hasMeta = (g.tags?.length ?? 0) > 0 || !!g.comment
                  const isExpanded = expandedId === g.id
                  return (
                    <Fragment key={g.id}>
                      <tr className={`border-b border-border transition-colors ${isExpanded ? 'bg-surface2' : 'hover:bg-surface2'}`}>
                        <td className="px-3 py-2.5 text-muted whitespace-nowrap">{d[2]}/{d[1]}/{d[0]}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{g.descripcion}</span>
                            {hasMeta && (
                              <button onClick={() => setExpandedId(isExpanded ? null : g.id)}
                                className={`transition-colors ${isExpanded ? 'text-accent-b' : 'text-muted hover:text-accent-b'}`}>
                                <MessageSquare size={12} />
                              </button>
                            )}
                          </div>
                          {(g.tags?.length ?? 0) > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {(g.tags || []).map(tag => (
                                <span key={tag} onClick={() => updateFilter('filterTag', filters.filterTag === tag ? '' : tag)}
                                  className="text-xs bg-accent-b/10 text-accent-b border border-accent-b/20 px-1.5 py-0 rounded-full cursor-pointer hover:bg-accent-b/20 transition-colors">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5"><span className="bg-surface2 border border-border px-2 py-0.5 rounded-full text-xs">{g.category}</span></td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {card && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: card.color }} /><span className="text-xs">{card.name}</span></span>}
                        </td>
                        <td className={`px-3 py-2.5 font-medium text-xs ${g.person === 'A' ? 'text-accent-a' : 'text-accent-b'}`}>{names[g.person]}</td>
                        <td className="px-3 py-2.5 font-display font-semibold whitespace-nowrap">${fmt(g.monto)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted">${fmt(g.monto * g.cuotas_total)}</td>
                        <td className="px-3 py-2.5">
                          {g.cuotas_total > 1
                            ? <span className="bg-accent-b/10 text-accent-b border border-accent-b/20 px-2 py-0.5 rounded-full text-xs">{g.cuota_actual}/{g.cuotas_total}</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {g.shared
                            ? <span className="bg-accent-s/10 text-accent-s border border-accent-s/20 px-2 py-0.5 rounded-full text-xs">Compartido</span>
                            : <span className="bg-surface2 border border-border px-2 py-0.5 rounded-full text-xs text-muted">Personal</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => openEdit(g)} className="text-muted hover:text-accent-b transition-colors p-1"><Pencil size={13} /></button>
                            <button onClick={() => deleteGasto(g)} className="text-muted hover:text-accent-a transition-colors p-1"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && g.comment && (
                        <tr className="border-b border-border bg-surface2">
                          <td colSpan={10} className="px-4 py-2.5">
                            <div className="flex items-start gap-2">
                              <MessageSquare size={13} className="text-accent-b mt-0.5 shrink-0" />
                              <p className="text-xs text-muted italic">{g.comment}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <GastoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={saveGasto}
        cards={cards}
        names={names}
        saving={saving}
        editingGasto={editingGasto}
        defaultMonth={month}
      />
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Gasto, fmt, monthLabel, CATEGORIES } from '@/types'
import { useCouple } from '@/lib/useCouple'
import { useToast } from '@/lib/ToastContext'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, PieChart as PieChartIcon, BarChart3, ArrowUpRight, ArrowDownRight, Wallet, Calendar, Target, List, Users } from 'lucide-react'

const COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a78bfa', '#f472b6', '#60a5fa', '#34d399', '#fb923c']

export default function EstadisticasPage() {
  const supabase = createClient()
  const { coupleId, myPerson, ready } = useCouple()
  const { showError } = useToast()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [names, setNames] = useState({ A: 'Persona A', B: 'Persona B' })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'tendencia' | 'distribucion' | 'comparacion'>('tendencia')
  const [monthsCount, setMonthsCount] = useState(6)
  const [viewMode, setViewMode] = useState<'mine' | 'both'>('mine')
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  const load = useCallback(async (cid: string) => {
    setLoading(true)
    try {
      const [{ data: g, error }, { data: cfg }] = await Promise.all([
        supabase.from('gastos').select('*').eq('couple_id', cid).order('month'),
        supabase.from('config').select('*').eq('couple_id', cid),
      ])
      if (error) throw error
      setGastos(g || [])
      if (cfg) {
        setNames({
          A: cfg.find((r: any) => r.key === 'name_a')?.value || 'Persona A',
          B: cfg.find((r: any) => r.key === 'name_b')?.value || 'Persona B',
        })
      }
    } catch (err: any) {
      console.error('Error cargando gastos:', err)
      showError('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (ready && coupleId) load(coupleId) }, [ready, coupleId, load])

  const allMonths = useMemo(() => {
    const unique = Array.from(new Set(gastos.map((g) => g.month)))
    return unique.sort()
  }, [gastos])

  const months = useMemo(() => allMonths.slice(-monthsCount), [allMonths, monthsCount])

  const currentMonth = selectedMonth || months[months.length - 1] || ''
  const prevMonth = useMemo(() => {
    const idx = allMonths.indexOf(currentMonth)
    return idx > 0 ? allMonths[idx - 1] : null
  }, [allMonths, currentMonth])

  const monthTotals = useMemo(() => {
    const totals: Record<string, { total: number; personA: number; personB: number; shared: number }> = {}
    months.forEach(m => {
      const monthGastos = gastos.filter(g => g.month === m)
      totals[m] = {
        total: monthGastos.reduce((s, g) => s + g.monto, 0),
        personA: monthGastos.filter(g => g.person === 'A' && !g.shared).reduce((s, g) => s + g.monto, 0),
        personB: monthGastos.filter(g => g.person === 'B' && !g.shared).reduce((s, g) => s + g.monto, 0),
        shared: monthGastos.filter(g => g.shared).reduce((s, g) => s + g.monto, 0),
      }
    })
    return totals
  }, [gastos, months])

  const currentKPIs = useMemo(() => {
    const isSpecificMonth = !!selectedMonth
    const targetMonth = selectedMonth || currentMonth
    
    if (!targetMonth) return null
    
    // Calcular totales según el modo
    let totalAmount = 0
    let prevTotalAmount = 0
    let gastosCount = 0
    
    if (isSpecificMonth) {
      // Modo mes específico: usar solo ese mes
      const current = monthTotals[targetMonth] || { total: 0, personA: 0, personB: 0, shared: 0 }
      totalAmount = viewMode === 'mine' 
        ? (myPerson === 'A' ? current.personA : current.personB) + current.shared / 2
        : current.total
      gastosCount = gastos.filter(g => g.month === targetMonth).length
      
      // Comparar con mes anterior
      const prev = prevMonth ? monthTotals[prevMonth] : null
      prevTotalAmount = prev 
        ? viewMode === 'mine'
          ? (myPerson === 'A' ? prev.personA : prev.personB) + prev.shared / 2
          : prev.total
        : 0
    } else {
      // Modo período completo: sumar todos los meses del período
      const periodGastos = gastos.filter(g => months.includes(g.month))
      gastosCount = periodGastos.length
      
      if (viewMode === 'mine') {
        // Personales + mitad de compartidos
        const personales = periodGastos.filter(g => g.person === myPerson && !g.shared).reduce((s, g) => s + g.monto, 0)
        const compartidos = periodGastos.filter(g => g.shared).reduce((s, g) => s + g.monto / 2, 0)
        totalAmount = personales + compartidos
      } else {
        totalAmount = periodGastos.reduce((s, g) => s + g.monto, 0)
      }
      
      // No hay "mes anterior" en modo período completo
      prevTotalAmount = 0
    }

    const diff = prevTotalAmount > 0 ? ((totalAmount - prevTotalAmount) / prevTotalAmount) * 100 : 0
    
    // Categoría top según el modo
    const gastosForTop = isSpecificMonth 
      ? gastos.filter(g => g.month === targetMonth)
      : gastos.filter(g => months.includes(g.month))
    const cats: Record<string, number> = {}
    gastosForTop.forEach(g => {
      const monto = g.shared && viewMode === 'mine' ? g.monto / 2 : g.monto
      cats[g.category] = (cats[g.category] || 0) + monto
    })
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0] || ['—', 0]

    return {
      total: totalAmount,
      diff,
      avgMonthly: months.length > 0 
        ? Object.values(monthTotals).reduce((s, m) => s + (viewMode === 'mine' 
          ? (myPerson === 'A' ? m.personA : m.personB) + m.shared / 2 
          : m.total), 0) / months.length 
        : 0,
      topCategory: topCat,
      gastosCount,
    }
  }, [currentMonth, selectedMonth, monthTotals, viewMode, myPerson, months, gastos])

  const tendenciaData = useMemo(() => {
    return months.map((month) => {
      const mt = monthTotals[month]
      const myTotal = mt.personA + mt.personB - mt.shared
      return {
        name: monthLabel(month).split(' ')[0].slice(0, 3),
        fullMonth: month,
        total: viewMode === 'mine' ? (myPerson === 'A' ? mt.personA : mt.personB) + mt.shared / 2 : mt.total,
        [names.A]: mt.personA + mt.shared / 2,
        [names.B]: mt.personB + mt.shared / 2,
      }
    })
  }, [months, monthTotals, viewMode, names, myPerson])

  const categoriasData = useMemo(() => {
    const cats: Record<string, number> = {}
    const gastosToUse = selectedMonth 
      ? gastos.filter(g => g.month === selectedMonth)
      : gastos.filter(g => months.includes(g.month))
    gastosToUse.forEach(g => {
      const monto = g.shared && viewMode === 'mine' ? g.monto / 2 : g.monto
      cats[g.category] = (cats[g.category] || 0) + monto
    })
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [gastos, months, selectedMonth, viewMode])

  const topGastos = useMemo(() => {
    const gastosToUse = selectedMonth
      ? gastos.filter(g => g.month === selectedMonth)
      : gastos.filter(g => months.includes(g.month))
    return gastosToUse
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10)
  }, [gastos, months, selectedMonth])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: ${fmt(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted animate-pulse">Cargando estadísticas...</div>
      </div>
    )
  }

  const kpis = currentKPIs || { total: 0, diff: 0, avgMonthly: 0, topCategory: ['—', 0], gastosCount: 0 }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display font-bold text-xl">📊 Estadísticas</h1>
        <select
          value={monthsCount}
          onChange={(e) => setMonthsCount(Number(e.target.value))}
          className="bg-surface border border-border text-text text-sm rounded-lg px-3 py-2 outline-none cursor-pointer"
        >
          <option value={3}>Últimos 3 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Último año</option>
          <option value={999}>Todo el historial</option>
        </select>
      </div>

      {/* Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('mine')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 ${
            viewMode === 'mine' ? 'bg-accent-b text-[#001a1a]' : 'bg-surface border border-border text-muted hover:bg-surface2'
          }`}
        >
          <span className={viewMode === 'mine' ? (myPerson === 'A' ? 'text-accent-a' : 'text-accent-b') : ''}>
            {myPerson === 'A' ? names.A.split(' ')[0] : names.B.split(' ')[0]}
          </span>
          <span className="hidden sm:inline">· Solo mío</span>
          <span className="sm:hidden">· Mío</span>
        </button>
        <button
          onClick={() => setViewMode('both')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 ${
            viewMode === 'both' ? 'bg-accent-b text-[#001a1a]' : 'bg-surface border border-border text-muted hover:bg-surface2'
          }`}
        >
          <Users size={14} />
          <span>Ambos</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-6">
        <div className="bg-gradient-to-br from-surface to-surface2 border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <Wallet size={14} className="text-accent-b sm:size-16" />
            <span className="text-[10px] sm:text-xs text-muted">Total {viewMode === 'mine' ? 'mío' : 'pareja'}</span>
          </div>
          <div className="font-display font-bold text-lg sm:text-2xl truncate">${fmt(kpis.total)}</div>
          {kpis.diff !== 0 && (
            <div className={`flex items-center gap-1 mt-0.5 sm:mt-1 text-[10px] sm:text-xs ${kpis.diff > 0 ? 'text-accent-a' : 'text-accent-b'}`}>
              {kpis.diff > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              <span className="hidden sm:inline">{Math.abs(kpis.diff).toFixed(1)}% vs mes ant.</span>
              <span className="sm:hidden">{Math.abs(kpis.diff).toFixed(0)}%</span>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-surface to-surface2 border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <Target size={14} className="text-accent-s sm:size-16" />
            <span className="text-[10px] sm:text-xs text-muted">Promedio</span>
          </div>
          <div className="font-display font-bold text-lg sm:text-2xl text-accent-s truncate">${fmt(kpis.avgMonthly)}</div>
        </div>

        <div className="bg-gradient-to-br from-surface to-surface2 border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <PieChartIcon size={14} className="text-accent-a sm:size-16" />
            <span className="text-[10px] sm:text-xs text-muted">Top</span>
          </div>
          <div className="font-bold text-sm sm:text-lg truncate" title={kpis.topCategory[0]}>{kpis.topCategory[0]}</div>
          <div className="text-[10px] sm:text-xs text-muted">${fmt(kpis.topCategory[1])}</div>
        </div>

        <div className="bg-gradient-to-br from-surface to-surface2 border border-border rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <List size={14} className="text-text sm:size-16" />
            <span className="text-[10px] sm:text-xs text-muted">Cantidad</span>
          </div>
          <div className="font-display font-bold text-lg sm:text-2xl">{kpis.gastosCount}</div>
        </div>
      </div>

      {/* Selector mes */}
      <div className="flex items-center gap-3 mb-4">
        <Calendar size={16} className="text-muted" />
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-surface border border-border text-text text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer"
        >
          <option value="">Período completo ({months.length} meses)</option>
          {allMonths.slice().reverse().map(m => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        {selectedMonth && (
          <button onClick={() => setSelectedMonth('')} className="text-xs text-accent-b hover:underline">
            Ver período
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'tendencia', label: 'Tendencia', icon: TrendingUp },
          { id: 'distribucion', label: 'Distribución', icon: PieChartIcon },
          { id: 'comparacion', label: 'Comparación', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all flex-shrink-0 ${
              activeTab === tab.id ? 'bg-accent-b text-[#001a1a]' : 'bg-surface border border-border text-muted hover:bg-surface2'
            }`}
          >
            <tab.icon size={14} className="sm:size-16" />
            <span className="font-medium text-xs sm:text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Gráficos */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 mb-6">
        {activeTab === 'tendencia' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-base sm:text-lg">Evolución mensual</h2>
            </div>
            {tendenciaData.length === 0 ? (
              <div className="text-center py-16 text-muted">
                <div className="text-4xl mb-3">📈</div>Sin datos
              </div>
            ) : (
              <div className="w-full h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tendenciaData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                    <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} stroke="#444" />
                    <YAxis tick={{ fill: '#888', fontSize: 10 }} stroke="#444" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#ffe66d" strokeWidth={3} dot={{ fill: '#ffe66d', strokeWidth: 0, r: 4 }} />
                    {viewMode === 'both' && (
                      <>
                        <Line type="monotone" dataKey={names.A} name={names.A} stroke="#ff6b6b" strokeWidth={2} dot={{ fill: '#ff6b6b', strokeWidth: 0, r: 3 }} />
                        <Line type="monotone" dataKey={names.B} name={names.B} stroke="#4ecdc4" strokeWidth={2} dot={{ fill: '#4ecdc4', strokeWidth: 0, r: 3 }} />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

{activeTab === 'distribucion' && (
          <>
            <h2 className="font-display font-bold text-base sm:text-lg mb-4">
              Por categoría {selectedMonth && `· ${monthLabel(selectedMonth)}`}
            </h2>
            {categoriasData.length === 0 ? (
              <div className="text-center py-16 text-muted"><div className="text-4xl mb-3">🥧</div>Sin datos</div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoriasData} cx="50%" cy="50%" labelLine={false}
                        label={({ percent }) => percent ? `${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius="80%" dataKey="value">
                        {categoriasData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categoriasData.map((cat, i) => (
                    <div key={cat.name} className="flex items-center justify-between p-2 sm:p-3 bg-surface2 rounded-lg">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs sm:text-sm">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold">${fmt(cat.value)}</div>
                        <div className="text-xs text-muted">{((cat.value / categoriasData.reduce((s, c) => s + c.value, 0)) * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'comparacion' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="font-display font-bold text-base sm:text-lg">{names.A} vs {names.B}</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-a"></span><span className="hidden sm:inline">{names.A}</span><span className="sm:hidden">A</span></span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-b"></span><span className="hidden sm:inline">{names.B}</span><span className="sm:hidden">B</span></span>
              </div>
            </div>
            {tendenciaData.length === 0 ? (
              <div className="text-center py-16 text-muted"><div className="text-4xl mb-3">⚖️</div>Sin datos</div>
            ) : (
              <div className="w-full h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tendenciaData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                    <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} stroke="#444" />
                    <YAxis tick={{ fill: '#888', fontSize: 10 }} stroke="#444" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey={names.A} name={names.A} fill="#ff6b6b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={names.B} name={names.B} fill="#4ecdc4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Top Gastos */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-base sm:text-lg">Top gastos {selectedMonth && `· ${monthLabel(selectedMonth)}`}</h2>
          <span className="text-xs text-muted">Top 10</span>
        </div>
      {topGastos.length === 0 ? (
        <div className="text-center py-8 text-muted">Sin gastos</div>
      ) : (
        <>
          {/* Desktop: Tabla */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase">
                  <th className="pb-2">Descripción</th>
                  <th className="pb-2">Categoría</th>
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Quién</th>
                  <th className="pb-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {topGastos.map((g) => (
                  <tr key={g.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium truncate max-w-[200px]" title={g.descripcion}>{g.descripcion}</span>
                        {g.shared && <span className="text-[9px] bg-accent-s/20 text-accent-s px-1 py-0.5 rounded w-fit">Compartido</span>}
                      </div>
                    </td>
                    <td className="py-3 text-muted">{g.category}</td>
                    <td className="py-3 text-muted text-xs">{g.fecha.split('-').reverse().join('/')}</td>
                    <td className="py-3">
                      <span className={g.person === 'A' ? 'text-accent-a' : 'text-accent-b'}>{names[g.person]}</span>
                    </td>
                    <td className="py-3 text-right font-display font-semibold">${fmt(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Cards */}
          <div className="sm:hidden space-y-3">
            {topGastos.map((g, index) => (
              <div key={g.id} className="bg-surface2 border border-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted font-mono">#{index + 1}</span>
                      <span className="font-medium text-sm truncate" title={g.descripcion}>{g.descripcion}</span>
                    </div>
                    {g.shared && (
                      <span className="text-[9px] bg-accent-s/20 text-accent-s px-1.5 py-0.5 rounded mt-1 inline-block">
                        Compartido
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold text-base">${fmt(g.monto)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <span className={g.person === 'A' ? 'text-accent-a' : 'text-accent-b'}>
                      {names[g.person]}
                    </span>
                    <span>·</span>
                    <span>{g.category}</span>
                  </div>
                  <span>{g.fecha.split('-').reverse().join('/')}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  )
}

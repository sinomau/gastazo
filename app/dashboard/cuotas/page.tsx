'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, Gasto, fmt, monthLabel } from '@/types'
import { useMonth } from '@/lib/MonthContext'
import { useCouple } from '@/lib/useCouple'

export default function CuotasPage() {
  const supabase = createClient()
  const { month } = useMonth()
  const { coupleId, ready } = useCouple()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [names, setNames] = useState({ A: 'Persona A', B: 'Persona B' })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (cid: string) => {
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

  useEffect(() => { if (ready && coupleId) load(coupleId) }, [ready, coupleId, load])

  const cuotasInfo = gastos
    .filter(g => g.cuotas_total > 1)
    .filter((g, index, self) => self.findIndex(x => x.purchase_id === g.purchase_id) === index)
    .map(g => {
      const [añoGasto, mesGastoNum] = g.month.split('-').map(Number)
      const [añoActual, mesActualNum] = month.split('-').map(Number)
      
      // Calcular mes de la última cuota
      let finalYear = añoGasto
      let finalMonth = mesGastoNum + (g.cuotas_total - g.cuota_actual)
      while (finalMonth > 12) { finalMonth -= 12; finalYear += 1 }
      
      // Calcular cuota actual según el mes seleccionado
      let mesesPasados = (añoActual - añoGasto) * 12 + (mesActualNum - mesGastoNum)
      let cuotaActualCalculada = g.cuota_actual + mesesPasados
      if (cuotaActualCalculada > g.cuotas_total) cuotaActualCalculada = g.cuotas_total
      if (cuotaActualCalculada < 1) cuotaActualCalculada = 1
      
      const finalMonthNum = finalYear * 12 + finalMonth
      const actualNum = añoActual * 12 + mesActualNum
      
      // Si la última cuota es >= mes actual, incluir
      if (finalMonthNum >= actualNum) {
        return { 
          ...g, 
          finalMonth: `${finalYear}-${String(finalMonth).padStart(2, '0')}`,
          cuotaActualCalculada,
          cuotasPendientes: g.cuotas_total - cuotaActualCalculada + 1
        }
      }
      return null
    })
    .filter((g): g is NonNullable<typeof g> => g !== null && (g.cuotasPendientes || 0) > 0)

  const personales = cuotasInfo.filter(g => !g.shared)
  const compartidas = cuotasInfo.filter(g => g.shared)
  const totalPersonal = personales.reduce((s, g) => s + (g?.monto || 0), 0)
  const totalCompartido = compartidas.reduce((s, g) => s + (g?.monto || 0), 0)

  if (loading) return <div className="text-center py-16 text-muted text-sm animate-pulse">Cargando…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-bold text-xl">Cuotas de {monthLabel(month)}</h1>
      </div>

      {cuotasInfo.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <div className="text-4xl mb-3">🎉</div>
          <p>Sin cuotas pendientes</p>
        </div>
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-accent-a/10 to-surface border border-accent-a/30 rounded-2xl p-4">
              <div className="text-xs text-muted mb-1">Personales</div>
              <div className="font-display font-bold text-2xl text-accent-a">${fmt(totalPersonal)}</div>
              <div className="text-xs text-muted mt-1">{personales.length} cuotas</div>
            </div>
            <div className="bg-gradient-to-br from-accent-b/10 to-surface border border-accent-b/30 rounded-2xl p-4">
              <div className="text-xs text-muted mb-1">Compartidas</div>
              <div className="font-display font-bold text-2xl text-accent-b">${fmt(totalCompartido)}</div>
              <div className="text-xs text-muted mt-1">{compartidas.length} cuotas</div>
            </div>
          </div>

          {/* Personales */}
          {personales.length > 0 && (
            <div className="mb-6">
              <h2 className="font-display font-bold text-sm mb-3 text-accent-a">Personales</h2>
              <div className="space-y-2">
                {personales.map(g => {
                  const info = g!
                  const terminaEsteMes = info.finalMonth === month
                  return (
                    <div key={info.id} className={`bg-surface border rounded-xl p-4 ${terminaEsteMes ? 'border-accent-a bg-accent-a/5' : 'border-border'}`}>
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{info.descripcion}</div>
                        <div className={`font-bold ${terminaEsteMes ? 'text-accent-a' : 'text-accent-b'}`}>${fmt(info.monto)}</div>
                      </div>
                      <div className="text-xs text-muted mt-1">
                        {names[info.person]} · Cuota {info.cuotaActualCalculada}/{info.cuotas_total} · Termina: {monthLabel(info.finalMonth)}
                        {terminaEsteMes && <span className="text-accent-a font-bold ml-2">¡Última!</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Separador */}
          {personales.length > 0 && compartidas.length > 0 && (
            <hr className="border-border my-6" />
          )}

          {/* Compartidas */}
          {compartidas.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-sm mb-3 text-accent-b">Compartidas</h2>
              <div className="space-y-2">
                {compartidas.map(g => {
                  const info = g!
                  const terminaEsteMes = info.finalMonth === month
                  return (
                    <div key={info.id} className={`bg-surface border rounded-xl p-4 ${terminaEsteMes ? 'border-accent-a bg-accent-a/5' : 'border-border'}`}>
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{info.descripcion}</div>
                        <div className={`font-bold ${terminaEsteMes ? 'text-accent-a' : 'text-accent-b'}`}>${fmt(info.monto)}</div>
                      </div>
                      <div className="text-xs text-muted mt-1">
                        {names[info.person]} · Cuota {info.cuotaActualCalculada}/{info.cuotas_total} · Termina: {monthLabel(info.finalMonth)}
                        {terminaEsteMes && <span className="text-accent-a font-bold ml-2">¡Última!</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

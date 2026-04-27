'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, Fijo, fmt, CATEGORIES, uid } from '@/types'
import { useCouple } from '@/lib/useCouple'
import FijoModal, { FijoFormData } from '@/components/FijoModal'
import { Btn } from '@/components/FormComponents'
import { Plus, Trash2, Pencil, Repeat, Zap } from 'lucide-react'
import { useToast } from '@/lib/ToastContext'

const ICONS = [
  { id: 'repeat', label: 'Repetir', icon: Repeat },
  { id: 'zap', label: 'Eléctrico', icon: Zap },
  { id: 'home', label: 'Hogar', icon: () => <span>🏠</span> },
  { id: 'wifi', label: 'Internet', icon: () => <span>📶</span> },
  { id: 'phone', label: 'Teléfono', icon: () => <span>📱</span> },
  { id: 'car', label: 'Auto', icon: () => <span>🚗</span> },
  { id: 'health', label: 'Salud', icon: () => <span>💊</span> },
  { id: 'cart', label: 'Compras', icon: () => <span>🛒</span> },
  { id: 'game', label: 'Entretenimiento', icon: () => <span>🎮</span> },
  { id: 'music', label: 'Suscripción', icon: () => <span>🎵</span> },
  { id: 'dumbbell', label: 'Gym', icon: () => <span>💪</span> },
  { id: 'dog', label: 'Mascota', icon: () => <span>🐕</span> },
]

export default function FijosPage() {
  const supabase = createClient()
  const { coupleId, ready } = useCouple()
  const { showSuccess, showError } = useToast()
  const [fijos, setFijos] = useState<Fijo[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [names, setNames] = useState({ A: 'Persona A', B: 'Persona B' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFijo, setEditingFijo] = useState<Fijo | null>(null)

  const load = useCallback(async (cid: string) => {
    setLoading(true)
    const [{ data: f }, { data: c }, { data: cfg }] = await Promise.all([
      supabase.from('fijos').select('*, card:cards(*)').eq('couple_id', cid).order('created_at'),
      supabase.from('cards').select('*').eq('couple_id', cid).order('created_at'),
      supabase.from('config').select('*').eq('couple_id', cid),
    ])
    setFijos(f || [])
    setCards(c || [])
    if (cfg) setNames({
      A: cfg.find(r => r.key === 'name_a')?.value || 'Persona A',
      B: cfg.find(r => r.key === 'name_b')?.value || 'Persona B',
    })
    setLoading(false)
  }, [])

  useEffect(() => { if (ready && coupleId) load(coupleId) }, [coupleId, ready, load])

  const openAdd = () => { setEditingFijo(null); setModalOpen(true) }
  const openEdit = (f: Fijo) => { setEditingFijo(f); setModalOpen(true) }

  const saveFijo = async (data: FijoFormData) => {
    if (!coupleId) return
    setSaving(true)

    const payload = {
      name: data.name,
      monto: data.monto,
      category: data.category,
      person: data.person,
      card_id: data.card_id || null,
      icon: data.icon,
      couple_id: coupleId,
    }

    if (editingFijo) {
      const { error } = await supabase.from('fijos').update(payload).eq('id', editingFijo.id)
      if (!error) {
        await load(coupleId)
        setModalOpen(false)
        showSuccess('Gasto fijo actualizado correctamente')
      } else {
        showError('Error al actualizar: ' + error.message)
      }
    } else {
      const { error } = await supabase.from('fijos').insert({ id: uid(), ...payload })
      if (!error) {
        await load(coupleId)
        setModalOpen(false)
        showSuccess('Gasto fijo creado correctamente')
      } else {
        showError('Error al crear: ' + error.message)
      }
    }
    setSaving(false)
  }

  const deleteFijo = async (fijo: Fijo) => {
    if (!confirm(`¿Eliminar "${fijo.name}"? Se dejará de generar automáticamente.`)) return
    const { error } = await supabase.from('fijos').delete().eq('id', fijo.id)
    if (!error) {
      setFijos(f => f.filter(x => x.id !== fijo.id))
      showSuccess('Gasto fijo eliminado')
    } else {
      showError('Error al eliminar: ' + error.message)
    }
  }

  const generarGastosDelMes = async () => {
    if (!coupleId || fijos.length === 0) return
    if (!confirm(`¿Generar ${fijos.length} gasto(s) fijo(s) para el mes actual?`)) return

    setSaving(true)
    const hoy = new Date()
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
    const fecha = `${mesActual}-01`

    const gastosACrear = fijos.map(f => ({
      id: uid(),
      fecha,
      monto: f.monto,
      descripcion: f.name,
      category: f.category,
      card_id: f.card_id,
      person: f.person as 'A' | 'B',
      shared: false,
      cuotas_total: 1,
      cuota_actual: 1,
      month: mesActual,
      from_fijo: true,
      couple_id: coupleId,
      purchase_id: null,
      comment: '',
      tags: ['fijo'],
    }))

    const { error } = await supabase.from('gastos').insert(gastosACrear)
    if (!error) {
      showSuccess(`${gastosACrear.length} gasto(s) fijo(s) generado(s) para ${mesActual}`)
    } else {
      showError('Error al generar: ' + error.message)
    }
    setSaving(false)
  }

  // Calcular total mensual
  const totalMensual = fijos.reduce((sum, f) => sum + f.monto, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display font-bold text-xl">Gastos Fijos</h1>
          <p className="text-sm text-muted mt-0.5">
            Total mensual: <span className="text-accent-b font-semibold">${fmt(totalMensual)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={generarGastosDelMes} disabled={saving || fijos.length === 0}>
            <Repeat size={14} className="inline mr-1" />
            Generar este mes
          </Btn>
          <Btn variant="primary" onClick={openAdd}>
            <Plus size={14} className="inline mr-1" />
            Nuevo Fijo
          </Btn>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted text-sm animate-pulse">Cargando…</div>
      ) : fijos.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-display font-bold text-lg mb-2">Sin gastos fijos</h3>
          <p className="text-sm text-muted mb-4 max-w-sm mx-auto">
            Agregá gastos recurrentes como alquiler, internet, suscripciones, etc. 
            Se generarán automáticamente cada mes.
          </p>
          <Btn variant="primary" onClick={openAdd}>
            <Plus size={14} className="inline mr-1" />
            Agregar gasto fijo
          </Btn>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fijos.map(fijo => {
            const Icon = ICONS.find(i => i.id === fijo.icon)?.icon || Repeat
            return (
              <div
                key={fijo.id}
                className="bg-surface border border-border rounded-xl p-4 hover:border-accent-b/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent-b/10 flex items-center justify-center text-accent-b">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{fijo.name}</h3>
                      <p className="text-xs text-muted">{fijo.category}</p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => openEdit(fijo)}
                      className="text-muted hover:text-accent-b transition-colors p-1"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => deleteFijo(fijo)}
                      className="text-muted hover:text-accent-a transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-lg">${fmt(fijo.monto)}</span>
                  <span className={`text-xs font-medium ${fijo.person === 'A' ? 'text-accent-a' : 'text-accent-b'}`}>
                    {names[fijo.person as 'A' | 'B']}
                  </span>
                </div>

                {fijo.card && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: fijo.card.color }}
                    />
                    <span className="text-xs text-muted">{fijo.card.name}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <FijoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={saveFijo}
        cards={cards}
        names={names}
        saving={saving}
        editingFijo={editingFijo}
      />
    </div>
  )
}

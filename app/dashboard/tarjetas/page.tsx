'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, Gasto, fmt, uid } from '@/types'
import { useMonth } from '@/lib/MonthContext'
import { useCouple } from '@/lib/useCouple'
import Modal from '@/components/Modal'
import { Input, Select, FormGroup, FormRow, Btn } from '@/components/FormComponents'
import { Plus, Trash2, Pencil, Check } from 'lucide-react'
import { validateNotEmpty, validateInteger } from '@/lib/validation'
import { useToast } from '@/lib/ToastContext'

export default function TarjetasPage() {
  const supabase = createClient()
  const { month } = useMonth()
  const { coupleId, ready } = useCouple()
  const { showSuccess, showError } = useToast()
  const [cards, setCards] = useState<Card[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cardDates, setCardDates] = useState<Record<string, { cierre_real: number|null, vencimiento_real: number|null }>>({})
  const [cardPaid, setCardPaid] = useState<Record<string, boolean>>({})
  const [names, setNames] = useState({ A: 'Persona A', B: 'Persona B' })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [datesModalCard, setDatesModalCard] = useState<Card | null>(null)
  const [saving, setSaving] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', owner: 'A' as 'A'|'B', color: '#4ecdc4', cierre: '', vencimiento: '' })
  const [datesForm, setDatesForm] = useState({ cierre_real: '', vencimiento_real: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const load = useCallback(async (mk: string, cid: string) => {
    setLoading(true)
    const [{ data: c }, { data: g }, { data: cfg }, { data: cd }, { data: cp }] = await Promise.all([
      supabase.from('cards').select('*').eq('couple_id', cid).order('created_at'),
      supabase.from('gastos').select('*').eq('couple_id', cid).order('month'),
      supabase.from('config').select('*').eq('couple_id', cid),
      supabase.from('card_dates').select('*').eq('couple_id', cid).eq('month', mk),
      supabase.from('card_paid').select('*').eq('couple_id', cid).eq('month', mk),
    ])
    setCards(c || [])
    setGastos(g || [])
    if (cfg) setNames({ A: cfg.find(r => r.key === 'name_a')?.value || 'Persona A', B: cfg.find(r => r.key === 'name_b')?.value || 'Persona B' })
    // Map card_dates by card_id
    const datesMap: Record<string, any> = {}
    for (const d of (cd || [])) datesMap[d.card_id] = d
    setCardDates(datesMap)
    // Map card_paid by card_id
    const paidMap: Record<string, boolean> = {}
    for (const p of (cp || [])) paidMap[p.card_id] = p.paid
    setCardPaid(paidMap)
    setLoading(false)
  }, [])

  useEffect(() => { if (ready && coupleId) load(month, coupleId) }, [month, coupleId, ready, load])

  const gastosDelMes = gastos.filter(g => g.month === month)

  // Get effective dates: card_dates for this month overrides card default
  const getEffectiveDates = (card: Card) => ({
    cierre: cardDates[card.id]?.cierre_real ?? card.cierre,
    vencimiento: cardDates[card.id]?.vencimiento_real ?? card.vencimiento,
    hasOverride: !!cardDates[card.id],
  })

  const openAdd = () => {
    setEditingCard(null)
    setForm({ name: '', owner: 'A', color: '#4ecdc4', cierre: '', vencimiento: '' })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (card: Card) => {
    setEditingCard(card)
    setForm({
      name: card.name,
      owner: card.owner,
      color: card.color,
      cierre: card.cierre ? String(card.cierre) : '',
      vencimiento: card.vencimiento ? String(card.vencimiento) : '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const saveCard = async () => {
    if (!coupleId) return

    const errors: Record<string, string> = {}

    // Validar nombre
    const nameValidation = validateNotEmpty(form.name, 'nombre')
    if (!nameValidation.valid) errors.name = nameValidation.error!

    // Validar días si están presentes
    if (form.cierre) {
      const cierreValidation = validateInteger(form.cierre, 'día de cierre', 1)
      if (!cierreValidation.valid) errors.cierre = cierreValidation.error!
      else if (parseInt(form.cierre) > 31) errors.cierre = 'El día debe ser entre 1 y 31'
    }

    if (form.vencimiento) {
      const vencValidation = validateInteger(form.vencimiento, 'día de vencimiento', 1)
      if (!vencValidation.valid) errors.vencimiento = vencValidation.error!
      else if (parseInt(form.vencimiento) > 31) errors.vencimiento = 'El día debe ser entre 1 y 31'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    setSaving(true)

    try {
      const payload = {
        name: form.name.trim(),
        owner: form.owner,
        color: form.color,
        cierre: form.cierre ? parseInt(form.cierre) : null,
        vencimiento: form.vencimiento ? parseInt(form.vencimiento) : null,
      }

      if (editingCard) {
        const { error } = await supabase.from('cards').update(payload).eq('id', editingCard.id)
        if (error) throw error
        showSuccess('Tarjeta actualizada correctamente')
      } else {
        const { error } = await supabase.from('cards').insert({ id: uid(), ...payload, couple_id: coupleId })
        if (error) throw error
        showSuccess('Tarjeta creada correctamente')
      }

      await load(month, coupleId)
      setModalOpen(false)
    } catch (err: any) {
      console.error('Error guardando tarjeta:', err)
      setFormErrors({ general: err.message || 'Error al guardar la tarjeta' })
      showError('No se pudo guardar la tarjeta')
    } finally {
      setSaving(false)
    }
  }

  const openDatesModal = (card: Card) => {
    const existing = cardDates[card.id]
    setDatesModalCard(card)
    setDatesForm({
      cierre_real: existing?.cierre_real ? String(existing.cierre_real) : '',
      vencimiento_real: existing?.vencimiento_real ? String(existing.vencimiento_real) : '',
    })
  }

  const [datesErrors, setDatesErrors] = useState<Record<string, string>>({})

  const saveDates = async () => {
    if (!datesModalCard || !coupleId) return

    const errors: Record<string, string> = {}

    // Validar días si están presentes
    if (datesForm.cierre_real) {
      const cierreValidation = validateInteger(datesForm.cierre_real, 'día de cierre', 1)
      if (!cierreValidation.valid) errors.cierre_real = cierreValidation.error!
      else if (parseInt(datesForm.cierre_real) > 31) errors.cierre_real = 'El día debe ser entre 1 y 31'
    }

    if (datesForm.vencimiento_real) {
      const vencValidation = validateInteger(datesForm.vencimiento_real, 'día de vencimiento', 1)
      if (!vencValidation.valid) errors.vencimiento_real = vencValidation.error!
      else if (parseInt(datesForm.vencimiento_real) > 31) errors.vencimiento_real = 'El día debe ser entre 1 y 31'
    }

    if (Object.keys(errors).length > 0) {
      setDatesErrors(errors)
      return
    }

    setDatesErrors({})
    setSaving(true)

    try {
      const { error } = await supabase.from('card_dates').upsert({
        card_id: datesModalCard.id,
        couple_id: coupleId,
        month,
        cierre_real: datesForm.cierre_real ? parseInt(datesForm.cierre_real) : null,
        vencimiento_real: datesForm.vencimiento_real ? parseInt(datesForm.vencimiento_real) : null,
      }, { onConflict: 'card_id,month' })

      if (error) throw error

      await load(month, coupleId)
      setDatesModalCard(null)
      showSuccess('Fechas actualizadas correctamente')
    } catch (err: any) {
      console.error('Error guardando fechas:', err)
      setDatesErrors({ general: err.message || 'Error al guardar las fechas' })
      showError('No se pudieron guardar las fechas')
    } finally {
      setSaving(false)
    }
  }

  const deleteCard = async (id: string) => {
    if (!confirm('¿Eliminar esta tarjeta?')) return
    await supabase.from('cards').delete().eq('id', id)
    setCards(c => c.filter(x => x.id !== id))
  }

  const togglePaid = async (id: string, currentPaid: boolean | undefined) => {
    if (!coupleId) return
    setUpdating(id)
    const newPaid = !currentPaid
    await supabase.from('card_paid').upsert({
      card_id: id,
      couple_id: coupleId,
      month,
      paid: newPaid,
    }, { onConflict: 'card_id,couple_id,month' })
    setCardPaid(prev => ({ ...prev, [id]: newPaid }))
    setUpdating(null)
  }

  const nextDate = (day: number | null) => {
    if (!day) return '—'
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth(), day)
    if (d <= now) d.setMonth(d.getMonth() + 1)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-bold text-xl">Tarjetas</h1>
        <Btn variant="primary" onClick={openAdd}><Plus size={14} className="inline mr-1" />Agregar</Btn>
      </div>

      {loading ? <div className="text-center py-16 text-muted text-sm animate-pulse">Cargando…</div>
      : cards.length === 0 ? <div className="text-center py-16 text-muted"><div className="text-4xl mb-3">💳</div><p className="text-sm">No hay tarjetas configuradas.</p></div>
      : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => {
            const cardGastos = gastosDelMes.filter(g => g.card_id === card.id)
            const total = cardGastos.reduce((s, g) => s + g.monto, 0)
            const { cierre, vencimiento, hasOverride } = getEffectiveDates(card)

            return (
              <div key={card.id} className={`bg-surface border rounded-xl p-5 transition-colors ${cardPaid[card.id] ? 'border-accent-b/50' : 'border-border hover:border-accent-b'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => togglePaid(card.id, cardPaid[card.id])}
                    disabled={updating === card.id}
                    className={`w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      cardPaid[card.id] ? 'bg-accent-b border-accent-b' : 'border-border hover:border-accent-b'
                    }`}
                  >
                    {cardPaid[card.id] && <Check size={16} className="text-[#001a1a]" />}
                  </button>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: card.color }} />
                  <div className="flex-1">
                    <div className="font-display font-bold text-base">{card.name}</div>
                    <div className={`text-xs ${card.owner === 'A' ? 'text-accent-a' : 'text-accent-b'}`}>{names[card.owner]}</div>
                  </div>
                  <button onClick={() => openEdit(card)} className="text-muted hover:text-accent-b transition-colors p-1" title="Editar tarjeta"><Pencil size={13} /></button>
                  <button onClick={() => deleteCard(card.id)} className="text-muted hover:text-accent-a transition-colors p-1" title="Eliminar"><Trash2 size={13} /></button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Próximo cierre</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{nextDate(cierre)}</span>
                      {hasOverride && cierre !== card.cierre && (
                        <span className="text-xs bg-accent-s/20 text-accent-s px-1.5 rounded">ajustado</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Próximo vencimiento</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{nextDate(vencimiento)}</span>
                      {hasOverride && vencimiento !== card.vencimiento && (
                        <span className="text-xs bg-accent-s/20 text-accent-s px-1.5 rounded">ajustado</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-muted">Gastos este mes</span>
                    <span className={`font-display font-bold ${total > 0 ? 'text-accent-a' : 'text-muted'}`}>${fmt(total)}</span>
                  </div>
                  {cardPaid[card.id] && (
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="text-muted text-xs">Estado</span>
                      <span className="text-accent-b text-xs font-medium">Pagada ✓</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => openDatesModal(card)}
                  className="mt-3 w-full text-xs text-muted hover:text-accent-b transition-colors border border-dashed border-border hover:border-accent-b rounded-lg py-1.5 text-center"
                >
                  📅 Ajustar fechas de {month}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit card modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingCard ? 'Editar Tarjeta' : 'Agregar Tarjeta'}>
        {formErrors.general && (
          <div className="bg-accent-a/10 border border-accent-a/30 text-accent-a rounded-lg p-3 text-sm mb-4">
            {formErrors.general}
          </div>
        )}
        <FormGroup label="Nombre">
          <Input
            placeholder="Ej: Visa Galicia"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className={formErrors.name ? 'border-accent-a focus:border-accent-a' : ''}
          />
          {formErrors.name && <span className="text-accent-a text-xs mt-1">{formErrors.name}</span>}
        </FormGroup>
        <FormRow>
          <FormGroup label="Pertenece a">
            <Select value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value as 'A'|'B' }))}>
              <option value="A">{names.A}</option><option value="B">{names.B}</option>
            </Select>
          </FormGroup>
          <FormGroup label="Color"><Input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 cursor-pointer p-1" /></FormGroup>
        </FormRow>
        <p className="text-xs text-muted mb-3">Día habitual de cierre/vencimiento (se puede ajustar por mes)</p>
        <FormRow>
          <FormGroup label="Día de cierre habitual">
            <Input
              type="number"
              min="1"
              max="31"
              placeholder="Ej: 15"
              value={form.cierre}
              onChange={e => setForm(f => ({ ...f, cierre: e.target.value }))}
              className={formErrors.cierre ? 'border-accent-a focus:border-accent-a' : ''}
            />
            {formErrors.cierre && <span className="text-accent-a text-xs mt-1">{formErrors.cierre}</span>}
          </FormGroup>
          <FormGroup label="Día de vencimiento habitual">
            <Input
              type="number"
              min="1"
              max="31"
              placeholder="Ej: 5"
              value={form.vencimiento}
              onChange={e => setForm(f => ({ ...f, vencimiento: e.target.value }))}
              className={formErrors.vencimiento ? 'border-accent-a focus:border-accent-a' : ''}
            />
            {formErrors.vencimiento && <span className="text-accent-a text-xs mt-1">{formErrors.vencimiento}</span>}
          </FormGroup>
        </FormRow>
        <div className="flex gap-2 justify-end mt-2">
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={saveCard} disabled={saving}>{saving ? 'Guardando…' : editingCard ? 'Guardar cambios' : 'Agregar'}</Btn>
        </div>
      </Modal>

  {/* Dates override modal */}
      <Modal open={!!datesModalCard} onClose={() => setDatesModalCard(null)} title={`Fechas reales — ${datesModalCard?.name} — ${month}`}>
        {datesErrors.general && (
          <div className="bg-accent-a/10 border border-accent-a/30 text-accent-a rounded-lg p-3 text-sm mb-4">
            {datesErrors.general}
          </div>
        )}
        <p className="text-xs text-muted mb-4">
          Estas fechas aplican solo para <strong className="text-text">{month}</strong>.
          Si están en blanco se usan los días habituales de la tarjeta.
        </p>
        <FormRow>
          <FormGroup label="Día de cierre real">
            <Input
              type="number"
              min="1"
              max="31"
              placeholder={datesModalCard?.cierre ? `Habitual: ${datesModalCard.cierre}` : 'Sin configurar'}
              value={datesForm.cierre_real}
              onChange={e => setDatesForm(f => ({ ...f, cierre_real: e.target.value }))}
              className={datesErrors.cierre_real ? 'border-accent-a focus:border-accent-a' : ''}
            />
            {datesErrors.cierre_real && <span className="text-accent-a text-xs mt-1">{datesErrors.cierre_real}</span>}
          </FormGroup>
          <FormGroup label="Día de vencimiento real">
            <Input
              type="number"
              min="1"
              max="31"
              placeholder={datesModalCard?.vencimiento ? `Habitual: ${datesModalCard.vencimiento}` : 'Sin configurar'}
              value={datesForm.vencimiento_real}
              onChange={e => setDatesForm(f => ({ ...f, vencimiento_real: e.target.value }))}
              className={datesErrors.vencimiento_real ? 'border-accent-a focus:border-accent-a' : ''}
            />
            {datesErrors.vencimiento_real && <span className="text-accent-a text-xs mt-1">{datesErrors.vencimiento_real}</span>}
          </FormGroup>
        </FormRow>
        <div className="flex gap-2 justify-end mt-2">
          <Btn variant="ghost" onClick={() => setDatesModalCard(null)}>Cancelar</Btn>
          <Btn variant="primary" onClick={saveDates} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Btn>
        </div>
      </Modal>
    </div>
  )
}

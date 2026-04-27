'use client'

import { useState, useEffect } from 'react'
import { CATEGORIES, Card, Gasto, fmt } from '@/types'
import Modal from '@/components/Modal'
import { Input, Select, FormGroup, FormRow, Btn } from '@/components/FormComponents'
import { X } from 'lucide-react'
import { validatePositiveNumber, validateNotEmpty, validateCuotaLogic } from '@/lib/validation'
import { useToast } from '@/lib/ToastContext'

const SUGGESTED_TAGS = ['urgente', 'reembolso', 'trabajo', 'vacaciones', 'regalo', 'salud', 'cuota fija', 'eventual']

export interface GastoFormData {
  fecha: string
  montoTotal: number
  montoCuota: number
  descripcion: string
  category: string
  card_id: string
  person: 'A' | 'B'
  cuotas_total: number
  cuota_actual: number
  shared: boolean
  comment: string
  tags: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: GastoFormData) => Promise<void>
  cards: Card[]
  names: { A: string; B: string }
  defaultPerson?: 'A' | 'B'
  defaultShared?: boolean
  hidePersonSelector?: boolean
  hideSharedToggle?: boolean
  title?: string
  saving?: boolean
  editingGasto?: Gasto | null
  defaultMonth?: string
}

export default function GastoModal({
  open, onClose, onSave, cards, names,
  defaultPerson = 'A', defaultShared = false,
  hidePersonSelector = false, hideSharedToggle = false,
  title = 'Agregar Gasto', saving = false,
  editingGasto = null, defaultMonth,
}: Props) {
  const { showError, showSuccess } = useToast()
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [montoTotal, setMontoTotal] = useState('')
  const [cuotasTotal, setCuotasTotal] = useState('1')
  const [cuotaActual, setCuotaActual] = useState('1')
  const [descripcion, setDescripcion] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [cardId, setCardId] = useState('')
  const [person, setPerson] = useState<'A' | 'B'>(defaultPerson)
  const [shared, setShared] = useState(defaultShared)
  const [comment, setComment] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (open) {
      if (editingGasto) {
        setFecha(editingGasto.fecha)
        setMontoTotal(String(editingGasto.monto * editingGasto.cuotas_total))
        setCuotasTotal(String(editingGasto.cuotas_total))
        setCuotaActual(String(editingGasto.cuota_actual))
        setDescripcion(editingGasto.descripcion)
        setCategory(editingGasto.category)
        setCardId(editingGasto.card_id ?? '')       
        setPerson(editingGasto.person)
        setShared(editingGasto.shared)
        setComment(editingGasto.comment || '')
        setTags(editingGasto.tags || [])
      } else {
        // Usar el primer día del mes seleccionado si se proporciona
        const defaultDate = defaultMonth ? `${defaultMonth}-01` : new Date().toISOString().split('T')[0]
        setFecha(defaultDate)
        setMontoTotal('')
        setCuotasTotal('1')
        setCuotaActual('1')
        setDescripcion('')
        setCategory(CATEGORIES[0])
        setCardId(cards[0]?.id || '')
        setPerson(defaultPerson)
        setShared(defaultShared)
        setComment('')
        setTags([])
      }
      setTagInput('')
    }
  }, [open, editingGasto, defaultMonth])

  const cuotas = parseInt(cuotasTotal) || 1
  const total = parseFloat(montoTotal) || 0
  const montoCuota = cuotas > 0 ? total / cuotas : total

  const handleCardChange = (cid: string) => {
    const card = cards.find(c => c.id === cid)
    setCardId(cid)
    if (!hidePersonSelector && card) setPerson(card.owner)
  }

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) removeTag(tags[tags.length - 1])
  }

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = async () => {
    const newErrors: Record<string, string> = {}

    // Validar descripción
    const descValidation = validateNotEmpty(descripcion, 'descripción')
    if (!descValidation.valid) newErrors.descripcion = descValidation.error!

    // Validar monto
    const montoValidation = validatePositiveNumber(montoTotal, 'monto')
    if (!montoValidation.valid) newErrors.monto = montoValidation.error!

    // Validar tarjeta
    if (!cardId) newErrors.card = 'Seleccioná una tarjeta'

    // Validar lógica de cuotas
    const cuotaNum = parseInt(cuotaActual) || 1
    const cuotasNum = parseInt(cuotasTotal) || 1
    const cuotaValidation = validateCuotaLogic(cuotaNum, cuotasNum)
    if (!cuotaValidation.valid) newErrors.cuotas = cuotaValidation.error!

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      showError('Corregí los errores del formulario')
      return
    }

    setErrors({})
    try {
      await onSave({
        fecha, montoTotal: total, montoCuota,
        descripcion, category, card_id: cardId,
        person, cuotas_total: cuotas,
        cuota_actual: cuotaNum,
        shared, comment, tags,
      })
      showSuccess(editingGasto ? 'Gasto actualizado correctamente' : 'Gasto guardado correctamente')
    } catch (err: any) {
      showError(err.message || 'Error al guardar el gasto')
      throw err // Re-lanzar para que el padre también maneje el error
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editingGasto ? 'Editar Gasto' : title}>
      <FormRow>
        <FormGroup label="Fecha">
          <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </FormGroup>
        <FormGroup label="Monto Total ($)">
          <Input
            type="number"
            placeholder="0.00"
            value={montoTotal}
            onChange={e => { setMontoTotal(e.target.value); if (errors.monto) setErrors(prev => ({ ...prev, monto: '' })) }}
            step="0.01"
            className={errors.monto ? 'border-accent-a focus:border-accent-a' : ''}
          />
          {errors.monto && <span className="text-accent-a text-xs mt-1">{errors.monto}</span>}
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup label="Cantidad de cuotas">
          <Input
            type="number"
            min="1"
            value={cuotasTotal}
            onChange={e => { setCuotasTotal(e.target.value); if (errors.cuotas) setErrors(prev => ({ ...prev, cuotas: '' })) }}
            className={errors.cuotas ? 'border-accent-a focus:border-accent-a' : ''}
          />
        </FormGroup>
        <FormGroup label="Cuota Nro.">
          <Input
            type="number"
            min="1"
            max={cuotasTotal}
            value={cuotaActual}
            onChange={e => { setCuotaActual(e.target.value); if (errors.cuotas) setErrors(prev => ({ ...prev, cuotas: '' })) }}
            className={errors.cuotas ? 'border-accent-a focus:border-accent-a' : ''}
          />
          {errors.cuotas && <span className="text-accent-a text-xs mt-1">{errors.cuotas}</span>}
        </FormGroup>
      </FormRow>

      {cuotas > 1 && total > 0 && (
        <div className="bg-surface2 border border-border rounded-lg px-4 py-2.5 mb-4 flex justify-between items-center">
          <span className="text-xs text-muted">{cuotas} cuotas de</span>
          <span className="font-display font-bold text-accent-b text-base">${fmt(montoCuota)}</span>
          <span className="text-xs text-muted">= ${fmt(total)} total</span>
        </div>
      )}

      <FormGroup label="Descripción">
        <Input
          placeholder="Ej: Supermercado Jumbo"
          value={descripcion}
          onChange={e => { setDescripcion(e.target.value); if (errors.descripcion) setErrors(prev => ({ ...prev, descripcion: '' })) }}
          className={errors.descripcion ? 'border-accent-a focus:border-accent-a' : ''}
        />
        {errors.descripcion && <span className="text-accent-a text-xs mt-1">{errors.descripcion}</span>}
      </FormGroup>

      <FormRow>
        <FormGroup label="Categoría">
          <Select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
        </FormGroup>
        <FormGroup label="Tarjeta">
          <Select
            value={cardId}
            onChange={e => { handleCardChange(e.target.value); if (errors.card) setErrors(prev => ({ ...prev, card: '' })) }}
            className={errors.card ? 'border-accent-a focus:border-accent-a' : ''}
          >
            <option value="">Seleccionar tarjeta</option>
            {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {errors.card && <span className="text-accent-a text-xs mt-1">{errors.card}</span>}
        </FormGroup>
      </FormRow>

      {!hidePersonSelector && (
        <FormGroup label="¿Quién pagó?">
          <Select value={person} onChange={e => setPerson(e.target.value as 'A' | 'B')}>
            <option value="A">{names.A}</option>
            <option value="B">{names.B}</option>
          </Select>
        </FormGroup>
      )}

      {!hideSharedToggle && (
        <div className="mb-4">
          <label className="flex items-center gap-2.5 cursor-pointer text-sm">
            <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)}
              className="w-4 h-4 accent-[#ffe66d] cursor-pointer" />
            <span>Gasto compartido <span className="text-muted">(se divide en el balance)</span></span>
          </label>
        </div>
      )}

      {/* Tags */}
      <FormGroup label="Etiquetas">
        <div className="bg-surface2 border border-border rounded-lg p-2 flex flex-wrap gap-1.5 min-h-[38px]">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-accent-b/20 text-accent-b border border-accent-b/30 px-2 py-0.5 rounded-full text-xs font-medium">
              #{tag}
              <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors"><X size={10} /></button>
            </span>
          ))}
          <input
            value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
            placeholder={tags.length === 0 ? 'Escribí y Enter para agregar…' : ''}
            className="bg-transparent text-xs outline-none flex-1 min-w-[100px] text-white placeholder:text-muted"
          />
        </div>
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 5).map(t => (
            <button key={t} onClick={() => addTag(t)}
              className="text-xs text-muted hover:text-accent-b transition-colors border border-dashed border-border hover:border-accent-b px-2 py-0.5 rounded-full">
              +{t}
            </button>
          ))}
        </div>
      </FormGroup>

      {/* Comment */}
      <FormGroup label="Comentario">
        <textarea
          value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Opcional: anotá cualquier detalle relevante…"
          rows={2}
          className="w-full bg-surface2 border border-border text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-accent-b resize-none placeholder:text-muted"
        />
      </FormGroup>

      <div className="flex gap-2 justify-end">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : editingGasto ? 'Guardar cambios' : 'Guardar'}
        </Btn>
      </div>
    </Modal>
  )
}

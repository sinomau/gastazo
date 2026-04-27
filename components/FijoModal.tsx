'use client'

import { useState, useEffect } from 'react'
import { CATEGORIES, Card } from '@/types'
import Modal from '@/components/Modal'
import { Input, Select, FormGroup, FormRow, Btn } from '@/components/FormComponents'
import { validatePositiveNumber, validateNotEmpty } from '@/lib/validation'
import { useToast } from '@/lib/ToastContext'
import { Repeat, Zap, Home, Wifi, Phone, Car, Heart, ShoppingCart, Gamepad2, Music, Dumbbell, Dog } from 'lucide-react'

export interface FijoFormData {
  name: string
  monto: number
  category: string
  person: 'A' | 'B'
  card_id: string
  icon: string
}

const ICON_OPTIONS = [
  { id: 'repeat', label: 'Genérico', icon: Repeat },
  { id: 'zap', label: 'Servicio', icon: Zap },
  { id: 'home', label: 'Hogar', icon: Home },
  { id: 'wifi', label: 'Internet', icon: Wifi },
  { id: 'phone', label: 'Teléfono', icon: Phone },
  { id: 'car', label: 'Auto', icon: Car },
  { id: 'heart', label: 'Salud', icon: Heart },
  { id: 'cart', label: 'Compras', icon: ShoppingCart },
  { id: 'game', label: 'Entretenimiento', icon: Gamepad2 },
  { id: 'music', label: 'Suscripción', icon: Music },
  { id: 'dumbbell', label: 'Gym', icon: Dumbbell },
  { id: 'dog', label: 'Mascota', icon: Dog },
]

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: FijoFormData) => Promise<void>
  cards: Card[]
  names: { A: string; B: string }
  saving?: boolean
  editingFijo?: { name: string; monto: number; category: string; person: string; card_id: string | null; icon: string } | null
}

export default function FijoModal({
  open,
  onClose,
  onSave,
  cards,
  names,
  saving = false,
  editingFijo = null,
}: Props) {
  const { showError } = useToast()
  const [name, setName] = useState('')
  const [monto, setMonto] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [person, setPerson] = useState<'A' | 'B'>('A')
  const [cardId, setCardId] = useState('')
  const [icon, setIcon] = useState('repeat')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (editingFijo) {
        setName(editingFijo.name)
        setMonto(String(editingFijo.monto))
        setCategory(editingFijo.category)
        setPerson(editingFijo.person as 'A' | 'B')
        setCardId(editingFijo.card_id || '')
        setIcon(editingFijo.icon || 'repeat')
      } else {
        setName('')
        setMonto('')
        setCategory(CATEGORIES[0])
        setPerson('A')
        setCardId(cards[0]?.id || '')
        setIcon('repeat')
      }
      setErrors({})
    }
  }, [open, editingFijo, cards])

  const handleSave = async () => {
    const newErrors: Record<string, string> = {}

    const nameValidation = validateNotEmpty(name, 'nombre')
    if (!nameValidation.valid) newErrors.name = nameValidation.error!

    const montoValidation = validatePositiveNumber(monto, 'monto')
    if (!montoValidation.valid) newErrors.monto = montoValidation.error!

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      showError('Corregí los errores del formulario')
      return
    }

    setErrors({})
    await onSave({
      name,
      monto: parseFloat(monto),
      category,
      person,
      card_id: cardId,
      icon,
    })
  }

  const SelectedIcon = ICON_OPTIONS.find(i => i.id === icon)?.icon || Repeat

  return (
    <Modal open={open} onClose={onClose} title={editingFijo ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo'}>
      <FormGroup label="Nombre">
        <Input
          placeholder="Ej: Netflix, Alquiler, Internet..."
          value={name}
          onChange={e => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: '' })) }}
          className={errors.name ? 'border-accent-a focus:border-accent-a' : ''}
        />
        {errors.name && <span className="text-accent-a text-xs mt-1">{errors.name}</span>}
      </FormGroup>

      <FormRow>
        <FormGroup label="Monto mensual ($)">
          <Input
            type="number"
            placeholder="0.00"
            value={monto}
            onChange={e => { setMonto(e.target.value); if (errors.monto) setErrors(prev => ({ ...prev, monto: '' })) }}
            step="0.01"
            className={errors.monto ? 'border-accent-a focus:border-accent-a' : ''}
          />
          {errors.monto && <span className="text-accent-a text-xs mt-1">{errors.monto}</span>}
        </FormGroup>
        <FormGroup label="Categoría">
          <Select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup label="¿Quién paga?">
          <Select value={person} onChange={e => setPerson(e.target.value as 'A' | 'B')}>
            <option value="A">{names.A}</option>
            <option value="B">{names.B}</option>
          </Select>
        </FormGroup>
        <FormGroup label="Tarjeta (opcional)">
          <Select value={cardId} onChange={e => setCardId(e.target.value)}>
            <option value="">Sin tarjeta</option>
            {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormGroup>
      </FormRow>

      <FormGroup label="Ícono">
        <div className="grid grid-cols-6 gap-2">
          {ICON_OPTIONS.map(opt => {
            const Icon = opt.icon
            const selected = icon === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setIcon(opt.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                  selected
                    ? 'border-accent-b bg-accent-b/10 text-accent-b'
                    : 'border-border hover:border-accent-b/50 text-muted'
                }`}
              >
                <Icon size={18} />
                <span className="text-[10px]">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </FormGroup>

      <div className="bg-surface2 border border-border rounded-lg p-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-b/10 flex items-center justify-center text-accent-b">
            <SelectedIcon size={20} />
          </div>
          <div>
            <p className="text-sm font-medium">{name || 'Nombre del gasto'}</p>
            <p className="text-xs text-muted">
              {monto ? `$${parseFloat(monto).toLocaleString('es-AR')}` : '$0'} · {category} · {names[person]}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : editingFijo ? 'Guardar cambios' : 'Guardar'}
        </Btn>
      </div>
    </Modal>
  )
}

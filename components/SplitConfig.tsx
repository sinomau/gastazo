'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  coupleId: string
  currentMethod: string
  currentPctA: number
  currentPctB: number
  nameA: string
  nameB: string
  onSaved: (method: string, pctA: number, pctB: number) => void
}

const METHODS = [
  { id: '50/50', label: '50/50 siempre', desc: 'Todos los gastos compartidos se dividen exactamente a la mitad', icon: '⚖️' },
  { id: 'percentage', label: 'Porcentaje fijo', desc: 'Definís un porcentaje para cada uno (ej: 60/40)', icon: '📊' },
  { id: 'per_expense', label: 'Por gasto', desc: 'Cada gasto compartido tiene su propio método de división', icon: '🧾' },
  { id: 'pool', label: 'Fondo común', desc: 'Los dos aportan a un fondo y los gastos se descuentan de ahí', icon: '🏦' },
  { id: 'visibility_only', label: 'Solo visibilidad', desc: 'Ven los gastos del otro pero no calculan división automática', icon: '👁️' },
]

export default function SplitConfig({ coupleId, currentMethod, currentPctA, currentPctB, nameA, nameB, onSaved }: Props) {
  const supabase = createClient()
  const [method, setMethod] = useState(currentMethod)
  const [pctA, setPctA] = useState(currentPctA)
  const [pctB, setPctB] = useState(currentPctB)
  const [saving, setSaving] = useState(false)

  const handlePctA = (val: number) => {
    const v = Math.max(0, Math.min(100, val))
    setPctA(v)
    setPctB(100 - v)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.rpc('update_split_method', {
      couple_id_input: coupleId,
      method,
      pct_a: pctA,
      pct_b: pctB,
    })
    onSaved(method, pctA, pctB)
    setSaving(false)
  }

  return (
    <div>
      <div className="space-y-2 mb-5">
        {METHODS.map(m => (
          <button key={m.id} onClick={() => setMethod(m.id)}
            className={`w-full text-left p-3.5 rounded-xl border transition-colors ${method === m.id ? 'border-accent-b bg-accent-b/10' : 'border-border bg-surface2 hover:border-accent-b/40'}`}>
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{m.icon}</span>
              <div className="flex-1">
                <div className={`font-semibold text-sm ${method === m.id ? 'text-accent-b' : 'text-white'}`}>{m.label}</div>
                <div className="text-xs text-muted mt-0.5">{m.desc}</div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${method === m.id ? 'border-accent-b bg-accent-b' : 'border-border'}`}>
                {method === m.id && <div className="w-1.5 h-1.5 rounded-full bg-[#001a1a]" />}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Percentage slider */}
      {method === 'percentage' && (
        <div className="bg-surface2 border border-border rounded-xl p-4 mb-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-accent-a">{nameA}: {pctA}%</span>
            <span className="text-sm font-semibold text-accent-b">{nameB}: {pctB}%</span>
          </div>
          <input
            type="range" min="0" max="100" value={pctA}
            onChange={e => handlePctA(parseInt(e.target.value))}
            className="w-full accent-[#4ecdc4] cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
          <div className="mt-3 flex h-3 rounded-full overflow-hidden">
            <div className="bg-accent-a transition-all" style={{ width: `${pctA}%` }} />
            <div className="bg-accent-b transition-all" style={{ width: `${pctB}%` }} />
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-accent-b text-[#001a1a] font-semibold rounded-xl py-2.5 text-sm hover:opacity-85 transition-opacity disabled:opacity-50">
        {saving ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </div>
  )
}

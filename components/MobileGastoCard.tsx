'use client'

import { Card as CardType, Gasto, fmt } from '@/types'
import { Pencil, Trash2, MessageSquare } from 'lucide-react'

interface MobileGastoCardProps {
  gasto: Gasto
  names: { A: string; B: string }
  onEdit: (gasto: Gasto) => void
  onDelete: (gasto: Gasto) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

export function MobileGastoCard({
  gasto,
  names,
  onEdit,
  onDelete,
  isExpanded,
  onToggleExpand,
}: MobileGastoCardProps) {
  const card = gasto.card as CardType
  const d = gasto.fecha.split('-')
  const hasMeta = (gasto.tags?.length ?? 0) > 0 || !!gasto.comment

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted">{d[2]}/{d[1]}/{d[0]}</span>
            <span className={`text-xs font-medium ${gasto.person === 'A' ? 'text-accent-a' : 'text-accent-b'}`}>
              {names[gasto.person]}
            </span>
          </div>
          <h3 className="font-medium text-sm truncate pr-2">{gasto.descripcion}</h3>
        </div>
        <div className="text-right">
          <div className="font-display font-bold text-lg">${fmt(gasto.monto)}</div>
          {gasto.cuotas_total > 1 && (
            <div className="text-xs text-muted">
              {gasto.cuota_actual}/{gasto.cuotas_total} cuotas
            </div>
          )}
        </div>
      </div>

      {/* Detalles */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="bg-surface2 border border-border px-2 py-0.5 rounded-full text-xs">
          {gasto.category}
        </span>
        {card && (
          <span className="flex items-center gap-1 bg-surface2 border border-border px-2 py-0.5 rounded-full text-xs">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: card.color }} />
            {card.name}
          </span>
        )}
        <span className={`px-2 py-0.5 rounded-full text-xs border ${
          gasto.shared
            ? 'bg-accent-s/10 text-accent-s border-accent-s/20'
            : 'bg-surface2 border-border text-muted'
        }`}>
          {gasto.shared ? 'Compartido' : 'Personal'}
        </span>
      </div>

      {/* Tags y comentario */}
      {hasMeta && (
        <div className="mb-3">
          {(gasto.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {gasto.tags?.map(tag => (
                <span key={tag} className="text-xs bg-accent-b/10 text-accent-b border border-accent-b/20 px-1.5 py-0 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {isExpanded && gasto.comment && (
            <div className="flex items-start gap-2 text-xs text-muted italic bg-surface2 rounded-lg p-2">
              <MessageSquare size={12} className="mt-0.5 shrink-0 text-accent-b" />
              <span>{gasto.comment}</span>
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        {hasMeta && (
          <button
            onClick={onToggleExpand}
            className={`text-xs flex items-center gap-1 transition-colors ${
              isExpanded ? 'text-accent-b' : 'text-muted hover:text-accent-b'
            }`}
          >
            <MessageSquare size={12} />
            {isExpanded ? 'Ver menos' : 'Ver más'}
          </button>
        )}
        {!hasMeta && <span />}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(gasto)}
            className="text-muted hover:text-accent-b transition-colors p-2"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(gasto)}
            className="text-muted hover:text-accent-a transition-colors p-2"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

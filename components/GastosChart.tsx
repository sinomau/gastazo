'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Gasto, fmt } from '@/types'
import { useCouple } from '@/lib/useCouple'

interface GastosChartProps {
  gastos: Gasto[]
  months: string[]
}

export function GastosChart({ gastos, months }: GastosChartProps) {
  const { myPerson } = useCouple()

  const data = useMemo(() => {
    // Ordenar meses
    const sortedMonths = [...months].sort()

    return sortedMonths.map((month) => {
      const monthGastos = gastos.filter((g) => g.month === month)

      const total = monthGastos.reduce((sum, g) => sum + g.monto, 0)
      const personal = monthGastos
        .filter((g) => g.person === myPerson && !g.shared)
        .reduce((sum, g) => sum + g.monto, 0)
      const shared = monthGastos
        .filter((g) => g.shared)
        .reduce((sum, g) => sum + g.monto / 2, 0)

      // Formatear mes para mostrar (ej: "2026-01" -> "Ene 2026")
      const [year, monthNum] = month.split('-')
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`

      return {
        name: monthLabel,
        total: Math.round(total),
        personal: Math.round(personal),
        shared: Math.round(shared),
        rawMonth: month,
      }
    })
  }, [gastos, months, myPerson])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: ${fmt(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted text-sm">
        Sin datos suficientes para mostrar el gráfico
      </div>
    )
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#888', fontSize: 12 }}
            stroke="#444"
          />
          <YAxis
            tick={{ fill: '#888', fontSize: 12 }}
            stroke="#444"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => <span className="text-sm">{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#ffe66d"
            strokeWidth={2}
            dot={{ fill: '#ffe66d', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="personal"
            name="Personal"
            stroke="#ff6b6b"
            strokeWidth={2}
            dot={{ fill: '#ff6b6b', strokeWidth: 0, r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="shared"
            name="Compartido (tu parte)"
            stroke="#4ecdc4"
            strokeWidth={2}
            dot={{ fill: '#4ecdc4', strokeWidth: 0, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

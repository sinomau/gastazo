export type Person = 'A' | 'B'

export interface Card {
  id: string
  name: string
  owner: Person
  color: string
  cierre: number | null
  vencimiento: number | null
  created_at?: string
}

export interface Gasto {
  id: string
  fecha: string
  monto: number
  descripcion: string
  category: string
  card_id: string | null
  person: Person
  shared: boolean
  cuotas_total: number
  cuota_actual: number
  purchase_id: string | null
  month: string
  from_fijo: boolean
  comment?: string
  tags?: string[]
  created_at?: string
  // joined
  card?: Card
}

export interface Fijo {
  id: string
  name: string
  icon: string
  monto: number
  category: string
  person: string
  card_id: string | null
  created_at?: string
  card?: Card
}

export interface Config {
  key: string
  value: string
}

export interface AuthorizedUser {
  email: string
  name: string
  person: Person
}

export const CATEGORIES = [
  'Supermercado', 'Alquiler', 'Internet', 'Pañales', 'Obra Social',
  'Agua', 'Luz', 'Gas', 'Restaurantes', 'Transporte', 'Salud',
  'Ropa', 'Entretenimiento', 'Educación', 'Viajes', 'Farmacia', 'Otros',
  'Rappi Supermercado', 'Rappi Comida', 'PedidosYa Super', 'PedidosYa Comida',
  'Auto', 'MercadoLibre', 'Electrodomésticos', 'Muebles', 'Suscripciones', 'Moto'
]

export const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

export function monthLabel(mk: string): string {
  const [y, m] = mk.split('-')
  return `${MONTHS[parseInt(m)-1]} ${y}`
}

export function fmt(n: number): string {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function uid(): string {
  return Math.random().toString(36).substr(2,9) + Date.now().toString(36)
}

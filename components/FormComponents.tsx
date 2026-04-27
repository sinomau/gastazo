import { cn } from '@/lib/utils'
import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react'

const baseInput = 'w-full bg-surface2 border border-border text-white placeholder-muted rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-b transition-colors'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(baseInput, className)} {...props} />
  )
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(baseInput, 'cursor-pointer', className)} {...props}>
      {children}
    </select>
  )
)
Select.displayName = 'Select'

export function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs text-muted font-medium mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

export function Btn({ variant = 'ghost', size = 'md', className, children, ...props }: BtnProps) {
  const base = 'rounded-lg font-medium transition-all cursor-pointer border-0'
  const variants = {
    primary: 'bg-accent-b text-[#001a1a] hover:opacity-85',
    secondary: 'bg-accent-s/20 text-accent-s border border-accent-s/30 hover:bg-accent-s/30',
    danger: 'bg-accent-a text-[#1a0000] hover:opacity-85',
    ghost: 'bg-surface2 text-white border border-border hover:border-accent-b',
  }
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-4 py-2 text-sm' }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h1 className="text-2xl font-bold">{children}</h1>
      {action}
    </div>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }

export function Field({ label, hint, id, ...props }: FieldProps) {
  const inputId = id ?? props.name
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        className="block min-h-12 w-full rounded-xl border border-brand-deep/20 bg-white px-3 text-base outline-none focus:border-brand-fairway focus:ring-2 focus:ring-brand-fairway/30"
        {...props}
      />
      {hint && <p className="text-xs text-brand-deep/60">{hint}</p>}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const styles = {
    primary: 'bg-brand-deep text-brand-cream hover:bg-brand-deep/90',
    secondary: 'bg-white text-brand-deep border border-brand-deep/20 hover:bg-brand-deep/5',
    danger: 'bg-brand-red text-white hover:bg-brand-red/90',
  }[variant]
  return (
    <button
      className={`min-h-12 w-full rounded-xl px-4 font-semibold transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  )
}

export function Alert({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const styles =
    kind === 'error' ? 'bg-brand-red/10 text-brand-red border-brand-red/30' : 'bg-brand-fairway/10 text-brand-deep border-brand-fairway/30'
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-deep/20 bg-white/60 p-6 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-brand-deep/70">{children}</div>}
    </div>
  )
}

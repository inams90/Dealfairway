import type { ReactNode } from 'react'
import { Logo } from '../../components/Logo'

export function AuthLayout({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-brand-cream px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-8">
      <div className="mx-auto w-full max-w-sm">
        <Logo className="mb-8 text-2xl" />
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-8 space-y-3 text-center text-sm">{footer}</div>}
      </div>
    </div>
  )
}

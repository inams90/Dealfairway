import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useProfile } from '../lib/useProfile'
import { firstName, formatLongDate, greetingFor } from '../lib/greeting'
import { EmptyState } from '../components/ui'

export function HomePage() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const now = new Date()
  const name = firstName(profile?.full_name || (user?.user_metadata?.full_name as string | undefined))

  const stats = [
    { label: 'Due today', value: 0, to: '/tasks' },
    { label: 'Overdue', value: 0, to: '/tasks' },
    { label: 'New inquiries', value: 0, to: '/inquiries' },
  ]

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-brand-deep/60">{formatLongDate(now)}</p>
        <h1 className="text-2xl font-bold">
          {greetingFor(now)}
          {name ? `, ${name}` : ''}
        </h1>
      </section>

      <section aria-label="Summary" className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-brand-deep/5">
            <div className="text-2xl font-bold text-brand-fairway">{s.value}</div>
            <div className="text-xs text-brand-deep/70">{s.label}</div>
          </Link>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Today</h2>
        <EmptyState title="You’re all clear">Tasks due today will appear here.</EmptyState>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Follow up</h2>
        <EmptyState title="No follow-ups yet">Clients with no contact in 30+ days will appear here.</EmptyState>
      </section>
    </div>
  )
}

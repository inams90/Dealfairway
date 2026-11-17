import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { PageTitle } from '../components/ui'
import { ChevronRightIcon } from '../components/icons'

const items = [
  { to: '/more/profile', label: 'Profile', ready: true },
  { to: '#', label: 'Import contacts', ready: false },
  { to: '#', label: 'Settings', ready: false },
  { to: '#', label: 'Install DealFairway', ready: false },
]

export function MorePage() {
  const { signOut, user } = useAuth()
  return (
    <div className="space-y-6">
      <PageTitle>More</PageTitle>
      <ul className="divide-y divide-brand-deep/10 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brand-deep/5">
        {items.map((item) => (
          <li key={item.label}>
            {item.ready ? (
              <Link to={item.to} className="flex min-h-14 items-center justify-between px-4">
                <span>{item.label}</span>
                <ChevronRightIcon className="text-brand-deep/40" />
              </Link>
            ) : (
              <div className="flex min-h-14 items-center justify-between px-4 text-brand-deep/40">
                <span>{item.label}</span>
                <span className="text-xs">Coming soon</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <p className="text-center text-sm text-brand-deep/60">Signed in as {user?.email}</p>
        <button
          type="button"
          onClick={signOut}
          className="min-h-12 w-full rounded-xl border border-brand-red/30 bg-white font-semibold text-brand-red"
        >
          Log out
        </button>
      </div>
    </div>
  )
}

import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from './Logo'
import { ClientsIcon, HomeIcon, InquiriesIcon, MoreIcon, TasksIcon } from './icons'

export const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/clients', label: 'Clients', icon: ClientsIcon },
  { to: '/tasks', label: 'Tasks', icon: TasksIcon },
  { to: '/inquiries', label: 'Inquiries', icon: InquiriesIcon },
  { to: '/more', label: 'More', icon: MoreIcon },
]

export function AppShell() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 bg-brand-deep pt-[env(safe-area-inset-top)] text-brand-cream shadow">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Logo className="text-lg [&_span_span]:text-[#9cc97f]" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-28">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-brand-deep/10 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                    isActive ? 'text-brand-fairway' : 'text-brand-deep/60'
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

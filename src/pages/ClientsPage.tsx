import { EmptyState, PageTitle } from '../components/ui'

export function ClientsPage() {
  return (
    <div>
      <PageTitle>Clients</PageTitle>
      <EmptyState title="Nothing here yet">Your clients will appear here. Adding and importing clients is coming next.</EmptyState>
    </div>
  )
}

import { EmptyState, PageTitle } from '../components/ui'

export function TasksPage() {
  return (
    <div>
      <PageTitle>Tasks</PageTitle>
      <EmptyState title="Nothing here yet">Swipe right to finish, swipe left to snooze — coming soon.</EmptyState>
    </div>
  )
}

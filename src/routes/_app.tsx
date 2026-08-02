import { Outlet, createFileRoute } from '@tanstack/react-router'
import Header from '@/components/Header'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Outlet />
    </div>
  )
}

import { Outlet, createFileRoute } from '@tanstack/react-router'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader variant="app" />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter clearFixedToolbar />
    </div>
  )
}

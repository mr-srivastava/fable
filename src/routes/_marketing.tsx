import { Outlet, createFileRoute } from '@tanstack/react-router'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { MarketingGridBackground } from '@/components/marketing/MarketingGridBackground'

export const Route = createFileRoute('/_marketing')({
  component: MarketingLayout,
})

function MarketingLayout() {
  return (
    <MarketingGridBackground className="flex min-h-screen flex-col text-foreground">
      <SiteHeader variant="marketing" />
      <main className="flex-1 overflow-x-clip">
        <Outlet />
      </main>
      <SiteFooter />
    </MarketingGridBackground>
  )
}

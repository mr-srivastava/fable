import { Outlet, createFileRoute } from '@tanstack/react-router'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { MarketingGridBackground } from '@/components/marketing/MarketingGridBackground'
import { MarketingHeader } from '@/components/marketing/MarketingHeader'

export const Route = createFileRoute('/_marketing')({
  component: MarketingLayout,
})

function MarketingLayout() {
  return (
    <MarketingGridBackground className="flex min-h-screen flex-col text-foreground">
      <MarketingHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </MarketingGridBackground>
  )
}

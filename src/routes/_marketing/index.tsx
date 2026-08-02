import { createFileRoute } from '@tanstack/react-router'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { MarketingHero } from '@/components/marketing/MarketingHero'

export const Route = createFileRoute('/_marketing/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <>
      <MarketingHero />
      <HowItWorks />
    </>
  )
}

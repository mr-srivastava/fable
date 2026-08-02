import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { MarketingWorkbenchPreview } from '@/components/marketing/MarketingWorkbenchPreview'
import { Button } from '@/components/ui/button'

export function MarketingHero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="animate-fade-in-up text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
          Turn JSON into <span className="text-primary">contract-ready</span>{' '}
          specimens
        </h1>
        <p className="animate-fade-in-up-delay-1 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Edit variants, infer field metadata, annotate your contract, and share
          stable links — built for API payloads and integration fixtures.
        </p>
      </div>

      <div className="animate-fade-in-up-delay-2 relative mx-auto mt-12 w-full max-w-5xl lg:mt-16">
        <div className="marketing-hero-glow pointer-events-none absolute -inset-8 rounded-3xl" />
        <MarketingWorkbenchPreview />
      </div>

      <div className="animate-fade-in-up-delay-2 mt-10 flex flex-wrap items-center justify-center gap-3 lg:mt-12">
        <Button
          render={<Link to="/playground" />}
          nativeButton={false}
          size="lg"
        >
          Open playground
          <ArrowRight aria-hidden className="size-4" />
        </Button>
        <Button
          render={<a href="#how-it-works" />}
          nativeButton={false}
          variant="outline"
          size="lg"
        >
          How it works
        </Button>
      </div>
    </section>
  )
}

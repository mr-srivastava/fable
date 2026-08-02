import { Link } from '@tanstack/react-router'
import { SiteBrandLink } from '@/components/SiteBrandLink'
import { Button } from '@/components/ui/button'

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <SiteBrandLink />

        <nav
          aria-label="Marketing"
          className="hidden items-center gap-8 md:flex"
        >
          <a
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <Link
            to="/playground"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Playground
          </Link>
        </nav>

        <Button
          render={<Link to="/playground" />}
          nativeButton={false}
          size="sm"
          className="shrink-0"
        >
          Open playground
        </Button>
      </div>
    </header>
  )
}

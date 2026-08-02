import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAINTAINER_SITE = 'https://aadarsh.online'

type SiteFooterProps = {
  clearFixedToolbar?: boolean
}

export function SiteFooter({ clearFixedToolbar = false }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        'border-t border-border/60 bg-background',
        clearFixedToolbar && 'mb-[calc(4.5rem+env(safe-area-inset-bottom))]',
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-12">
          <div className="space-y-3">
            <p className="font-mono text-sm font-semibold tracking-tight">
              Specimen
            </p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              A JSON inspection workbench for editing variants, inferring
              lightweight contracts, and sharing stable specimen links.
            </p>
          </div>

          <div className="space-y-4">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Maintainer
            </p>
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                Maintained by{' '}
                <a
                  href={MAINTAINER_SITE}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Aadarsh
                </a>
              </p>
              <p className="leading-relaxed text-muted-foreground">
                Projects, writing, and contact details live at{' '}
                <a
                  href={MAINTAINER_SITE}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  aadarsh.online
                </a>
                .
              </p>
              <a
                href={MAINTAINER_SITE}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Visit aadarsh.online
                <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border/40 pt-8">
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
          >
            <Link
              to="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <Link
              to="/playground"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Playground
            </Link>
            <a
              href={MAINTAINER_SITE}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              aadarsh.online
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

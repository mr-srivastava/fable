import { Link, useRouterState } from '@tanstack/react-router'
import { SiteBrandLink } from '@/components/SiteBrandLink'
import { Button } from '@/components/ui/button'

export default function Header() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isPlaygroundRoute = pathname === '/playground'

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 text-foreground backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <SiteBrandLink />
        <div className="flex items-center gap-2">
          {!isPlaygroundRoute && (
            <Button
              render={<Link to="/playground" />}
              nativeButton={false}
              variant="default"
              size="sm"
              className="shrink-0"
            >
              New specimen
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

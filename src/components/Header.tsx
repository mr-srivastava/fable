import { Link, useRouterState } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Header() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isCreateRoute = pathname === '/'

  return (
    <header className="border-b bg-background/95 text-foreground backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <h1 className="font-mono text-lg font-semibold tracking-tight">
          <Link to="/" className="hover:opacity-90">
            Specimen
          </Link>
        </h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!isCreateRoute && (
            <Button asChild variant="default" size="sm">
              <Link to="/">New specimen</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

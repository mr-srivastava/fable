import { Link, useRouterState } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

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
          {!isCreateRoute && (
            <Button
              render={<Link to="/" />}
              nativeButton={false}
              variant="default"
              size="sm"
            >
              New specimen
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

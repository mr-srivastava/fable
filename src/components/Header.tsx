import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Header() {
  return (
    <header className="border-b bg-background text-foreground shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          <Link to="/" className="hover:opacity-90">
            Fable
          </Link>
        </h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="default" size="sm">
            <Link to="/">Create new</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export default function Header() {
  return (
    <header className="border-b bg-background text-foreground shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">
          <Link to="/" className="hover:opacity-90">
            Fable
          </Link>
        </h1>
        <Button asChild variant="default" size="sm">
          <Link to="/">Create new</Link>
        </Button>
      </div>
    </header>
  )
}

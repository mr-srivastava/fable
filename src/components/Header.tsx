import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="border-b bg-background text-foreground shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
        <h1 className="text-xl font-semibold">
          <Link to="/" className="hover:opacity-90">
            Fable
          </Link>
        </h1>
      </div>
    </header>
  )
}

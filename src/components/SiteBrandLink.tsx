import { Link } from '@tanstack/react-router'
import { Braces } from 'lucide-react'

export function SiteBrandLink() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 font-mono text-lg font-semibold tracking-tight hover:opacity-90"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Braces aria-hidden className="size-4" />
      </span>
      Specimen
    </Link>
  )
}

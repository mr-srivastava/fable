import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Home, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="flex items-center border-b bg-background p-4 text-foreground shadow-sm">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label="Open menu"
            >
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-64 flex-col p-0 sm:max-w-[16rem]"
            showCloseButton={false}
          >
            <SheetHeader className="flex flex-row items-center justify-between space-y-0 border-b px-4 py-4">
              <SheetTitle className="text-lg">Navigation</SheetTitle>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </Button>
              </SheetClose>
            </SheetHeader>
            <nav className="flex-1 overflow-y-auto p-4">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 font-medium transition-colors hover:bg-muted"
                activeProps={{
                  className:
                    'flex items-center gap-3 rounded-lg bg-primary p-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90',
                }}
              >
                <Home className="size-5" />
                Create blob
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
        <h1 className="ml-4 text-xl font-semibold">
          <Link to="/" className="hover:opacity-90">
            Fable
          </Link>
        </h1>
      </header>
    </>
  )
}

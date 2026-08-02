import type { CSSProperties } from 'react'

const STEPS = [
  {
    title: 'Paste or edit JSON',
    description:
      'Start with one or more named examples. Specimen validates JSON as you type and keeps every example in sync.',
  },
  {
    title: 'Infer a contract',
    description:
      'Quicktype analyzes all valid examples to infer required fields, nullability, and mixed types across your payload.',
  },
  {
    title: 'Annotate fields',
    description:
      'Add descriptions and enumerated values. Compatibility diagnostics flag examples that likely represent different contracts.',
  },
  {
    title: 'Save and share',
    description:
      'Persist to Convex and share a stable /blob/:id link. The primary payload is also available through GET /api/blob/:id.',
  },
] as const

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="border-t bg-card/80"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-primary">
            Workflow
          </p>
          <h2
            id="how-it-works-heading"
            className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            How it works
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Specimen turns representative JSON into an annotated contract you
            can save, share, and export.
          </p>
        </div>

        <ol className="mt-16 grid gap-6 sm:grid-cols-2 lg:gap-8">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="marketing-elevated-sm animate-fade-in-up-stagger rounded-xl bg-background p-7 sm:p-8"
              style={
                {
                  '--stagger-delay': `${index * 60}ms`,
                } as CSSProperties
              }
            >
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

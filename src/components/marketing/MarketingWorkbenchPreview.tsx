const CONTRACT_FIELDS = [
  { path: 'user', type: 'object' },
  { path: 'user.id', type: 'string' },
  { path: 'user.email', type: 'string' },
  { path: 'plan', type: 'string' },
] as const

function JsonPreview() {
  return (
    <pre className="overflow-x-auto rounded-md border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground shadow-xs sm:text-xs">
      <code>
        <span className="text-muted-foreground">{'{'}</span>
        {'\n'}
        <span className="text-syntax-property">{'  "user"'}</span>
        <span className="text-muted-foreground">: </span>
        <span className="text-muted-foreground">{'{'}</span>
        {'\n'}
        <span className="text-syntax-property">{'    "id"'}</span>
        <span className="text-muted-foreground">: </span>
        <span className="text-syntax-string">"usr_01"</span>
        <span className="text-muted-foreground">,</span>
        {'\n'}
        <span className="text-syntax-property">{'    "email"'}</span>
        <span className="text-muted-foreground">: </span>
        <span className="text-syntax-string">"avery@example.com"</span>
        {'\n'}
        <span className="text-muted-foreground">{'  }'}</span>
        <span className="text-muted-foreground">,</span>
        {'\n'}
        <span className="text-syntax-property">{'  "plan"'}</span>
        <span className="text-muted-foreground">: </span>
        <span className="text-syntax-string">"pro"</span>
        {'\n'}
        <span className="text-muted-foreground">{'}'}</span>
      </code>
    </pre>
  )
}

export function MarketingWorkbenchPreview() {
  return (
    <div
      role="img"
      aria-label="Preview of the Specimen workbench with Payload and Contract Inspector panels"
      className="workbench-elevated overflow-hidden rounded-2xl bg-card"
    >
      <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:divide-x">
        <div className="space-y-4 p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Payload</h2>
          </div>

          <div className="flex items-center gap-2 border-b pb-2">
            <span className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium">
              Example 1
            </span>
          </div>

          <JsonPreview />
        </div>

        <div className="space-y-4 border-t bg-muted/15 p-5 sm:p-6 md:border-t-0">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">
              Contract Inspector
            </h2>
          </div>

          <div className="overflow-hidden rounded-md border bg-background shadow-xs">
            {CONTRACT_FIELDS.map((field) => (
              <div
                key={field.path}
                className="flex items-center justify-between gap-3 border-b px-3 py-2.5 text-sm last:border-b-0"
              >
                <code className="truncate font-mono text-xs text-foreground">
                  {field.path}
                </code>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {field.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

# Agent guide

This file contains the repository-wide rules for automated coding agents. Read
it before changing code, then load only the files relevant to the current task.

## Product

Specimen is a JSON inspection workbench. You can edit multiple example
payloads, infer a lightweight contract, annotate fields, save the result to
Convex, and share it through a stable `/blob/:id` URL.

The public product name is **Specimen**. Internally, persisted records and new
code use **document** terminology. The `blob` name remains at public URL and
HTTP compatibility seams.

## Technology

The application uses React 19, TypeScript, TanStack Start and Router, Convex,
Tailwind CSS, CodeMirror, Valibot, Vitest, ESLint, and Prettier. Use `pnpm` for
all package and script commands.

## Commands

Use these commands from the repository root:

- Start the web application: `pnpm run dev`
- Start the Convex backend: `pnpm exec convex dev`
- Run unit tests: `pnpm run test`
- Run static checks: `pnpm run check`
- Build the application: `pnpm run build`
- Run the full local gate: `pnpm run preflight`

Run focused tests while iterating, then run `pnpm run test` and
`pnpm run preflight` before handing off a change.

## Repository map

The important modules are organized as follows:

- `src/routes/` owns route loading, persistence calls, and navigation.
- `src/components/` contains presentation modules and UI primitives.
- `src/hooks/use-document-draft.ts` adapts the pure draft module to React.
- `src/lib/document-draft.ts` owns document editing transitions.
- `src/lib/contract/` owns contract inference, diagnostics, display, and edits.
- `src/lib/json/` owns JSON parsing, formatting, and per-example validation.
- `src/config/` owns validated frontend configuration.
- `shared/` contains domain schemas, limits, and persistence preparation used
  by both the frontend and Convex.
- `convex/` contains the storage schema, functions, and public HTTP adapter.

Read `docs/architecture.md` for data flow and module seams. Read
`docs/domain-model.md` before changing stored documents, contract inference,
limits, or public blob compatibility.

## Change workflow

Before editing, read the target file, its tests, and one neighboring example of
the same pattern. Keep changes focused and separate behavior-preserving
refactors from product behavior changes.

Follow these rules when implementing:

- Keep route modules thin. Put document editing behavior in the document-draft
  module and pure contract behavior in `src/lib/contract/`.
- Validate untrusted input at HTTP, configuration, form, and persistence seams.
- Keep presentation modules free of persistence and domain synchronization.
- Use the shared document schemas instead of duplicating TypeScript shapes.
- Add tests at a module's interface. Avoid tests that depend on private helpers.
- Prefer additive changes at public interfaces. Preserve documented status
  codes, response fields, URL shapes, and error codes.
- Do not add a port or adapter interface until at least two implementations are
  justified, normally production and test implementations.

## Domain invariants

Preserve these invariants unless the task explicitly changes them:

- Every document has at least one example.
- The active example ID refers to an existing example.
- Stored `data` equals the first example's JSON. It is a legacy projection, not
  a second writable source of truth.
- Each example contains valid JSON and is at most 100 KiB.
- A document contains at most 20 examples and is at most 512 KiB in total.
- Contract fields are inferred from all valid examples.
- Re-inference preserves editable `description` and `enumValues` metadata for
  paths that still exist.
- Invalid JSON disables contract analysis without discarding the last contract.
- Public `/blob/:id` and `/api/blob` paths remain compatibility interfaces.

## Generated files

Never edit these files manually:

- `convex/_generated/**`
- `src/routeTree.gen.ts`

Regenerate Convex types with the Convex development command. TanStack Router
regenerates the route tree from files in `src/routes/`.

## Safety boundaries

Never commit secrets or local environment files. Ask before adding a dependency,
changing authentication or authorization, removing a public compatibility
field, or performing a destructive data migration.

Treat schema changes as migrations. Account for records created before
`examples`, `contract`, or `totalSize` existed.

## Documentation

Update documentation in the same change when commands, environment variables,
module seams, limits, domain invariants, or public HTTP behavior change. Keep
Markdown concise, use sentence-case headings, and verify relative links.

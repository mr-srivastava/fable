# Contributing

This guide describes the local development and verification workflow for
Specimen. Read `AGENTS.md` as well when using an automated coding agent.

## Prepare the environment

Install dependencies and initialize Convex before starting development:

```bash
pnpm install
pnpm exec convex dev
```

Copy `.env.example` to `.env.local` if Convex doesn't create the file. Never
commit real deployment credentials or local environment files.

## Make a change

Keep each change focused and reviewable. Follow this workflow:

1. Read the relevant module, its tests, and its callers.
2. Add characterization tests before refactoring unclear behavior.
3. Put domain behavior behind a small, testable module interface.
4. Update tests and documentation with the implementation.
5. Run focused checks while iterating.
6. Run the complete verification gate before requesting review.

Don't mix an unrelated refactor into a feature or bug-fix change. Avoid editing
generated files under `convex/_generated/` or `src/routeTree.gen.ts`.

## Verify the change

Run the complete local gate:

```bash
pnpm run test
pnpm run preflight
```

Tests use Vitest in a Node environment and include `src/**/*.test.ts`. Add tests
at stable module interfaces rather than private implementation details.

## Change persisted data

Treat every Convex schema update as a migration. Preserve compatibility with
older records that may not contain `examples`, `contract`, or `totalSize`.

Before changing persistence, document:

- The old and new record shapes.
- How existing records remain readable.
- Whether a backfill is required.
- How the change can be rolled back.

Ask for explicit approval before destructive migrations or removal of legacy
fields.

## Change the public interface

The `/blob/:id`, `POST /api/blob`, and `GET /api/blob/:id` interfaces may have
external consumers. Prefer additive response fields, stable error codes, and
optional inputs. Document any intentional breaking change and provide a
migration path.

## Update documentation

Update `README.md`, `AGENTS.md`, or the relevant file under `docs/` when a
change affects setup, commands, environment variables, architecture, domain
invariants, limits, or public behavior.

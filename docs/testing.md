# Testing

Specimen organizes tests by the runtime they need and the product boundary they
exercise. This guide defines where tests live, how they are named, and which
shared test utilities to use.

## Test taxonomy

Choose the narrowest test type that can verify Specimen-owned behavior through
a stable public interface.

- **Unit tests** verify pure domain transitions, validation, adapters, state
  machines, and view-model derivation in Node. Keep them next to the owning
  `.ts` module and name them `<module>.test.ts`.
- **Component tests** verify rendered behavior, accessibility, callbacks, and
  user interactions in JSDOM. Keep them next to the owning `.tsx` component and
  name them `<Component>.test.tsx`.
- **Backend integration tests** verify Convex functions, validators, and stored
  projections. Keep them under `convex/` next to the owning module and name
  them `<module>.test.ts`.
- **Browser tests** verify a small number of critical workflows that depend on
  real browser APIs, layout, workers, routing, or hydration. Keep them under a
  dedicated browser-test directory when that project is introduced.

Tests for neutral modules belong under `shared/`, not under `src/`. Tests for
generated files are not permitted.

## Vitest projects

`vitest.config.ts` separates tests by runtime. The `unit` project discovers
`.test.ts` files under `src/`, `shared/`, and `convex/` and runs them in Node.
The `component` project discovers `.test.tsx` files under `src/` and runs them
in JSDOM.

The file extension is therefore part of the runtime convention:

- Use `.test.ts` for Node tests.
- Use `.test.tsx` for JSDOM component tests.

Don't add file-level `@vitest-environment` comments. If a test needs a
different runtime, add it to an explicit Vitest project so discovery and setup
remain centralized.

## Test structure

Write tests around behavior that a caller or user can observe. Use descriptive
test names that state the result or rule, such as `rejects duplicate example
IDs` or `returns focus to the renamed tab`.

For component tests, query elements by accessible role, label, or visible text.
Use `userEvent.setup()` for user interactions. Use `fireEvent` only for a
low-level event that doesn't have a realistic `userEvent` equivalent. Don't
assert third-party DOM structure, generated class names, library data
attributes, or animation timing unless Specimen depends on that contract.

Mock expensive or external boundaries, such as CodeMirror, a browser worker,
persistence, or the network. Don't mock pure Specimen modules merely to make a
test easier to arrange.

## Shared test utilities

Shared utilities remove mechanical setup while keeping each test's intent
visible.

- `src/test/setup/dom.ts` registers DOM matchers, cleanup, and missing JSDOM
  browser APIs for every component test.
- `src/test/factories/document.ts` constructs canonical document examples with
  focused overrides.
- `src/test/factories/document-editor.ts` constructs editor view models and
  command spies with focused overrides.
- `convex/test.setup.ts` creates an isolated `convex-test` backend with the
  production schema and function modules.

Prefer a shared factory when a canonical domain object or boundary interface
appears in multiple test files. Keep one-off inputs inside their test. Don't
put assertions, component-specific render functions, or test-specific expected
values in a shared factory.

## Running tests

Run the complete suite from the repository root with:

```sh
pnpm run test
```

During iteration, pass a file path or test-name filter through the existing
Vitest command. Before handing off a change, run both `pnpm run test` and
`pnpm run preflight` as described in the repository agent guide.

# Architecture

Specimen separates pure document behavior from React presentation and Convex
persistence. This guide explains the stable module seams and the direction of
dependencies.

## System flow

The create and view routes load or initialize a document draft, pass it to the
editor presentation, and persist a canonical write input through Convex.

```text
TanStack route
  -> React document-draft adapter
    -> pure document-draft module
      -> contract inference and diagnostics
  -> Convex generated client
    -> document mutation
      -> shared persistence preparation
        -> Convex database
```

Public HTTP requests enter through `convex/http.ts` and call the same Convex
document mutation as the browser application.

## Document draft seam

`src/lib/document-draft.ts` is the main editing module. Its interface owns
example transitions, active selection, contract synchronization, validation,
snapshot generation, and persistence preparation.

`src/hooks/use-document-draft.ts` is a React adapter over that interface. Route
modules use the adapter but remain responsible only for loading, saving,
navigation, and route-specific presentation.

Tests exercise the pure draft interface. They don't render React or inspect
private state inside presentation modules.

## Contract modules

Contract behavior is divided by responsibility:

- `inferContract.ts` traverses JSON and infers contract fields.
- `analyzeContractCompatibility.ts` evaluates similarity and divergence.
- `mergeContractEdits.ts` preserves editable annotations after inference.
- `contractTree.ts` prepares inferred paths for display.

These are in-process modules. They remain pure and require no adapter seam.

## Shared domain modules

The `shared/` directory is neutral code consumed by both the frontend and
Convex:

- `document.ts` defines Valibot schemas and TypeScript domain types.
- `document-limits.ts` defines storage limits and UTF-8 sizing.
- `document-write.ts` validates and prepares canonical persistence records.

Convex-specific validators live in `convex/documentModel.ts` because they are
tied to the Convex runtime. The schema and functions reuse those validators.

## Persistence seam

Callers submit `examples` and an optional `contract`. The persistence module
derives these stored projections:

- `data` contains the first example for legacy readers.
- `size` contains the first example's UTF-8 byte size.
- `totalSize` contains the serialized document payload size.
- `metadata.version` identifies the stored representation.

The projections are implementation details. Callers must not provide or
synchronize them.

## Configuration seam

`src/config/public-config.ts` validates browser configuration once. Required
configuration fails early instead of constructing partially configured clients.

Server configuration is read only inside the Convex HTTP adapter. `SITE_URL`
takes precedence over `CONVEX_SITE_URL` when producing share links.

## Generated code

TanStack Router generates `src/routeTree.gen.ts`. Convex generates files under
`convex/_generated/`. Treat generated code as output and change its source
configuration instead.

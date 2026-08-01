# Architecture

Specimen separates pure document behavior from React presentation and Convex
persistence. This guide explains the stable module seams and the direction of
dependencies.

## System flow

The create and view routes load or initialize a document draft, pass it to the
editor presentation, and persist a canonical write input through Convex.

```text
TanStack route
  -> React document-editor controller
    -> XState document-editor machine
      -> pure document-draft module
      -> contract worker and persistence actors
    -> UI view model and commands
      -> editor presentation
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

Valid examples are sent to a debounced browser worker for Quicktype inference.
The worker returns a JSON Schema Draft 7 contract without blocking the editor.
The draft applies user-authored overrides, validates every example with Ajv,
and derives the flattened compatibility contract used by the inspector.

`src/lib/document-editor-machine.ts` coordinates analysis, persistence, and
export as parallel XState regions. It invokes Quicktype, TypeScript generation,
and route-provided persistence as actors. Editing events call the pure draft
transitions instead of duplicating domain behavior in machine assignments.
An in-flight save retains the snapshot it submitted, so later edits remain
dirty after the save finishes. An edit that cancels TypeScript generation
settles the export command with an explicit cancellation error.

`src/hooks/use-document-editor.ts` owns the machine actor and browser worker
lifecycle. It exposes a `model` and `commands` interface defined by
`src/lib/document-editor-model.ts`. Presentation modules don't consume XState
snapshots, Comlink proxies, Convex mutations, or writable compatibility
contracts.

Routes initialize the draft, inject create or update persistence, and handle
navigation. The same editor controller serves create and saved views.

Tests exercise pure draft transitions, machine events and snapshots, and the
derived UI view model. They don't inspect private state inside presentation
modules.

## Contract modules

Contract behavior is divided by responsibility:

- `inferContract.ts` traverses JSON and infers contract fields.
- `analyzeContractCompatibility.ts` evaluates similarity and divergence.
- `mergeContractEdits.ts` preserves editable annotations after inference.
- `contractTree.ts` prepares inferred paths for display.
- `quicktype.ts` adapts Quicktype inference and TypeScript generation.
- `shared/json-schema.ts` applies overrides, projects display fields, resolves
  local references, and validates examples with Ajv.

The compatibility diagnostics remain pure and in-process. Quicktype runs only
in the browser worker because inference and code generation are asynchronous
and comparatively expensive.

The worker boundary uses Comlink for typed request correlation, errors, and
proxy cleanup. A contract-specific client owns the worker lifecycle and adds
local request cancellation to the `infer` and `generateTypeScript` methods, so
React code doesn't handle message IDs, proxies, or raw worker events.

## Presentation seam

`JsonEditorPanel` renders the editor view model and sends commands. The model
uses discriminated states for contract analysis, submission, and export, so
unavailable capabilities include a stable reason instead of unrelated status
and `disabled` flags.

Contract fields emit JSON-Pointer override commands. The document draft applies
those commands to the inferred schema and derives the flattened contract. This
keeps the compatibility projection read-only at the presentation boundary.

Components retain local state only for visual interaction, such as expanded
diagnostics or an enum input draft. Workflow state and asynchronous errors live
in the editor machine.

## Shared domain modules

The `shared/` directory is neutral code consumed by both the frontend and
Convex:

- `document.ts` defines Valibot schemas and TypeScript domain types.
- `document-limits.ts` defines storage limits and UTF-8 sizing.
- `document-write.ts` validates and prepares canonical persistence records.
- `json-schema.ts` owns the shared JSON Schema and Ajv boundary.

Convex-specific validators live in `convex/documentModel.ts` because they are
tied to the Convex runtime. The schema and functions reuse those validators.

## Persistence seam

Callers submit `examples`, the effective `jsonSchema`, authored
`contractOverrides`, and the flattened compatibility `contract`. The
persistence module revalidates the inputs, reapplies surviving overrides,
normalizes the effective schema, and derives these stored projections:

- `data` contains the first example for legacy readers.
- `contract` contains the flattened view derived from the effective schema.
- `size` contains the first example's UTF-8 byte size.
- `totalSize` contains the serialized document payload size.
- `metadata.version` identifies the stored representation.

The persistence module rejects override pointers that don't resolve against
the schema. Derived projections are implementation details; callers don't
synchronize them independently.

Version 2 records store JSON Schema as the canonical contract. The flattened
contract remains an additive compatibility projection during migration.

## Configuration seam

`src/config/public-config.ts` validates browser configuration once. Required
configuration fails early instead of constructing partially configured clients.

Server configuration is read only inside the Convex HTTP adapter. `SITE_URL`
takes precedence over `CONVEX_SITE_URL` when producing share links.

## Generated code

TanStack Router generates `src/routeTree.gen.ts`. Convex generates files under
`convex/_generated/`. Treat generated code as output and change its source
configuration instead.

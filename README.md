# Specimen

Specimen is a JSON inspection workbench for building and sharing representative
payloads. It infers lightweight contract metadata across multiple examples and
lets you annotate the resulting fields.

## Capabilities

Specimen provides the following core workflows:

- Edit and format JSON with inline validation.
- Maintain multiple examples for one document.
- Infer required, nullable, and mixed-type contract fields.
- Annotate fields with descriptions and enumerated values.
- Detect examples that likely represent separate contracts.
- Save documents to Convex and share stable links.
- Read the primary JSON payload through a public HTTP endpoint.

## Local development

You need a current Node.js release, `pnpm`, and a Convex project. Copy
`.env.example` to `.env.local`, then let Convex populate the deployment values
or set them manually.

Run the frontend and Convex backend in separate terminals:

```bash
pnpm install
pnpm exec convex dev
```

```bash
pnpm run dev
```

The web application listens on `http://localhost:3000` by default.

## Environment variables

The application uses these variables:

- `VITE_CONVEX_URL` is required by the browser application.
- `CONVEX_DEPLOYMENT` identifies the local or hosted Convex deployment.
- `VITE_SHOW_DEVTOOLS=true` enables development panels in development mode.
- `SITE_URL` controls share URLs returned by the public HTTP endpoint.
- `CONVEX_SITE_URL` is the fallback share URL when `SITE_URL` is absent.

## Verification

Use the following commands to verify changes:

```bash
pnpm run test
pnpm run check
pnpm run build
pnpm run preflight
```

`preflight` runs formatting, linting, type checking, and a production build.

## Public HTTP interface

Create a document by posting any valid JSON value:

```bash
curl --request POST \
  --header 'Content-Type: application/json' \
  --data '{"name":"Avery"}' \
  "$CONVEX_SITE_URL/api/blob"
```

A successful response contains the document ID and share URL:

```json
{
  "id": "document_id",
  "url": "https://example.com/blob/document_id"
}
```

Read the primary payload with `GET /api/blob/:id`. Error responses retain the
legacy `error` string and include a machine-readable `code`.

## Architecture and contribution

Read the following guides before making substantial changes:

- [Architecture](docs/architecture.md)
- [Domain model](docs/domain-model.md)
- [Contribution guide](CONTRIBUTING.md)
- [Agent guide](AGENTS.md)

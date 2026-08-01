# Domain model

Specimen stores JSON examples and an inferred contract as one document. This
guide defines the terms, invariants, limits, and compatibility behavior that
implementations must preserve.

## Document

A document is the persisted aggregate. It contains one or more examples and an
optional inferred contract. New internal code uses the term `document`.

Older code and public interfaces use the term `blob`. The public term is a
compatibility commitment, not the preferred internal domain name.

## Example

An example is a named JSON string with a stable ID and timestamps. A document
always contains at least one example, and the active example ID always refers
to an example in the draft.

The first example is the primary example. Persistence copies its JSON into the
legacy `data` field so older readers and `GET /api/blob/:id` continue to work.

## Contract

A contract is inferred from all valid examples. Each field records:

- Its dot-separated path.
- Its inferred JSON type.
- Whether it appears in every example.
- Whether any observed value is `null`.
- Optional user-authored enumerated values.
- An optional user-authored description.

When examples change, inference replaces structural facts while preserving the
description and enumerated values for paths that still exist.

Invalid JSON temporarily disables inference. The draft retains the last valid
contract so a temporary editing error doesn't destroy annotations.

## Compatibility diagnostics

Contract diagnostics compare paths and top-level fields across examples. Shared
envelope fields or discriminator fields suppress false-positive divergence
warnings. Otherwise, sufficiently dissimilar examples with many optional
fields are grouped and shown as likely separate contracts.

These thresholds are product behavior. Update their tests and this guide when
changing them.

## Limits

Persistence enforces all of these limits:

- Each example is at most 100 KiB of UTF-8 JSON.
- Each document contains at most 20 examples.
- The serialized examples and contract are at most 512 KiB in total.

The editor displays the per-example limit. The backend remains authoritative
for both per-example and total-document limits.

## Public compatibility

The following interfaces retain the legacy `blob` name:

- Browser route: `/blob/:id`
- Create endpoint: `POST /api/blob`
- Read endpoint: `GET /api/blob/:id`

HTTP error responses contain a human-readable `error` string and a stable
machine-readable `code`. Add fields instead of removing or changing existing
fields whenever possible.

## Legacy records

Records created by older versions may contain only `data`, `size`, and metadata.
The frontend normalizes those records into a single default example. New
optional fields must preserve that read path until a deliberate migration and
deprecation process removes it.

export const MAX_VARIANT_BYTES = 100 * 1024
export const MAX_DOCUMENT_BYTES = 512 * 1024
export const MAX_VARIANTS_PER_DOCUMENT = 20

export function getUtf8Size(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

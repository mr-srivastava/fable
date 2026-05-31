import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

const http = httpRouter()
const DOCUMENT_ID_PATTERN = /^[a-z0-9_]+$/i

function getJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

function parseDocumentId(raw: string): Id<'documents'> | null {
  if (raw.length < 10 || raw.length > 64 || !DOCUMENT_ID_PATTERN.test(raw)) {
    return null
  }
  return raw as Id<'documents'>
}

http.route({
  path: '/api/blob',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return getJsonResponse({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const data = JSON.stringify(body)

    try {
      const blobId = await ctx.runMutation(api.documents.create, { data })
      const siteUrl =
        process.env.SITE_URL ?? process.env.CONVEX_SITE_URL ?? 'http://localhost:3000'
      const url = `${siteUrl}/blob/${blobId}`

      return getJsonResponse({ id: blobId, url }, { status: 201 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create blob'
      return getJsonResponse({ error: message }, { status: 400 })
    }
  }),
})

http.route({
  pathPrefix: '/api/blob/',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const rawId = decodeURIComponent(url.pathname.replace('/api/blob/', ''))
    const id = parseDocumentId(rawId)

    if (!id) {
      return getJsonResponse({ error: 'Invalid blob id' }, { status: 400 })
    }

    const document = await ctx.runQuery(api.documents.get, { id })

    if (!document) {
      return getJsonResponse({ error: 'Blob not found' }, { status: 404 })
    }

    return new Response(document.data, {
      headers: { 'Content-Type': 'application/json' },
    })
  }),
})

export default http

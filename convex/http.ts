import { httpRouter } from 'convex/server'
import { parseDocumentId } from '../shared/document'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

const http = httpRouter()

function getJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

function getErrorResponse(code: string, message: string, status: number) {
  return getJsonResponse({ error: message, code }, { status })
}

http.route({
  path: '/api/blob',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return getErrorResponse('INVALID_JSON', 'Invalid JSON body', 400)
    }

    const data = JSON.stringify(body)

    try {
      const now = Date.now()
      const blobId = await ctx.runAction(api.documentWrites.create, {
        variants: [
          {
            id: 'default',
            name: 'Variant',
            data,
            createdAt: now,
          },
        ],
      })
      const siteUrl =
        process.env.SITE_URL ??
        process.env.CONVEX_SITE_URL ??
        'http://localhost:3000'
      const url = `${siteUrl}/blob/${blobId}`

      return getJsonResponse({ id: blobId, url }, { status: 201 })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create blob'
      return getErrorResponse('VALIDATION_ERROR', message, 400)
    }
  }),
})

http.route({
  pathPrefix: '/api/blob/',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const rawId = decodeURIComponent(url.pathname.replace('/api/blob/', ''))
    const id = parseDocumentId<Id<'documents'>>(rawId)

    if (!id) {
      return getErrorResponse('INVALID_BLOB_ID', 'Invalid blob id', 400)
    }

    const document = await ctx.runQuery(api.documents.get, { id })

    if (!document) {
      return getErrorResponse('BLOB_NOT_FOUND', 'Blob not found', 404)
    }

    return new Response(document.data, {
      headers: { 'Content-Type': 'application/json' },
    })
  }),
})

export default http

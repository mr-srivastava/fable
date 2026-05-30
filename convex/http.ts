import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'

const http = httpRouter()

http.route({
  path: '/api/blob',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const data = JSON.stringify(body)

    try {
      const blobId = await ctx.runMutation(api.blobs.create, { data })
      const siteUrl =
        process.env.SITE_URL ?? process.env.CONVEX_SITE_URL ?? 'http://localhost:3000'
      const url = `${siteUrl}/blob/${blobId}`

      return new Response(
        JSON.stringify({ id: blobId, url }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create blob'
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }),
})

export default http

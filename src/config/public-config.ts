export type PublicConfig = {
  convexUrl: string
  showDevtools: boolean
}

type PublicEnvironment = {
  VITE_CONVEX_URL?: string
  VITE_SHOW_DEVTOOLS?: string
}

export function loadPublicConfig(environment: object): PublicConfig {
  const env = environment as PublicEnvironment
  const convexUrl = env.VITE_CONVEX_URL?.trim()
  if (!convexUrl) {
    throw new Error('VITE_CONVEX_URL is required')
  }

  return {
    convexUrl,
    showDevtools: env.VITE_SHOW_DEVTOOLS === 'true',
  }
}

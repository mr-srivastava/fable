import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { publicConfig } from '@/config/runtime'

const convexClient = new ConvexReactClient(publicConfig.convexUrl)

export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ConvexProvider client={convexClient}>{children}</ConvexProvider>
  )
}

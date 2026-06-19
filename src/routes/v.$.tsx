import { useParams } from "@tanstack/react-router"

export function FileViewRoute() {
  const params = useParams({ strict: false })
  const filePath = (params as Record<string, string>)._splat ?? ""

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <code className="rounded bg-muted px-3 py-1.5 text-sm">
          {filePath}
        </code>
        <p className="mt-4 text-muted-foreground">
          Editor will be implemented in plan 003
        </p>
      </div>
    </div>
  )
}

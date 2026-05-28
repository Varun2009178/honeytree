// Best-effort extraction of a planted-tree id from Good API's response.
// Returns null if the shape is unrecognized — callers must NOT treat null as failure.
export function parseTreeId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, any>
  return (
    d.tree_details?.[0]?.id ??
    d.id ??
    d.data?.id ??
    d.data?.tree_details?.[0]?.id ??
    null
  )
}

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

export function parseLocation(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, any>
  const v =
    d.tree_details?.[0]?.country ??
    d.tree_details?.[0]?.location ??
    d.location ??
    d.country ??
    d.data?.location ??
    null
  return typeof v === "string" && v.trim() ? v : null
}

export function parseProject(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, any>
  const v =
    d.tree_details?.[0]?.project ??
    d.project ??
    d.project_name ??
    d.data?.project ??
    null
  return typeof v === "string" && v.trim() ? v : null
}

export function parseGlobalNumber(data: unknown): number | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, any>
  const v =
    d.global_number ??
    d.tree_number ??
    d.tree_details?.[0]?.number ??
    d.data?.global_number ??
    null
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

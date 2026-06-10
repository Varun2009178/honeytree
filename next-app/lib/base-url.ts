// The deployment's own origin, derived from the incoming request.
//
// We intentionally do NOT use NEXT_PUBLIC_APP_URL here: NEXT_PUBLIC_* vars are
// inlined at BUILD time (even in server code), so relying on one for redirects
// bakes in whatever value existed when the bundle was built and ignores runtime
// env. Reading the forwarded host/proto means redirects land on the real domain
// the request came in on — prod on prod, localhost on localhost — with no rebuild.
export function getBaseUrl(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
  if (!host) return new URL(req.url).origin
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")
  return `${proto}://${host}`
}

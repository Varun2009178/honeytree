import { NextRequest, NextResponse } from "next/server"

// Canonicalize the apex domain to www so window.location.origin (and every
// redirect derived from the request host) is always the same. Inconsistent
// hosts are the main cause of intermittent OAuth failures: a redirectTo built
// from tryhoney.xyz isn't allowlisted/matched the same as www.tryhoney.xyz.
const APEX = "tryhoney.xyz"
const CANONICAL = "www.tryhoney.xyz"

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase()
  if (host === APEX) {
    const url = req.nextUrl.clone()
    url.protocol = "https"
    url.host = CANONICAL
    url.port = ""
    return NextResponse.redirect(url, 308)
  }
  return NextResponse.next()
}

export const config = {
  // Skip Next internals, static assets, and webhook endpoints (external callers
  // like Stripe don't follow redirects — they must hit the configured host).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|api/webhooks).*)"],
}

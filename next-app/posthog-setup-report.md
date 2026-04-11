<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Honeydew Next.js landing page. The integration uses `instrumentation-client.ts` for client-side initialization (Next.js 15.3+ pattern), a reverse proxy via `next.config.mjs` rewrites for reliable ingestion, and a server-side `posthog-node` client for API route tracking. Users are identified at the point of waitlist signup using their email as the distinct ID, and the client-side session and distinct IDs are forwarded to the server via request headers so that both client and server events can be correlated.

## Files created or modified

| File | Change |
|---|---|
| `instrumentation-client.ts` | **Created** — initializes `posthog-js` with the reverse-proxy host, error tracking (`capture_exceptions`), and debug mode in development |
| `lib/posthog-server.ts` | **Created** — singleton `posthog-node` client for server-side event capture |
| `next.config.mjs` | **Modified** — added `/ingest` reverse proxy rewrites and `skipTrailingSlashRedirect: true` |
| `.env.local` | **Modified** — added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` |
| `app/page.tsx` | **Modified** — added PostHog import + 3 client-side events (see table below) |
| `app/api/waitlist/route.ts` | **Modified** — added server-side `waitlist_signup_completed` event with correlated distinct/session IDs |

## Tracked events

| Event | Description | File |
|---|---|---|
| `get_early_access_clicked` | User clicks the "Get early access" CTA in the hero section | `app/page.tsx` |
| `get_access_clicked` | User clicks the "Get Access" button in the navbar | `app/page.tsx` |
| `waitlist_form_submitted` | User submits the waitlist form (client-side, top of conversion funnel). Also calls `posthog.identify()` with the user's email. | `app/page.tsx` |
| `waitlist_signup_completed` | Server-side: waitlist email was successfully processed (correlated via `X-POSTHOG-DISTINCT-ID` / `X-POSTHOG-SESSION-ID` headers) | `app/api/waitlist/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/377570/dashboard/1455240
- **Waitlist Conversion Funnel** (Hero CTA → Form → Signup): https://us.posthog.com/project/377570/insights/g9Deuflh
- **Daily Waitlist Signups** (30-day trend): https://us.posthog.com/project/377570/insights/bfBPbUFB
- **CTA Clicks: Hero vs Navbar** (bar chart comparison): https://us.posthog.com/project/377570/insights/HlovTDuI
- **Total Waitlist Signups** (90-day count): https://us.posthog.com/project/377570/insights/YdhAwLko
- **Navbar CTA → Signup Funnel**: https://us.posthog.com/project/377570/insights/Bc0w62wi

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

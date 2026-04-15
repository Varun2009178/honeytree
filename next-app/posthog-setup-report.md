<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into this Next.js App Router project. PostHog client-side (`posthog-js`) and server-side (`posthog-node`) packages were already installed; the wizard built on that foundation by wiring up event capture at the key user-action points across the landing page and the Honeydew API routes. Environment variables were confirmed and updated in `.env.local`. The `instrumentation-client.ts` initialisation was updated to include the recommended `defaults: "2026-01-30"` option.

## Files modified

| File | Change |
|---|---|
| `instrumentation-client.ts` | Added `defaults: "2026-01-30"` to PostHog init config |
| `app/page.tsx` | Added `posthog-js` import; `command_copied` capture in `copyCommand`; `github_link_clicked` capture on GitHub nav link |
| `app/api/research/route.ts` | Imported `getPostHogClient`; `research_limit_reached` capture on 429 response; `research_generated` capture after successful stream completion |

## Tracked events

| Event | Description | File |
|---|---|---|
| `command_copied` | User copies a CLI install/init command from the landing page | `app/page.tsx` |
| `github_link_clicked` | User clicks the GitHub header link — top of conversion funnel | `app/page.tsx` |
| `research_generated` | AI research brief successfully streamed for a LinkedIn profile | `app/api/research/route.ts` |
| `research_limit_reached` | User exhausted the 3-generation free tier cap | `app/api/research/route.ts` |
| `waitlist_signup_completed` | Waitlist signup stored and notification sent *(pre-existing)* | `app/api/waitlist/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/382616/dashboard/1469072
- **Waitlist conversion funnel** (GitHub click → command copied → signup): https://us.posthog.com/project/382616/insights/MvwgRON9
- **Research generations over time**: https://us.posthog.com/project/382616/insights/p6TVHrxx
- **CLI commands copied by step**: https://us.posthog.com/project/382616/insights/D0naqSK4
- **Research limit reached (churn signal)**: https://us.posthog.com/project/382616/insights/jE6db1mQ
- **Waitlist signups over time**: https://us.posthog.com/project/382616/insights/5UPFUIqx

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

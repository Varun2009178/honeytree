import posthog from "posthog-js"

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

if (token) {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: false,
    disable_session_recording: true,
    autocapture: false,
    debug: process.env.NODE_ENV === "development",
    advanced_disable_decide: true,
  })
}

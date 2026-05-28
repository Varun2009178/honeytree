"use client"

export default function AuthCallbackPage() {
  return (
    <div className="shell">
      <div className="shell-inner">
        <div className="callback-page">
          <div className="callback-icon">&#127794;</div>
          <h1 className="callback-title">You&apos;re connected!</h1>
          <p className="callback-sub">
            You can close this window and return to your terminal. Your forest will now sync to the cloud.
          </p>
        </div>
      </div>
    </div>
  )
}

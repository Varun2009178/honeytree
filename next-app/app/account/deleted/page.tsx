export const dynamic = "force-dynamic"

export default function AccountDeletedPage() {
  return (
    <div className="shell">
      <div className="shell-inner">
        <div className="callback-page">
          <div className="callback-icon">&#129704;</div>
          <h1 className="callback-title">Your forest is gone.</h1>
          <p className="callback-sub">
            Your Honeytree account, forest, and rewards have been permanently deleted. The
            real trees you planted stay in the ground &mdash; only your records here were
            removed. You can start over anytime with <code>honeytree login</code>.
          </p>
        </div>
      </div>
    </div>
  )
}

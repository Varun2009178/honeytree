import { ReceiptModel } from "./receipt"

const TREE = String.raw`
       /\
      /  \
     /    \
    /______\
       ||
       ||
`

const TREE_BLOSSOM = String.raw`
      .::.
    .:(@@):.
   :(@@@@@@):
    ':(@@):'
       ||
       ||
`

export function asciiTreeFor(model: ReceiptModel): string {
  return model.hasCherry ? TREE_BLOSSOM : TREE
}

export function receiptSubject(model: ReceiptModel): string {
  const what = model.quantity === 1 ? model.yourTreeLabel : `${model.quantity} real trees`
  return `🌱 You planted ${what} — Honeytree receipt`
}

export function renderReceiptText(model: ReceiptModel): string {
  const lines: string[] = []
  lines.push(asciiTreeFor(model).replace(/^\n+|\n+$/g, ""))
  lines.push("")
  lines.push(`You planted ${model.yourTreeLabel}.`)
  lines.push(`Globally, that's tree #${model.globalNumber}.`)
  lines.push("")
  lines.push(`Location: ${model.location}${model.project ? ` — ${model.project}` : ""}`)
  lines.push(`Trees in this planting: ${model.quantity}`)
  lines.push("")
  lines.push("Your forest at this moment:")
  lines.push(`  • ${model.virtualTrees} virtual trees`)
  lines.push(`  • ${model.streak} day streak`)
  lines.push("")
  if (model.badges.length > 0) {
    lines.push("Your badges:")
    for (const b of model.badges) {
      const isNew = model.newBadges.some((n) => n.slug === b.slug)
      lines.push(`  • ${b.label}${isNew ? "  (new!)" : ""}`)
    }
    lines.push("")
  }
  lines.push("Thank you for growing a real forest with Honeytree.")
  lines.push("https://tryhoney.xyz")
  return lines.join("\n")
}

export function renderReceiptHtml(model: ReceiptModel): string {
  const badgeItems = model.badges
    .map((b) => {
      const isNew = model.newBadges.some((n) => n.slug === b.slug)
      return `<li>${escapeHtml(b.label)}${isNew ? " <strong>(new!)</strong>" : ""}</li>`
    })
    .join("")

  return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#0c0a09;color:#e7e5e4;font-family:ui-sans-serif,system-ui,sans-serif;">
  <div style="max-width:520px;margin:0 auto;">
    <pre style="font-family:ui-monospace,Menlo,monospace;color:#f59e0b;line-height:1.1;font-size:14px;">${escapeHtml(
      asciiTreeFor(model),
    )}</pre>
    <h1 style="font-size:20px;margin:8px 0;">You planted ${escapeHtml(model.yourTreeLabel)}.</h1>
    <p style="margin:4px 0;color:#a8a29e;">Globally, that's tree <strong style="color:#f59e0b;">#${model.globalNumber}</strong>.</p>
    <p style="margin:12px 0;">📍 ${escapeHtml(model.location)}${
      model.project ? ` — ${escapeHtml(model.project)}` : ""
    }</p>
    <p style="margin:12px 0;">🌳 ${model.virtualTrees} virtual trees · 🔥 ${model.streak} day streak</p>
    ${model.badges.length ? `<p style="margin:12px 0 4px;">Your badges:</p><ul>${badgeItems}</ul>` : ""}
    <p style="margin:24px 0 0;color:#a8a29e;">Thank you for growing a real forest with Honeytree.</p>
    <p style="margin:4px 0;"><a href="https://tryhoney.xyz" style="color:#f59e0b;">View your forest →</a></p>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

import { Resend } from "resend"
import { ReceiptModel } from "./receipt"
import {
  renderReceiptHtml,
  renderReceiptText,
  receiptSubject,
} from "./receipt-template"

let _resend: Resend | null = null
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!_resend) _resend = new Resend(key)
  return _resend
}

export interface SendResult {
  skipped: boolean
  error?: string
}

export async function sendReceiptEmail(
  to: string,
  model: ReceiptModel
): Promise<SendResult> {
  if (!to) return { skipped: true }
  const resend = getResend()
  if (!resend) {
    console.warn("[email] RESEND_API_KEY unset — skipping receipt email")
    return { skipped: true }
  }
  const from = process.env.RECEIPT_FROM_EMAIL || "Honeytree <receipts@tryhoney.xyz>"
  try {
    await resend.emails.send({
      from,
      to,
      subject: receiptSubject(model),
      html: renderReceiptHtml(model),
      text: renderReceiptText(model),
    })
    return { skipped: false }
  } catch (e) {
    console.error("[email] failed to send receipt:", e)
    return { skipped: false, error: String(e) }
  }
}

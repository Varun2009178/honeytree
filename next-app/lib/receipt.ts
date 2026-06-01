export interface ReceiptInput {
  quantity: number
  priorRealTrees: number          // user's completed real trees BEFORE this transaction
  globalBaseOffset: number
  globalCompletedTotal: number    // global completed real trees AFTER this transaction
  goodApiLocation: string | null
  goodApiProject: string | null
  goodApiGlobalNumber: number | null
  fallbackLocation: string
  virtualTrees: number
  streak: number
  badges: { slug: string; label: string }[]   // all unlocked after grant
  newBadgeSlugs: string[]                      // newly unlocked this transaction
}

export interface ReceiptModel {
  quantity: number
  yourTreeNumbers: number[]
  yourTreeLabel: string
  globalNumber: number
  location: string
  project: string | null
  virtualTrees: number
  streak: number
  badges: { slug: string; label: string }[]
  newBadges: { slug: string; label: string }[]
  hasBloomer: boolean
}

export function ordinal(n: number): string {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

export function buildReceiptModel(input: ReceiptInput): ReceiptModel {
  const qty = Math.max(1, Math.floor(input.quantity) || 1)
  const first = input.priorRealTrees + 1
  const numbers = Array.from({ length: qty }, (_, i) => first + i)
  const last = numbers[numbers.length - 1]

  const yourTreeLabel =
    qty === 1 ? `your ${ordinal(numbers[0])} tree` : `trees #${first}–#${last}`

  const globalNumber =
    input.goodApiGlobalNumber ?? input.globalBaseOffset + input.globalCompletedTotal

  const location = input.goodApiLocation ?? input.fallbackLocation

  const newBadges = input.badges.filter((b) => input.newBadgeSlugs.includes(b.slug))
  const hasBloomer = input.badges.some((b) => b.slug === "bloomer")

  return {
    quantity: qty,
    yourTreeNumbers: numbers,
    yourTreeLabel,
    globalNumber,
    location,
    project: input.goodApiProject,
    virtualTrees: input.virtualTrees,
    streak: input.streak,
    badges: input.badges,
    newBadges,
    hasBloomer,
  }
}

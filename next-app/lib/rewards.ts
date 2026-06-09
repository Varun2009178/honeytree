// Tree-variety unlocks, gated by cumulative real trees planted.
export const REWARD_THRESHOLDS = [
  { slug: "cherry", label: "Cherry Blossom", description: "Cherry blossom trees join your forest", threshold: 1 },
  { slug: "pine", label: "Pine", description: "Evergreen pines join your forest", threshold: 5 },
  { slug: "oak", label: "Oak", description: "Broad oaks join your forest", threshold: 10 },
  { slug: "ancient", label: "Ancient", description: "Rare tall golden ancients join your forest", threshold: 25 },
  { slug: "mythic", label: "Mythic", description: "Glowing mythic trees join your forest", threshold: 50 },
] as const

export type BadgeSlug = (typeof REWARD_THRESHOLDS)[number]["slug"]

export function getNewRewards(
  realTreesPlanted: number,
  existingSlugs: string[]
): (typeof REWARD_THRESHOLDS)[number][] {
  return REWARD_THRESHOLDS.filter(
    (r) => realTreesPlanted >= r.threshold && !existingSlugs.includes(r.slug)
  )
}

// Reward thresholds based on real trees planted
export const REWARD_THRESHOLDS = [
  { slug: "planter", label: "Planter", description: "Planted your first real tree", threshold: 1 },
  { slug: "bloomer", label: "Bloomer", description: "Cherry blossom canopy appears in your forest", threshold: 5 },
  { slug: "grove", label: "Grove", description: "Teal ground and trunk palette unlocked", threshold: 10 },
  { slug: "ancient", label: "Ancient Forest", description: "Rare tall golden trees appear in your forest", threshold: 25 },
  { slug: "legend", label: "Legend", description: "Your username floats above your forest", threshold: 50 },
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

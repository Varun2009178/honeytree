import { REWARD_THRESHOLDS } from "./rewards"

// ~21 kg CO2 sequestered per tree per year (common public estimate).
const CO2_KG_PER_TREE_YEAR = 21

export function co2KgPerYear(realTrees: number): number {
  const n = Number.isFinite(realTrees) && realTrees > 0 ? realTrees : 0
  return n * CO2_KG_PER_TREE_YEAR
}

export interface ForestTree {
  type: string
  growth: number
  x: number
  variant?: string | null
  heightBonus?: number
}

export interface ProfileModel {
  username: string
  avatarUrl: string | null
  virtualTrees: number
  realTrees: number
  co2Kg: number
  varieties: { slug: string; label: string }[]
  forest: ForestTree[]
}

export function buildProfileModel(input: {
  profile: { username: string; avatar_url: string | null }
  trees: { count: number; forest_data: ForestTree[] } | null
  completedRealTrees: number
  unlockedSlugs: string[]
}): ProfileModel {
  const unlocked = new Set(input.unlockedSlugs)
  return {
    username: input.profile.username,
    avatarUrl: input.profile.avatar_url ?? null,
    virtualTrees: input.trees?.count ?? 0,
    realTrees: input.completedRealTrees ?? 0,
    co2Kg: co2KgPerYear(input.completedRealTrees ?? 0),
    varieties: REWARD_THRESHOLDS
      .filter((r) => unlocked.has(r.slug))
      .map((r) => ({ slug: r.slug, label: r.label })),
    forest: input.trees?.forest_data ?? [],
  }
}

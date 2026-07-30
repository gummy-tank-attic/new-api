/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import {
  EXCLUDED_GROUPS,
  FILTER_ALL,
  getGroupDisplayRank,
  getVendorTabRank,
} from '../constants'
import type { PricingModel, PricingVendor } from '../types'
import { getConfiguredGroupRatio } from './model-helpers'

export type UsableGroupMap = Record<string, string>

/**
 * Read group description from API `usable_group` (string map).
 * Tolerates legacy object shape `{ desc }` if present.
 */
export function getUsableGroupDescription(
  usableGroup: UsableGroupMap | Record<string, unknown>,
  group: string
): string {
  const raw = usableGroup[group]
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object' && 'desc' in raw) {
    const desc = (raw as { desc?: unknown }).desc
    if (typeof desc === 'string') return desc
  }
  return ''
}

export function filterModelsByVendor(
  models: PricingModel[],
  vendor: string
): PricingModel[] {
  if (!vendor || vendor === FILTER_ALL) return models
  return models.filter((m) => m.vendor_name === vendor)
}

/**
 * Groups visible for the current vendor selection:
 * enable_groups on matching models ∩ usable_group ∩ group_ratio − excluded.
 */
export function deriveGroupsForVendor(options: {
  models: PricingModel[]
  vendor: string
  groupRatio: Record<string, number>
  usableGroup: UsableGroupMap | Record<string, unknown>
}): string[] {
  const modelsOfVendor = filterModelsByVendor(options.models, options.vendor)
  const usableKeys = new Set(Object.keys(options.usableGroup || {}))
  const ratioKeys = new Set(Object.keys(options.groupRatio || {}))
  const seen = new Set<string>()

  for (const model of modelsOfVendor) {
    const groups = Array.isArray(model.enable_groups) ? model.enable_groups : []
    for (const g of groups) {
      if (!g || EXCLUDED_GROUPS.includes(g)) continue
      if (!usableKeys.has(g) || !ratioKeys.has(g)) continue
      seen.add(g)
    }
  }

  return [...seen].sort((a, b) => {
    const rankA = getGroupDisplayRank(a)
    const rankB = getGroupDisplayRank(b)
    if (rankA !== rankB) return rankA - rankB
    const ra = getConfiguredGroupRatio(options.groupRatio, a)
    const rb = getConfiguredGroupRatio(options.groupRatio, b)
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  })
}

/** Prefer lowest ratio (special price); tie-break by name. */
export function pickDefaultGroup(
  groups: string[],
  groupRatio: Record<string, number>
): string | null {
  if (groups.length === 0) return null
  let best = groups[0]
  let bestRatio = getConfiguredGroupRatio(groupRatio, best)
  for (let i = 1; i < groups.length; i++) {
    const g = groups[i]
    const r = getConfiguredGroupRatio(groupRatio, g)
    if (r < bestRatio || (r === bestRatio && g.localeCompare(best) < 0)) {
      best = g
      bestRatio = r
    }
  }
  return best
}

export function filterModelsByVendorAndGroup(
  models: PricingModel[],
  vendor: string,
  group: string | null
): PricingModel[] {
  let list = filterModelsByVendor(models, vendor)
  if (group && group !== FILTER_ALL) {
    list = list.filter((m) => m.enable_groups?.includes(group))
  }
  return list
}

export function buildVendorTabOptions(
  models: PricingModel[],
  vendors: PricingVendor[]
): { value: string; label: string; count: number; icon?: string }[] {
  // Only concrete suppliers — never include "All Vendors" / FILTER_ALL.
  return vendors
    .map((vendor) => {
      const count = models.reduce(
        (n, m) => n + (m.vendor_name === vendor.name ? 1 : 0),
        0
      )
      return { vendor, count }
    })
    .filter((entry) => {
      if (entry.count <= 0) return false
      const name = (entry.vendor.name || '').trim()
      if (!name) return false
      // Guard against synthetic / i18n "all" entries if they ever appear in API data
      if (name === FILTER_ALL) return false
      if (/^all(\s+vendors?)?$/i.test(name)) return false
      if (name === '所有供应商' || name === '所有供應商') return false
      return true
    })
    .sort((a, b) => {
      const rankA = getVendorTabRank(a.vendor.name)
      const rankB = getVendorTabRank(b.vendor.name)
      if (rankA !== rankB) return rankA - rankB
      return a.vendor.name.localeCompare(b.vendor.name, undefined, {
        sensitivity: 'base',
      })
    })
    .map(({ vendor, count }) => ({
      value: vendor.name,
      label: vendor.name,
      count,
      icon: vendor.icon,
    }))
}

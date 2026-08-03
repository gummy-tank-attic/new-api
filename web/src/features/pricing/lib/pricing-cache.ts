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
import type { PricingData } from '../types'

const STORAGE_KEY = 'metartr.pricing.cache.v1'
/** Keep snapshot for hard-refresh SWR; longer than query staleTime. */
const MAX_AGE_MS = 30 * 60 * 1000

type CachedPayload = {
  savedAt: number
  data: PricingData
}

function isPricingData(value: unknown): value is PricingData {
  if (!value || typeof value !== 'object') return false
  const v = value as PricingData
  return Array.isArray(v.data) && Array.isArray(v.vendors)
}

/** Read last successful pricing payload for placeholder / SWR. */
export function readPricingCache(): PricingData | undefined {
  try {
    if (typeof window === 'undefined') return undefined
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as CachedPayload
    if (!parsed?.savedAt || !isPricingData(parsed.data)) return undefined
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return undefined
    return parsed.data
  } catch {
    return undefined
  }
}

/** Persist pricing after a successful network fetch. */
export function writePricingCache(data: PricingData): void {
  try {
    if (typeof window === 'undefined') return
    if (!isPricingData(data)) return
    const payload: CachedPayload = { savedAt: Date.now(), data }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

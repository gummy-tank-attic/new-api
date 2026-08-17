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
import type { RankingsResponse } from '../api'
import type { RankingPeriod } from '../types'

export type RankingsPayload = RankingsResponse

const STORAGE_KEY = 'metartr.rankings.cache.v1'
/** First-paint placeholder only. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000

type CachedPayload = {
  savedAt: number
  byPeriod: Partial<Record<RankingPeriod, RankingsPayload>>
}

export function isRankingsPayload(value: unknown): value is RankingsPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as RankingsPayload
  return Boolean(
    v.data &&
      Array.isArray(v.data.models) &&
      Array.isArray(v.data.vendors)
  )
}

function readStore(): CachedPayload | undefined {
  try {
    if (typeof window === 'undefined') return undefined
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as CachedPayload
    if (!parsed?.savedAt || typeof parsed.byPeriod !== 'object') return undefined
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return undefined
    return parsed
  } catch {
    return undefined
  }
}

export function readRankingsCache(
  period: RankingPeriod
): RankingsPayload | undefined {
  const store = readStore()
  const data = store?.byPeriod[period]
  return isRankingsPayload(data) ? data : undefined
}

export function writeRankingsCache(
  period: RankingPeriod,
  data: RankingsPayload
): void {
  try {
    if (typeof window === 'undefined') return
    if (!isRankingsPayload(data)) return
    const existing = readStore()
    const payload: CachedPayload = {
      savedAt: Date.now(),
      byPeriod: { ...(existing?.byPeriod ?? {}), [period]: data },
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

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
import { useQuery } from '@tanstack/react-query'

import { useAuthStore } from '@/stores/auth-store'

import { getRankings } from '../api'
import {
  readRankingsCache,
  writeRankingsCache,
} from '../lib/rankings-cache'
import type { RankingPeriod } from '../types'

const memoryRankingsCache: Partial<
  Record<RankingPeriod, ReturnType<typeof readRankingsCache>>
> = {}

export function useRankings(period: RankingPeriod) {
  const sessionSid = useAuthStore((state) => state.auth.session?.sid)

  return useQuery({
    queryKey: ['rankings', period, sessionSid ?? 'anon'],
    queryFn: async () => {
      const fresh = await getRankings(period)
      writeRankingsCache(period, fresh)
      memoryRankingsCache[period] = fresh
      return fresh
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    retryDelay: 600,
    networkMode: 'always',
    placeholderData: (previousData, previousQuery) => {
      if (previousQuery?.queryKey[1] === period && previousData) {
        return previousData
      }
      return memoryRankingsCache[period] ?? readRankingsCache(period)
    },
  })
}

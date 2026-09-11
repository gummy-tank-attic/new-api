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
import { useEffect } from 'react'

import type { SystemStatus } from '@/features/auth/types'
import {
  mapStatusDataToConfig,
  readCachedStatus,
  statusQueryOptions,
} from '@/lib/status-query'
import { useSystemConfigStore } from '@/stores/system-config-store'

/** Seed value from the persisted snapshot, so the first render is not empty. */
function getInitialStatus(): SystemStatus | undefined {
  const cached = readCachedStatus() as SystemStatus | null
  if (cached?.telegram_oauth && !cached?.telegram_bot_name) {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('status')
      } catch {
        /* empty */
      }
    }
    return undefined
  }
  return cached ?? undefined
}

let lastSyncedStatus: unknown = null

function syncStatusToSystemConfig(status: unknown) {
  if (!status || typeof status !== 'object') return
  if (lastSyncedStatus === status) return
  lastSyncedStatus = status
  try {
    const { setConfig, setLoading } = useSystemConfigStore.getState()
    setConfig(mapStatusDataToConfig(status as Record<string, unknown>))
    // Status is the sole brand-config loader on production;
    // clear the store loading flag so header logo/name are not stuck on skeletons.
    setLoading(false)
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[useStatus] Failed to sync status to system config', err)
    }
  }
}

/**
 * Subscribe to the shared `/api/status` query.
 *
 * Every caller reads the same cache entry, so mounting this hook in several
 * components costs one request. See `statusQueryOptions` for cache lifetimes.
 */
export function useStatus() {
  const { data, isLoading, error } = useQuery({
    ...statusQueryOptions,
    // Use localStorage data as initial data
    placeholderData: getInitialStatus(),
  })

  // Sync placeholder/cached status into brand store (footer, logo, name).
  // queryFn already syncs network results; this covers first paint from cache.
  useEffect(() => {
    if (data) syncStatusToSystemConfig(data)
  }, [data])

  return {
    status: (data as SystemStatus | null) ?? null,
    loading: isLoading,
    error,
  }
}

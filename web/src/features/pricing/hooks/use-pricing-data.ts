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
import { useMemo } from 'react'

import { useStatus } from '@/hooks/use-status'

import { getPricing } from '../api'
import { readPricingCache, writePricingCache } from '../lib/pricing-cache'
import type { PricingVendor } from '../types'

const EMPTY_VENDORS: PricingVendor[] = []
const EMPTY_RATIO: Record<string, number> = {}
const EMPTY_USABLE: Record<string, string> = {}
const EMPTY_ENDPOINT: Record<string, unknown> = {}
const EMPTY_AUTO: string[] = []

/** Module-level snapshot so hard refresh still has a sync placeholder once read. */
let memoryPricingCache = readPricingCache()

export function usePricingData() {
  const { status } = useStatus()

  const { data, isPending, isFetching, isError, error, refetch, isPlaceholderData } =
    useQuery({
      queryKey: ['pricing'],
      queryFn: async () => {
        const fresh = await getPricing()
        writePricingCache(fresh)
        memoryPricingCache = fresh
        return fresh
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      // Soft-fail network: keep showing last good data when available
      placeholderData: () => memoryPricingCache ?? readPricingCache(),
      retry: 1,
      retryDelay: 800,
    })

  // Ensure rates never reach zero to prevent division errors
  const priceRate = useMemo(
    () => Math.max((status?.price as number) ?? 1, 0.001),
    [status?.price]
  )
  const usdExchangeRate = useMemo(
    () => Math.max((status?.usd_exchange_rate as number) ?? priceRate, 0.001),
    [status?.usd_exchange_rate, priceRate]
  )

  const models = useMemo(() => {
    if (!data?.data?.length) return []

    const vendorMap = new Map((data.vendors ?? []).map((v) => [v.id, v]))

    return data.data.map((model) => {
      const vendor = model.vendor_id
        ? vendorMap.get(model.vendor_id)
        : undefined
      return {
        ...model,
        key: model.model_name,
        vendor_name: vendor?.name,
        vendor_icon: vendor?.icon,
        vendor_description: vendor?.description,
        group_ratio: data.group_ratio,
      }
    })
  }, [data])

  const hasModels = models.length > 0
  // Full-page blocking only when we have nothing to show yet
  const isLoading = isPending && !hasModels
  // Soft background refresh (SWR / window focus)
  const isRefreshing = isFetching && hasModels

  return {
    models,
    vendors: data?.vendors ?? EMPTY_VENDORS,
    groupRatio: data?.group_ratio ?? EMPTY_RATIO,
    usableGroup:
      (data?.usable_group as Record<string, string> | undefined) ??
      EMPTY_USABLE,
    endpointMap: data?.supported_endpoint ?? EMPTY_ENDPOINT,
    autoGroups: data?.auto_groups ?? EMPTY_AUTO,
    isLoading,
    isRefreshing,
    isPlaceholderData,
    // Error only matters when we cannot show a table
    error: hasModels ? null : isError ? error : null,
    refetch,
    priceRate,
    usdExchangeRate,
  }
}

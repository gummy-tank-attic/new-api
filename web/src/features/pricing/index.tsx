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
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { Button } from '@/components/ui/button'

import { LoadingSkeleton, ModelDetailsDrawer } from './components'
import { SupplierPricingLayout } from './components/supplier-pricing-layout'
import type { PriceMode } from './components/supplier-price-table'
import { FILTER_ALL, VIEW_MODES } from './constants'
import { usePricingData } from './hooks/use-pricing-data'
import {
  buildVendorTabOptions,
  deriveGroupsForVendor,
  filterModelsByVendorAndGroup,
  pickDefaultGroup,
} from './lib/derive-vendor-groups'
import { comparePricingModels } from './lib/model-helpers'

export function Pricing() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: '/pricing/' })
  const search = useSearch({ from: '/pricing/' })

  const [selectedModelName, setSelectedModelName] = useState<string | null>(
    null
  )
  /** Default open: group price (dual-line sell + official) */
  const [priceMode, setPriceMode] = useState<PriceMode>('group')

  const {
    models,
    vendors,
    groupRatio,
    usableGroup,
    endpointMap,
    autoGroups,
    isLoading,
    error,
    refetch,
    priceRate,
    usdExchangeRate,
  } = usePricingData()

  const allModels = useMemo(() => models || [], [models])

  const groupFromUrl = search.group

  const vendorOptions = useMemo(
    () => buildVendorTabOptions(allModels, vendors || []),
    [allModels, vendors]
  )

  // Prefer URL vendor when it is a real tab; otherwise first supplier (no All Vendors).
  const vendor = useMemo(() => {
    const fromUrl = search.vendor
    if (
      fromUrl &&
      fromUrl !== FILTER_ALL &&
      vendorOptions.some((o) => o.value === fromUrl)
    ) {
      return fromUrl
    }
    return vendorOptions[0]?.value ?? FILTER_ALL
  }, [search.vendor, vendorOptions])

  const groups = useMemo(
    () =>
      deriveGroupsForVendor({
        models: allModels,
        vendor,
        groupRatio: groupRatio || {},
        usableGroup: usableGroup || {},
      }),
    [allModels, vendor, groupRatio, usableGroup]
  )

  // Prefer URL group when valid; otherwise lowest-ratio default. No auto-navigate
  // (auto URL sync previously could loop and freeze / blank the page on refresh).
  const selectedGroup = useMemo(() => {
    if (groupFromUrl && groups.includes(groupFromUrl)) return groupFromUrl
    return pickDefaultGroup(groups, groupRatio || {})
  }, [groupFromUrl, groups, groupRatio])

  const tableModels = useMemo(() => {
    if (!selectedGroup) return []
    const byVendorGroup = filterModelsByVendorAndGroup(
      allModels,
      vendor,
      selectedGroup
    )
    // Vendor first, then natural model id (numeric-aware version segments)
    return [...byVendorGroup].sort(comparePricingModels)
  }, [allModels, vendor, selectedGroup])

  const usableGroupMap = useMemo(() => {
    const raw = usableGroup || {}
    const map: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') {
        map[key] = value
      } else if (value && typeof value === 'object' && 'desc' in value) {
        const desc = (value as { desc?: unknown }).desc
        map[key] = typeof desc === 'string' ? desc : ''
      } else {
        map[key] = ''
      }
    }
    return map
  }, [usableGroup])

  const handleVendorChange = useCallback(
    (nextVendor: string) => {
      void navigate({
        search: (prev) => {
          const next = { ...prev }
          if (nextVendor === FILTER_ALL) {
            delete next.vendor
          } else {
            next.vendor = nextVendor
          }
          delete next.group
          return next
        },
        replace: true,
      })
    },
    [navigate]
  )

  const handleGroupChange = useCallback(
    (nextGroup: string) => {
      void navigate({
        search: (prev) => ({ ...prev, group: nextGroup }),
        replace: true,
      })
    },
    [navigate]
  )

  const handleClearFilters = useCallback(() => {
    void navigate({
      search: () => ({}),
      replace: true,
    })
  }, [navigate])

  const handleModelClick = useCallback((modelName: string) => {
    setSelectedModelName(modelName)
  }, [])

  const selectedModel = useMemo(
    () =>
      selectedModelName
        ? allModels.find((model) => model.model_name === selectedModelName) ||
          null
        : null,
    [allModels, selectedModelName]
  )

  const hasActiveFilters = vendor !== FILTER_ALL || Boolean(groupFromUrl)

  if (isLoading) {
    return (
      <PublicLayout showMainContainer={false}>
        <div className='mx-auto w-full max-w-[1200px] px-3 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10'>
          <LoadingSkeleton viewMode={VIEW_MODES.TABLE} />
        </div>
      </PublicLayout>
    )
  }

  if (error) {
    return (
      <PublicLayout showMainContainer={false}>
        <div className='mx-auto flex w-full max-w-[1200px] flex-col items-center px-3 pt-24 pb-8 text-center sm:px-6'>
          <h1 className='text-foreground text-lg font-semibold'>
            {t('Failed to load pricing')}
          </h1>
          <p className='text-muted-foreground mt-2 max-w-md text-sm'>
            {t('Could not load price data. Please try again.')}
          </p>
          <Button className='mt-4' variant='outline' onClick={() => refetch()}>
            {t('Retry')}
          </Button>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout showMainContainer={false}>
      <PageTransition className='relative mx-auto w-full max-w-[1200px] px-4 pt-16 pb-12 sm:px-6 sm:pt-20 sm:pb-14'>
        {/* Type: Display 30/36 · Body 16. Color: foreground / muted only. */}
        <header className='mb-7 sm:mb-8'>
          <h1 className='text-foreground text-3xl font-semibold tracking-tight sm:text-4xl sm:leading-tight'>
            {t('Model Square')}
          </h1>
          <p className='text-muted-foreground mt-2.5 text-base leading-relaxed'>
            {t('This site currently has {{count}} models enabled', {
              count: allModels.length,
            })}
          </p>
        </header>

        <SupplierPricingLayout
          vendorOptions={vendorOptions}
          vendor={vendor}
          onVendorChange={handleVendorChange}
          groups={groups}
          selectedGroup={selectedGroup}
          onGroupChange={handleGroupChange}
          groupRatio={groupRatio || {}}
          usableGroup={usableGroupMap}
          priceMode={priceMode}
          onPriceModeChange={setPriceMode}
          models={tableModels}
          priceRate={priceRate ?? 1}
          usdExchangeRate={usdExchangeRate ?? 1}
          onModelClick={handleModelClick}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {selectedModel && (
          <ModelDetailsDrawer
            open={Boolean(selectedModel)}
            onOpenChange={(open) => {
              if (!open) setSelectedModelName(null)
            }}
            model={selectedModel}
            groupRatio={groupRatio || {}}
            usableGroup={usableGroupMap}
            endpointMap={
              (endpointMap as Record<
                string,
                { path?: string; method?: string }
              >) || {}
            }
            autoGroups={autoGroups || []}
            priceRate={priceRate ?? 1}
            usdExchangeRate={usdExchangeRate ?? 1}
            tokenUnit='M'
            showRechargePrice={false}
          />
        )}
      </PageTransition>
    </PublicLayout>
  )
}

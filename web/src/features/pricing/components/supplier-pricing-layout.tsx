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
import { LayoutGrid, Sparkles, Table2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import {
  isByteDancePricingVendor,
  lookupGroupMapValue,
  MANUAL_GROUP_SAVINGS_OFF,
} from '../constants'
import { getUsableGroupDescription } from '../lib/derive-vendor-groups'
import { resolveGroupSavingsOffPercent } from '../lib/group-discount'
import { resolveGroupDescription } from '../lib/group-intro-i18n'
import { getConfiguredGroupRatio } from '../lib/model-helpers'
import { isByteDanceOrVideoModel } from '../lib/video-pricing'
import type { PricingModel } from '../types'
import { EmptyState } from './empty-state'
import { GroupPriceCards } from './group-price-cards'
import { SupplierPriceTable, type PriceMode } from './supplier-price-table'
import { SupplierTabs, type SupplierTabOption } from './supplier-tabs'
import { VideoModelGrid } from './video-model-grid'

export interface SupplierPricingLayoutProps {
  vendorOptions: SupplierTabOption[]
  vendor: string
  onVendorChange: (vendor: string) => void
  groups: string[]
  selectedGroup: string | null
  onGroupChange: (group: string) => void
  groupRatio: Record<string, number>
  usableGroup: Record<string, string>
  priceMode: PriceMode
  onPriceModeChange: (mode: PriceMode) => void
  models: PricingModel[]
  priceRate: number
  usdExchangeRate: number
  onModelClick: (modelName: string) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  className?: string
}

export function SupplierPricingLayout(props: SupplierPricingLayoutProps) {
  const { t } = useTranslation()

  const isVideoVendor =
    isByteDancePricingVendor(props.vendor) ||
    (props.models.length > 0 && props.models.every(isByteDanceOrVideoModel))

  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() =>
    isVideoVendor ? 'grid' : 'table'
  )

  useEffect(() => {
    setViewMode(isVideoVendor ? 'grid' : 'table')
  }, [props.vendor, isVideoVendor])

  const rawGroupIntro = props.selectedGroup
    ? getUsableGroupDescription(props.usableGroup, props.selectedGroup)
    : ''
  const groupIntroDisplay = props.selectedGroup
    ? resolveGroupDescription(t, props.selectedGroup, rawGroupIntro, {
        emptyPlaceholder: '',
      })
    : ''

  const isGroupMode = props.priceMode === 'group'
  const savings = useMemo(() => {
    if (!isGroupMode || !props.selectedGroup) return null
    const ratio = getConfiguredGroupRatio(props.groupRatio, props.selectedGroup)
    return resolveGroupSavingsOffPercent(
      ratio,
      lookupGroupMapValue(MANUAL_GROUP_SAVINGS_OFF, props.selectedGroup)
    )
  }, [isGroupMode, props.groupRatio, props.selectedGroup])

  return (
    <div className={cn('space-y-6', props.className)}>
      {/* 1. Supplier Navigation Tabs */}
      <SupplierTabs
        options={props.vendorOptions}
        value={props.vendor}
        onChange={props.onVendorChange}
      />

      {/* 2. Studio Control Bar */}
      <div className='flex flex-col gap-3'>
        {/* Top: Group Selector Tabs */}
        <GroupPriceCards
          groups={props.groups}
          selectedGroup={props.selectedGroup}
          onSelect={props.onGroupChange}
          groupRatio={props.groupRatio}
          usableGroup={props.usableGroup}
        />

        {/* Scheme A Luxury Callout Banner (方案 A 高光导读卡) */}
        {groupIntroDisplay ? (
          <div className='relative flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent p-2.5 shadow-2xs backdrop-blur-xs sm:px-4 sm:py-2.5 dark:from-amber-500/[0.12] dark:via-amber-500/[0.05] dark:to-transparent'>
            <div className='flex min-w-0 flex-1 items-center gap-2.5'>
              <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 shadow-2xs ring-1 ring-amber-500/20 dark:text-amber-300'>
                <Sparkles className='h-3.5 w-3.5' />
              </span>
              <div className='flex min-w-0 items-center'>
                <p
                  className='text-foreground/90 text-[13.5px] leading-relaxed font-medium sm:text-[14px]'
                  title={groupIntroDisplay}
                >
                  {groupIntroDisplay}
                </p>
              </div>
            </div>

            {/* Right: View Mode Toggle (Grid vs Table) */}
            <div className='ml-auto flex shrink-0 items-center gap-2.5'>
              <div
                className='bg-background/80 dark:bg-muted/80 ring-border/50 inline-flex rounded-full p-1 shadow-2xs ring-1 backdrop-blur-xs'
                role='group'
                aria-label={t('View mode')}
              >
                <button
                  type='button'
                  onClick={() => setViewMode('grid')}
                  aria-label={t('Grid view')}
                  title={t('Grid view')}
                  className={cn(
                    'rounded-full p-1.5 transition-all',
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <LayoutGrid className='h-3.5 w-3.5' />
                </button>
                <button
                  type='button'
                  onClick={() => setViewMode('table')}
                  aria-label={t('Table view')}
                  title={t('Table view')}
                  className={cn(
                    'rounded-full p-1.5 transition-all',
                    viewMode === 'table'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Table2 className='h-3.5 w-3.5' />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className='flex min-h-[36px] items-center justify-end'>
            <div
              className='bg-muted/80 ring-border/50 inline-flex rounded-full p-1 shadow-2xs ring-1'
              role='group'
              aria-label={t('View mode')}
            >
              <button
                type='button'
                onClick={() => setViewMode('grid')}
                aria-label={t('Grid view')}
                title={t('Grid view')}
                className={cn(
                  'rounded-full p-1.5 transition-all',
                  viewMode === 'grid'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutGrid className='h-3.5 w-3.5' />
              </button>
              <button
                type='button'
                onClick={() => setViewMode('table')}
                aria-label={t('Table view')}
                title={t('Table view')}
                className={cn(
                  'rounded-full p-1.5 transition-all',
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Table2 className='h-3.5 w-3.5' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Content: Bento Grid or Clean Table */}
      {props.models.length === 0 ? (
        <EmptyState
          hasActiveFilters={props.hasActiveFilters}
          onClearFilters={props.onClearFilters}
        />
      ) : viewMode === 'grid' && isVideoVendor ? (
        <VideoModelGrid
          models={props.models}
          priceMode={props.priceMode}
          selectedGroup={props.selectedGroup}
          groupRatio={props.groupRatio}
          priceRate={props.priceRate}
          usdExchangeRate={props.usdExchangeRate}
          savings={savings}
          onModelClick={props.onModelClick}
        />
      ) : (
        <SupplierPriceTable
          models={props.models}
          priceMode={props.priceMode}
          selectedGroup={props.selectedGroup}
          groupRatio={props.groupRatio}
          priceRate={props.priceRate}
          usdExchangeRate={props.usdExchangeRate}
          onModelClick={props.onModelClick}
        />
      )}
    </div>
  )
}

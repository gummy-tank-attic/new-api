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
import { LayoutGrid, Table2 } from 'lucide-react'
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

        {/* Bottom Sub-bar: Description on Left, Controls on Far Right */}
        <div className='flex flex-wrap items-center justify-between gap-3 min-h-[36px]'>
          <div className='flex items-center min-w-0 flex-1'>
            {groupIntroDisplay && (
              <p
                className='text-muted-foreground text-sm font-normal leading-relaxed tracking-tight'
                title={groupIntroDisplay}
              >
                • {groupIntroDisplay}
              </p>
            )}
          </div>

          {/* Right: Controls Cluster (图一：放到最右边) */}
          <div className='flex items-center gap-2.5 ml-auto shrink-0'>
            <div
              className='bg-muted/80 ring-border/50 inline-flex rounded-full p-1 ring-1 shadow-2xs'
              role='group'
              aria-label={t('Price mode')}
            >
              <button
                type='button'
                onClick={() => props.onPriceModeChange('official')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  props.priceMode === 'official'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('Official price')}
              </button>
              <button
                type='button'
                onClick={() => props.onPriceModeChange('group')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  props.priceMode === 'group'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('Group price')}
              </button>
            </div>

            {/* View Mode Toggle: Grid vs Table */}
            <div
              className='bg-muted/80 ring-border/50 inline-flex rounded-full p-1 ring-1 shadow-2xs'
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

      {/* 4. Elegant Minimalist Pricing Rule Footer */}
      <div className='pt-1 text-center'>
        <p className='text-muted-foreground/75 text-xs leading-relaxed'>
          {t(
            'Each model is quoted at the upstream official list price. Actual billing uses only your group ratio—with no hidden multipliers or extra fees.'
          )}
        </p>
      </div>
    </div>
  )
}

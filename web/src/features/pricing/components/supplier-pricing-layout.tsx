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
import { Sparkles } from 'lucide-react'
import { useMemo } from 'react'
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

        {/* Group Intro Callout Banner (Clean Neutral Stripe/Linear Style) */}
        {groupIntroDisplay ? (
          <div className='flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/20 px-4 py-2 shadow-xs transition-all dark:bg-card/40 dark:border-border/50'>
            <div className='flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border/60'>
              <Sparkles className='size-3.5' />
            </div>
            <p
              className='text-[12.5px] font-medium text-foreground/85 tracking-tight sm:text-[13px]'
              title={groupIntroDisplay}
            >
              {groupIntroDisplay}
            </p>
          </div>
        ) : null}
      </div>

      {/* 3. Main Content: Bento Grid or Clean Table */}
      {(() => {
        if (props.models.length === 0) {
          return (
            <EmptyState
              hasActiveFilters={props.hasActiveFilters}
              onClearFilters={props.onClearFilters}
            />
          )
        }
        if (isVideoVendor) {
          return (
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
          )
        }
        return (
          <SupplierPriceTable
            models={props.models}
            priceMode={props.priceMode}
            selectedGroup={props.selectedGroup}
            groupRatio={props.groupRatio}
            priceRate={props.priceRate}
            usdExchangeRate={props.usdExchangeRate}
            onModelClick={props.onModelClick}
          />
        )
      })()}
    </div>
  )
}

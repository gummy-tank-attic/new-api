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
import { Film, MessageSquare, Sparkles } from 'lucide-react'
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

  const isByteDanceVendor = isByteDancePricingVendor(props.vendor)

  const videoModels = useMemo(
    () => (isByteDanceVendor ? props.models : props.models.filter(isByteDanceOrVideoModel)),
    [isByteDanceVendor, props.models]
  )
  const standardModels = useMemo(
    () => (isByteDanceVendor ? [] : props.models.filter((m) => !isByteDanceOrVideoModel(m))),
    [isByteDanceVendor, props.models]
  )

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

  const hasMultipleGroups = props.groups.length > 1

  return (
    <div className={cn('space-y-6', props.className)}>
      {/* 1. Supplier Navigation Tabs */}
      <SupplierTabs
        options={props.vendorOptions}
        value={props.vendor}
        onChange={props.onVendorChange}
      />

      {/* 2. Studio Control Bar */}
      {(hasMultipleGroups || Boolean(groupIntroDisplay)) && (
        <div className='flex flex-col gap-3'>
          {/* Top: Group Selector Tabs (仅在多分组时展示切换胶囊，如 Anthropic、OpenAI) */}
          {hasMultipleGroups && (
            <GroupPriceCards
              groups={props.groups}
              selectedGroup={props.selectedGroup}
              onSelect={props.onGroupChange}
              groupRatio={props.groupRatio}
              usableGroup={props.usableGroup}
              models={props.models}
            />
          )}

          {/* Group Intro Callout Banner (Clean Neutral Stripe/Linear Style) */}
          {groupIntroDisplay ? (
            <div className='mb-1 flex items-center gap-2.5 rounded-xl border border-[var(--p-border,#E2E8F0)] bg-white px-[15px] py-[8.5px] shadow-[0_1px_2px_rgba(15,23,42,0.02)]'>
              <div className='flex size-6 shrink-0 items-center justify-center rounded-md border border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]'>
                <Sparkles className='size-3.5' />
              </div>
              <p
                className='text-[13.5px] font-medium text-[var(--p-text-body,#1E293B)]'
                title={groupIntroDisplay}
              >
                {groupIntroDisplay}
              </p>
            </div>
          ) : null}
        </div>
      )}

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

        // Pure video vendor (e.g. ByteDance / Seedance)
        if (videoModels.length > 0 && standardModels.length === 0) {
          return (
            <VideoModelGrid
              models={videoModels}
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

        // Pure text / standard vendor (e.g. Anthropic, OpenAI, Moonshot, DeepSeek)
        if (videoModels.length === 0 && standardModels.length > 0) {
          return (
            <SupplierPriceTable
              models={standardModels}
              priceMode={props.priceMode}
              selectedGroup={props.selectedGroup}
              groupRatio={props.groupRatio}
              priceRate={props.priceRate}
              usdExchangeRate={props.usdExchangeRate}
              onModelClick={props.onModelClick}
            />
          )
        }

        // Hybrid vendor with both video models and text models (e.g. MiniMax)
        return (
          <div className='space-y-8'>
            {/* Language & Chat Models Section (Top) */}
            <div className='space-y-4'>
              <div className='flex items-center gap-2.5'>
                <div className='flex size-6.5 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-400'>
                  <MessageSquare className='size-3.5' />
                </div>
                <h3 className='text-[16.5px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-foreground'>
                  {t('pricing.section.textModels', '语言与对话模型')}
                </h3>
                <span className='rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2 py-[1.5px] text-xs font-semibold leading-[1.4] text-[#334155] tabular-nums'>
                  {standardModels.length}
                </span>
              </div>
              <SupplierPriceTable
                models={standardModels}
                priceMode={props.priceMode}
                selectedGroup={props.selectedGroup}
                groupRatio={props.groupRatio}
                priceRate={props.priceRate}
                usdExchangeRate={props.usdExchangeRate}
                onModelClick={props.onModelClick}
              />
            </div>

            {/* Video Generation Models Section (Bottom) */}
            <div className='space-y-4 pt-6 border-t border-border/50'>
              <div className='flex items-center gap-2.5'>
                <div className='flex size-6.5 shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-400'>
                  <Film className='size-3.5' />
                </div>
                <h3 className='text-[16.5px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-foreground'>
                  {t('pricing.section.videoModels', '视频生成模型')}
                </h3>
                <span className='rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2 py-[1.5px] text-xs font-semibold leading-[1.4] text-[#334155] tabular-nums'>
                  {videoModels.length}
                </span>
              </div>
              <VideoModelGrid
                models={videoModels}
                priceMode={props.priceMode}
                selectedGroup={props.selectedGroup}
                groupRatio={props.groupRatio}
                priceRate={props.priceRate}
                usdExchangeRate={props.usdExchangeRate}
                savings={savings}
                onModelClick={props.onModelClick}
              />
            </div>
          </div>
        )
      })()}
    </div>
  )
}

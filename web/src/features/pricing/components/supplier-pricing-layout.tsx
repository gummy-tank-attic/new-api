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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { getUsableGroupDescription } from '../lib/derive-vendor-groups'
import { resolveGroupDescription } from '../lib/group-intro-i18n'
import { EmptyState } from './empty-state'
import { GroupPriceCards } from './group-price-cards'
import { PricingRulesBanner } from './pricing-rules-banner'
import {
  SupplierPriceTable,
  type PriceMode,
} from './supplier-price-table'
import { SupplierTabs, type SupplierTabOption } from './supplier-tabs'
import type { PricingModel } from '../types'

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
  const rawGroupIntro = props.selectedGroup
    ? getUsableGroupDescription(props.usableGroup, props.selectedGroup)
    : ''
  // Prefer curated i18n by group name; else raw admin text; else empty placeholder.
  const groupIntroDisplay = props.selectedGroup
    ? resolveGroupDescription(t, props.selectedGroup, rawGroupIntro, {
        emptyPlaceholder: t('No description for this group'),
      })
    : t('No description for this group')

  return (
    <div className={cn('space-y-5', props.className)}>
      <SupplierTabs
        options={props.vendorOptions}
        value={props.vendor}
        onChange={props.onVendorChange}
      />

      <PricingRulesBanner usdExchangeRate={props.usdExchangeRate} />

      {/* Card: neutral surface, soft elevation — brand color only in controls */}
      <div className='bg-card overflow-hidden rounded-2xl border border-border/70 shadow-sm'>
        <div className='flex flex-wrap items-center gap-3 border-b border-border/60 px-5 py-3.5 sm:px-6'>
          {/* Title 16 — below sell price so numbers stay hero */}
          <h2 className='text-foreground text-base font-semibold tracking-tight'>
            {t('Price list')}
          </h2>
          <div
            className='bg-muted inline-flex rounded-full p-1 ring-1 ring-border/50'
            role='group'
            aria-label={t('Price mode')}
          >
            <button
              type='button'
              onClick={() => props.onPriceModeChange('official')}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                props.priceMode === 'official'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('Official price')}
            </button>
            <button
              type='button'
              onClick={() => props.onPriceModeChange('group')}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                props.priceMode === 'group'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('Group price')}
            </button>
          </div>
        </div>

        <div className='space-y-4 px-5 py-5 sm:px-6 sm:py-6'>
          <GroupPriceCards
            groups={props.groups}
            selectedGroup={props.selectedGroup}
            onSelect={props.onGroupChange}
            groupRatio={props.groupRatio}
            usableGroup={props.usableGroup}
          />

          {props.selectedGroup && (
            // Slightly stronger contrast than body muted — easy to scan, not loud
            <div className='bg-muted/55 rounded-xl border border-border/60 px-4 py-3 text-[15px] leading-relaxed'>
              <span className='text-foreground font-semibold tracking-tight'>
                {t('Group intro')}
              </span>
              <span className='text-border mx-2.5' aria-hidden>
                |
              </span>
              <span className='text-foreground/88'>{groupIntroDisplay}</span>
            </div>
          )}

          {props.models.length === 0 ? (
            <EmptyState
              hasActiveFilters={props.hasActiveFilters}
              onClearFilters={props.onClearFilters}
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
      </div>
    </div>
  )
}

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
import { Clock } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { cn } from '@/lib/utils'

import {
  DEFAULT_TOKEN_UNIT,
  lookupGroupMapValue,
  MANUAL_GROUP_SAVINGS_OFF,
  TIME_TIERED_MODEL_NAMES,
} from '../constants'
import {
  formatDynamicUnitPrice,
  getDynamicPricingTiers,
  isDynamicPricingModel,
} from '../lib/dynamic-price'
import { resolveGroupSavingsOffPercent } from '../lib/group-discount'
import {
  getConfiguredGroupRatio,
  isPerImageExpressionModel,
  isTokenBasedModel,
} from '../lib/model-helpers'
import {
  formatPrice,
  formatRequestPrice,
  stripTrailingZeros,
} from '../lib/price'
import {
  getVideoModelTierGroups,
  isByteDanceOrVideoModel,
  isVideoUpscaleModel,
} from '../lib/video-pricing'
import type { PriceType, PricingModel, TokenUnit } from '../types'
import { ImageTierPrices } from './image-tier-prices'

export type PriceMode = 'group' | 'official'

export interface SupplierPriceTableProps {
  models: PricingModel[]
  priceMode: PriceMode
  selectedGroup: string | null
  groupRatio: Record<string, number>
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  onModelClick?: (modelName: string) => void
  className?: string
}

function isEmptyPrice(value: string): boolean {
  return value === '-' || value === '—' || value === ''
}

function isTimeTieredModel(model: PricingModel): boolean {
  const name = (model.model_name || '').trim().toLowerCase()
  return TIME_TIERED_MODEL_NAMES.some((t) => t.toLowerCase() === name)
}

function getModelUnitPrice(
  model: PricingModel,
  type: PriceType,
  ratioMultiplier: number,
  tokenUnit: TokenUnit,
  priceRate = 1,
  usdExchangeRate = 1,
  selectedGroup?: string
): string {
  if (isDynamicPricingModel(model)) {
    const tiers = getDynamicPricingTiers(model)
    if (tiers.length > 0) {
      const tier = tiers[0]
      if ('inputPrice' in tier) {
        let val = 0
        if (type === 'input') val = Number(tier.inputPrice) || 0
        else if (type === 'output') val = Number(tier.outputPrice) || 0
        else if (type === 'cache') val = Number(tier.cacheReadPrice) || 0
        else if (type === 'create_cache') {
          val = Number(tier.cacheCreatePrice) || 0
        }

        if (val > 0) {
          return formatDynamicUnitPrice(val, {
            tokenUnit,
            priceRate,
            usdExchangeRate,
            groupRatioMultiplier: ratioMultiplier,
          })
        }
      }
    }
  }

  return formatPrice(
    model,
    type,
    tokenUnit,
    false,
    priceRate,
    usdExchangeRate,
    selectedGroup,
    ratioMultiplier
  )
}

function resolvePrices(
  groupPrice: string,
  officialPrice: string,
  isGroupMode: boolean,
  hasGroup: boolean
): { primary: string; official: string | null } {
  if (hasGroup && isGroupMode) {
    return { primary: groupPrice, official: officialPrice }
  }
  return { primary: officialPrice, official: null }
}

function PriceColumn(props: {
  primary: string
  official?: string | null
  unit?: string
  className?: string
  primaryClassName?: string
}) {
  if (isEmptyPrice(props.primary)) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center py-1',
          props.className
        )}
      >
        <span className='text-muted-foreground/30 text-sm font-light'>—</span>
      </div>
    )
  }

  const showOfficial =
    props.official != null &&
    !isEmptyPrice(props.official) &&
    props.official !== props.primary

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-1',
        props.className
      )}
    >
      <div className='flex items-baseline justify-center gap-1'>
        <span className='text-foreground text-[15px] font-semibold tabular-nums tracking-tight sm:text-[15.5px]'>
          {stripTrailingZeros(props.primary)}
        </span>
        {props.unit && (
          <span className='text-muted-foreground/75 text-[11px] font-normal'>
            {props.unit}
          </span>
        )}
      </div>
      {showOfficial && props.official && (
        <span className='text-muted-foreground/50 decoration-muted-foreground/35 mt-0.5 text-[11.5px] font-normal tabular-nums line-through'>
          {stripTrailingZeros(props.official)}
        </span>
      )}
    </div>
  )
}

function SavingsBadge({ savings }: { savings: number | null }) {
  if (savings == null) return null
  return (
    <span
      translate='no'
      className='notranslate inline-flex items-center justify-center rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white tabular-nums shadow-xs'
    >
      {savings}% OFF
    </span>
  )
}

export function SupplierPriceTable(props: SupplierPriceTableProps) {
  const { t } = useTranslation()
  const tokenUnit = props.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const priceRate = props.priceRate ?? 1
  const usdExchangeRate = props.usdExchangeRate ?? 1
  const unitHint = tokenUnit === 'K' ? '1K' : '1M'
  const isGroupMode = props.priceMode === 'group'
  const selectedGroup = props.selectedGroup ?? undefined

  const savings = useMemo(() => {
    if (!isGroupMode || !props.selectedGroup) return null
    const ratio = getConfiguredGroupRatio(props.groupRatio, props.selectedGroup)
    return resolveGroupSavingsOffPercent(
      ratio,
      lookupGroupMapValue(MANUAL_GROUP_SAVINGS_OFF, props.selectedGroup)
    )
  }, [isGroupMode, props.selectedGroup, props.groupRatio])

  const isImageTable = props.models.every((m) => isPerImageExpressionModel(m))
  const isGenerationTable =
    isImageTable || props.models.some((m) => isByteDanceOrVideoModel(m))

  return (
    <div className={cn('w-full space-y-3', props.className)}>
      {/* 1. Refined Column Legend Header with Crisp Baseline */}
      <div
        className={cn(
          'text-muted-foreground/85 border-border hidden grid-cols-12 items-center gap-4 border-b px-5 pb-2 text-[12px] font-medium tracking-normal',
          !isImageTable && 'md:grid'
        )}
      >
        <div className='col-span-4'>{t('Model', '模型名称')}</div>
        {isGenerationTable ? (
          <div
            className={isImageTable ? 'col-span-8' : 'col-span-6 text-center'}
          >
            {t('Generation Mode & Pricing', '生成模式与计费价格')}
          </div>
        ) : (
          <>
            <div className='col-span-2 text-center'>
              {t('Input price')}
              <span className='text-muted-foreground/60 ml-1 font-sans text-[11px] font-normal'>
                / {unitHint}
              </span>
            </div>
            <div className='col-span-2 text-center'>
              {t('Output price')}
              <span className='text-muted-foreground/60 ml-1 font-sans text-[11px] font-normal'>
                / {unitHint}
              </span>
            </div>
            <div className='col-span-2 text-center'>
              {t('Cache & Details', '缓存与扩展')}
            </div>
          </>
        )}
        {!isImageTable && (
          <div className='col-span-2 text-center'>
            {t('Discount', '优惠幅度')}
          </div>
        )}
      </div>

      {/* 2. Floating Card-Rows List */}
      <div className='flex flex-col gap-2.5 sm:gap-3'>
        {props.models.map((model) => {
          const isTimeTiered = isTimeTieredModel(model)

          if (isPerImageExpressionModel(model)) {
            return (
              <div
                key={model.model_name}
                className='group relative grid grid-cols-1 items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-150 hover:border-foreground/15 hover:bg-muted/30 hover:shadow-xs md:grid-cols-12'
              >
                <div className='col-span-12 flex min-w-0 items-center gap-2 md:col-span-4'>
                  <button
                    type='button'
                    className='text-foreground group-hover:text-primary min-w-0 truncate rounded-sm text-left font-sans text-[15px] font-medium antialiased transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current sm:text-[15.5px] sm:font-semibold'
                    onClick={() => props.onModelClick?.(model.model_name)}
                  >
                    {model.model_name}
                  </button>
                  <CopyButton
                    value={model.model_name}
                    size='icon'
                    variant='ghost'
                    className='text-muted-foreground/40 hover:text-foreground size-5 shrink-0 transition-opacity duration-150 sm:opacity-0 group-hover:opacity-100'
                    iconClassName='size-3'
                  />
                </div>
                <div className='col-span-12 min-w-0 md:col-span-6'>
                  {!isGroupMode && (
                    <div className='text-muted-foreground mb-1 text-xs'>
                      {t('Base Price')}
                    </div>
                  )}
                  <ImageTierPrices
                    model={model}
                    layout='table'
                    groupRatio={
                      isGroupMode
                        ? getConfiguredGroupRatio(
                            props.groupRatio,
                            selectedGroup ?? ''
                          )
                        : 1
                    }
                  />
                </div>
              </div>
            )
          }

          // Video Model Branch
          if (isByteDanceOrVideoModel(model)) {
            const isUpscale = isVideoUpscaleModel(model)
            const tierGroups = isUpscale ? [] : getVideoModelTierGroups(model)
            const upscaleRatio =
              isGroupMode && savings != null ? (100 - savings) / 100 : 1

            return (
              <div
                key={model.model_name}
                onClick={() => props.onModelClick?.(model.model_name)}
                className='group relative grid cursor-pointer grid-cols-1 items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/40 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:border-border/80 dark:hover:border-border dark:hover:bg-accent/20 md:grid-cols-12'
              >
                {/* Left: Model Identity (Only model name + copy, no icon) */}
                <div className='col-span-12 flex min-w-0 items-center gap-2 md:col-span-4'>
                  <span className='text-foreground group-hover:text-primary truncate font-sans text-[15px] font-medium antialiased transition-colors sm:text-[15.5px] sm:font-semibold'>
                    {model.model_name}
                  </span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <CopyButton
                      value={model.model_name}
                      size='icon'
                      variant='ghost'
                      className='text-muted-foreground/40 hover:text-foreground size-5'
                      iconClassName='size-3'
                    />
                  </span>
                </div>

                {/* Center: Video Mode Pricing */}
                <div className='col-span-12 md:col-span-6'>
                  {isUpscale && (
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                      <PriceColumn
                        primary={`$${(0.0091 * upscaleRatio * priceRate).toFixed(4)}`}
                        official={`$${(0.013 * priceRate).toFixed(4)}`}
                        unit='/ 秒起'
                      />
                      <PriceColumn
                        primary={`$${(7.1848 * upscaleRatio * priceRate).toFixed(2)}`}
                        official={`$${(10.2639 * priceRate).toFixed(2)}`}
                        unit='/ 1M'
                      />
                      <div className='flex flex-col items-center justify-center py-1 text-center'>
                        <span className='text-[11px] font-medium text-purple-600 dark:text-purple-400'>
                          720p · 1080p · 2K
                        </span>
                        <span className='text-muted-foreground/60 mt-0.5 text-[10px]'>
                          细节重绘超分
                        </span>
                      </div>
                    </div>
                  )}
                  {!isUpscale && tierGroups.length > 0 && (
                    <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-3'>
                      {tierGroups.slice(0, 3).map((tg) => {
                        const noneBilled =
                          (isGroupMode
                            ? tg.withoutVideoPrice
                            : (tg.officialWithoutVideoPrice ??
                              tg.withoutVideoPrice)) * priceRate
                        const noneOff =
                          (tg.officialWithoutVideoPrice ??
                            tg.withoutVideoPrice) * priceRate
                        const videoBilled =
                          (isGroupMode
                            ? tg.withVideoPrice
                            : (tg.officialWithVideoPrice ??
                              tg.withVideoPrice)) * priceRate
                        const videoOff =
                          (tg.officialWithVideoPrice ?? tg.withVideoPrice) *
                          priceRate

                        return (
                          <div
                            key={tg.title}
                            className='bg-muted/20 border-border/40 flex flex-col rounded-lg border px-2.5 py-1.5 text-xs'
                          >
                            <div className='border-border/20 text-foreground mb-1 flex items-center justify-between border-b pb-0.5 text-[11px] font-semibold'>
                              <span>{tg.resLabel}</span>
                              <span className='text-muted-foreground/60 text-[9.5px]'>
                                / 1M tok
                              </span>
                            </div>
                            <div className='flex items-center justify-between text-[11px]'>
                              <span className='text-muted-foreground/75'>
                                无视频:
                              </span>
                              <span className='text-foreground font-semibold tabular-nums'>
                                ${noneBilled.toFixed(3)}
                                {isGroupMode && (
                                  <span className='text-muted-foreground/50 ml-1 text-[9.5px] font-normal line-through'>
                                    ${noneOff.toFixed(3)}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className='mt-0.5 flex items-center justify-between text-[11px]'>
                              <span className='text-muted-foreground/75'>
                                有视频:
                              </span>
                              <span className='text-foreground font-semibold tabular-nums'>
                                ${videoBilled.toFixed(3)}
                                {isGroupMode && (
                                  <span className='text-muted-foreground/50 ml-1 text-[9.5px] font-normal line-through'>
                                    ${videoOff.toFixed(3)}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {!isUpscale && tierGroups.length === 0 && (
                    <div className='text-muted-foreground py-2 text-center text-sm'>
                      {t('Special billing expression')}
                    </div>
                  )}
                </div>

                {/* Right: Savings */}
                <div className='col-span-12 flex items-center justify-center md:col-span-2'>
                  <SavingsBadge savings={savings} />
                </div>
              </div>
            )
          }

          // Time-Tiered Branch (DeepSeek)
          if (isTimeTiered) {
            const baseRatio = getConfiguredGroupRatio(
              props.groupRatio,
              selectedGroup || ''
            )
            const offPeakInput = resolvePrices(
              getModelUnitPrice(
                model,
                'input',
                baseRatio * 0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              ),
              getModelUnitPrice(
                model,
                'input',
                0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate
              ),
              isGroupMode,
              Boolean(selectedGroup)
            )
            const peakInput = resolvePrices(
              getModelUnitPrice(
                model,
                'input',
                baseRatio,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              ),
              getModelUnitPrice(
                model,
                'input',
                1,
                tokenUnit,
                priceRate,
                usdExchangeRate
              ),
              isGroupMode,
              Boolean(selectedGroup)
            )
            const offPeakOutput = resolvePrices(
              getModelUnitPrice(
                model,
                'output',
                baseRatio * 0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              ),
              getModelUnitPrice(
                model,
                'output',
                0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate
              ),
              isGroupMode,
              Boolean(selectedGroup)
            )
            const peakOutput = resolvePrices(
              getModelUnitPrice(
                model,
                'output',
                baseRatio,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              ),
              getModelUnitPrice(
                model,
                'output',
                1,
                tokenUnit,
                priceRate,
                usdExchangeRate
              ),
              isGroupMode,
              Boolean(selectedGroup)
            )
            const offPeakCache = resolvePrices(
              getModelUnitPrice(
                model,
                'cache',
                baseRatio * 0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              ),
              getModelUnitPrice(
                model,
                'cache',
                0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate
              ),
              isGroupMode,
              Boolean(selectedGroup)
            )
            const peakCache = resolvePrices(
              getModelUnitPrice(
                model,
                'cache',
                baseRatio,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              ),
              getModelUnitPrice(
                model,
                'cache',
                1,
                tokenUnit,
                priceRate,
                usdExchangeRate
              ),
              isGroupMode,
              Boolean(selectedGroup)
            )

            const offPeakSavings =
              savings != null ? Math.round(100 - (100 - savings) * 0.5) : 50

            return (
              <div
                key={model.model_name}
                onClick={() => props.onModelClick?.(model.model_name)}
                className='group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-150 hover:border-foreground/15 hover:shadow-xs'
              >
                {/* 1. Header: Model Identity */}
                <div className='flex items-center justify-between border-b border-border/40 bg-muted/20 px-5 py-2.5'>
                  <div className='flex items-center gap-2'>
                    <span className='font-sans text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors sm:text-[15.5px]'>
                      {model.model_name}
                    </span>
                    <span onClick={(e) => e.stopPropagation()}>
                      <CopyButton
                        value={model.model_name}
                        size='icon'
                        variant='ghost'
                        className='text-muted-foreground/40 hover:text-foreground size-5 shrink-0 transition-opacity duration-150 sm:opacity-0 group-hover:opacity-100'
                        iconClassName='size-3'
                      />
                    </span>
                    <span className='inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-400'>
                      <Clock className='size-2.5' />
                      {t('pricing.timeTieredBadge', '分时计费')}
                    </span>
                  </div>
                </div>

                {/* 2. Seamless Integrated Tier Rows (Zero Nested Boxes) */}
                <div className='divide-y divide-border/40'>
                  {/* Tier 1: OFF-PEAK Row */}
                  <div className='grid grid-cols-1 items-center gap-2.5 bg-emerald-500/[0.03] px-5 py-2.5 transition-colors hover:bg-emerald-500/[0.06] md:grid-cols-12'>
                    {/* Col 4: Time Range & Pill */}
                    <div className='col-span-12 flex items-center gap-2.5 md:col-span-4'>
                      <span
                        title={t('pricing.offPeakHoursTooltip', '其余全天时段 · 享受 50% 折扣')}
                        className='inline-flex shrink-0 items-center justify-center rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400 shadow-2xs'
                      >
                        {t('pricing.offPeakPill', '闲时')}
                      </span>
                      <span className='text-muted-foreground/80 font-sans text-[11.5px] whitespace-nowrap tracking-tight sm:text-[12px]'>
                        {t('pricing.offPeakTimeRange', '00:00-09:00, 12:00-14:00, 18:00-24:00 (SGT)')}
                      </span>
                    </div>

                    {/* Col 6: Prices strictly aligned with table header */}
                    <div className='col-span-12 grid grid-cols-3 gap-2 md:col-span-6'>
                      <div className='flex flex-col items-center justify-center text-center'>
                        <span className='text-muted-foreground/60 text-[9.5px] font-normal md:hidden'>
                          {t('Input price')}
                        </span>
                        <PriceColumn
                          primary={offPeakInput.primary}
                          official={offPeakInput.official}
                        />
                      </div>
                      <div className='flex flex-col items-center justify-center text-center'>
                        <span className='text-muted-foreground/60 text-[9.5px] font-normal md:hidden'>
                          {t('Output price')}
                        </span>
                        <PriceColumn
                          primary={offPeakOutput.primary}
                          official={offPeakOutput.official}
                        />
                      </div>
                      <div className='flex flex-col items-center justify-center text-center'>
                        <span className='text-muted-foreground/60 text-[9.5px] font-normal md:hidden'>
                          {t('pricing.cachePrice', '缓存读取')}
                        </span>
                        <PriceColumn
                          primary={offPeakCache.primary}
                          official={offPeakCache.official}
                        />
                      </div>
                    </div>

                    {/* Col 2: Discount */}
                    <div className='col-span-12 flex items-center justify-center md:col-span-2'>
                      <SavingsBadge savings={offPeakSavings} />
                    </div>
                  </div>

                  {/* Tier 2: PEAK Row */}
                  <div className='grid grid-cols-1 items-center gap-2.5 bg-background px-5 py-2.5 transition-colors hover:bg-muted/20 md:grid-cols-12'>
                    {/* Col 4: Time Range & Pill */}
                    <div className='col-span-12 flex items-center gap-2.5 md:col-span-4'>
                      <span
                        title={t('pricing.peakHoursTooltip', '新加坡时间 09:00-12:00, 14:00-18:00 · 标准原价')}
                        className='inline-flex shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground shadow-2xs'
                      >
                        {t('pricing.peakPill', '忙时')}
                      </span>
                      <span className='text-muted-foreground/60 font-sans text-[11.5px] whitespace-nowrap tracking-tight sm:text-[12px]'>
                        {t('pricing.peakTimeRange', '09:00-12:00, 14:00-18:00 (SGT)')}
                      </span>
                    </div>

                    {/* Col 6: Prices strictly aligned with table header */}
                    <div className='col-span-12 grid grid-cols-3 gap-2 md:col-span-6'>
                      <div className='flex flex-col items-center justify-center text-center'>
                        <span className='text-muted-foreground/60 text-[9.5px] font-normal md:hidden'>
                          {t('Input price')}
                        </span>
                        <PriceColumn
                          primary={peakInput.primary}
                          official={peakInput.official}
                        />
                      </div>
                      <div className='flex flex-col items-center justify-center text-center'>
                        <span className='text-muted-foreground/60 text-[9.5px] font-normal md:hidden'>
                          {t('Output price')}
                        </span>
                        <PriceColumn
                          primary={peakOutput.primary}
                          official={peakOutput.official}
                        />
                      </div>
                      <div className='flex flex-col items-center justify-center text-center'>
                        <span className='text-muted-foreground/60 text-[9.5px] font-normal md:hidden'>
                          {t('pricing.cachePrice', '缓存读取')}
                        </span>
                        <PriceColumn
                          primary={peakCache.primary}
                          official={peakCache.official}
                        />
                      </div>
                    </div>

                    {/* Col 2: Discount */}
                    <div className='col-span-12 flex items-center justify-center md:col-span-2'>
                      {savings != null ? (
                        <SavingsBadge savings={savings} />
                      ) : (
                        <span className='text-muted-foreground/25 text-sm font-light'>—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          // Standard Token / Request Model Branch
          const isToken = isTokenBasedModel(model)
          let inputPrice = { primary: '—', official: null as string | null }
          let outputPrice = { primary: '—', official: null as string | null }
          let cachePrice = { primary: '—', official: null as string | null }

          if (!isToken) {
            const groupReq = formatRequestPrice(
              model,
              false,
              priceRate,
              usdExchangeRate,
              selectedGroup
            )
            const offReq = formatRequestPrice(
              model,
              false,
              priceRate,
              usdExchangeRate,
              undefined,
              1
            )
            const res = resolvePrices(
              groupReq,
              offReq,
              isGroupMode,
              Boolean(selectedGroup)
            )
            inputPrice = res
          } else {
            const inGroup = formatPrice(
              model,
              'input',
              tokenUnit,
              false,
              priceRate,
              usdExchangeRate,
              selectedGroup
            )
            const inOff = formatPrice(
              model,
              'input',
              tokenUnit,
              false,
              priceRate,
              usdExchangeRate,
              undefined,
              1
            )
            inputPrice = resolvePrices(
              inGroup,
              inOff,
              isGroupMode,
              Boolean(selectedGroup)
            )

            const outGroup = formatPrice(
              model,
              'output',
              tokenUnit,
              false,
              priceRate,
              usdExchangeRate,
              selectedGroup
            )
            const outOff = formatPrice(
              model,
              'output',
              tokenUnit,
              false,
              priceRate,
              usdExchangeRate,
              undefined,
              1
            )
            outputPrice = resolvePrices(
              outGroup,
              outOff,
              isGroupMode,
              Boolean(selectedGroup)
            )

            const cacheGroup = formatPrice(
              model,
              'cache',
              tokenUnit,
              false,
              priceRate,
              usdExchangeRate,
              selectedGroup
            )
            const cacheOff = formatPrice(
              model,
              'cache',
              tokenUnit,
              false,
              priceRate,
              usdExchangeRate,
              undefined,
              1
            )
            cachePrice = resolvePrices(
              cacheGroup,
              cacheOff,
              isGroupMode,
              Boolean(selectedGroup)
            )
          }

          return (
            <div
              key={model.model_name}
              onClick={() => props.onModelClick?.(model.model_name)}
              className='group relative grid cursor-pointer grid-cols-1 items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-150 hover:border-foreground/15 hover:bg-muted/30 hover:shadow-xs md:grid-cols-12'
            >
              {/* Left: Model Identity: Only model name + copy */}
              <div className='col-span-12 flex min-w-0 items-center gap-2 md:col-span-4'>
                <span
                  translate='no'
                  className='notranslate text-foreground group-hover:text-primary truncate font-sans text-[15px] font-semibold antialiased transition-colors sm:text-[15.5px]'
                >
                  {model.model_name}
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <CopyButton
                    value={model.model_name}
                    size='icon'
                    variant='ghost'
                    className='text-muted-foreground/40 hover:text-foreground size-5 transition-opacity duration-150 sm:opacity-0 group-hover:opacity-100'
                    iconClassName='size-3'
                  />
                </span>
              </div>

              {/* Middle: Standard Price Columns without nested boxes (无须 1m) */}
              <div className='col-span-12 grid grid-cols-1 gap-2 sm:grid-cols-3 md:col-span-6'>
                <PriceColumn
                  primary={inputPrice.primary}
                  official={inputPrice.official}
                  unit={!isToken ? '/ 次' : undefined}
                />
                <PriceColumn
                  primary={outputPrice.primary}
                  official={outputPrice.official}
                />
                <PriceColumn
                  primary={cachePrice.primary}
                  official={cachePrice.official}
                />
              </div>

              {/* Right: Savings */}
              <div className='col-span-12 flex items-center justify-center md:col-span-2'>
                {savings != null ? (
                  <SavingsBadge savings={savings} />
                ) : (
                  <span className='text-muted-foreground/25 text-sm font-light'>—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

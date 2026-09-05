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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { cn } from '@/lib/utils'

import {
  DEFAULT_TOKEN_UNIT,
  lookupGroupMapValue,
  MANUAL_GROUP_SAVINGS_OFF,
} from '../constants'
import {
  formatDynamicUnitPrice,
  getDynamicPricingTiers,
  isDynamicPricingModel,
} from '../lib/dynamic-price'
import { resolveGroupSavingsOffPercent } from '../lib/group-discount'
import {
  getConfiguredGroupRatio,
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
  const name = model.model_name.toLowerCase()
  return name.includes('deepseek-v4') || name.startsWith('deepseek')
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
        else if (type === 'create_cache')
          val = Number(tier.cacheCreatePrice) || 0

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

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-1',
        props.className
      )}
    >
      <div className='flex items-baseline justify-center gap-1'>
        <span className='text-foreground text-[15px] font-semibold tabular-nums sm:text-[16px]'>
          {stripTrailingZeros(props.primary)}
        </span>
        {props.unit && (
          <span className='text-muted-foreground/75 text-[11px] font-normal'>
            {props.unit}
          </span>
        )}
      </div>
      {props.official && !isEmptyPrice(props.official) && (
        <span className='text-muted-foreground/75 decoration-muted-foreground/40 mt-0.5 text-[12px] font-medium tabular-nums line-through'>
          {stripTrailingZeros(props.official)}
        </span>
      )}
    </div>
  )
}

function SavingsBadge({ savings }: { savings: number | null }) {
  if (savings == null) return null
  return (
    <span className='inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-2.5 py-0.5 text-xs leading-normal font-bold whitespace-nowrap text-white tabular-nums shadow-2xs ring-1 ring-rose-500/20'>
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

  const isVideoTable =
    props.models.length > 0 && props.models.every(isByteDanceOrVideoModel)

  return (
    <div className={cn('w-full space-y-3', props.className)}>
      {/* 1. Refined Column Legend Header */}
      <div className='text-muted-foreground border-border/40 hidden grid-cols-12 items-center gap-4 border-b px-5 py-2.5 text-xs font-medium md:grid'>
        <div className='col-span-4'>{t('Model', '模型名称')}</div>
        {isVideoTable ? (
          <div className='col-span-6 text-center'>
            {t('Generation Mode & Pricing', '生成模式与计费价格')}
          </div>
        ) : (
          <>
            <div className='col-span-2 text-center'>
              {t('Input price')}
              <span className='text-muted-foreground/70 ml-1 font-mono text-[10.5px] font-normal lowercase'>
                / {unitHint}
              </span>
            </div>
            <div className='col-span-2 text-center'>
              {t('Output price')}
              <span className='text-muted-foreground/70 ml-1 font-mono text-[10.5px] font-normal lowercase'>
                / {unitHint}
              </span>
            </div>
            <div className='col-span-2 text-center'>
              {t('Cache & Details', '缓存与扩展')}
            </div>
          </>
        )}
        <div className='col-span-2 text-center'>
          {t('Discount', '优惠幅度')}
        </div>
      </div>

      {/* 2. Floating Card-Rows List */}
      <div className='flex flex-col gap-2.5 sm:gap-3'>
        {props.models.map((model) => {
          const isTimeTiered = isTimeTieredModel(model)

          // Video Model Branch
          if (isByteDanceOrVideoModel(model)) {
            const isUpscale = isVideoUpscaleModel(model)
            const tierGroups = isUpscale ? [] : getVideoModelTierGroups(model)

            return (
              <div
                key={model.model_name}
                onClick={() => props.onModelClick?.(model.model_name)}
                className='group border-border/70 bg-card/80 hover:border-primary/40 hover:bg-card relative grid cursor-pointer grid-cols-1 items-center gap-4 rounded-xl border px-5 py-3.5 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs md:grid-cols-12'
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
                  {isUpscale ? (
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                      <PriceColumn
                        primary={`$${(0.0091 * (isGroupMode ? (savings != null ? (100 - savings) / 100 : 1) : 1) * priceRate).toFixed(4)}`}
                        official={`$${(0.013 * priceRate).toFixed(4)}`}
                        unit='/ 秒起'
                      />
                      <PriceColumn
                        primary={`$${(7.1848 * (isGroupMode ? (savings != null ? (100 - savings) / 100 : 1) : 1) * priceRate).toFixed(2)}`}
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
                  ) : tierGroups.length > 0 ? (
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
                  ) : (
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

            return (
              <div
                key={model.model_name}
                onClick={() => props.onModelClick?.(model.model_name)}
                className='group border-border/70 bg-card/80 hover:border-primary/40 hover:bg-card relative grid cursor-pointer grid-cols-1 items-center gap-4 rounded-xl border px-5 py-3.5 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs md:grid-cols-12'
              >
                {/* Left: Model Identity: Only model name + copy */}
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

                {/* Center: Time-tiered Pricing */}
                <div className='col-span-12 grid grid-cols-1 gap-2 sm:grid-cols-3 md:col-span-6'>
                  <PriceColumn
                    primary={offPeakInput.primary}
                    official={offPeakInput.official}
                    unit='(闲时)'
                  />
                  <PriceColumn
                    primary={offPeakOutput.primary}
                    official={offPeakOutput.official}
                    unit='(闲时)'
                  />
                  <PriceColumn
                    primary={peakInput.primary}
                    official={peakInput.official}
                    unit='(忙时)'
                  />
                </div>

                {/* Right: Savings */}
                <div className='col-span-12 flex items-center justify-center md:col-span-2'>
                  <SavingsBadge savings={savings} />
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
              className='group border-border/70 bg-card/80 hover:border-primary/40 hover:bg-card relative grid cursor-pointer grid-cols-1 items-center gap-4 rounded-xl border px-5 py-3.5 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs md:grid-cols-12'
            >
              {/* Left: Model Identity: Only model name + copy */}
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
                <SavingsBadge savings={savings} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

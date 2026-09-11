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
  isDynamicUpToGroup,
  lookupGroupMapValue,
  lookupModelSavingsOff,
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
  getDurationVideoTiers,
  getVideoModelTierGroups,
  isByteDanceOrVideoModel,
  isDurationBasedVideoModel,
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

export function isTimeTieredModel(model: PricingModel): boolean {
  // 核心守卫：必须后端启用了表达式计费（tiered_expr），才进入分时展示；若后端为普通按量/Token模式，严格跟随展示为标准按量
  if (!isDynamicPricingModel(model)) return false
  const expr = model.billing_expr || ''
  const hasTimeRule = /(?:hour|minute|weekday)\s*\(/i.test(expr)
  const name = (model.model_name || '').trim().toLowerCase()
  const isWhitelisted = TIME_TIERED_MODEL_NAMES.some((t) => t.toLowerCase() === name)
  return hasTimeRule || isWhitelisted
}

export function getOffPeakMultiplier(model: PricingModel): number {
  const expr = model.billing_expr || ''
  const m = expr.match(/\?\s*1(?:\.0+)?\s*:\s*([\d.]+)/)
  if (m) {
    const val = Number(m[1])
    if (Number.isFinite(val) && val > 0 && val < 1) return val
  }
  return 0.5
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
      className='notranslate inline-flex items-center justify-center rounded-full bg-rose-500 px-2.5 pt-[3px] pb-[2px] text-xs font-bold tracking-wide whitespace-nowrap text-white tabular-nums shadow-xs leading-none'
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
    if (isDynamicUpToGroup(props.selectedGroup)) return null
    const ratio = getConfiguredGroupRatio(props.groupRatio, props.selectedGroup)
    return resolveGroupSavingsOffPercent(
      ratio,
      lookupGroupMapValue(MANUAL_GROUP_SAVINGS_OFF, props.selectedGroup)
    )
  }, [isGroupMode, props.selectedGroup, props.groupRatio])

  const isMiniMaxTable = useMemo(() => {
    return props.models.some((m) => {
      const name = (m.model_name || '').toLowerCase()
      const owner = (m.owner_by || '').toLowerCase()
      return name.startsWith('minimax') || owner.includes('minimax')
    })
  }, [props.models])

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
        <div className={isMiniMaxTable ? 'col-span-3' : 'col-span-4'}>
          {t('Model', '模型名称')}
        </div>
        {isGenerationTable ? (
          <div
            className={
              isImageTable
                ? 'col-span-9'
                : isMiniMaxTable
                  ? 'col-span-8 text-center'
                  : 'col-span-6 text-center'
            }
          >
            {t('Generation Mode & Pricing', '生成模式与计费价格')}
          </div>
        ) : isMiniMaxTable ? (
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
              {t('Cache Read', '缓存读取')}
              <span className='text-muted-foreground/60 ml-1 font-sans text-[11px] font-normal'>
                / {unitHint}
              </span>
            </div>
            <div className='col-span-2 text-center'>
              {t('Cache Write', '缓存写入')}
              <span className='text-muted-foreground/60 ml-1 font-sans text-[11px] font-normal'>
                / {unitHint}
              </span>
            </div>
          </>
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
              <span className='text-muted-foreground/60 ml-1 font-sans text-[11px] font-normal'>
                / {unitHint}
              </span>
            </div>
          </>
        )}
        {!isImageTable && (
          <div
            className={cn(
              'text-center',
              isMiniMaxTable ? 'col-span-1' : 'col-span-2'
            )}
          >
            {isMiniMaxTable ? t('Discount', '优惠') : t('Discount', '优惠幅度')}
          </div>
        )}
      </div>

      {/* 2. Floating Card-Rows List */}
      <div className='flex flex-col gap-2.5 sm:gap-3'>
        {props.models.map((model) => {
          const isTimeTiered = isTimeTieredModel(model)
          const modelSavings = lookupModelSavingsOff(model.model_name)
          const effectiveSavings = isGroupMode
            ? (modelSavings ?? savings)
            : null

          if (isPerImageExpressionModel(model)) {
            return (
              <div
                key={model.model_name}
                className='group relative grid grid-cols-1 items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-150 hover:border-foreground/15 hover:bg-muted/30 hover:shadow-xs md:grid-cols-12'
              >
                <div className='col-span-12 flex min-w-0 items-center gap-2 md:col-span-3'>
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
                <div className='col-span-12 min-w-0 md:col-span-9'>
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
            const isDurationBased = isDurationBasedVideoModel(model)
            const tierGroups = isUpscale || isDurationBased ? [] : getVideoModelTierGroups(model)
            const durationTiers = isDurationBased ? getDurationVideoTiers(model) : []
            const upscaleRatio =
              isGroupMode && savings != null ? (100 - savings) / 100 : 1

            return (
              <div
                key={model.model_name}
                onClick={() => props.onModelClick?.(model.model_name)}
                className='group relative grid cursor-pointer grid-cols-1 items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/40 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:border-border/80 dark:hover:border-border dark:hover:bg-accent/20 md:grid-cols-12'
              >
                {/* Left: Model Identity (Only model name + copy, no icon) */}
                <div
                  className={cn(
                    'col-span-12 flex min-w-0 items-center gap-2',
                    isMiniMaxTable ? 'md:col-span-3' : 'md:col-span-4'
                  )}
                >
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
                <div
                  className={cn(
                    'col-span-12',
                    isMiniMaxTable ? 'md:col-span-8' : 'md:col-span-6'
                  )}
                >
                  {isDurationBased && (
                    <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
                      {durationTiers.map((dt) => {
                        const billedSec = dt.secondPrice * priceRate
                        const officialSec = (dt.officialSecondPrice ?? dt.secondPrice) * priceRate
                        const billed5s = dt.est5sPrice * priceRate
                        const official5s = (dt.officialEst5sPrice ?? dt.est5sPrice) * priceRate
                        const showOff = isGroupMode && Math.abs(billedSec - officialSec) > 0.0001

                        return (
                          <div
                            key={dt.resolution}
                            className='bg-muted/20 border-border/40 flex flex-col rounded-lg border px-3 py-1.5 text-xs'
                          >
                            <div className='border-border/20 text-foreground mb-1 flex items-center justify-between border-b pb-1 text-[11px] font-semibold'>
                              <span className='font-bold'>{dt.resLabel}</span>
                              <span className='text-muted-foreground/75 font-mono text-[10.5px]'>
                                5s 约 ${billed5s.toFixed(3)}
                                {showOff && (
                                  <span className='line-through ml-1 text-muted-foreground/50'>
                                    ${official5s.toFixed(3)}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className='flex items-center justify-between text-[11px]'>
                              <span className='text-muted-foreground/75'>
                                每秒单价:
                              </span>
                              <span className='text-foreground font-semibold tabular-nums font-mono'>
                                ${billedSec >= 0.01 && !Number.isInteger(billedSec * 1000)
                                  ? billedSec.toFixed(4).replace(/0$/, '')
                                  : billedSec.toFixed(3)}/s
                                {showOff && (
                                  <span className='text-muted-foreground/50 ml-1.5 text-[10px] font-normal line-through'>
                                    ${officialSec >= 0.01 && !Number.isInteger(officialSec * 1000)
                                      ? officialSec.toFixed(4).replace(/0$/, '')
                                      : officialSec.toFixed(3)}/s
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
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
                  {!isUpscale && !isDurationBased && tierGroups.length === 0 && (
                    <div className='text-muted-foreground py-2 text-center text-sm'>
                      {t('Special billing expression')}
                    </div>
                  )}
                </div>

                {/* Right: Savings */}
                <div
                  className={cn(
                    'col-span-12 flex items-center justify-center',
                    isMiniMaxTable ? 'md:col-span-1' : 'md:col-span-2'
                  )}
                >
                  <SavingsBadge savings={effectiveSavings} />
                </div>
              </div>
            )
          }

          // Time-Tiered Branch (DeepSeek)
          if (isTimeTiered) {
            const offPeakMultiplier = getOffPeakMultiplier(model)
            const baseRatio = getConfiguredGroupRatio(
              props.groupRatio,
              selectedGroup || ''
            )
            const offPeakInput = resolvePrices(
              getModelUnitPrice(
                model,
                'input',
                baseRatio * offPeakMultiplier,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              ),
              getModelUnitPrice(
                model,
                'input',
                offPeakMultiplier,
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
                baseRatio * offPeakMultiplier,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              ),
              getModelUnitPrice(
                model,
                'output',
                offPeakMultiplier,
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
                baseRatio * offPeakMultiplier,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              ),
              getModelUnitPrice(
                model,
                'cache',
                offPeakMultiplier,
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

            const defaultDiscountPercent = Math.round((1 - offPeakMultiplier) * 100)
            const offPeakSavings =
              effectiveSavings != null
                ? Math.round(100 - (100 - effectiveSavings) * offPeakMultiplier)
                : defaultDiscountPercent

            const isV41Schedule =
              Boolean(model.billing_expr?.includes('weekday')) ||
              (model.model_name || '').toLowerCase().includes('deepseek-v4.1-flash')

            const offPeakTimeLabel = isV41Schedule
              ? t('pricing.v41OffPeakTimeRange', '周六日全天 · 工作日 12:00-14:00, 18:00-09:00 (新加坡时间)')
              : t('pricing.offPeakTimeRange', '00:00-09:00, 12:00-14:00, 18:00-24:00 (新加坡时间)')

            const peakTimeLabel = isV41Schedule
              ? t('pricing.v41PeakTimeRange', '工作日 09:00-12:00, 14:00-18:00 (新加坡时间)')
              : t('pricing.peakTimeRange', '09:00-12:00, 14:00-18:00 (新加坡时间)')

            const offPeakTooltipText = isV41Schedule
              ? t('pricing.v41OffPeakHoursTooltip', '周六日全天、工作日中午 12:00-14:00 与夜晨 18:00-09:00 (新加坡时间) · 享受 50% 闲时折扣')
              : t('pricing.offPeakHoursTooltip', '新加坡时间其余全天时段 · 享受 50% 闲时折扣')

            const peakTooltipText = isV41Schedule
              ? t('pricing.v41PeakHoursTooltip', '仅工作日（周一至周五）09:00-12:00 与 14:00-18:00 (新加坡时间) · 标准原价')
              : t('pricing.peakHoursTooltip', '新加坡时间 09:00-12:00, 14:00-18:00 · 标准原价')

            const badgeTooltipText = isV41Schedule
              ? t('pricing.v41TimeTieredBadgeTooltip', '工作日 09:00-12:00 与 14:00-18:00 为忙时；周六日全天、工作日 12:00-14:00 及 18:00-09:00 为闲时 (5折)')
              : t('pricing.timeTieredBadgeTooltip', '新加坡时间 09:00-12:00 与 14:00-18:00 为忙时；其余全天时段为闲时 (5折)')

            return (
              <div
                key={model.model_name}
                onClick={() => props.onModelClick?.(model.model_name)}
                className='group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-sm transition-all duration-200 hover:border-blue-400/40 hover:shadow-md hover:shadow-blue-500/5 dark:border-border/70 dark:hover:border-blue-500/30'
              >
                {/* Ambient subtle glow */}
                <div
                  className='pointer-events-none absolute -top-14 -right-14 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl transition-all duration-500 group-hover:bg-blue-500/15'
                  aria-hidden='true'
                />

                {/* 1. Header: Model Identity */}
                <div className='flex items-center justify-between border-b border-border/50 bg-muted/25 px-5 py-2.5'>
                  <div className='flex items-center gap-2'>
                    <span className='font-sans text-[15px] font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors sm:text-[15.5px]'>
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
                    <span
                      title={badgeTooltipText}
                      className='inline-flex cursor-help items-center gap-1.5 rounded-full border border-blue-200 bg-blue-100/70 px-2.5 py-0.5 text-[10.5px] font-medium text-blue-800 shadow-2xs transition-colors hover:bg-blue-200/80 dark:border-blue-800/80 dark:bg-blue-900/40 dark:text-blue-300'
                    >
                      <Clock className='size-2.5 text-blue-600 dark:text-blue-400' />
                      {t('pricing.timeTieredBadge', '分时计费')}
                    </span>
                  </div>
                </div>

                {/* 2. Seamless Integrated Tier Rows (Zero Nested Boxes) */}
                <div className='divide-y divide-border/40'>
                  {/* Tier 1: OFF-PEAK Row */}
                  <div className='grid grid-cols-1 items-center gap-2.5 bg-blue-500/[0.03] px-5 py-2.5 transition-colors hover:bg-blue-500/[0.06] dark:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.08] md:grid-cols-12'>
                    {/* Col Time Range & Pill */}
                    <div
                      className={cn(
                        'col-span-12 flex items-center gap-2.5',
                        isMiniMaxTable ? 'md:col-span-3' : 'md:col-span-4'
                      )}
                    >
                      <span
                        title={offPeakTooltipText}
                        className='inline-flex shrink-0 items-center justify-center rounded-md border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-blue-700 shadow-2xs dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-300'
                      >
                        {t('pricing.offPeakPill', '闲时')}
                      </span>
                      <span className='text-muted-foreground/80 font-sans text-[11px] whitespace-nowrap tracking-tight sm:text-[11.5px] xl:text-[12px]'>
                        {offPeakTimeLabel}
                      </span>
                    </div>

                    {/* Col Prices strictly aligned with table header */}
                    <div
                      className={cn(
                        'col-span-12 grid gap-2',
                        isMiniMaxTable
                          ? 'grid-cols-2 sm:grid-cols-4 md:col-span-8'
                          : 'grid-cols-1 sm:grid-cols-3 md:col-span-6'
                      )}
                    >
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
                      {isMiniMaxTable && (
                        <div className='flex flex-col items-center justify-center text-center'>
                          <span className='text-muted-foreground/60 text-[9.5px] font-normal md:hidden'>
                            {t('Cache Write', '缓存写入')}
                          </span>
                          <PriceColumn primary='—' />
                        </div>
                      )}
                    </div>

                    {/* Col Discount */}
                    <div
                      className={cn(
                        'col-span-12 flex items-center justify-center',
                        isMiniMaxTable ? 'md:col-span-1' : 'md:col-span-2'
                      )}
                    >
                      <SavingsBadge savings={offPeakSavings} />
                    </div>
                  </div>

                  {/* Tier 2: PEAK Row */}
                  <div className='grid grid-cols-1 items-center gap-2.5 bg-background/80 px-5 py-2.5 transition-colors hover:bg-muted/20 md:grid-cols-12'>
                    {/* Col Time Range & Pill */}
                    <div
                      className={cn(
                        'col-span-12 flex items-center gap-2.5',
                        isMiniMaxTable ? 'md:col-span-3' : 'md:col-span-4'
                      )}
                    >
                      <span
                        title={peakTooltipText}
                        className='inline-flex shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      >
                        {t('pricing.peakPill', '忙时')}
                      </span>
                      <span className='text-muted-foreground/70 font-sans text-[11px] whitespace-nowrap tracking-tight sm:text-[11.5px] xl:text-[12px]'>
                        {peakTimeLabel}
                      </span>
                    </div>

                    {/* Col Prices strictly aligned with table header */}
                    <div
                      className={cn(
                        'col-span-12 grid gap-2',
                        isMiniMaxTable
                          ? 'grid-cols-2 sm:grid-cols-4 md:col-span-8'
                          : 'grid-cols-1 sm:grid-cols-3 md:col-span-6'
                      )}
                    >
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
                      {isMiniMaxTable && (
                        <div className='flex flex-col items-center justify-center text-center'>
                          <span className='text-muted-foreground/60 text-[9.5px] font-normal md:hidden'>
                            {t('Cache Write', '缓存写入')}
                          </span>
                          <PriceColumn primary='—' />
                        </div>
                      )}
                    </div>

                    {/* Col Discount */}
                    <div
                      className={cn(
                        'col-span-12 flex items-center justify-center',
                        isMiniMaxTable ? 'md:col-span-1' : 'md:col-span-2'
                      )}
                    >
                      {effectiveSavings != null ? (
                        <SavingsBadge savings={effectiveSavings} />
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
          let cacheReadPrice = { primary: '—', official: null as string | null }
          let cacheWritePrice = { primary: '—', official: null as string | null }

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
            cacheReadPrice = resolvePrices(
              cacheGroup,
              cacheOff,
              isGroupMode,
              Boolean(selectedGroup)
            )

            const cacheWriteGroup = formatPrice(
              model,
              'create_cache',
              tokenUnit,
              false,
              priceRate,
              usdExchangeRate,
              selectedGroup
            )
            const cacheWriteOff = formatPrice(
              model,
              'create_cache',
              tokenUnit,
              false,
              priceRate,
              usdExchangeRate,
              undefined,
              1
            )
            cacheWritePrice = resolvePrices(
              cacheWriteGroup,
              cacheWriteOff,
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
              <div
                className={cn(
                  'col-span-12 flex min-w-0 items-center gap-2',
                  isMiniMaxTable ? 'md:col-span-3' : 'md:col-span-4'
                )}
              >
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

              {/* Middle: Standard Price Columns */}
              {isMiniMaxTable ? (
                <div className='col-span-12 grid grid-cols-2 gap-2 sm:grid-cols-4 md:col-span-8'>
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
                    primary={cacheReadPrice.primary}
                    official={cacheReadPrice.official}
                  />
                  <PriceColumn
                    primary={cacheWritePrice.primary}
                    official={cacheWritePrice.official}
                  />
                </div>
              ) : (
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
                    primary={cacheReadPrice.primary}
                    official={cacheReadPrice.official}
                  />
                </div>
              )}

              {/* Right: Savings */}
              <div
                className={cn(
                  'col-span-12 flex items-center justify-center',
                  isMiniMaxTable ? 'md:col-span-1' : 'md:col-span-2'
                )}
              >
                {effectiveSavings != null ? (
                  <SavingsBadge savings={effectiveSavings} />
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

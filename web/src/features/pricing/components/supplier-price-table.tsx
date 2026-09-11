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
import { Clock, MessageSquare } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { getLobeIcon } from '@/lib/lobe-icon'
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

const MODEL_NAME_CLASS =
  'min-w-0 break-words text-[14.5px] sm:text-[15.5px] font-semibold tracking-[-0.01em] text-[var(--p-text-main,#0F172A)] leading-snug'

const MINIMAX_COLS =
  'md:grid-cols-[minmax(0,3.2fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.6fr)]'

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
  hasGroup: boolean,
  effectiveSavings?: number | null
): { primary: string; official: string | null } {
  if (hasGroup && isGroupMode) {
    if (officialPrice && officialPrice !== groupPrice && !isEmptyPrice(officialPrice)) {
      return { primary: groupPrice, official: officialPrice }
    }
    if (
      effectiveSavings != null &&
      effectiveSavings > 0 &&
      effectiveSavings < 100 &&
      groupPrice &&
      !isEmptyPrice(groupPrice)
    ) {
      const numMatch = groupPrice.match(/^([^\d-]*)([-\d,]+\.?\d*)(k?)$/)
      if (numMatch) {
        const [, symbol, numStr, suffix] = numMatch
        const num = parseFloat(numStr.replaceAll(',', ''))
        if (!isNaN(num) && num > 0) {
          const original = num / (1 - effectiveSavings / 100)
          const decimals = (numStr.split('.')[1] || '').length
          const formattedOriginal = `${symbol}${original.toFixed(Math.max(decimals, 3))}${suffix}`
          return { primary: groupPrice, official: formattedOriginal }
        }
      }
    }
    return { primary: groupPrice, official: null }
  }
  return { primary: officialPrice, official: null }
}

function PriceColumn(props: {
  primary: string
  official?: string | null
  unit?: string
  label?: string
  className?: string
  primaryClassName?: string
}) {
  if (isEmptyPrice(props.primary)) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center py-1.5 px-2 rounded-lg bg-muted/20 border border-border/30 md:bg-transparent md:border-0 md:p-0 md:py-1',
          props.className
        )}
      >
        {props.label && (
          <span className='mb-0.5 text-[11.5px] font-medium text-slate-500 md:hidden'>
            {props.label}
          </span>
        )}
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
        'flex flex-col items-center justify-center text-center rounded-lg bg-[#F8FAFC] border border-[#F1F5F9] px-2.5 py-2 md:bg-transparent md:border-0 md:p-0 md:py-1',
        props.className
      )}
    >
      {props.label && (
        <span className='mb-0.5 text-[11.5px] font-medium text-slate-500 md:hidden'>
          {props.label}
        </span>
      )}
      <div className='flex items-baseline justify-center gap-1'>
        <span className='text-[16px] font-semibold tabular-nums tracking-[-0.01em] text-[var(--p-text-main,#0F172A)] max-md:text-[15.5px]'>
          {stripTrailingZeros(props.primary)}
        </span>
        {props.unit && (
          <span className='text-[11.5px] font-normal text-[var(--p-text-subtle,#64748B)]'>
            {props.unit}
          </span>
        )}
      </div>
      {showOfficial && props.official && (
        <span className='mt-[1.5px] text-[12.5px] font-normal tabular-nums text-[var(--p-text-strike,#94A3B8)] line-through max-md:text-[12px]'>
          {stripTrailingZeros(props.official)}
        </span>
      )}
    </div>
  )
}

function SavingsBadge({ savings, className }: { savings: number | null; className?: string }) {
  if (savings == null) return null
  return (
    <span
      translate='no'
      className={cn(
        'notranslate inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#F43F5E] to-[#E11D48] min-w-[4.75rem] w-[4.75rem] h-[23px] text-xs font-bold tracking-[0.02em] whitespace-nowrap text-white tabular-nums shadow-[0_1px_2px_rgba(225,29,72,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] leading-none text-center',
        className
      )}
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
      const vendor = (m.vendor_name || '').toLowerCase()
      return name.startsWith('minimax') || vendor.includes('minimax')
    })
  }, [props.models])

  const isImageTable = props.models.every((m) => isPerImageExpressionModel(m))
  const isGenerationTable =
    isImageTable || props.models.some((m) => isByteDanceOrVideoModel(m))

  const modelRowClass = cn(
    'group relative grid cursor-pointer items-center rounded-[14px] border border-[var(--p-border,#E2E8F0)] bg-[var(--p-card,#fff)] px-[22px] py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-all duration-150 hover:border-[var(--p-border-hover,#CBD5E1)] hover:bg-[#FAFAFA] hover:shadow-[0_3px_8px_rgba(15,23,42,0.04)]',
    isMiniMaxTable
      ? cn('grid-cols-1 gap-x-2.5 gap-y-3 max-md:px-4 max-md:py-4', MINIMAX_COLS)
      : 'grid-cols-1 gap-4 md:grid-cols-12'
  )

  return (
    <div className={cn('w-full space-y-3', props.className)}>
      {/* 1. Refined Column Legend Header with Crisp Baseline */}
      <div
        className={cn(
          'mb-2.5 hidden items-center border-b border-[var(--p-border,#E2E8F0)] px-[22px] py-2.5 text-[13px] font-semibold text-[var(--p-text-muted,#334155)]',
          !isImageTable && 'md:grid',
          isMiniMaxTable ? MINIMAX_COLS : 'grid-cols-12 gap-4'
        )}
      >
        <div className={isMiniMaxTable ? undefined : 'col-span-4'}>
          {t('Model', '模型名称')}
        </div>
        {(() => {
          if (isGenerationTable) {
            let genColClass = 'col-span-6 text-center'
            if (isImageTable) {
              genColClass = 'col-span-9'
            } else if (isMiniMaxTable) {
              genColClass = 'col-span-8 text-center'
            }
            return (
              <div className={genColClass}>
                {t('Generation Mode & Pricing', '生成模式与计费价格')}
              </div>
            )
          }
          if (isMiniMaxTable) {
            return (
              <>
                <div className='text-center'>
                  {t('Input price')}
                  <span className='ml-[3px] text-[11.5px] font-normal text-[var(--p-text-subtle,#64748B)]'>
                    / {unitHint}
                  </span>
                </div>
                <div className='text-center'>
                  {t('Output price')}
                  <span className='ml-[3px] text-[11.5px] font-normal text-[var(--p-text-subtle,#64748B)]'>
                    / {unitHint}
                  </span>
                </div>
                <div className='text-center'>
                  {t('Cache Read', '缓存读取')}
                  <span className='ml-[3px] text-[11.5px] font-normal text-[var(--p-text-subtle,#64748B)]'>
                    / {unitHint}
                  </span>
                </div>
                <div className='text-center'>
                  {t('Cache Write', '缓存写入')}
                  <span className='ml-[3px] text-[11.5px] font-normal text-[var(--p-text-subtle,#64748B)]'>
                    / {unitHint}
                  </span>
                </div>
              </>
            )
          }
          return (
            <>
              <div className='col-span-2 text-center'>
                {t('Input price')}
                <span className='ml-[3px] text-[11.5px] font-normal text-[var(--p-text-subtle,#64748B)]'>
                  / {unitHint}
                </span>
              </div>
              <div className='col-span-2 text-center'>
                {t('Output price')}
                <span className='ml-[3px] text-[11.5px] font-normal text-[var(--p-text-subtle,#64748B)]'>
                  / {unitHint}
                </span>
              </div>
              <div className='col-span-2 text-center'>
                {t('Cache & Details', '缓存与扩展')}
                <span className='ml-[3px] text-[11.5px] font-normal text-[var(--p-text-subtle,#64748B)]'>
                  / {unitHint}
                </span>
              </div>
            </>
          )
        })()}
        {!isImageTable && (
          <div
            className={cn(
              'text-center',
              !isMiniMaxTable && 'col-span-2'
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
                className={cn(modelRowClass, 'cursor-default')}
              >
                <div className='col-span-12 flex min-w-0 items-center gap-2.5 md:col-span-3'>
                  <div className='flex size-[26px] shrink-0 items-center justify-center rounded-[7px] border border-[var(--p-logo-border,#FFE4E6)] bg-[var(--p-logo-bg,#FFF1F5)]'>
                    {(model.vendor_icon || model.icon)
                      ? getLobeIcon(model.vendor_icon || model.icon, 15)
                      : <MessageSquare className='size-3.5 text-rose-500' />}
                  </div>
                  <button
                    type='button'
                    className={cn(
                      MODEL_NAME_CLASS,
                      'rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current'
                    )}
                    onClick={() => props.onModelClick?.(model.model_name)}
                  >
                    {model.model_name}
                  </button>
                  <CopyButton
                    value={model.model_name}
                    size='icon'
                    variant='ghost'
                    className='size-6 shrink-0 text-[#94A3B8] opacity-70 transition-opacity duration-150 group-hover:opacity-[0.85] hover:bg-[#F1F5F9] hover:text-[#0F172A] sm:opacity-0 sm:group-hover:opacity-[0.85]'
                    iconClassName='size-[15.5px]'
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
                className={modelRowClass}
              >
                {/* Left: Model Identity (Mobile: row header with name left and SavingsBadge right) */}
                <div
                  className={cn(
                    'col-span-12 flex min-w-0 items-center justify-between gap-2.5',
                    isMiniMaxTable ? 'md:col-span-3' : 'md:col-span-4'
                  )}
                >
                  <div className='flex min-w-0 items-center gap-2.5'>
                    <div className='flex size-[26px] shrink-0 items-center justify-center rounded-[7px] border border-[var(--p-logo-border,#FFE4E6)] bg-[var(--p-logo-bg,#FFF1F5)]'>
                      {(model.vendor_icon || model.icon)
                        ? getLobeIcon(model.vendor_icon || model.icon, 15)
                        : <MessageSquare className='size-3.5 text-rose-500' />}
                    </div>
                    <span className={MODEL_NAME_CLASS}>
                      {model.model_name}
                    </span>
                    <span onClick={(e) => e.stopPropagation()}>
                      <CopyButton
                        value={model.model_name}
                        size='icon'
                        variant='ghost'
                        className='size-6 shrink-0 text-[#94A3B8] opacity-70 transition-opacity duration-150 group-hover:opacity-[0.85] hover:bg-[#F1F5F9] hover:text-[#0F172A] sm:opacity-0 sm:group-hover:opacity-[0.85]'
                        iconClassName='size-[15.5px]'
                      />
                    </span>
                  </div>
                  {effectiveSavings != null && (
                    <div className='shrink-0 md:hidden'>
                      <SavingsBadge savings={effectiveSavings} />
                    </div>
                  )}
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
                              <span className='font-semibold'>{dt.resLabel}</span>
                              <span className='text-muted-foreground/75 tabular-nums text-[10.5px]'>
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
                              <span className='text-foreground font-semibold tabular-nums'>
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
                    'col-span-12 hidden md:flex items-center justify-center',
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
                className='group relative flex cursor-pointer flex-col overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-all duration-150 hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-[0_3px_8px_rgba(15,23,42,0.04)] dark:hover:border-border dark:hover:bg-accent/20'
              >

                {/* 1. Header: Model Identity */}
                <div className='flex items-center justify-between border-b border-border/50 bg-muted/25 px-5 py-2.5'>
                  <div className='flex min-w-0 items-center gap-2.5'>
                    <div className='flex size-[26px] shrink-0 items-center justify-center rounded-[7px] border border-[var(--p-logo-border,#FFE4E6)] bg-[var(--p-logo-bg,#FFF1F5)]'>
                      {(model.vendor_icon || model.icon)
                        ? getLobeIcon(model.vendor_icon || model.icon, 15)
                        : <MessageSquare className='size-3.5 text-rose-500' />}
                    </div>
                    <span className={MODEL_NAME_CLASS}>
                      {model.model_name}
                    </span>
                    <span onClick={(e) => e.stopPropagation()}>
                      <CopyButton
                        value={model.model_name}
                        size='icon'
                        variant='ghost'
                        className='size-6 shrink-0 text-[#94A3B8] opacity-70 transition-opacity duration-150 group-hover:opacity-[0.85] hover:bg-[#F1F5F9] hover:text-[#0F172A] sm:opacity-0 sm:group-hover:opacity-[0.85]'
                        iconClassName='size-[15.5px]'
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
              Boolean(selectedGroup),
              effectiveSavings
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
              Boolean(selectedGroup),
              effectiveSavings
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
              Boolean(selectedGroup),
              effectiveSavings
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
              Boolean(selectedGroup),
              effectiveSavings
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
              Boolean(selectedGroup),
              effectiveSavings
            )
          }

          return (
            <div
              key={model.model_name}
              onClick={() => props.onModelClick?.(model.model_name)}
              className={modelRowClass}
            >
              {/* Left: Model Identity (Mobile: row header with name left and SavingsBadge right) */}
              <div
                className={cn(
                  'flex min-w-0 items-center justify-between gap-2.5',
                  isMiniMaxTable
                    ? 'col-span-2 md:col-auto'
                    : 'col-span-12 md:col-span-4'
                )}
              >
                <div className='flex min-w-0 items-center gap-2.5'>
                  <div className='flex size-[26px] shrink-0 items-center justify-center rounded-[7px] border border-[var(--p-logo-border,#FFE4E6)] bg-[var(--p-logo-bg,#FFF1F5)]'>
                    {(model.vendor_icon || model.icon)
                      ? getLobeIcon(model.vendor_icon || model.icon, 15)
                      : <MessageSquare className='size-3.5 text-rose-500' />}
                  </div>
                  <span
                    translate='no'
                    className={cn('notranslate', MODEL_NAME_CLASS)}
                  >
                    {model.model_name}
                  </span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <CopyButton
                      value={model.model_name}
                      size='icon'
                      variant='ghost'
                      className='size-6 shrink-0 text-[#94A3B8] opacity-70 transition-opacity duration-150 group-hover:opacity-[0.85] hover:bg-[#F1F5F9] hover:text-[#0F172A] sm:opacity-0 sm:group-hover:opacity-[0.85]'
                      iconClassName='size-[15.5px]'
                    />
                  </span>
                </div>
                {effectiveSavings != null && (
                  <div className='shrink-0 md:hidden'>
                    <SavingsBadge savings={effectiveSavings} />
                  </div>
                )}
              </div>

              {/* Middle: Standard Price Columns (Mobile: 2x2 with labels & subtle card background) */}
              {isMiniMaxTable ? (
                <div className='col-span-2 grid grid-cols-2 gap-x-2.5 gap-y-3 md:contents'>
                  <PriceColumn
                    primary={inputPrice.primary}
                    official={inputPrice.official}
                    unit={!isToken ? '/ 次' : undefined}
                    label={`${t('Input price')} (/${unitHint})`}
                  />
                  <PriceColumn
                    primary={outputPrice.primary}
                    official={outputPrice.official}
                    label={`${t('Output price')} (/${unitHint})`}
                  />
                  <PriceColumn
                    primary={cacheReadPrice.primary}
                    official={cacheReadPrice.official}
                    label={`${t('Cache Read', '缓存读取')} (/${unitHint})`}
                  />
                  <PriceColumn
                    primary={cacheWritePrice.primary}
                    official={cacheWritePrice.official}
                    label={`${t('Cache Write', '缓存写入')} (/${unitHint})`}
                  />
                </div>
              ) : (
                <div className='col-span-12 grid grid-cols-1 gap-2 sm:grid-cols-3 md:col-span-6'>
                  <PriceColumn
                    primary={inputPrice.primary}
                    official={inputPrice.official}
                    unit={!isToken ? '/ 次' : undefined}
                    label={`${t('Input price')} (/${unitHint})`}
                  />
                  <PriceColumn
                    primary={outputPrice.primary}
                    official={outputPrice.official}
                    label={`${t('Output price')} (/${unitHint})`}
                  />
                  <PriceColumn
                    primary={cacheReadPrice.primary}
                    official={cacheReadPrice.official}
                    label={`${t('Cache & Details', '缓存与扩展')} (/${unitHint})`}
                  />
                </div>
              )}

              {/* Right: Savings (Desktop only, mobile rendered in card header) */}
              <div
                className={cn(
                  'hidden items-center justify-center md:flex',
                  !isMiniMaxTable && 'col-span-2'
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

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
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import {
  DEFAULT_TOKEN_UNIT,
  isByteDancePricingVendor,
  lookupGroupMapValue,
  MANUAL_GROUP_SAVINGS_OFF,
} from '../constants'
import {
  formatDynamicUnitPrice,
  formatTaskUsageUnitPrice,
  getDynamicPricingTiers,
  getTaskUsagePriceUnitLabelKey,
  isDynamicPricingModel,
} from '../lib/dynamic-price'
import { getTaskMatrixTableLines } from '../lib/task-matrix-display'
import { resolveGroupSavingsOffPercent } from '../lib/group-discount'
import {
  getConfiguredGroupRatio,
  getDisplayGroupRatio,
  isTokenBasedModel,
} from '../lib/model-helpers'
import {
  formatPrice,
  formatRequestPrice,
  stripTrailingZeros,
} from '../lib/price'
import type { PriceType, PricingModel, TokenUnit } from '../types'
import {
  getModelSupportedResolutions,
  getResolutionBadgeStyle,
  getVideoModelCapabilityTag,
  getVideoModelTierGroups,
  isByteDanceOrVideoModel,
  isVideoUpscaleModel,
  parseVideoUpscaleTiers,
} from '../lib/video-pricing'

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
        else if (type === 'create_cache') val = Number(tier.cacheCreatePrice) || 0

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

/**
 * Centered dual price:
 *   sell     16px medium  (slightly larger)
 *   official 13px regular strike  (paired under sell)
 */
function DualPriceCell(props: {
  primary: string
  /** Official baseline; always shown under primary when provided */
  official: string | null
}) {
  if (isEmptyPrice(props.primary)) {
    return (
      <div className='flex justify-center'>
        <span className='text-muted-foreground/35 text-sm'>—</span>
      </div>
    )
  }

  const primaryText = stripTrailingZeros(props.primary)
  const officialText =
    props.official && !isEmptyPrice(props.official)
      ? stripTrailingZeros(props.official)
      : null

  // NOTE: ui/table applies `[&_td_*]:text-sm` on every cell descendant, which
  // would squash both lines. Use !important + inline fontSize so contrast wins.
  return (
    <div className='flex flex-col items-center gap-0.5 py-0.5 text-center'>
      <span
        className='text-foreground font-sans !text-base leading-none font-medium tracking-tight tabular-nums'
        style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.2 }}
      >
        {primaryText}
      </span>
      {officialText ? (
        <span
          className='text-muted-foreground/60 decoration-muted-foreground/40 font-sans !text-[13px] leading-none font-normal tabular-nums line-through'
          style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.2 }}
        >
          {officialText}
        </span>
      ) : null}
    </div>
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

  // Official mode: empty. Group mode: any group → convert ratio to N% off (all vendors).
  const savings = useMemo(() => {
    if (!isGroupMode || !props.selectedGroup) return null
    const ratio = getConfiguredGroupRatio(props.groupRatio, props.selectedGroup)
    return resolveGroupSavingsOffPercent(
      ratio,
      lookupGroupMapValue(MANUAL_GROUP_SAVINGS_OFF, props.selectedGroup)
    )
  }, [isGroupMode, props.selectedGroup, props.groupRatio])

  const rows = useMemo(() => props.models, [props.models])
  const isTimeTieredTable = useMemo(
    () => rows.length > 0 && rows.some(isTimeTieredModel),
    [rows]
  )
  const isVideoTable = useMemo(
    () => rows.length > 0 && rows.every(isByteDanceOrVideoModel),
    [rows]
  )

  if (rows.length === 0) {
    return (
      <div className='text-muted-foreground px-3 py-10 text-center text-sm'>
        {t('No models match your current filters.')}
      </div>
    )
  }

  const baseRatio = getConfiguredGroupRatio(props.groupRatio, selectedGroup || '')

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-xl border border-border/60',
        props.className
      )}
    >
      {isTimeTieredTable ? (
        <div className='flex items-center gap-2 border-b border-border/50 bg-muted/25 px-4 py-2 text-xs text-muted-foreground'>
          <span className='inline-block size-1.5 rounded-full bg-indigo-500/70 shrink-0' />
          <span>
            {t(
              'Peak Hours: 09:00–12:00 and 14:00–18:00 SGT (all other hours are off-peak)',
              '高峰时段：09:00–12:00 与 14:00–18:00（新加坡时间，其余时间为空闲）'
            )}
          </span>
        </div>
      ) : null}

      {/* Scale: head 12 · body 15 · price 18/12. Drop forced equal text-sm. */}
      <Table className='[&_td]:text-[15px] [&_td_*]:text-[length:inherit] [&_th]:text-xs [&_th_*]:text-xs'>
        <TableHeader>
          <TableRow className='bg-muted/40 hover:bg-muted/40 border-border/60 border-b'>
            {isVideoTable ? (
              <>
                <TableHead className='text-muted-foreground h-11 min-w-[12rem] px-4 font-medium tracking-wide'>
                  {t('Model & Capability', '模型与特性')}
                </TableHead>
                <TableHead className='text-muted-foreground h-11 min-w-[9rem] px-3 text-center font-medium tracking-wide'>
                  {t('Supported Resolutions', '支持分辨率')}
                </TableHead>
                <TableHead className='text-muted-foreground h-11 min-w-[20rem] px-4 text-center font-medium tracking-wide'>
                  {t('Generation Mode & Pricing', '生成模式与计费价格')}
                </TableHead>
                <TableHead className='text-muted-foreground h-11 min-w-[6rem] px-3 text-center font-medium tracking-wide'>
                  {t('Savings')}
                </TableHead>
              </>
            ) : (
              <>
                <TableHead className='text-muted-foreground h-11 min-w-[11rem] px-4 font-medium tracking-wide'>
                  {t('Model ID')}
                </TableHead>
                {isTimeTieredTable ? (
                  <TableHead className='text-muted-foreground h-11 px-3 text-center font-medium tracking-wide'>
                    {t('Billing Period', '计费时段')}
                  </TableHead>
                ) : null}
                <TableHead className='text-muted-foreground h-11 px-3 text-center font-medium tracking-wide'>
                  {t('Input price')}
                  <span className='text-muted-foreground/50 ml-1 font-normal'>
                    {t('/ {{unit}} tokens', { unit: unitHint })}
                  </span>
                </TableHead>
                <TableHead className='text-muted-foreground h-11 px-3 text-center font-medium tracking-wide'>
                  {t('Output price')}
                  <span className='text-muted-foreground/50 ml-1 font-normal'>
                    {t('/ {{unit}} tokens', { unit: unitHint })}
                  </span>
                </TableHead>
                {!isTimeTieredTable ? (
                  <TableHead className='text-muted-foreground h-11 px-3 text-center font-medium tracking-wide'>
                    {t('Cache Write')}
                    <span className='text-muted-foreground/50 ml-1 font-normal'>
                      {t('/ {{unit}} tokens', { unit: unitHint })}
                    </span>
                  </TableHead>
                ) : null}
                <TableHead className='text-muted-foreground h-11 px-3 text-center font-medium tracking-wide'>
                  {t('Cache Read')}
                  <span className='text-muted-foreground/50 ml-1 font-normal'>
                    {t('/ {{unit}} tokens', { unit: unitHint })}
                  </span>
                </TableHead>
                <TableHead className='text-muted-foreground h-11 px-3 text-center font-medium tracking-wide'>
                  {t('Savings')}
                </TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((model, index) => {
            if (isVideoTable) {
              const capTag = getVideoModelCapabilityTag(model.model_name)
              const resolutions = getModelSupportedResolutions(model)
              return (
                <TableRow
                  key={model.model_name}
                  onClick={() => props.onModelClick?.(model.model_name)}
                  className={cn(
                    'border-border/60 transition-colors',
                    props.onModelClick && 'cursor-pointer hover:bg-muted/30',
                    index % 2 === 1 ? 'bg-muted/40 dark:bg-muted/20' : 'bg-background'
                  )}
                >
                  <TableCell className='px-4 py-3.5 align-middle'>
                    <div className='flex flex-col gap-1'>
                      <div className='flex items-center gap-1.5'>
                        <span className='font-mono text-[15px] font-semibold tracking-tight text-foreground'>
                          {model.model_name}
                        </span>
                        <span
                          className='inline-flex'
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <CopyButton
                            value={model.model_name}
                            size='icon'
                            variant='ghost'
                            className='text-muted-foreground/55 hover:text-muted-foreground size-8 shrink-0'
                            iconClassName='size-3.5'
                          />
                        </span>
                      </div>
                      {capTag && (
                        <div>
                          <Badge
                            variant='outline'
                            className={cn('text-[10px] px-1.5 py-0 border font-normal', capTag.className)}
                          >
                            {capTag.label}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='px-3 py-3.5 align-middle text-center'>
                    <div className='flex flex-wrap items-center justify-center gap-1 max-w-[140px] mx-auto'>
                      {resolutions.map((res) => {
                        const style = getResolutionBadgeStyle(res)
                        return (
                          <Badge
                            key={res}
                            variant='outline'
                            className={cn('text-[10px] px-1.5 py-0 font-medium', style.className)}
                          >
                            {style.label}
                          </Badge>
                        )
                      })}
                    </div>
                  </TableCell>
                  <TableCell className='px-4 py-3.5 align-middle'>
                    {isVideoUpscaleModel(model) ? (
                      <VideoUpscaleTableContent
                        model={model}
                        tokenUnit={tokenUnit}
                        priceRate={priceRate}
                        usdExchangeRate={usdExchangeRate}
                        selectedGroup={selectedGroup}
                        isGroupMode={isGroupMode}
                        savings={savings}
                      />
                    ) : (
                      <VideoGenerationTableContent
                        model={model}
                        tokenUnit={tokenUnit}
                        priceRate={priceRate}
                        usdExchangeRate={usdExchangeRate}
                        selectedGroup={selectedGroup}
                        isGroupMode={isGroupMode}
                        savings={savings}
                        t={t}
                      />
                    )}
                  </TableCell>
                  <TableCell className='px-3 py-3.5 align-middle text-center'>
                    <SavingsPill savings={savings} />
                  </TableCell>
                </TableRow>
              )
            }

            if (isTimeTieredModel(model)) {
              // Off-peak prices (0.5x half price)
              const offPeakInputGroup = getModelUnitPrice(
                model,
                'input',
                baseRatio * 0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              )
              const offPeakInputOfficial = getModelUnitPrice(
                model,
                'input',
                0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate
              )
              const offPeakOutputGroup = getModelUnitPrice(
                model,
                'output',
                baseRatio * 0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              )
              const offPeakOutputOfficial = getModelUnitPrice(
                model,
                'output',
                0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate
              )
              const offPeakCacheGroup = getModelUnitPrice(
                model,
                'cache',
                baseRatio * 0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              )
              const offPeakCacheOfficial = getModelUnitPrice(
                model,
                'cache',
                0.5,
                tokenUnit,
                priceRate,
                usdExchangeRate
              )

              const offPeakInput = resolvePrices(
                offPeakInputGroup,
                offPeakInputOfficial,
                isGroupMode,
                Boolean(selectedGroup)
              )
              const offPeakOutput = resolvePrices(
                offPeakOutputGroup,
                offPeakOutputOfficial,
                isGroupMode,
                Boolean(selectedGroup)
              )
              const offPeakCache = resolvePrices(
                offPeakCacheGroup,
                offPeakCacheOfficial,
                isGroupMode,
                Boolean(selectedGroup)
              )

              // Peak prices (1.0x baseline price)
              const peakInputGroup = getModelUnitPrice(
                model,
                'input',
                baseRatio,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              )
              const peakInputOfficial = getModelUnitPrice(
                model,
                'input',
                1,
                tokenUnit,
                priceRate,
                usdExchangeRate
              )
              const peakOutputGroup = getModelUnitPrice(
                model,
                'output',
                baseRatio,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              )
              const peakOutputOfficial = getModelUnitPrice(
                model,
                'output',
                1,
                tokenUnit,
                priceRate,
                usdExchangeRate
              )
              const peakCacheGroup = getModelUnitPrice(
                model,
                'cache',
                baseRatio,
                tokenUnit,
                priceRate,
                usdExchangeRate,
                selectedGroup
              )
              const peakCacheOfficial = getModelUnitPrice(
                model,
                'cache',
                1,
                tokenUnit,
                priceRate,
                usdExchangeRate
              )

              const peakInput = resolvePrices(
                peakInputGroup,
                peakInputOfficial,
                isGroupMode,
                Boolean(selectedGroup)
              )
              const peakOutput = resolvePrices(
                peakOutputGroup,
                peakOutputOfficial,
                isGroupMode,
                Boolean(selectedGroup)
              )
              const peakCache = resolvePrices(
                peakCacheGroup,
                peakCacheOfficial,
                isGroupMode,
                Boolean(selectedGroup)
              )

              return (
                <Fragment key={model.model_name}>
                  {/* Row 1: 空闲 */}
                  <TableRow
                    className={cn(
                      'border-border/50 transition-colors hover:bg-muted/80',
                      index % 2 === 1 ? 'bg-muted/60 dark:bg-muted/30' : 'bg-background'
                    )}
                  >
                    <TableCell
                      rowSpan={2}
                      className='px-4 py-3 align-middle border-r border-border/40 cursor-pointer'
                      onClick={() => props.onModelClick?.(model.model_name)}
                    >
                      <div className='flex max-w-[20rem] items-center gap-2'>
                        <span className='text-foreground truncate font-mono text-[15px] font-medium tracking-tight'>
                          {model.model_name}
                        </span>
                        <span
                          className='inline-flex'
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <CopyButton
                            value={model.model_name}
                            size='icon'
                            variant='ghost'
                            className='text-muted-foreground/55 hover:text-muted-foreground size-8 shrink-0'
                            iconClassName='size-3.5'
                          />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='px-3 py-3 text-center'>
                      <span
                        title={t('All other hours are off-peak', '其余时间为空闲')}
                        className='inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11.5px] font-medium text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/15 cursor-help'
                      >
                        {t('Off-peak', '空闲')}
                      </span>
                    </TableCell>
                    <TableCell className='px-3 py-3 text-center'>
                      <DualPriceCell primary={offPeakInput.primary} official={offPeakInput.official} />
                    </TableCell>
                    <TableCell className='px-3 py-3 text-center'>
                      <DualPriceCell primary={offPeakOutput.primary} official={offPeakOutput.official} />
                    </TableCell>
                    <TableCell className='px-3 py-3 text-center'>
                      <DualPriceCell primary={offPeakCache.primary} official={offPeakCache.official} />
                    </TableCell>
                    <TableCell
                      rowSpan={2}
                      className='px-3 py-3 text-center align-middle border-l border-border/40'
                    >
                      <SavingsPill savings={savings} />
                    </TableCell>
                  </TableRow>

                  {/* Row 2: 峰值 */}
                  <TableRow
                    className={cn(
                      'border-border/50 border-t border-border/30 transition-colors hover:bg-muted/80',
                      index % 2 === 1 ? 'bg-muted/60 dark:bg-muted/30' : 'bg-background'
                    )}
                  >
                    <TableCell className='px-3 py-3 text-center'>
                      <span
                        title={t('Peak Hours: 09:00–12:00 and 14:00–18:00 SGT', '高峰时段：09:00–12:00 与 14:00–18:00（新加坡时间）')}
                        className='inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11.5px] font-medium text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-500/15 cursor-help'
                      >
                        {t('Peak', '峰值')}
                      </span>
                    </TableCell>
                    <TableCell className='px-3 py-3 text-center'>
                      <DualPriceCell primary={peakInput.primary} official={peakInput.official} />
                    </TableCell>
                    <TableCell className='px-3 py-3 text-center'>
                      <DualPriceCell primary={peakOutput.primary} official={peakOutput.official} />
                    </TableCell>
                    <TableCell className='px-3 py-3 text-center'>
                      <DualPriceCell primary={peakCache.primary} official={peakCache.official} />
                    </TableCell>
                  </TableRow>
                </Fragment>
              )
            }

            return (
              <TableRow
                key={model.model_name}
                className={cn(
                  'border-border/50 cursor-pointer transition-colors hover:bg-muted/80',
                  index % 2 === 1 ? 'bg-muted/60 dark:bg-muted/30' : 'bg-background'
                )}
                onClick={() => props.onModelClick?.(model.model_name)}
              >
                <TableCell className='px-4 py-3'>
                  <div className='flex max-w-[20rem] items-center gap-2'>
                    <span className='text-foreground truncate font-mono text-[15px] font-medium tracking-tight'>
                      {model.model_name}
                    </span>
                    <span
                      className='inline-flex'
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <CopyButton
                        value={model.model_name}
                        size='icon'
                        variant='ghost'
                        className='text-muted-foreground/55 hover:text-muted-foreground size-8 shrink-0'
                        iconClassName='size-3.5'
                      />
                    </span>
                  </div>
                </TableCell>
                <ModelPriceCells
                  model={model}
                  tokenUnit={tokenUnit}
                  priceRate={priceRate}
                  usdExchangeRate={usdExchangeRate}
                  selectedGroup={selectedGroup}
                  isGroupMode={isGroupMode}
                  savings={savings}
                  t={t}
                />
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {isVideoTable && (
        <div className='bg-muted/30 border-t border-border/50 px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2'>
          <span className='inline-block h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0' />
          <span>
            {t(
              'Video billing note: Text/image-to-video uses standard rates; reference video uses reference rates; upscale uses seconds + tokens compound billing.',
              '计费说明：文生视频与图生视频执行「无参考视频」费率；首尾帧与多镜头运镜执行「参考视频」费率；Upscale 按时长秒数 + Token 复合计费。'
            )}
          </span>
        </div>
      )}
    </div>
  )
}

function ModelPriceCells(props: {
  model: PricingModel
  tokenUnit: TokenUnit
  priceRate: number
  usdExchangeRate: number
  selectedGroup?: string
  isGroupMode: boolean
  savings: number | null
  t: (key: string) => string
}) {
  const {
    model,
    tokenUnit,
    priceRate,
    usdExchangeRate,
    selectedGroup,
    isGroupMode,
    savings,
    t,
  } = props

  if (isVideoUpscaleModel(model)) {
    return (
      <>
        <TableCell colSpan={4} className='px-3 py-3.5'>
          <VideoUpscaleTableContent
            model={model}
            tokenUnit={tokenUnit}
            priceRate={priceRate}
            usdExchangeRate={usdExchangeRate}
            selectedGroup={selectedGroup}
            isGroupMode={isGroupMode}
            savings={savings}
          />
        </TableCell>
        <TableCell className='px-3 py-3.5 text-center'>
          <SavingsPill savings={savings} />
        </TableCell>
      </>
    )
  }

  if (isByteDanceOrVideoModel(model)) {
    const groups = getVideoModelTierGroups(model)
    if (groups.length > 0) {
      return (
        <>
          <TableCell colSpan={4} className='px-3 py-3.5'>
            <VideoGenerationTableContent
              model={model}
              tokenUnit={tokenUnit}
              priceRate={priceRate}
              usdExchangeRate={usdExchangeRate}
              selectedGroup={selectedGroup}
              isGroupMode={isGroupMode}
              savings={savings}
              t={t}
            />
          </TableCell>
          <TableCell className='px-3 py-3.5 text-center'>
            <SavingsPill savings={savings} />
          </TableCell>
        </>
      )
    }
  }

  if (isDynamicPricingModel(model)) {
    const matrixLines = isByteDancePricingVendor(model.vendor_name)
      ? getTaskMatrixTableLines(
          model.billing_expr,
          model.billing_usage_schema
        )
      : null
    if (matrixLines && matrixLines.length > 0) {
      const groupRatio = getDisplayGroupRatio(model, selectedGroup ?? undefined)
      return (
        <>
          <TableCell colSpan={4} className='px-3 py-3.5'>
            <div className='mx-auto flex w-full max-w-md flex-col gap-2'>
              {matrixLines.map((line) => {
                const groupPrice = formatTaskUsageUnitPrice(line.unitPrice, {
                  tokenUnit,
                  priceRate,
                  usdExchangeRate,
                  groupRatioMultiplier: groupRatio,
                })
                const officialPrice = formatTaskUsageUnitPrice(line.unitPrice, {
                  tokenUnit,
                  priceRate,
                  usdExchangeRate,
                  groupRatioMultiplier: 1,
                })
                const { primary, official } = resolvePrices(
                  groupPrice,
                  officialPrice,
                  isGroupMode,
                  Boolean(selectedGroup)
                )
                return (
                  <div
                    key={line.labelKey}
                    className='flex items-center justify-between gap-4'
                  >
                    <span className='text-foreground text-sm font-medium'>
                      {t(line.labelKey)}
                    </span>
                    <div className='flex items-center gap-1.5'>
                      <DualPriceCell primary={primary} official={official} />
                      <span className='text-muted-foreground shrink-0 text-xs'>
                        / {t(getTaskUsagePriceUnitLabelKey(line.unit))}
                      </span>
                    </div>
                  </div>
                )
              })}
              <p className='text-muted-foreground text-left text-xs leading-snug'>
                {t(
                  'Text-to-video and image-to-video use the first price; a reference video uses the second.'
                )}
              </p>
            </div>
          </TableCell>
          <TableCell className='px-3 py-3.5 text-center'>
            <SavingsPill savings={savings} />
          </TableCell>
        </>
      )
    }
    if (model.model_name === 'gpt-image-2') {
      return (
        <>
          <TableCell colSpan={4} className='px-3 py-3.5 text-center'>
            <div className='flex flex-wrap items-center justify-center gap-4'>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='text-muted-foreground px-1.5 py-0 text-[10px] font-semibold uppercase'
                >
                  1K
                </Badge>
                <span className='text-sm font-medium'>$0.025 / image</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='text-muted-foreground px-1.5 py-0 text-[10px] font-semibold uppercase'
                >
                  2K
                </Badge>
                <span className='text-sm font-medium'>$0.035 / image</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='text-muted-foreground px-1.5 py-0 text-[10px] font-semibold uppercase'
                >
                  4K
                </Badge>
                <span className='text-sm font-medium'>$0.07 / image</span>
              </div>
            </div>
          </TableCell>
          <TableCell className='px-3 py-3.5 text-center'>
            <span className='text-muted-foreground/35 text-sm'>—</span>
          </TableCell>
        </>
      )
    }
    if (model.model_name === 'grok-imagine-image-quality') {
      return (
        <>
          <TableCell colSpan={4} className='px-3 py-3.5 text-center'>
            <div className='flex flex-wrap items-center justify-center gap-4'>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='text-muted-foreground px-1.5 py-0 text-[10px] font-semibold uppercase'
                >
                  1K
                </Badge>
                <span className='text-sm font-medium'>$0.035 / image</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='text-muted-foreground px-1.5 py-0 text-[10px] font-semibold uppercase'
                >
                  2K
                </Badge>
                <span className='text-sm font-medium'>$0.045 / image</span>
              </div>
            </div>
          </TableCell>
          <TableCell className='px-3 py-3.5 text-center'>
            <span className='text-muted-foreground/35 text-sm'>—</span>
          </TableCell>
        </>
      )
    }
    if (model.model_name === 'grok-imagine-image') {
      return (
        <>
          <TableCell colSpan={4} className='px-3 py-3.5 text-center'>
            <div className='flex flex-wrap items-center justify-center gap-4'>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='text-muted-foreground px-1.5 py-0 text-[10px] font-semibold uppercase'
                >
                  1K
                </Badge>
                <span className='text-sm font-medium'>$0.025 / image</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='text-muted-foreground px-1.5 py-0 text-[10px] font-semibold uppercase'
                >
                  2K
                </Badge>
                <span className='text-sm font-medium'>$0.035 / image</span>
              </div>
            </div>
          </TableCell>
          <TableCell className='px-3 py-3.5 text-center'>
            <span className='text-muted-foreground/35 text-sm'>—</span>
          </TableCell>
        </>
      )
    }
    if (model.model_name === 'grok-imagine-video') {
      return (
        <>
          <TableCell colSpan={4} className='px-3 py-3.5 text-center'>
            <div className='flex flex-col items-center justify-center gap-2'>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='text-muted-foreground px-1.5 py-0 text-[10px] font-semibold uppercase'
                >
                  480p
                </Badge>
                <span className='text-sm font-medium'>
                  $0.025 / s{' '}
                  <span className='text-muted-foreground ml-1 text-xs font-normal'>
                    (Default: 8s, Configurable: 1-15s)
                  </span>
                </span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='text-muted-foreground px-1.5 py-0 text-[10px] font-semibold uppercase'
                >
                  720p
                </Badge>
                <span className='text-sm font-medium'>
                  $0.035 / s{' '}
                  <span className='text-muted-foreground ml-1 text-xs font-normal'>
                    (Default: 8s, Configurable: 1-15s)
                  </span>
                </span>
              </div>
            </div>
          </TableCell>
          <TableCell className='px-3 py-3.5 text-center'>
            <span className='text-muted-foreground/35 text-sm'>—</span>
          </TableCell>
        </>
      )
    }

    return (
      <>
        <TableCell colSpan={4} className='px-3 py-3.5 text-center'>
          <span className='text-muted-foreground text-sm'>
            {t('Special billing expression')}
          </span>
        </TableCell>
        <TableCell className='px-3 py-3.5 text-center'>
          <span className='text-muted-foreground/35 text-sm'>—</span>
        </TableCell>
      </>
    )
  }

  if (!isTokenBasedModel(model)) {
    const groupPrice = formatRequestPrice(
      model,
      false,
      priceRate,
      usdExchangeRate,
      selectedGroup
    )
    const officialPrice = formatRequestPrice(
      model,
      false,
      priceRate,
      usdExchangeRate,
      undefined,
      1
    )
    const { primary, official } = resolvePrices(
      groupPrice,
      officialPrice,
      isGroupMode,
      Boolean(selectedGroup)
    )
    return (
      <>
        <TableCell className='px-3 py-3.5 text-center'>
          <DualPriceCell primary={primary} official={official} />
          <div className='text-muted-foreground/50 mt-1 text-center text-xs'>
            / {t('request')}
          </div>
        </TableCell>
        <TableCell className='px-3 py-3.5 text-center'>
          <span className='text-muted-foreground/35 text-sm'>—</span>
        </TableCell>
        <TableCell className='px-3 py-3.5 text-center'>
          <span className='text-muted-foreground/35 text-sm'>—</span>
        </TableCell>
        <TableCell className='px-3 py-3.5 text-center'>
          <span className='text-muted-foreground/35 text-sm'>—</span>
        </TableCell>
        <TableCell className='px-3 py-3.5 text-center'>
          <SavingsPill savings={savings} />
        </TableCell>
      </>
    )
  }

  const types: PriceType[] = ['input', 'output', 'create_cache', 'cache']

  return (
    <>
      {types.map((type) => {
        const groupPrice = formatPrice(
          model,
          type,
          tokenUnit,
          false,
          priceRate,
          usdExchangeRate,
          selectedGroup
        )
        const officialPrice = formatPrice(
          model,
          type,
          tokenUnit,
          false,
          priceRate,
          usdExchangeRate,
          undefined,
          1
        )
        const { primary, official } = resolvePrices(
          groupPrice,
          officialPrice,
          isGroupMode,
          Boolean(selectedGroup)
        )
        return (
          <TableCell key={type} className='px-3 py-3.5 text-center'>
            <DualPriceCell primary={primary} official={official} />
          </TableCell>
        )
      })}
      <TableCell className='px-3 py-3.5 text-center'>
        <SavingsPill savings={savings} />
      </TableCell>
    </>
  )
}

function VideoUpscaleTableContent(props: {
  model: PricingModel
  tokenUnit: TokenUnit
  priceRate: number
  usdExchangeRate: number
  selectedGroup?: string
  isGroupMode: boolean
  savings?: number | null
}) {
  const tiers = parseVideoUpscaleTiers(props.model.billing_expr)
  const rawRatio = getDisplayGroupRatio(props.model, props.selectedGroup ?? undefined)
  const effectiveRatio =
    props.isGroupMode && props.savings != null && rawRatio === 1
      ? (100 - props.savings) / 100
      : rawRatio

  return (
    <div className='mx-auto flex w-full max-w-lg flex-col gap-2'>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
        {tiers.map((tier) => {
          const mult = props.isGroupMode ? effectiveRatio : 1
          const secondPrice = (tier.secondPrice * mult * props.priceRate).toFixed(4)
          const officialSecond = (tier.secondPrice * props.priceRate).toFixed(4)
          const tokenPrice = (tier.tokenPricePerM * mult * props.priceRate).toFixed(2)
          const est5s = (
            (tier.secondPrice * 5 + (tier.tokenPricePerM * 1000) / 1_000_000) *
            mult *
            props.priceRate
          ).toFixed(2)
          const showOfficial = props.isGroupMode && props.savings != null

          return (
            <div
              key={tier.tierKey}
              className='bg-muted/20 flex flex-col items-center justify-between rounded-lg border border-border/50 p-2.5 text-center'
            >
              <div className='flex flex-col items-center gap-1'>
                <Badge variant='outline' className='px-1.5 py-0 text-[10px] font-medium'>
                  {tier.displayName}
                </Badge>
                <div className='flex flex-col items-center'>
                  <span className='font-mono text-sm font-semibold text-foreground'>
                    ${secondPrice} / 秒
                  </span>
                  {showOfficial && (
                    <span className='text-muted-foreground/60 text-[11px] font-mono line-through'>
                      ${officialSecond}
                    </span>
                  )}
                </div>
                <span className='text-muted-foreground text-[10px] font-mono'>
                  + ${tokenPrice} / 1M tok
                </span>
              </div>
              <div className='mt-1.5 border-t border-border/40 pt-1 text-[10px] text-muted-foreground'>
                5s 预估 ≈ ${est5s}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VideoGenerationTableContent(props: {
  model: PricingModel
  tokenUnit: TokenUnit
  priceRate: number
  usdExchangeRate: number
  selectedGroup?: string
  isGroupMode: boolean
  savings?: number | null
  t: (key: string) => string
}) {
  const groups = getVideoModelTierGroups(props.model)
  const rawRatio = getDisplayGroupRatio(props.model, props.selectedGroup ?? undefined)
  const effectiveRatio =
    props.isGroupMode && props.savings != null && rawRatio === 1
      ? (100 - props.savings) / 100
      : rawRatio

  if (groups.length === 0) return null

  const formatTokens = (val: number, multiplier: number) => {
    return formatTaskUsageUnitPrice(val, {
      tokenUnit: props.tokenUnit,
      priceRate: props.priceRate,
      usdExchangeRate: props.usdExchangeRate,
      groupRatioMultiplier: multiplier,
    })
  }

  return (
    <div className='mx-auto flex w-full max-w-lg flex-col gap-2'>
      <div
        className={cn(
          'grid gap-2',
          groups.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {groups.map((group) => {
          const noneGroup = formatTokens(group.withoutVideoPrice, effectiveRatio)
          const noneOfficial = formatTokens(group.withoutVideoPrice, 1)
          const { primary: nonePrimary, official: noneOff } = resolvePrices(
            noneGroup,
            noneOfficial,
            props.isGroupMode,
            Boolean(props.selectedGroup)
          )

          const videoGroup = formatTokens(group.withVideoPrice, effectiveRatio)
          const videoOfficial = formatTokens(group.withVideoPrice, 1)
          const { primary: videoPrimary, official: videoOff } = resolvePrices(
            videoGroup,
            videoOfficial,
            props.isGroupMode,
            Boolean(props.selectedGroup)
          )

          return (
            <div
              key={group.title}
              className='bg-muted/20 flex flex-col justify-between rounded-lg border border-border/50 p-2.5 text-left'
            >
              <div className='mb-2 flex items-center justify-between border-b border-border/40 pb-1.5'>
                <span className='text-foreground text-xs font-semibold'>
                  {group.title}
                </span>
                <span className='text-muted-foreground/60 text-[10px] uppercase'>
                  / 1M Tokens
                </span>
              </div>
              <div className='space-y-1.5 text-xs'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-muted-foreground font-medium'>
                    无视频输入:
                  </span>
                  <DualPriceCell primary={nonePrimary} official={noneOff} />
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-muted-foreground font-medium'>
                    有视频输入:
                  </span>
                  <DualPriceCell primary={videoPrimary} official={videoOff} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Group mode: top = group sell price, bottom = official baseline (always dual).
 * Official mode: top = official only.
 */
function resolvePrices(
  groupPrice: string,
  officialPrice: string,
  isGroupMode: boolean,
  hasGroup: boolean
): { primary: string; official: string | null } {
  if (hasGroup && isGroupMode) {
    return { primary: groupPrice, official: officialPrice }
  }
  // Official toggle: still show dual when a group is selected so users always
  // see “官方价格” under the active amount? No — single official line only.
  return { primary: officialPrice, official: null }
}

function SavingsPill(props: { savings: number | null }) {
  // Official price mode: leave blank (no dash)
  if (props.savings == null) {
    return <span className='inline-block min-h-[1em]' />
  }
  // Fixed English copy — never i18n: "85% off"
  const label = `${props.savings}%\u00A0off`
  return (
    <span className='inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold tracking-tight whitespace-nowrap text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/40 tabular-nums'>
      <span className='text-[10px]'>⚡</span>
      <span>{label}</span>
    </span>
  )
}

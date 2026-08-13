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
  lookupGroupMapValue,
  MANUAL_GROUP_SAVINGS_OFF,
} from '../constants'
import { isDynamicPricingModel } from '../lib/dynamic-price'
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

  if (rows.length === 0) {
    return (
      <div className='text-muted-foreground px-3 py-10 text-center text-sm'>
        {t('No models match your current filters.')}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-xl border border-border/60',
        props.className
      )}
    >
      {/* Scale: head 12 · body 15 · price 18/12. Drop forced equal text-sm. */}
      <Table className='[&_td]:text-[15px] [&_td_*]:text-[length:inherit] [&_th]:text-xs [&_th_*]:text-xs'>
        <TableHeader>
          <TableRow className='bg-muted/40 hover:bg-muted/40 border-border/60 border-b'>
            <TableHead className='text-muted-foreground h-11 min-w-[11rem] px-4 font-medium tracking-wide'>
              {t('Model ID')}
            </TableHead>
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
            <TableHead className='text-muted-foreground h-11 px-3 text-center font-medium tracking-wide'>
              {t('Cache Write')}
              <span className='text-muted-foreground/50 ml-1 font-normal'>
                {t('/ {{unit}} tokens', { unit: unitHint })}
              </span>
            </TableHead>
            <TableHead className='text-muted-foreground h-11 px-3 text-center font-medium tracking-wide'>
              {t('Cache Read')}
              <span className='text-muted-foreground/50 ml-1 font-normal'>
                {t('/ {{unit}} tokens', { unit: unitHint })}
              </span>
            </TableHead>
            <TableHead className='text-muted-foreground h-11 px-3 text-center font-medium tracking-wide'>
              {t('Savings')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((model, index) => (
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
          ))}
        </TableBody>
      </Table>
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

  if (isDynamicPricingModel(model)) {
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

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
import { ArrowUpRight, Check, Copy, ImageIcon, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { lookupModelSavingsOff } from '../constants'
import {
  getModelSpecificDiscountPercent,
  getModelSupportedResolutions,
  getResolutionBadgeStyle,
  getVideoModelCapabilityTag,
  getVideoModelHeroPrice,
  getVideoModelTagline,
} from '../lib/video-pricing'
import type { PricingModel } from '../types'
import type { PriceMode } from './supplier-price-table'

export interface ImageModelGridProps {
  models: PricingModel[]
  onModelClick: (modelName: string) => void
  priceMode: PriceMode
  selectedGroup: string | null
  groupRatio: Record<string, number>
  priceRate: number
  usdExchangeRate: number
  savings?: number | null
  className?: string
}

export function ImageModelGrid(props: ImageModelGridProps) {
  const { t } = useTranslation()
  const { copyToClipboard } = useCopyToClipboard()
  const [copiedName, setCopiedName] = useState<string | null>(null)

  const isGroupMode = props.priceMode === 'group'

  const handleCopy = (e: React.MouseEvent, modelName: string) => {
    e.stopPropagation()
    copyToClipboard(modelName)
    setCopiedName(modelName)
    setTimeout(() => {
      setCopiedName((curr) => (curr === modelName ? null : curr))
    }, 1800)
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 sm:gap-6',
        props.className
      )}
    >
      {props.models.map((model) => {
        const isUnfiltered = (model.model_name || '').toLowerCase().includes('unfiltered')
        const resolutions = getModelSupportedResolutions(model)
        const capTag = getVideoModelCapabilityTag(model.model_name)
        const tagline = getVideoModelTagline(model.model_name)
        const discountOff = isGroupMode
          ? (lookupModelSavingsOff(model.model_name) ?? (getModelSpecificDiscountPercent(model.model_name) || null))
          : null
        const hero = getVideoModelHeroPrice(model, isGroupMode, props.priceRate)

        const vendorIcon =
          model.vendor_icon || model.icon
            ? getLobeIcon(model.vendor_icon || model.icon, 15)
            : <ImageIcon className='size-3.5 text-emerald-600' />

        const nameLen = (model.model_name || '').length
        const titleClass =
          nameLen > 28
            ? 'text-[13.5px] sm:text-[14px] leading-snug tracking-[-0.015em]'
            : nameLen > 20
              ? 'text-[14.5px] sm:text-[15px] leading-snug tracking-[-0.01em]'
              : 'text-[15px] sm:text-[15.5px] leading-normal tracking-[-0.01em]'

        return (
          <div
            key={model.id || model.model_name}
            role='button'
            tabIndex={0}
            onClick={() => props.onModelClick(model.model_name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                props.onModelClick(model.model_name)
              }
            }}
            className={cn(
              'group relative flex w-full flex-col justify-start overflow-hidden rounded-2xl border border-[#E2E8F0]/90 p-6 text-left shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-all duration-200',
              '[background:radial-gradient(circle_at_95%_5%,rgba(16,185,129,0.04)_0%,transparent_60%),#fff]',
              'hover:-translate-y-px hover:border-[#CBD5E1] hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] cursor-pointer',
              'dark:border-border dark:bg-card dark:[background:unset]'
            )}
          >
            {/* Top Section */}
            <div className='space-y-2.5'>
              {/* Row 1: Model Identity (Full Width, No Crowding) */}
              <div className='flex items-center gap-2.5 min-w-0 min-h-[26px]'>
                <div className='flex size-[26px] shrink-0 items-center justify-center rounded-[7px] border border-emerald-100 bg-emerald-50/70 dark:border-emerald-800/40 dark:bg-emerald-950/30'>
                  {vendorIcon}
                </div>
                <div className='flex min-w-0 flex-1 items-center gap-1.5'>
                  <span
                    translate='no'
                    className={cn(
                      'notranslate break-words font-semibold text-[var(--p-text-main,#0F172A)]',
                      titleClass
                    )}
                    title={model.model_name}
                  >
                    {model.model_name}
                  </span>
                  <button
                    type='button'
                    aria-label={t('Copy model name')}
                    onClick={(e) => handleCopy(e, model.model_name)}
                    className='size-6 shrink-0 inline-flex items-center justify-center rounded-md text-[#94A3B8] opacity-70 transition-opacity duration-150 group-hover:opacity-[0.85] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                  >
                    {copiedName === model.model_name ? (
                      <Check className='size-[15.5px] text-emerald-600' />
                    ) : (
                      <Copy className='size-[15.5px]' />
                    )}
                  </button>
                </div>
              </div>

              {/* Row 2: Capability Tag (Left) & Discount Badge (Right) - Perfect Balance */}
              <div className='flex items-center justify-between gap-2.5 min-h-[24px]'>
                {capTag ? (
                  <span
                    className={cn(
                      'inline-block rounded-full border px-[9px] py-[2px] text-[11.5px] font-semibold tracking-tight',
                      capTag.className
                    )}
                  >
                    {t(capTag.key, capTag.label)}
                  </span>
                ) : (
                  <div />
                )}

                {discountOff != null && isGroupMode && (
                  <span
                    translate='no'
                    className='notranslate inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#F43F5E] to-[#E11D48] min-w-[4.5rem] px-2.5 h-[22px] text-[11.5px] font-bold tracking-wide text-white shadow-[0_1px_2px_rgba(225,29,72,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] tabular-nums shrink-0 leading-none text-center'
                  >
                    {discountOff}% OFF
                  </span>
                )}
              </div>

              {/* Row 3: Prominent Supported Resolutions */}
              <div className='mb-2.5 flex items-center gap-[7px] text-[12.5px] min-h-[24px]'>
                <span className='shrink-0 text-[12px] font-medium text-[#64748B]'>
                  {t('Supported Resolutions:', '支持分辨率:')}
                </span>
                <div className='flex flex-wrap items-center gap-[7px]'>
                  {resolutions.map((res) => {
                    const style = getResolutionBadgeStyle(res)
                    return (
                      <span
                        key={res}
                        className='inline-flex items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-[2px] text-[12px] font-semibold tracking-[0.01em] text-[#334155] tabular-nums dark:border-border dark:bg-muted dark:text-foreground'
                      >
                        {style.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Row 4: Tagline */}
              <p className='min-h-[42px] text-[13px] leading-[21px] font-normal text-[#334155] dark:text-muted-foreground'>
                {t(tagline.key, tagline.defaultText)}
              </p>
            </div>

            {/* Middle Section: Hero Price & Image Spec Matrix */}
            <div className='mt-4 flex-1 flex flex-col'>
              {/* Hero Starting Price */}
              <div className='flex items-baseline justify-between border-t border-[#E2E8F0] pt-3'>
                <span className='text-[12px] font-semibold uppercase tracking-[0.05em] text-[#64748B]'>
                  {t('Starting Price', '起步价格')}
                </span>
                <div className='text-right'>
                  <div className='flex items-baseline justify-end gap-1'>
                    <span className='text-[22px] font-semibold tabular-nums text-[#0F172A] dark:text-foreground'>
                      {hero.priceText}
                    </span>
                    {hero.officialPriceText && isGroupMode && (
                      <span className='text-[13px] font-normal tabular-nums text-[#94A3B8] line-through'>
                        {hero.officialPriceText}
                      </span>
                    )}
                    <span className='ml-0.5 text-[12.5px] font-normal text-[#64748B]'>
                      {t(hero.unitKey, hero.unitText)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing Matrix (Aligned with Video Model Cards) */}
              <div className='mt-3.5 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white text-xs shadow-[0_1px_2px_rgba(15,23,42,0.02)] dark:border-border dark:bg-card'>
                <div className='grid grid-cols-12 bg-muted/40 border-b border-border/50 px-3.5 py-2 text-xs font-semibold text-muted-foreground'>
                  <div className='col-span-4'>{t('Resolution', '分辨率')}</div>
                  <div className='col-span-4 text-right'>{t('imagePricing.textToImage', '文生图')}</div>
                  <div className='col-span-4 text-right'>{t('imagePricing.imageToImage', '图生图')}</div>
                </div>
                <div className='divide-y divide-border/40 bg-card/60'>
                  {resolutions.map((res) => {
                    const style = getResolutionBadgeStyle(res)
                    const showOfficial = isGroupMode && hero.officialPriceText != null

                    return (
                      <div
                        key={res}
                        className='grid grid-cols-12 items-center px-3.5 py-2.5 transition-colors hover:bg-muted/30'
                      >
                        <div className='col-span-4 pr-1'>
                          <span className='font-semibold text-foreground text-[13px]'>
                            {style.label}
                          </span>
                        </div>
                        <div className='col-span-4 text-right'>
                          <div className='font-semibold text-foreground text-[13.5px] tabular-nums leading-tight'>
                            {hero.priceText}
                          </div>
                          {showOfficial && (
                            <div className='text-[11px] text-muted-foreground/55 line-through tabular-nums font-normal'>
                              {hero.officialPriceText}
                            </div>
                          )}
                        </div>
                        <div className='col-span-4 text-right'>
                          <div className='font-semibold text-foreground text-[13.5px] tabular-nums leading-tight'>
                            {hero.priceText}
                          </div>
                          {showOfficial && (
                            <div className='text-[11px] text-muted-foreground/55 line-through tabular-nums font-normal'>
                              {hero.officialPriceText}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className='border-t border-border bg-slate-50 px-3.5 py-[7px] text-right text-[11.5px] font-medium text-slate-500 dark:bg-muted/30 dark:text-slate-400'>
                  {t('Unit: / 1M Tokens', '计费单位：/ 1M Tokens')}
                </div>
              </div>

              {/* Unfiltered Feature Callout Banner (Aligned with Image 2 / Upscale style) */}
              {isUnfiltered && (
                <div className='relative mt-3.5 overflow-hidden rounded-xl border border-purple-300/70 bg-gradient-to-br from-purple-500/12 via-indigo-500/8 to-purple-500/16 p-3 shadow-2xs dark:border-purple-700/60 dark:from-purple-950/50 dark:to-indigo-950/40'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='inline-flex items-center gap-1 rounded-md bg-purple-600 px-2 py-0.5 text-xs font-semibold text-white shadow-xs dark:bg-purple-500'>
                      <Sparkles className='h-3 w-3' />
                      {t('imagePricing.unfilteredCalloutBadge', '原生自由')}
                    </span>
                    <span className='text-[13px] font-semibold text-purple-950 dark:text-purple-200 tracking-tight'>
                      {t('imagePricing.unfilteredCalloutTitle', '无审查限制与纯粹创意')}
                    </span>
                  </div>
                  <p className='text-[12.5px] leading-[1.6] text-foreground/85'>
                    {t(
                      'imagePricing.unfilteredCalloutDesc',
                      '完全解除提示词与艺术表现审查限制，原生释放 Seedream 5.0 的概念设计、超现实幻想与艺术生成潜能，适合专业创意设计与无拘无束的视觉探索。'
                    )}
                  </p>
                </div>
              )}

              {/* Card Footer: clean, zero duplicate estimate note text */}
              <div className='mt-auto pt-3 flex items-center justify-end border-t border-[#F1F5F9] dark:border-border/40'>
                <span className='inline-flex items-center gap-[3px] text-[12.5px] font-medium text-[#2563EB]'>
                  {t('Details', '详情')}
                  <ArrowUpRight className='size-[13px] stroke-[2.2]' />
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

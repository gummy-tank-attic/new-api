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
import { ArrowUpRight, Check, Copy, ImageIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { getConfiguredGroupRatio } from '../lib/model-helpers'
import {
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
  const groupRatioVal = isGroupMode && props.selectedGroup
    ? getConfiguredGroupRatio(props.groupRatio, props.selectedGroup)
    : 1
  const effectiveRate = groupRatioVal * (props.priceRate ?? 1)

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
        const resolutions = getModelSupportedResolutions(model)
        const capTag = getVideoModelCapabilityTag(model.model_name)
        const tagline = getVideoModelTagline(model.model_name)
        const modelRate = isGroupMode
          ? (model.group_ratio && props.selectedGroup && typeof model.group_ratio[props.selectedGroup] === 'number'
              ? model.group_ratio[props.selectedGroup] * (props.priceRate ?? 1)
              : effectiveRate)
          : 1
        const hero = getVideoModelHeroPrice(model, isGroupMode, modelRate)
        const discountOff = isGroupMode
          ? (hero.discountOff ?? props.savings ?? null)
          : null

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
              'group relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E2E8F0]/90 p-5 sm:p-6 text-left shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-all duration-200',
              '[background:radial-gradient(circle_at_95%_5%,rgba(16,185,129,0.04)_0%,transparent_60%),#fff]',
              'hover:-translate-y-px hover:border-[#CBD5E1] hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] cursor-pointer',
              'dark:border-border dark:bg-card dark:[background:unset]'
            )}
          >
            {/* Top Section */}
            <div className='flex flex-col gap-2.5'>
              {/* Row 1: Model Identity (Left) & Discount Badge (Right) */}
              <div className='flex items-center justify-between gap-2 min-h-[28px]'>
                <div className='flex min-w-0 flex-1 items-center gap-2.5'>
                  <div className='flex size-[26px] shrink-0 items-center justify-center rounded-[7px] border border-emerald-100 bg-emerald-50/70 dark:border-emerald-800/40 dark:bg-emerald-950/30'>
                    {vendorIcon}
                  </div>
                  <div className='flex min-w-0 flex-1 items-center gap-1.5'>
                    <span
                      translate='no'
                      className={cn(
                        'notranslate truncate font-semibold text-[var(--p-text-main,#0F172A)] dark:text-foreground',
                        titleClass
                      )}
                      title={model.model_name}
                    >
                      {model.model_name}
                    </span>
                    <button
                      type='button'
                      aria-label={t('Copy model name', '复制模型名称')}
                      onClick={(e) => handleCopy(e, model.model_name)}
                      className='size-6 shrink-0 inline-flex items-center justify-center rounded-md text-[#94A3B8] opacity-70 transition-opacity duration-150 group-hover:opacity-[0.85] hover:bg-[#F1F5F9] hover:text-[var(--p-text-main,#111111)] dark:hover:bg-muted'
                    >
                      {copiedName === model.model_name ? (
                        <Check className='size-[15.5px] text-emerald-600' />
                      ) : (
                        <Copy className='size-[15.5px]' />
                      )}
                    </button>
                  </div>
                </div>

                {discountOff != null && discountOff > 0 && isGroupMode ? (
                  <span
                    translate='no'
                    className='notranslate inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#F43F5E] to-[#E11D48] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white shadow-[0_1px_2px_rgba(225,29,72,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] tabular-nums shrink-0 whitespace-nowrap leading-none text-center'
                  >
                    {discountOff}% OFF
                  </span>
                ) : null}
              </div>

              {/* Row 2: Capability Tag & Supported Resolution Pills (Unified Responsive Flow) */}
              <div className='flex flex-wrap items-center gap-1.5 min-h-[24px]'>
                {capTag ? (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                      capTag.className
                    )}
                  >
                    {t(capTag.key, capTag.label)}
                  </span>
                ) : null}

                {resolutions.map((res) => {
                  const style = getResolutionBadgeStyle(res)
                  return (
                    <span
                      key={res}
                      className='inline-flex items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold tracking-tight text-[#475569] tabular-nums dark:border-border dark:bg-muted/60 dark:text-muted-foreground whitespace-nowrap'
                    >
                      {style.label}
                    </span>
                  )
                })}
              </div>

              {/* Row 3: Tagline with consistent line-clamp */}
              <div className='flex min-h-[36px] items-center'>
                <p className='line-clamp-2 text-[12px] leading-[18px] font-normal text-[var(--p-text-muted,#3f3f46)] dark:text-muted-foreground'>
                  {t(tagline.key, tagline.defaultText)}
                </p>
              </div>
            </div>

            {/* Middle Section: Hero Price & Image Spec Matrix */}
            <div className='mt-3.5 flex flex-1 flex-col justify-start'>
              {/* Hero Starting Price (only for simple models without structured spec tables) */}
              {resolutions.length === 0 && (
                <div className='flex items-baseline justify-between border-t border-[#E2E8F0] pt-3'>
                  <span className='text-[12px] font-semibold uppercase tracking-[0.05em] text-[#64748B]'>
                    {t('Starting Price', '起步价格')}
                  </span>
                  <div className='text-right'>
                    <div className='flex items-baseline justify-end gap-1'>
                      <span className='text-[22px] font-semibold tabular-nums text-[var(--p-text-main,#111111)] dark:text-foreground'>
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
              )}

              {/* Pricing Matrix (Aligned with Video Model Cards) */}
              {resolutions.length > 0 && (
                <div className='overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] dark:border-border dark:bg-card'>
                  <div className='grid grid-cols-[28%_36%_36%] border-b border-[#E2E8F0] bg-[#F8FAFC] px-[14px] py-2 text-[11.5px] font-semibold text-[var(--p-text-muted,#3f3f46)] dark:border-border dark:bg-muted/40 dark:text-muted-foreground'>
                    <div className='text-left truncate'>{t('Resolution', '分辨率')}</div>
                    <div className='text-right truncate' title={t('imagePricing.textToImage', '文生图')}>{t('imagePricing.textToImage', '文生图')}</div>
                    <div className='text-right truncate' title={t('imagePricing.imageToImage', '图生图')}>{t('imagePricing.imageToImage', '图生图')}</div>
                  </div>
                  <div className='flex flex-col'>
                    {resolutions.map((res, index) => {
                      const resKey = res.toLowerCase()
                      const resPrice = hero.resolutionPrices?.[resKey]
                      const currentPriceText = resPrice?.priceText ?? hero.priceText
                      const currentOfficialText = resPrice?.officialPriceText ?? hero.officialPriceText
                      const currentImgToImgPriceText = resPrice?.imgToImgPriceText ?? currentPriceText
                      const currentOfficialImgToImgText = resPrice?.officialImgToImgPriceText ?? currentOfficialText
                      const style = getResolutionBadgeStyle(res)
                      const showOfficial = isGroupMode && currentOfficialText != null
                      const showOfficialImgToImg = isGroupMode && currentOfficialImgToImgText != null

                      return (
                        <div
                          key={res}
                          className={cn(
                            'grid grid-cols-[28%_36%_36%] items-center px-[14px] min-h-[50px] py-1.5 transition-colors hover:bg-[#FAFAFA] dark:hover:bg-muted/30',
                            index < resolutions.length - 1 &&
                              'border-b border-[#F1F5F9] dark:border-border/40'
                          )}
                        >
                          <div className='text-left text-[13px] font-semibold text-[var(--p-text-main,#111111)] dark:text-foreground'>
                            {style.label}
                          </div>
                          <div className='text-right flex flex-col justify-center min-h-[36px]'>
                            <div className='text-[13.5px] font-semibold tabular-nums text-[var(--p-text-main,#111111)] dark:text-foreground leading-tight'>
                              {currentPriceText}
                            </div>
                            {showOfficial && (
                              <div className='text-[10.5px] font-normal tabular-nums text-[#94A3B8] line-through leading-none mt-0.5'>
                                {currentOfficialText}
                              </div>
                            )}
                          </div>
                          <div className='text-right flex flex-col justify-center min-h-[36px]'>
                            <div className='text-[13.5px] font-semibold tabular-nums text-[var(--p-text-main,#111111)] dark:text-foreground leading-tight'>
                              {currentImgToImgPriceText}
                            </div>
                            {showOfficialImgToImg && (
                              <div className='text-[10.5px] font-normal tabular-nums text-[#94A3B8] line-through leading-none mt-0.5'>
                                {currentOfficialImgToImgText}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className='border-t border-[#E2E8F0] bg-[#F8FAFC] px-[14px] py-[7px] text-right text-[11.5px] font-normal text-[#64748B] dark:border-border dark:bg-muted/30 dark:text-slate-400'>
                    {hero.isPerImage
                      ? `${t('pricing.billing_unit_label', '计费单位：')} ${t('imagePricing.unitPerImage', '/ 张')}`
                      : `${t('pricing.billing_unit_label', '计费单位：')} ${t('videoPricing.unitPer1MTokens', '/ 1M Tokens')}`}
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer: clean, zero duplicate estimate note text */}
            <div className='mt-auto pt-3.5 flex items-center justify-end border-t border-[#F1F5F9] dark:border-border/40'>
              <span className='inline-flex items-center gap-[3px] text-[12.5px] font-medium text-[#2563EB] group-hover:underline'>
                {t('Details', '详情')}
                <ArrowUpRight className='size-[13px] stroke-[2.2]' />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

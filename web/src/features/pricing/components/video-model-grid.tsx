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
import { ArrowUpRight, Check, Copy, Film, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { lookupModelSavingsOff } from '../constants'
import {
  getDurationVideoTiers,
  getModelSpecificDiscountPercent,
  getModelSupportedResolutions,
  getResolutionBadgeStyle,
  getVideoModelCapabilityTag,
  getVideoModelHeroPrice,
  getVideoModelTagline,
  getVideoModelTierGroups,
  isDurationBasedVideoModel,
  isVideoUpscaleModel,
  parseVideoUpscaleTiers,
} from '../lib/video-pricing'
import type { PricingModel } from '../types'
import type { PriceMode } from './supplier-price-table'

export interface VideoModelGridProps {
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

export function VideoModelGrid(props: VideoModelGridProps) {
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
        const isUpscale = isVideoUpscaleModel(model)
        const isDurationBased = isDurationBasedVideoModel(model)
        const resolutions = getModelSupportedResolutions(model)
        const capTag = getVideoModelCapabilityTag(model.model_name)
        const tagline = getVideoModelTagline(model.model_name)
        const discountOff = isGroupMode
          ? (lookupModelSavingsOff(model.model_name) ?? (getModelSpecificDiscountPercent(model.model_name) || null))
          : null
        const hero = getVideoModelHeroPrice(model, isGroupMode, props.priceRate)
        const tierGroups = isUpscale || isDurationBased ? [] : getVideoModelTierGroups(model)
        const upscaleTiers = isUpscale
          ? parseVideoUpscaleTiers(model.billing_expr)
          : []
        const durationTiers = isDurationBased
          ? getDurationVideoTiers(model)
          : []

        const vendorIcon =
          model.vendor_icon || model.icon
            ? getLobeIcon(model.vendor_icon || model.icon, 22)
            : <Film className='text-rose-500 h-5 w-5' />

        const showOfficial = isGroupMode && discountOff != null

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
              '[background:radial-gradient(circle_at_95%_5%,rgba(255,59,128,0.04)_0%,transparent_60%),#fff]',
              'hover:-translate-y-px hover:border-[#CBD5E1] hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] cursor-pointer',
              'dark:border-border dark:bg-card dark:[background:unset]'
            )}
          >

            {/* Top Section */}
            <div className='space-y-2.5'>
              {/* Row 1: Model Identity (Left) & Discount Badge (Right end) */}
              <div className='flex items-center justify-between gap-3 min-w-0'>
                <div className='flex items-center gap-2.5 min-w-0'>
                  <div className='flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-950/40'>
                    {vendorIcon}
                  </div>
                  <div className='inline-flex items-center gap-1.5 min-w-0 flex-wrap'>
                    <h3
                      className='truncate text-[16px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-foreground'
                      title={model.model_name}
                    >
                      {model.model_name}
                    </h3>
                    <button
                      type='button'
                      aria-label={t('Copy model name')}
                      onClick={(e) => handleCopy(e, model.model_name)}
                      className='inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[#94A3B8] opacity-80 transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    >
                      {copiedName === model.model_name ? (
                        <Check className='size-[15.5px] text-emerald-600' />
                      ) : (
                        <Copy className='size-[15.5px]' />
                      )}
                    </button>
                  </div>
                </div>

                {discountOff != null && isGroupMode && (
                  <span
                    translate='no'
                    className='notranslate inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#F43F5E] to-[#E11D48] min-w-[4.75rem] w-[4.75rem] h-[23px] text-xs font-bold tracking-wide text-white shadow-[0_1px_2px_rgba(225,29,72,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] tabular-nums shrink-0 leading-none text-center'
                  >
                    {discountOff}% OFF
                  </span>
                )}
              </div>

              {/* Row 2: Capability Tag (clean and prominent) */}
              {capTag && (
                <div className='flex items-center'>
                  <span
                    className={cn(
                      'inline-block rounded-full border px-[9px] py-[2.5px] text-[12px] font-semibold tracking-tight',
                      capTag.className
                    )}
                  >
                    {t(capTag.key, capTag.label)}
                  </span>
                </div>
              )}

              {/* Row 3: Prominent Supported Resolutions */}
              <div className='mb-2.5 flex items-center gap-[7px] text-[12.5px]'>
                <span className='shrink-0 text-[12px] font-medium text-[#64748B]'>
                  {t('Supported Resolutions:')}
                </span>
                <div className='flex flex-wrap items-center gap-[7px]'>
                  {resolutions.map((res) => {
                    const style = getResolutionBadgeStyle(res)
                    return (
                      <span
                        key={res}
                        className='inline-flex items-center justify-center rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-[2.5px] text-[12px] font-semibold tracking-[0.01em] text-[#1E293B] tabular-nums'
                      >
                        {style.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Row 4: Tagline */}
              <p className='text-[13px] leading-[1.6] font-normal text-[#334155] dark:text-muted-foreground'>
                {t(tagline.key, tagline.defaultText)}
              </p>
            </div>

            {/* Middle Section: Hero Price & Rate Breakdown */}
            <div className='mt-4'>
              {/* Hero Starting Price */}
              <div className='flex items-baseline justify-between border-t border-[#E2E8F0] pt-3'>
                <span className='text-[12px] font-semibold uppercase tracking-[0.05em] text-[#64748B]'>
                  {t('Starting Price')}
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
                  {isUpscale && (
                    <div className='text-[10px] text-muted-foreground/80 mt-0.5 font-medium'>
                      {t('Upscale Service · Video Tokens $7.18/1M+')}
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Spec Matrix (Seedance 官方规格表) */}
              {isUpscale && (
                <div className='rounded-xl border border-border/70 bg-muted/20 overflow-hidden text-xs shadow-2xs'>
                  <div className='grid grid-cols-12 bg-muted/40 border-b border-border/50 px-3.5 py-2 text-xs font-semibold text-muted-foreground'>
                    <div className='col-span-4'>{t('Resolution')}</div>
                    <div className='col-span-4 text-right'>{t('Upscale (/s)')}</div>
                    <div className='col-span-4 text-right'>{t('Video (/1M)')}</div>
                  </div>
                  <div className='divide-y divide-border/40 bg-card/60'>
                    {upscaleTiers.map((tier) => {
                      const billedSecond =
                        (isGroupMode ? tier.secondPrice : tier.officialSecondPrice) *
                        props.priceRate
                      const officialSecond =
                        tier.officialSecondPrice * props.priceRate
                      const billedToken =
                        (isGroupMode ? tier.tokenPricePerM : tier.officialTokenPricePerM) *
                        props.priceRate
                      const officialToken =
                        tier.officialTokenPricePerM * props.priceRate

                      return (
                        <div
                          key={tier.tierKey}
                          className='grid grid-cols-12 items-center px-3 py-2.5 transition-colors hover:bg-muted/30'
                        >
                          <div className='col-span-4 pr-1'>
                            <span className='font-semibold text-foreground text-[13px]'>
                              {tier.displayName}
                            </span>
                          </div>
                          <div className='col-span-4 text-right'>
                            <div className='font-semibold text-foreground text-[13.5px] tabular-nums leading-tight'>
                              ${billedSecond.toFixed(4)}/s
                            </div>
                            {showOfficial && (
                              <div className='text-[10px] text-muted-foreground/55 line-through tabular-nums font-normal'>
                                ${officialSecond.toFixed(4)}
                              </div>
                            )}
                          </div>
                          <div className='col-span-4 text-right'>
                            <div className='font-semibold text-foreground text-[13.5px] tabular-nums leading-tight'>
                              ${billedToken.toFixed(2)}/M
                            </div>
                            {showOfficial && (
                              <div className='text-[10px] text-muted-foreground/55 line-through tabular-nums font-normal'>
                                ${officialToken.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className='border-t border-border bg-slate-50 px-3.5 py-[7px] text-right text-[11.5px] font-medium text-slate-500 dark:bg-muted/30 dark:text-slate-400'>
                    {t('Billing formula: Charge = Video Tokens + Duration × Upscale Rate')}
                  </div>
                </div>
              )}
              {isDurationBased && (
                <div className='mt-4 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] dark:border-border dark:bg-card'>
                  <div className='grid grid-cols-[28%_40%_32%] border-b border-[#E2E8F0] bg-[#F8FAFC] px-[14px] py-2 text-[12px] font-semibold text-[#334155] dark:border-border dark:bg-muted/40 dark:text-muted-foreground'>
                    <div className='text-left'>{t('Resolution', '分辨率')}</div>
                    <div className='text-center'>{t('videoPricing.est5s', '5s 预估价格')}</div>
                    <div className='text-right'>{t('videoPricing.ratePerSec', '每秒单价')}</div>
                  </div>
                  <div className='flex flex-col'>
                    {durationTiers.map((tier, index) => {
                      const billedEst5s = tier.est5sPrice * props.priceRate
                      const billedSecond = tier.secondPrice * props.priceRate

                      return (
                        <div
                          key={tier.resolution}
                          className={cn(
                            'grid grid-cols-[28%_40%_32%] items-center px-[14px] py-[9.5px] transition-colors hover:bg-[#FAFAFA] dark:hover:bg-muted/30',
                            index < durationTiers.length - 1 && 'border-b border-[#F1F5F9] dark:border-border/40'
                          )}
                        >
                          <div className='text-left text-[13px] font-semibold text-[#0F172A] dark:text-foreground'>
                            {tier.resLabel}
                          </div>
                          <div className='text-center text-[13.5px] font-semibold tabular-nums text-[#0F172A] dark:text-foreground'>
                            ${billedEst5s.toFixed(3)}
                          </div>
                          <div className='text-right text-[13.5px] font-semibold tabular-nums text-[#0F172A] dark:text-foreground'>
                            ${billedSecond >= 0.01 && !Number.isInteger(billedSecond * 1000) ? billedSecond.toFixed(4).replace(/0$/, '') : billedSecond.toFixed(3)}
                            <span className='ml-0.5 text-[12px] font-normal text-[#64748B]'>/s</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className='border-t border-[#E2E8F0] bg-[#F8FAFC] px-[14px] py-[7px] text-right text-[11.5px] font-normal text-[#64748B] dark:border-border dark:bg-muted/30 dark:text-slate-400'>
                    {t('videoPricing.durationUnitFooter', '计费单位：/ 秒 · 支持 4~15 秒自定义时长')}
                  </div>
                </div>
              )}
              {!isUpscale && !isDurationBased && (
                <div className='mt-4 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white text-xs shadow-[0_1px_2px_rgba(15,23,42,0.02)] dark:border-border dark:bg-card'>
                  <div className='grid grid-cols-12 bg-muted/40 border-b border-border/50 px-3.5 py-2 text-xs font-semibold text-muted-foreground'>
                    <div className='col-span-4'>{t('Resolution')}</div>
                    <div className='col-span-4 text-right'>{t('Without Video Input')}</div>
                    <div className='col-span-4 text-right'>{t('With Video Input')}</div>
                  </div>
                  <div className='divide-y divide-border/40 bg-card/60'>
                    {tierGroups.map((group) => {
                      const billedNoVideo =
                        (isGroupMode
                          ? group.withoutVideoPrice
                          : group.officialWithoutVideoPrice ?? group.withoutVideoPrice) *
                        props.priceRate
                      const officialNoVideo =
                        (group.officialWithoutVideoPrice ?? group.withoutVideoPrice) *
                        props.priceRate
                      const billedVideo =
                        (isGroupMode
                          ? group.withVideoPrice
                          : group.officialWithVideoPrice ?? group.withVideoPrice) *
                        props.priceRate
                      const officialVideo =
                        (group.officialWithVideoPrice ?? group.withVideoPrice) *
                        props.priceRate

                      return (
                        <div
                          key={group.title}
                          className='grid grid-cols-12 items-center px-3 py-2.5 transition-colors hover:bg-muted/30'
                        >
                          <div className='col-span-4 pr-1'>
                            <div className='font-semibold text-foreground text-[13px] leading-tight'>
                              {group.resLabel}
                            </div>
                          </div>
                          <div className='col-span-4 text-right'>
                            <div className='font-semibold text-foreground text-[13.5px] tabular-nums leading-tight'>
                              ${billedNoVideo.toFixed(3)}
                            </div>
                            {showOfficial && (
                              <div className='text-[11px] text-muted-foreground/55 line-through tabular-nums font-normal'>
                                ${officialNoVideo.toFixed(3)}
                              </div>
                            )}
                          </div>
                          <div className='col-span-4 text-right'>
                            <div className='font-semibold text-foreground text-[13.5px] tabular-nums leading-tight'>
                              ${billedVideo.toFixed(3)}
                            </div>
                            {showOfficial && (
                              <div className='text-[11px] text-muted-foreground/55 line-through tabular-nums font-normal'>
                                ${officialVideo.toFixed(3)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className='border-t border-border bg-slate-50 px-3.5 py-[7px] text-right text-[11.5px] font-medium text-slate-500 dark:bg-muted/30 dark:text-slate-400'>
                    {t('Unit: / 1M Tokens')}
                  </div>
                </div>
              )}

              {/* Upscale Explanation Banner at bottom of card */}
              {isUpscale && (
                <div className='relative mt-3.5 overflow-hidden rounded-xl border border-purple-300/70 bg-gradient-to-br from-purple-500/12 via-indigo-500/8 to-purple-500/16 p-3 shadow-2xs dark:border-purple-700/60 dark:from-purple-950/50 dark:to-indigo-950/40'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='inline-flex items-center gap-1 rounded-md bg-purple-600 px-2 py-0.5 text-xs font-semibold text-white shadow-xs dark:bg-purple-500'>
                      <Sparkles className='h-3 w-3' />
                      {t('Upscale Principle')}
                    </span>
                    <span className='text-[13px] font-semibold text-purple-950 dark:text-purple-200 tracking-tight'>
                      {t('Deep Learning & Detail Reconstruction')}
                    </span>
                  </div>
                  <p className='text-[12.5px] leading-[1.6] text-foreground/85'>
                    {t('Takes lower-resolution video and enhances it to higher definition using deep learning and detail reconstruction. For example, generating at 480p and then upscaling to 720p achieves nearly 90% detail fidelity.')}
                  </p>
                </div>
              )}
            </div>

            {/* Card Footer: clean, zero duplicate estimate note text */}
            <div className='mt-3.5 flex items-center justify-end border-t border-[#F1F5F9] pt-2.5 dark:border-border/40'>
              <span className='inline-flex items-center gap-[3px] text-[12.5px] font-medium text-[#2563EB]'>
                {t('Details')}
                <ArrowUpRight className='size-[13px] stroke-[2.2]' />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

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

import {
  getModelSpecificDiscountPercent,
  getModelSupportedResolutions,
  getResolutionBadgeStyle,
  getVideoModelCapabilityTag,
  getVideoModelHeroPrice,
  getVideoModelTagline,
  getVideoModelTierGroups,
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
        const resolutions = getModelSupportedResolutions(model)
        const capTag = getVideoModelCapabilityTag(model.model_name)
        const tagline = getVideoModelTagline(model.model_name)
        const discountOff = isGroupMode
          ? getModelSpecificDiscountPercent(model.model_name)
          : null
        const hero = getVideoModelHeroPrice(model, isGroupMode, props.priceRate)
        const tierGroups = isUpscale ? [] : getVideoModelTierGroups(model)
        const upscaleTiers = isUpscale
          ? parseVideoUpscaleTiers(model.billing_expr)
          : []
        const isFlagship =
          model.model_name.toLowerCase().includes('2.5') ||
          model.model_name.toLowerCase().includes('4k')

        const vendorIcon =
          model.vendor_icon || model.icon
            ? getLobeIcon(model.vendor_icon || model.icon, 22)
            : <Film className='text-primary h-5 w-5' />

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
              'group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card/95 p-5 text-left shadow-sm transition-all duration-300 backdrop-blur-sm',
              'hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer',
              isFlagship
                ? 'border-primary/25 dark:border-primary/20'
                : 'border-border/70'
            )}
          >
            {/* Ambient subtle glow for flagship models */}
            {isFlagship && (
              <div
                className='pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl transition-all duration-500 group-hover:bg-primary/20'
                aria-hidden='true'
              />
            )}

            {/* Top Section */}
            <div className='space-y-2.5'>
              {/* Row 1: Model Name (Prominent & Bold) + Discount Badge (No lightning) + Copy Button */}
              <div className='flex items-center gap-2.5 min-w-0'>
                <div className='bg-primary/10 text-primary border-primary/20 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs'>
                  {vendorIcon}
                </div>
                <div className='min-w-0 flex-1 flex items-center flex-wrap gap-1.5 sm:gap-2'>
                  <div className='inline-flex items-center gap-1.5 shrink-0'>
                    <h3
                      className='text-foreground group-hover:text-primary text-[15px] sm:text-base font-bold sm:font-extrabold tracking-tight transition-colors'
                      title={model.model_name}
                    >
                      {model.model_name}
                    </h3>
                    <button
                      type='button'
                      aria-label={t('Copy model name')}
                      onClick={(e) => handleCopy(e, model.model_name)}
                      className='text-muted-foreground/70 hover:bg-muted hover:text-foreground inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors'
                    >
                      {copiedName === model.model_name ? (
                        <Check className='text-emerald-600 dark:text-emerald-400 h-3.5 w-3.5' />
                      ) : (
                        <Copy className='h-3.5 w-3.5' />
                      )}
                    </button>
                  </div>
                  {discountOff != null && isGroupMode && (
                    <span className='inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wide text-white shadow-2xs shadow-rose-600/30 dark:bg-rose-500 tabular-nums shrink-0'>
                      {discountOff}% OFF
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Capability Tag (clean and prominent) */}
              {capTag && (
                <div className='flex items-center'>
                  <span
                    className={cn(
                      'inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight shadow-2xs',
                      capTag.className
                    )}
                  >
                    {t(capTag.label)}
                  </span>
                </div>
              )}

              {/* Row 3: Prominent Supported Resolutions */}
              <div className='flex items-center gap-2 pt-0.5 text-xs'>
                <span className='text-muted-foreground/85 text-[11px] font-semibold shrink-0'>
                  {t('Supported Resolutions:')}
                </span>
                <div className='flex flex-wrap items-center gap-1.5'>
                  {resolutions.map((res) => {
                    const style = getResolutionBadgeStyle(res)
                    return (
                      <span
                        key={res}
                        className={cn(
                          'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-tight shadow-2xs tabular-nums',
                          style.className
                        )}
                      >
                        {style.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Row 4: Tagline */}
              <p className='text-muted-foreground text-xs leading-relaxed font-normal'>
                {t(tagline)}
              </p>
            </div>

            {/* Middle Section: Hero Price & Rate Breakdown */}
            <div className='border-border/50 my-3.5 space-y-3.5 border-t pt-3.5'>
              {/* Hero Starting Price */}
              <div className='flex items-baseline justify-between'>
                <span className='text-muted-foreground text-[11px] font-semibold uppercase tracking-wider'>
                  {t('Starting Price')}
                </span>
                <div className='text-right'>
                  <div className='flex items-baseline justify-end gap-1.5'>
                    <span className='text-foreground text-2xl font-extrabold tracking-tight tabular-nums'>
                      {hero.priceText}
                    </span>
                    {hero.officialPriceText && isGroupMode && (
                      <span className='text-muted-foreground/60 text-sm line-through tabular-nums font-normal'>
                        {hero.officialPriceText}
                      </span>
                    )}
                  </div>
                  <span className='text-muted-foreground ml-1 text-xs font-normal'>
                    {hero.unitText}
                  </span>
                  {isUpscale && (
                    <div className='text-[10px] text-muted-foreground/80 mt-0.5 font-medium'>
                      {t('Upscale Service · Video Tokens $7.18/1M+')}
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Spec Matrix (Seedance 官方规格表) */}
              {isUpscale ? (
                /* Upscale Spec Table - 3-column layout strictly aligned with official Tokease structure */
                <div className='rounded-xl border border-border/70 bg-muted/20 overflow-hidden text-xs shadow-2xs'>
                  <div className='grid grid-cols-12 bg-muted/50 border-b border-border/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground'>
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
                            <span className='font-bold text-foreground text-xs'>
                              {tier.displayName}
                            </span>
                          </div>
                          <div className='col-span-4 text-right'>
                            <div className='font-bold text-foreground text-xs sm:text-[13px] tabular-nums leading-tight'>
                              ${billedSecond.toFixed(4)}/s
                            </div>
                            {showOfficial && (
                              <div className='text-[10px] text-muted-foreground/55 line-through tabular-nums font-normal'>
                                ${officialSecond.toFixed(4)}
                              </div>
                            )}
                          </div>
                          <div className='col-span-4 text-right'>
                            <div className='font-bold text-foreground text-xs sm:text-[13px] tabular-nums leading-tight'>
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
                  <div className='border-t border-border/40 bg-muted/15 px-3 py-1.5 text-right text-[10px] text-muted-foreground/80 font-mono'>
                    {t('Billing formula: Charge = Video Tokens + Duration × Upscale Rate')}
                  </div>
                </div>
              ) : (
                /* Regular Video Spec Table */
                <div className='rounded-xl border border-border/70 bg-muted/20 overflow-hidden text-xs shadow-2xs'>
                  <div className='grid grid-cols-12 bg-muted/50 border-b border-border/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground'>
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
                            <div className='font-bold text-foreground text-xs leading-tight'>
                              {group.resLabel}
                            </div>
                          </div>
                          <div className='col-span-4 text-right'>
                            <div className='font-bold text-foreground text-xs sm:text-[13px] tabular-nums leading-tight'>
                              ${billedNoVideo.toFixed(3)}
                            </div>
                            {showOfficial && (
                              <div className='text-[11px] text-muted-foreground/55 line-through tabular-nums font-normal'>
                                ${officialNoVideo.toFixed(3)}
                              </div>
                            )}
                          </div>
                          <div className='col-span-4 text-right'>
                            <div className='font-bold text-foreground text-xs sm:text-[13px] tabular-nums leading-tight'>
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
                  <div className='border-t border-border/40 bg-muted/15 px-3 py-1.5 text-right text-[10px] text-muted-foreground/75 font-mono'>
                    {t('Unit: / 1M Tokens')}
                  </div>
                </div>
              )}

              {/* Upscale Explanation Banner at bottom of card */}
              {isUpscale && (
                <div className='relative mt-3.5 overflow-hidden rounded-xl border border-purple-300/80 bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-purple-500/20 p-2.5 shadow-2xs dark:border-purple-700/60 dark:from-purple-950/50 dark:to-indigo-950/40'>
                  <div className='flex items-center gap-1.5 mb-1.5'>
                    <span className='inline-flex items-center gap-1 rounded-md bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs dark:bg-purple-500'>
                      <Sparkles className='h-3 w-3' />
                      {t('Upscale Principle')}
                    </span>
                    <span className='text-[11px] font-bold text-purple-900 dark:text-purple-200'>
                      {t('Deep Learning & Detail Reconstruction')}
                    </span>
                  </div>
                  <p className='text-[11px] leading-relaxed text-foreground/90'>
                    {t('Takes lower-resolution video and enhances it to higher definition using deep learning and detail reconstruction. For example, generating at 480p and then upscaling to 720p achieves nearly 90% detail fidelity.')}
                  </p>
                </div>
              )}
            </div>

            {/* Card Footer: clean, zero duplicate estimate note text */}
            <div className='border-border/40 mt-auto flex items-center justify-end border-t pt-3 text-xs'>
              <span className='text-primary group-hover:text-primary/90 inline-flex items-center gap-0.5 text-xs font-medium'>
                {t('Details')}
                <ArrowUpRight className='h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

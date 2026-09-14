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

import { getConfiguredGroupRatio } from '../lib/model-helpers'
import {
  getDurationVideoTiers,
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
        const isUpscale = isVideoUpscaleModel(model)
        const isDurationBased = isDurationBasedVideoModel(model)
        const resolutions = getModelSupportedResolutions(model)
        const capTag = getVideoModelCapabilityTag(model.model_name)
        const tagline = getVideoModelTagline(model.model_name)
        let modelRate = 1
        if (isGroupMode) {
          if (
            model.group_ratio &&
            props.selectedGroup &&
            typeof model.group_ratio[props.selectedGroup] === 'number'
          ) {
            modelRate = model.group_ratio[props.selectedGroup] * (props.priceRate ?? 1)
          } else {
            modelRate = effectiveRate
          }
        }
        const durationTiers = isDurationBased
          ? getDurationVideoTiers(model)
          : []
        const durationRatio = isGroupMode && modelRate > 0 ? modelRate / (props.priceRate ?? 1) : 1
        const dynamicDurationDiscount =
          isDurationBased &&
          durationTiers.length > 0 &&
          durationTiers[0].officialSecondPrice != null &&
          durationTiers[0].secondPrice * durationRatio < durationTiers[0].officialSecondPrice
            ? Math.round((1 - (durationTiers[0].secondPrice * durationRatio) / durationTiers[0].officialSecondPrice) * 100)
            : null
        const hero = getVideoModelHeroPrice(model, isGroupMode, modelRate)
        const tierGroups = isUpscale || isDurationBased ? [] : getVideoModelTierGroups(model)
        const discountOff = isGroupMode
          ? (hero.discountOff ?? dynamicDurationDiscount ?? null)
          : null
        const upscaleTiers = isUpscale
          ? parseVideoUpscaleTiers(model.billing_expr)
          : []

        const vendorIcon =
          model.vendor_icon || model.icon
            ? getLobeIcon(model.vendor_icon || model.icon, 15)
            : <Film className='size-3.5 text-rose-500' />

        const nameLen = (model.model_name || '').length
        let titleClass =
          'text-[15px] sm:text-[15.5px] leading-normal tracking-[-0.01em]'
        if (nameLen > 28) {
          titleClass =
            'text-[13.5px] sm:text-[14px] leading-snug tracking-[-0.015em]'
        } else if (nameLen > 20) {
          titleClass =
            'text-[14.5px] sm:text-[15px] leading-snug tracking-[-0.01em]'
        }

        const showOfficial = isGroupMode

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
              'group relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E2E8F0]/90 p-6 text-left shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-all duration-200',
              '[background:radial-gradient(circle_at_95%_5%,rgba(255,59,128,0.04)_0%,transparent_60%),#fff]',
              'hover:-translate-y-px hover:border-[#CBD5E1] hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] cursor-pointer',
              'dark:border-border dark:bg-card dark:[background:unset]'
            )}
          >

            {/* Top Section */}
            <div className='space-y-2.5'>
              {/* Row 1: Model Identity (Full Width, No Crowding) */}
              <div className='flex items-center gap-2.5 min-w-0 h-[28px]'>
                <div className='flex size-[26px] shrink-0 items-center justify-center rounded-[7px] border border-[var(--p-logo-border,#FFE4E6)] bg-[var(--p-logo-bg,#FFF1F5)]'>
                  {vendorIcon}
                </div>
                <div className='flex min-w-0 flex-1 items-center gap-1.5'>
                  <span
                    translate='no'
                    className={cn(
                      'notranslate truncate font-semibold text-[var(--p-text-main,#0F172A)]',
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
                    className='size-6 shrink-0 inline-flex items-center justify-center rounded-md text-[#94A3B8] opacity-70 transition-opacity duration-150 group-hover:opacity-[0.85] hover:bg-[#F1F5F9] hover:text-[var(--p-text-main,#111111)]'
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
              <div className='flex items-center justify-between gap-2.5 h-[26px]'>
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

                {discountOff != null && discountOff > 0 && isGroupMode ? (
                  <span
                    translate='no'
                    className='notranslate inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#F43F5E] to-[#E11D48] min-w-[4.5rem] px-2.5 h-[22px] text-[11.5px] font-bold tracking-wide text-white shadow-[0_1px_2px_rgba(225,29,72,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] tabular-nums shrink-0 leading-none text-center'
                  >
                    {discountOff}% OFF
                  </span>
                ) : (
                  <div />
                )}
              </div>

              {/* Row 3: Prominent Supported Resolutions */}
              <div className='flex items-center gap-[7px] text-[12.5px] h-[26px]'>
                <span className='shrink-0 text-[12px] font-medium text-[#64748B]'>
                  {t('Supported Resolutions:')}
                </span>
                <div className='flex flex-wrap items-center gap-[7px]'>
                  {resolutions.map((res) => {
                    const style = getResolutionBadgeStyle(res)
                    return (
                      <span
                        key={res}
                        className='inline-flex items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-[2px] text-[12px] font-semibold tracking-[0.01em] text-[var(--p-text-muted,#3f3f46)] tabular-nums dark:border-border dark:bg-muted dark:text-foreground'
                      >
                        {style.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Row 4: Tagline */}
              <div className='flex h-[40px] items-center'>
                <p className='line-clamp-2 text-[13px] leading-[20px] font-normal text-[var(--p-text-muted,#3f3f46)] dark:text-muted-foreground'>
                  {t(tagline.key, tagline.defaultText)}
                </p>
              </div>
            </div>

            {/* Middle Section: Hero Price & Rate Breakdown */}
            <div className='mt-3.5 flex flex-1 flex-col justify-start'>
              {/* Hero Starting Price (only for simple models without structured spec tables) */}
              {!isDurationBased && !isUpscale && tierGroups.length === 0 && (
                <div className='flex items-baseline justify-between border-t border-[#E2E8F0] pt-3'>
                  <span className='text-[12px] font-semibold uppercase tracking-[0.05em] text-[#64748B]'>
                    {t('Starting Price')}
                  </span>
                  <div className='text-right'>
                    <div className='flex items-baseline justify-end gap-1'>
                      <span className='text-[22px] font-semibold tabular-nums text-[var(--p-text-main,#111111)] dark:text-foreground'>
                        {hero.priceText}
                      </span>
                      {hero.officialPriceText &&
                        hero.officialPriceText !== hero.priceText &&
                        isGroupMode && (
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

              {/* Pricing Spec Matrix (Seedance 官方规格表) */}
              {isUpscale && (
                <>
                  <div className='overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] text-xs dark:border-border dark:bg-card'>
                    <div className='grid grid-cols-12 bg-[#F8FAFC] border-b border-[#E2E8F0] px-3.5 py-2 text-xs font-semibold text-[var(--p-text-muted,#3f3f46)] dark:border-border dark:bg-muted/40 dark:text-muted-foreground'>
                      <div className='col-span-4'>{t('Resolution')}</div>
                      <div className='col-span-4 text-right'>{t('Upscale (/s)')}</div>
                      <div className='col-span-4 text-right'>{t('Video (/1M)')}</div>
                    </div>
                    <div className='divide-y divide-[#F1F5F9] bg-white dark:divide-border/40 dark:bg-card'>
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
                            className='grid grid-cols-12 items-center px-3.5 min-h-[46px] py-1 transition-colors hover:bg-[#FAFAFA] dark:hover:bg-muted/30'
                          >
                            <div className='col-span-4 pr-1'>
                              <span className='font-semibold text-[var(--p-text-main,#111111)] text-[13px] dark:text-foreground'>
                                {tier.displayName}
                              </span>
                            </div>
                            <div className='col-span-4 text-right flex flex-col justify-center min-h-[34px]'>
                              <div className='font-semibold text-[var(--p-text-main,#111111)] text-[13.5px] tabular-nums leading-tight dark:text-foreground'>
                                ${billedSecond.toFixed(4)}/s
                              </div>
                              {showOfficial && billedSecond <= officialSecond && (
                                <div className='text-[10px] text-[#94A3B8] line-through tabular-nums font-normal leading-none mt-0.5'>
                                  ${officialSecond.toFixed(4)}
                                </div>
                              )}
                            </div>
                            <div className='col-span-4 text-right flex flex-col justify-center min-h-[34px]'>
                              <div className='font-semibold text-[var(--p-text-main,#111111)] text-[13.5px] tabular-nums leading-tight dark:text-foreground'>
                                ${billedToken.toFixed(2)}/M
                              </div>
                              {showOfficial && billedToken <= officialToken && (
                                <div className='text-[10px] text-[#94A3B8] line-through tabular-nums font-normal leading-none mt-0.5'>
                                  ${officialToken.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className='border-t border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-[7px] text-right text-[11px] font-normal text-[#64748B] dark:border-border dark:bg-muted/30 dark:text-slate-400'>
                      {t('Billing formula: Charge = Video Tokens + Duration × Upscale Rate', '计费公式：单次任务扣费 = 视频实际消耗 Token 费 + 视频时长 Upscale 秒费')}
                    </div>
                  </div>

                  {/* Upscale Explanation Banner: fully displayed, no truncation */}
                  <div className='relative mt-3 rounded-xl border border-purple-200/80 bg-purple-50/70 p-2.5 text-xs text-purple-900 shadow-2xs dark:border-purple-800/60 dark:bg-purple-950/30 dark:text-purple-200'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <span className='inline-flex shrink-0 items-center gap-1 rounded-md bg-purple-600 px-1.5 py-0.5 text-[11px] font-semibold text-white dark:bg-purple-500'>
                        <Sparkles className='size-3' />
                        {t('Upscale Principle', '超分原理')}
                      </span>
                      <span className='text-[12px] font-semibold text-purple-950 dark:text-purple-200'>
                        {t('Deep Learning & Detail Reconstruction', '深度学习与细节重构')}
                      </span>
                    </div>
                    <p className='text-[12px] leading-[1.55] text-purple-900/90 dark:text-purple-200/90'>
                      {t(
                        'Takes lower-resolution video and enhances it to higher definition using deep learning and detail reconstruction. For example, generating at 480p and then upscaling to 720p achieves nearly 90% detail fidelity.',
                        '基于深度学习对低分辨率视频进行细节重建与超分增强，如 480p 生成后超分至 720p 可获得近 90% 细节还原度。'
                      )}
                    </p>
                  </div>
                </>
              )}

              {isDurationBased && (
                <div className='overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] dark:border-border dark:bg-card'>
                  <div className='grid grid-cols-[28%_40%_32%] border-b border-[#E2E8F0] bg-[#F8FAFC] px-[14px] py-2 text-[12px] font-semibold text-[var(--p-text-muted,#3f3f46)] dark:border-border dark:bg-muted/40 dark:text-muted-foreground'>
                    <div className='text-left'>{t('Resolution', '分辨率')}</div>
                    <div className='text-center'>{t('videoPricing.est5s', '5s 预估价格')}</div>
                    <div className='text-right'>{t('videoPricing.ratePerSec', '每秒单价')}</div>
                  </div>
                  <div className='flex flex-col'>
                    {durationTiers.length === 0 ? (
                      <div className='px-[14px] py-3 text-sm text-muted-foreground'>
                        {t('Unable to parse structured pricing')}
                      </div>
                    ) : (
                      durationTiers.map((tier, index) => {
                        const billedEst5s =
                          (isGroupMode ? tier.est5sPrice : tier.officialEst5sPrice ?? tier.est5sPrice) *
                          props.priceRate
                        const officialEst5s =
                          (tier.officialEst5sPrice ?? tier.est5sPrice) * props.priceRate
                        const billedSecond =
                          (isGroupMode ? tier.secondPrice : tier.officialSecondPrice ?? tier.secondPrice) *
                          props.priceRate
                        const officialSecond =
                          (tier.officialSecondPrice ?? tier.secondPrice) * props.priceRate
                        const showOffPrice = showOfficial

                        return (
                          <div
                            key={tier.resolution}
                            className={cn(
                              'grid grid-cols-[28%_40%_32%] items-center px-[14px] min-h-[50px] py-1.5 transition-colors hover:bg-[#FAFAFA] dark:hover:bg-muted/30',
                              index < durationTiers.length - 1 && 'border-b border-[#F1F5F9] dark:border-border/40'
                            )}
                          >
                            <div className='text-left text-[13px] font-semibold text-[var(--p-text-main,#111111)] dark:text-foreground'>
                              {tier.resLabel}
                            </div>
                            <div className='text-center flex flex-col justify-center min-h-[36px]'>
                              <div className='text-[13.5px] font-semibold tabular-nums text-[var(--p-text-main,#111111)] dark:text-foreground leading-tight'>
                                ${billedEst5s.toFixed(3)}
                              </div>
                              {showOffPrice && (
                                <div className='text-[10.5px] font-normal tabular-nums text-[#94A3B8] line-through leading-none mt-0.5'>
                                  ${officialEst5s.toFixed(3)}
                                </div>
                              )}
                            </div>
                            <div className='text-right flex flex-col justify-center min-h-[36px]'>
                              <div className='text-[13.5px] font-semibold tabular-nums text-[var(--p-text-main,#111111)] dark:text-foreground leading-tight'>
                                ${billedSecond >= 0.01 && !Number.isInteger(billedSecond * 1000) ? billedSecond.toFixed(4).replace(/0$/, '') : billedSecond.toFixed(3)}
                                <span className='ml-0.5 text-[12px] font-normal text-[#64748B]'>/s</span>
                              </div>
                              {showOffPrice && (
                                <div className='text-[10.5px] font-normal tabular-nums text-[#94A3B8] line-through leading-none mt-0.5'>
                                  ${officialSecond.toFixed(3)}/s
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className='border-t border-[#E2E8F0] bg-[#F8FAFC] px-[14px] py-[7px] text-right text-[11.5px] font-normal text-[#64748B] dark:border-border dark:bg-muted/30 dark:text-slate-400'>
                    {t('videoPricing.durationUnitFooter', '计费单位：/ 秒 · 支持 4~15 秒自定义时长')}
                  </div>
                </div>
              )}

              {!isUpscale && !isDurationBased && (
                <div className='overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] dark:border-border dark:bg-card'>
                  <div className='grid grid-cols-[28%_36%_36%] border-b border-[#E2E8F0] bg-[#F8FAFC] px-[14px] py-2 text-[12px] font-semibold text-[var(--p-text-muted,#3f3f46)] dark:border-border dark:bg-muted/40 dark:text-muted-foreground'>
                    <div className='text-left'>{t('Resolution')}</div>
                    <div className='text-right'>{t('Without Video Input')}</div>
                    <div className='text-right'>{t('With Video Input')}</div>
                  </div>
                  <div className='flex flex-col'>
                    {tierGroups.map((group, index) => {
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
                      const showNoVideoOfficial =
                        isGroupMode && officialNoVideo > billedNoVideo + 0.0001
                      const showVideoOfficial =
                        isGroupMode && officialVideo > billedVideo + 0.0001

                      return (
                        <div
                          key={group.title}
                          className={cn(
                            'grid grid-cols-[28%_36%_36%] items-center px-[14px] min-h-[50px] py-1.5 transition-colors hover:bg-[#FAFAFA] dark:hover:bg-muted/30',
                            index < tierGroups.length - 1 &&
                              'border-b border-[#F1F5F9] dark:border-border/40'
                          )}
                        >
                          <div className='text-left text-[13px] font-semibold text-[var(--p-text-main,#111111)] dark:text-foreground'>
                            {group.resLabel}
                          </div>
                          <div className='text-right flex flex-col justify-center min-h-[36px]'>
                            <div className='text-[13.5px] font-semibold tabular-nums text-[var(--p-text-main,#111111)] dark:text-foreground leading-tight'>
                              ${billedNoVideo.toFixed(3)}
                            </div>
                            {showNoVideoOfficial && (
                              <div className='text-[10.5px] font-normal tabular-nums text-[#94A3B8] line-through leading-none mt-0.5'>
                                ${officialNoVideo.toFixed(3)}
                              </div>
                            )}
                          </div>
                          <div className='text-right flex flex-col justify-center min-h-[36px]'>
                            <div className='text-[13.5px] font-semibold tabular-nums text-[var(--p-text-main,#111111)] dark:text-foreground leading-tight'>
                              ${billedVideo.toFixed(3)}
                            </div>
                            {showVideoOfficial && (
                              <div className='text-[10.5px] font-normal tabular-nums text-[#94A3B8] line-through leading-none mt-0.5'>
                                ${officialVideo.toFixed(3)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className='border-t border-[#E2E8F0] bg-[#F8FAFC] px-[14px] py-[7px] text-right text-[11.5px] font-normal text-[#64748B] dark:border-border dark:bg-muted/30 dark:text-slate-400'>
                    {t('Billing Unit:', '计费单位：')}/ 1M Tokens
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer: pinned strictly to bottom with mt-auto */}
            <div className='mt-auto pt-3.5 flex items-center justify-end border-t border-[#F1F5F9] dark:border-border/40'>
              <span className='inline-flex items-center gap-[3px] text-[12.5px] font-medium text-[#2563EB] group-hover:underline'>
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

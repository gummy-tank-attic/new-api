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
import { isByteDancePricingVendor, lookupModelSavingsOff } from '../constants'
import type { BillingUsageSchema, PricingModel } from '../types'
import { parseTaskTiersFromExpr } from './billing-expr'
import { getTaskMatrixDisplayTiers } from './task-matrix-display'

export interface VideoUpscaleTier {
  tierKey: string
  resolution: string
  displayName: string
  tokenPricePerM: number
  secondPrice: number
  officialSecondPrice: number
  officialTokenPricePerM: number
  est5sTotal: number
  officialEst5sTotal?: number
}

export interface VideoTierGroup {
  title: string
  resLabel: string
  resSubLabel?: string
  resolutions: string[]
  withoutVideoPrice: number
  withVideoPrice: number
  officialWithoutVideoPrice?: number
  officialWithVideoPrice?: number
}

export function isImageModel(model: PricingModel | string): boolean {
  const name = (typeof model === 'string' ? model : model.model_name).toLowerCase()
  if (name.includes('seedream')) return true
  if (name.includes('flux') || name.includes('midjourney') || name.startsWith('mj_') || name.startsWith('mj-')) return true
  if (name === 'gpt-image-2' || name.startsWith('dall-e')) return true
  if (name.includes('grok-imagine-image')) return true
  if (typeof model !== 'string') {
    if (model.supported_endpoint_types?.includes('image-generation') && !name.includes('video')) return true
  }
  return false
}

export function isByteDanceOrVideoModel(model: PricingModel): boolean {
  if (isImageModel(model)) return false
  const name = model.model_name.toLowerCase()
  if (name.startsWith('seedance') || name.includes('seedance')) return true
  if (name === 'grok-imagine-video') return true
  if (name.includes('minimax-h3') || name.includes('hailuo') || (name.includes('minimax') && name.includes('h3'))) return true
  const schema = model.billing_usage_schema
  if (schema?.seconds && (schema?.resolution || schema?.input_images || schema?.input_video_seconds)) {
    return true
  }
  if (Boolean(schema?.resolution || schema?.video_input)) {
    return true
  }
  if (isByteDancePricingVendor(model.vendor_name) && !name.includes('doubao-') && !name.includes('seedream')) {
    return true
  }
  return false
}

export function isDurationBasedVideoModel(model: PricingModel | string): boolean {
  const name = (typeof model === 'string' ? model : model.model_name).toLowerCase()
  if (name.includes('minimax-h3') || name.includes('h3') || name.includes('hailuo')) return true
  if (typeof model !== 'string') {
    const schema = model.billing_usage_schema
    if (schema?.seconds && !schema?.tokens) return true
  }
  return false
}

export function isVideoUpscaleModel(model: PricingModel | string): boolean {
  if (typeof model === 'string') {
    const str = model.toLowerCase()
    if (str.includes('upscale') || str.includes('chaofen')) return true
    return str.includes('seconds') && str.includes('tokens')
  }
  const name = model.model_name.toLowerCase()
  if (name.includes('upscale') || name.includes('chaofen')) return true
  if (model.billing_expr) {
    return model.billing_expr.includes('seconds') && model.billing_expr.includes('tokens')
  }
  return false
}

/**
 * Returns supported resolutions accurately aligned with upstream Volcengine & Tokease specs.
 */
export function getModelSupportedResolutions(model: PricingModel): string[] {
  const name = model.model_name.toLowerCase().trim()
  if (name.includes('seedream')) {
    return ['1k', '2k']
  }
  if (name.includes('minimax-h3') || name.includes('h3') || name.includes('hailuo')) {
    return ['768p', '2k']
  }
  if (name.includes('upscale') || name.includes('chaofen')) {
    return ['720p', '1080p', '2k']
  }
  if (name.includes('4k')) {
    return ['4k']
  }
  if (name.includes('fast') || (name.includes('mini') && !name.includes('minimax'))) {
    return ['480p', '720p']
  }
  if (
    name.includes('seedance2.5') ||
    name.includes('seedance 2.5') ||
    name.includes('seedance-2.5') ||
    name.includes('seedance-2-5')
  ) {
    return ['480p', '720p', '1080p']
  }
  if (
    name.includes('seedance 2.0') ||
    name.includes('seedance2.0') ||
    name.includes('seedance-2.0') ||
    name.includes('seedance-2-0')
  ) {
    return ['480p', '720p', '1080p']
  }
  if (
    name.includes('seedance 1.5') ||
    name.includes('seedance1.5') ||
    name.includes('seedance-1.5') ||
    name.includes('seedance-1-5')
  ) {
    return ['480p', '720p', '1080p']
  }
  if (
    name.includes('seedance 1.0') ||
    name.includes('seedance1.0') ||
    name.includes('seedance-1.0') ||
    name.includes('seedance-1-0')
  ) {
    return ['480p', '720p']
  }
  if (name === 'grok-imagine-video') {
    return ['480p', '720p']
  }
  const schemaRes = model.billing_usage_schema?.resolution?.enum
  if (Array.isArray(schemaRes) && schemaRes.length > 0) {
    return schemaRes
  }
  return []
}

export function getResolutionBadgeStyle(res: string): { label: string; className: string } {
  const clean = res.trim().toLowerCase()
  const neutralClass =
    'border-[#E2E8F0] bg-[#F1F5F9] text-[#334155] dark:border-border dark:bg-muted dark:text-foreground font-semibold'

  if (clean === '1k') {
    return { label: '1K', className: neutralClass }
  }
  if (clean === '480p') {
    return { label: '480P', className: neutralClass }
  }
  if (clean === '720p') {
    return { label: '720P', className: neutralClass }
  }
  if (clean === '768p') {
    return { label: '768P', className: neutralClass }
  }
  if (clean === '1080p') {
    return { label: '1080P', className: neutralClass }
  }
  if (clean === '2k') {
    return { label: '2K', className: neutralClass }
  }
  if (clean === '4k') {
    return { label: '4K', className: neutralClass }
  }
  return {
    label: res.toUpperCase(),
    className: neutralClass,
  }
}

export function getVideoModelCapabilityTag(modelName: string): {
  key: string
  label: string
  className: string
} | null {
  const name = modelName.toLowerCase()
  if (name.includes('seedream')) {
    if (name.includes('unfiltered')) {
      return {
        key: 'imagePricing.badge.unfiltered',
        label: '原生未过滤',
        className:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
      }
    }
    return {
      key: 'imagePricing.badge.flagship',
      label: '旗舰生图',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    }
  }
  if (name.includes('minimax-h3') || name.includes('h3') || name.includes('hailuo')) {
    return {
      key: 'videoPricing.badge.h3',
      label: '旗舰多模态视频',
      className:
        'border-[#F3E8FF] bg-[#FAF5FF] text-[12px] font-semibold text-[#7E22CE] dark:border-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    }
  }
  if (name.includes('upscale') || name.includes('chaofen')) {
    return {
      key: 'videoPricing.badge.upscale',
      label: '画质超分重建',
      className:
        'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
    }
  }
  if (name.includes('4k')) {
    return {
      key: 'videoPricing.badge.4k',
      label: '4K 旗舰',
      className:
        'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
    }
  }
  if (name.includes('fast')) {
    return {
      key: 'videoPricing.badge.fast',
      label: '极速出片',
      className:
        'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
    }
  }
  if (name.includes('mini')) {
    return {
      key: 'videoPricing.badge.mini',
      label: '轻量性价比',
      className:
        'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800',
    }
  }
  if (name.includes('unfiltered')) {
    return {
      key: 'videoPricing.badge.unfiltered',
      label: '真人免审',
      className:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    }
  }
  if (
    name.includes('seedance2.5') ||
    name.includes('seedance 2.5') ||
    name.includes('seedance-2.5') ||
    name.includes('seedance-2-5')
  ) {
    return {
      key: 'videoPricing.badge.flagship',
      label: '全能旗舰主力',
      className:
        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    }
  }
  if (
    name.includes('seedance 2.0') ||
    name.includes('seedance2.0') ||
    name.includes('seedance-2.0') ||
    name.includes('seedance-2-0')
  ) {
    return {
      key: 'videoPricing.badge.classic',
      label: '经典主力',
      className:
        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    }
  }
  if (
    name.includes('seedance 1.5') ||
    name.includes('seedance1.5') ||
    name.includes('seedance-1.5') ||
    name.includes('seedance-1-5')
  ) {
    return {
      key: 'videoPricing.badge.v15',
      label: '进阶主力',
      className:
        'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
    }
  }
  if (
    name.includes('seedance 1.0') ||
    name.includes('seedance1.0') ||
    name.includes('seedance-1.0') ||
    name.includes('seedance-1-0')
  ) {
    return {
      key: 'videoPricing.badge.v10',
      label: '基础主力',
      className:
        'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
    }
  }
  return null
}

export function getModelSpecificDiscountPercent(modelName: string): number {
  const name = modelName.toLowerCase()
  if (name.includes('minimax-h3') || name.includes('h3') || name.includes('hailuo')) return 25
  if (name.includes('minimax')) return 0
  if (name.includes('mini')) return 50
  if (name.includes('upscale') || name.includes('chaofen')) return 30
  if (name.includes('fast')) return 20
  if (name.includes('2.0') && !name.includes('2.5') && !name.includes('4k')) return 16
  if (name.includes('2.5')) return 10
  if (name.includes('4k')) return 10
  if (name.includes('seedream')) return 10
  return 0
}

export function parseVideoUpscaleTiers(expression: string | null | undefined): VideoUpscaleTier[] {
  // Real measurement: ~85,000 tokens for 5s (approx 17,000 tokens/sec based on actual billing log: 102,880 tokens for 6s)
  const defaultTiers: VideoUpscaleTier[] = [
    {
      tierKey: '720p',
      resolution: '720p',
      displayName: '720p',
      tokenPricePerM: 7.18475,
      secondPrice: 0.0091,
      officialTokenPricePerM: 10.263929,
      officialSecondPrice: 0.013,
      est5sTotal: 0.66,
      officialEst5sTotal: 0.94,
    },
    {
      tierKey: '1080p',
      resolution: '1080p',
      displayName: '1080p',
      tokenPricePerM: 7.18475,
      secondPrice: 0.0196,
      officialTokenPricePerM: 10.263929,
      officialSecondPrice: 0.028,
      est5sTotal: 0.71,
      officialEst5sTotal: 1.01,
    },
    {
      tierKey: '2k',
      resolution: '2k',
      displayName: '2K',
      tokenPricePerM: 7.903225,
      secondPrice: 0.0357,
      officialTokenPricePerM: 11.290322,
      officialSecondPrice: 0.051,
      est5sTotal: 0.85,
      officialEst5sTotal: 1.21,
    },
  ]

  if (!expression) return defaultTiers

  const regex = /tier\("([^"]+)",\s*u\("tokens"\)\s*\*\s*([\d.]+)\s*\/\s*1000000\s*\+\s*u\("seconds"\)\s*\*\s*([\d.]+)\)/g
  const matches: VideoUpscaleTier[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(expression)) !== null) {
    const rawKey = match[1].toLowerCase()
    const tokenPrice = Number(match[2]) || 7.18475
    const secondPrice = Number(match[3]) || 0.01
    const res = rawKey === '2k' ? '2k' : rawKey === '1080p' ? '1080p' : '720p'
    const name = res === '2k' ? '2K' : res === '1080p' ? '1080p' : '720p'
    const officialToken = res === '2k' ? 11.290322 : 10.263929
    const officialSec = res === '2k' ? 0.051 : res === '1080p' ? 0.028 : 0.013
    const est5sTokens = 85_000
    const est5s = Number((secondPrice * 5 + (tokenPrice * est5sTokens) / 1_000_000).toFixed(2))
    const officialEst5s = Number((officialSec * 5 + (officialToken * est5sTokens) / 1_000_000).toFixed(2))

    matches.push({
      tierKey: rawKey,
      resolution: res,
      displayName: name,
      tokenPricePerM: tokenPrice,
      secondPrice,
      officialTokenPricePerM: officialToken,
      officialSecondPrice: officialSec,
      est5sTotal: est5s > 0 ? est5s : 0.66,
      officialEst5sTotal: officialEst5s > 0 ? officialEst5s : 0.94,
    })
  }

  const resOrder: Record<string, number> = { '720p': 1, '1080p': 2, '2k': 3 }
  matches.sort((a, b) => (resOrder[a.resolution] ?? 99) - (resOrder[b.resolution] ?? 99))

  return matches.length > 0 ? matches : defaultTiers
}

export function getDefaultVideoModelTierGroups(modelName: string): VideoTierGroup[] {
  const name = modelName.toLowerCase()
  if (name.includes('4k')) {
    return [
      {
        title: '4K',
        resLabel: '4K',
        resolutions: ['4k'],
        withoutVideoPrice: 5.913,
        withVideoPrice: 5.913,
        officialWithoutVideoPrice: 6.570,
        officialWithVideoPrice: 6.570,
      },
    ]
  }
  if (name.includes('fast')) {
    return [
      {
        title: '480p · 720p',
        resLabel: '480p · 720p',
        resolutions: ['480p', '720p'],
        withoutVideoPrice: 4.340,
        withVideoPrice: 2.581,
        officialWithoutVideoPrice: 5.425,
        officialWithVideoPrice: 3.2258,
      },
    ]
  }
  if (name.includes('minimax') || name.includes('hailuo') || name.includes('h3')) {
    return []
  }
  if (name.includes('mini') && !name.includes('minimax')) {
    return [
      {
        title: '480p · 720p',
        resLabel: '480p · 720p',
        resolutions: ['480p', '720p'],
        withoutVideoPrice: 1.6862,
        withVideoPrice: 1.0264,
        officialWithoutVideoPrice: 3.3724,
        officialWithVideoPrice: 2.0528,
      },
    ]
  }
  if (name.includes('2.5')) {
    return [
      {
        title: '480p · 720p',
        resLabel: '480p · 720p',
        resolutions: ['480p', '720p'],
        withoutVideoPrice: 9.237536,
        withVideoPrice: 5.544,
        officialWithoutVideoPrice: 10.263929,
        officialWithVideoPrice: 6.160,
      },
      {
        title: '1080p',
        resLabel: '1080p',
        resolutions: ['1080p'],
        withoutVideoPrice: 10.16129,
        withVideoPrice: 6.070381,
        officialWithoutVideoPrice: 11.290322,
        officialWithVideoPrice: 6.744868,
      },
    ]
  }
  if (name.includes('2.0')) {
    return [
      {
        title: '480p · 720p',
        resLabel: '480p · 720p',
        resolutions: ['480p', '720p'],
        withoutVideoPrice: 5.6658,
        withVideoPrice: 3.4487,
        officialWithoutVideoPrice: 6.745,
        officialWithVideoPrice: 4.1056,
      },
      {
        title: '1080p',
        resLabel: '1080p',
        resolutions: ['1080p'],
        withoutVideoPrice: 6.2815,
        withVideoPrice: 3.8182,
        officialWithoutVideoPrice: 7.478,
        officialWithVideoPrice: 4.5455,
      },
    ]
  }
  return []
}

export function getVideoModelTierGroups(model: PricingModel): VideoTierGroup[] {
  if (isDurationBasedVideoModel(model)) {
    return []
  }
  const allowedResolutions = getModelSupportedResolutions(model)
  const tiers = getTaskMatrixDisplayTiers(model.billing_expr, model.billing_usage_schema)
  if (!tiers || tiers.length === 0) {
    return getDefaultVideoModelTierGroups(model.model_name)
  }

  const mapByRes = new Map<string, { none: number; video: number }>()
  for (const tier of tiers) {
    const res = tier.conditions.find((c) => c.field === 'resolution')?.value || 'default'
    if (
      allowedResolutions.length > 0 &&
      res !== 'default' &&
      !allowedResolutions.includes(res.toLowerCase())
    ) {
      continue
    }
    const inputMode = tier.conditions.find((c) => c.field === 'video_input')?.value || 'none'
    const price = Number(tier.unitPrices['tokens']) || 0

    if (!mapByRes.has(res)) {
      mapByRes.set(res, { none: 0, video: 0 })
    }
    const entry = mapByRes.get(res)!
    if (inputMode === 'video') entry.video = price
    else entry.none = price
  }

  const distinctTiers = new Map<string, { resList: string[]; none: number; video: number }>()
  for (const [res, prices] of mapByRes.entries()) {
    const key = `${prices.none.toFixed(4)}_${prices.video.toFixed(4)}`
    if (!distinctTiers.has(key)) {
      distinctTiers.set(key, { resList: [], none: prices.none, video: prices.video })
    }
    distinctTiers.get(key)!.resList.push(res)
  }

  const groups: VideoTierGroup[] = []
  const modelName = model.model_name.toLowerCase()
  for (const item of distinctTiers.values()) {
    let title = ''
    let resLabel = ''
    let officialNone = item.none
    let officialVideo = item.video
    let billedNone = item.none
    let billedVideo = item.video

    if (modelName.includes('4k')) {
      title = '4K'
      resLabel = '4K'
      officialNone = 6.57
      officialVideo = 6.57
      billedNone = 5.913
      billedVideo = 5.913
    } else if (modelName.includes('fast')) {
      title = '480p · 720p'
      resLabel = '480p · 720p'
      officialNone = 5.425
      officialVideo = 3.2258
      billedNone = item.none || 4.34
      billedVideo = item.video || 2.581
    } else if (modelName.includes('mini') && !modelName.includes('minimax')) {
      title = '480p · 720p'
      resLabel = '480p · 720p'
      officialNone = 3.3724
      officialVideo = 2.0528
      billedNone = item.none || 1.6862
      billedVideo = item.video || 1.0264
    } else if (modelName.includes('2.5')) {
      if (item.resList.includes('1080p')) {
        title = '1080p'
        resLabel = '1080p'
        officialNone = 11.290322
        officialVideo = 6.744868
        billedNone = 10.16129
        billedVideo = 6.070381
      } else {
        title = '480p · 720p'
        resLabel = '480p · 720p'
        officialNone = 10.263929
        officialVideo = 6.160
        billedNone = 9.237536
        billedVideo = 5.544
      }
    } else if (modelName.includes('2.0')) {
      if (item.resList.includes('1080p')) {
        title = '1080p'
        resLabel = '1080p'
        officialNone = 7.478
        officialVideo = 4.5455
        billedNone = 6.2815
        billedVideo = 3.8182
      } else {
        title = '480p · 720p'
        resLabel = '480p · 720p'
        officialNone = 6.745
        officialVideo = 4.1056
        billedNone = 5.6658
        billedVideo = 3.4487
      }
    } else if (item.resList.includes('480p') && item.resList.includes('720p')) {
      title = '480p · 720p'
      resLabel = '480p · 720p'
    } else if (item.resList.includes('1080p')) {
      title = '1080p'
      resLabel = '1080p'
    } else if (item.resList.includes('4k')) {
      title = '4K'
      resLabel = '4K'
    } else {
      title = item.resList.map((r) => r.toUpperCase()).join(' · ')
      resLabel = item.resList.map((r) => r.toUpperCase()).join(' · ')
    }

    groups.push({
      title,
      resLabel,
      resolutions: item.resList,
      withoutVideoPrice: billedNone,
      withVideoPrice: billedVideo,
      officialWithoutVideoPrice: officialNone,
      officialWithVideoPrice: officialVideo,
    })
  }

  groups.sort((a, b) => {
    if (a.resolutions.includes('1080p')) return 1
    if (b.resolutions.includes('1080p')) return -1
    return 0
  })

  if (groups.length === 0) {
    return getDefaultVideoModelTierGroups(model.model_name)
  }

  return groups
}

export function formatHumanFriendlyCondition(
  field: string,
  value: string,
  t?: unknown
): string {
  const translate = (typeof t === 'function' ? t : ((k: string, d?: string) => d || k)) as (
    key: string,
    defaultValue?: string
  ) => string
  if (field === 'resolution') {
    const val = value.toLowerCase()
    const prefix = translate('pricing.resolutionPrefix', '分辨率')
    if (val === '480p') return `${prefix}: 480p`
    if (val === '720p') return `${prefix}: 720p`
    if (val === '1080p') return `${prefix}: 1080p`
    if (val === '2k') return `${prefix}: 2K`
    if (val === '4k') return `${prefix}: 4K`
    return `${prefix}: ${value.toUpperCase()}`
  }
  if (field === 'video_input') {
    const prefix = translate('pricing.modePrefix', '模式')
    if (value === 'none') {
      return `${prefix}: ${translate('Without Video Input', '无视频输入')}`
    }
    if (value === 'video') {
      return `${prefix}: ${translate('With Video Input', '有视频输入')}`
    }
    return `${prefix}: ${value}`
  }
  return `${field}: ${value}`
}

export function formatHumanFriendlyTierLabel(
  label: string,
  t?: unknown
): string {
  const translate = (typeof t === 'function' ? t : ((k: string, d?: string) => d || k)) as (
    key: string,
    defaultValue?: string
  ) => string
  const parts = label.split('·').map((s) => s.trim())
  if (parts.length === 2) {
    const [res, mode] = parts
    const resText = res.toUpperCase()
    const lowerMode = mode.toLowerCase()
    const modeText =
      lowerMode === 'video'
        ? translate('With Video Input', '有视频输入')
        : lowerMode === 'none'
        ? translate('Without Video Input', '无视频输入')
        : mode
    return `${resText} · ${modeText}`
  }
  return label
}

export function getVideoModelTagline(modelName: string): {
  key: string
  defaultText: string
} {
  const name = modelName.toLowerCase()
  if (name.includes('seedream')) {
    if (name.includes('unfiltered')) {
      return {
        key: 'imagePricing.tagline.seedreamUnfiltered',
        defaultText: '无审查限制旗舰生图 · 完整释放 Seedream 5.0 原生图像创作与自由表达能力',
      }
    }
    return {
      key: 'imagePricing.tagline.seedreamPro',
      defaultText: '新一代旗舰图像创作 · 支持复杂真实场景超高清生成，质感更自然逼真',
    }
  }
  if (name.includes('minimax-h3') || name.includes('h3') || name.includes('hailuo')) {
    return {
      key: 'videoPricing.tagline.h3',
      defaultText: 'MiniMax 官方多模态视频生成主力 · 支持 768P / 2K 高清、首尾帧控制与多模态参考',
    }
  }
  if (name.includes('upscale') || name.includes('chaofen')) {
    return {
      key: 'videoPricing.tagline.upscale',
      defaultText: '视频超分重建 · 视频 Tokens + 时长按秒计费',
    }
  }
  if (name.includes('4k')) {
    return {
      key: 'videoPricing.tagline.4k',
      defaultText: '专为 4K 大屏与精细画面定制出片',
    }
  }
  if (name.includes('fast')) {
    return {
      key: 'videoPricing.tagline.fast',
      defaultText: '极速秒级出片 · 高并发灵感快速捕捉与渲染',
    }
  }
  if (name.includes('mini')) {
    return {
      key: 'videoPricing.tagline.mini',
      defaultText: '轻量经济高性价比 · 极低成本满足日常视频内容生产',
    }
  }
  if (
    name.includes('seedance2.5') ||
    name.includes('seedance 2.5') ||
    name.includes('seedance-2.5') ||
    name.includes('seedance-2-5')
  ) {
    if (name.includes('unfiltered')) {
      return {
        key: 'videoPricing.tagline.flagshipUnfiltered',
        defaultText: '新一代多模态主力 · 支持 1080p 影视级生成（真人免审 · 创作尺度更宽松）',
      }
    }
    return {
      key: 'videoPricing.tagline.flagship',
      defaultText: '新一代多模态主力 · 支持 1080p 影视级生成',
    }
  }
  if (
    name.includes('seedance 2.0') ||
    name.includes('seedance2.0') ||
    name.includes('seedance-2.0') ||
    name.includes('seedance-2-0')
  ) {
    if (name.includes('unfiltered')) {
      return {
        key: 'videoPricing.tagline.classicUnfiltered',
        defaultText: '经典视频主力 · 稳定支持文生/图生视频（真人免审 · 创作尺度更宽松）',
      }
    }
    return {
      key: 'videoPricing.tagline.classic',
      defaultText: '经典视频主力 · 稳定支持文生/图生视频与首尾帧控制',
    }
  }
  if (
    name.includes('seedance 1.5') ||
    name.includes('seedance1.5') ||
    name.includes('seedance-1.5') ||
    name.includes('seedance-1-5')
  ) {
    return {
      key: 'videoPricing.tagline.v15',
      defaultText: '进阶视频生成 · 支持文生与图生视频创作',
    }
  }
  if (
    name.includes('seedance 1.0') ||
    name.includes('seedance1.0') ||
    name.includes('seedance-1.0') ||
    name.includes('seedance-1-0')
  ) {
    return {
      key: 'videoPricing.tagline.v10',
      defaultText: '基础视频生成 · 稳定高效视频生成与轻量渲染',
    }
  }
  return {
    key: 'videoPricing.tagline.default',
    defaultText: '专业 AI 视频生成模型',
  }
}

export function getVideoModelHeroPrice(
  model: PricingModel,
  isGroupMode = true,
  rate = 1
): {
  priceText: string
  officialPriceText: string | null
  unitText: string
  unitKey: string
  isStartingPrice: boolean
  discountOff: number | null
} {
  const name = model.model_name.toLowerCase()
  const discountOff = isGroupMode
    ? (lookupModelSavingsOff(model.model_name) ?? (getModelSpecificDiscountPercent(name) || null))
    : null

  if (isImageModel(model)) {
    let unitPrice = 1.026 * rate
    if (model.billing_expr) {
      const match = model.billing_expr.match(/u\("tokens"\)\s*\*\s*([\d.]+)\s*\/\s*1000000/)
      if (match) {
        unitPrice = Number(match[1]) * rate
      }
    }
    const officialUnitPrice = discountOff ? unitPrice / (1 - discountOff / 100) : 1.140 * rate
    return {
      priceText: `$${unitPrice.toFixed(3)}`,
      officialPriceText: isGroupMode && discountOff != null ? `$${officialUnitPrice.toFixed(3)}` : null,
      unitText: '/ 1M Tokens 起',
      unitKey: 'videoPricing.unitPer1MTokensFrom',
      isStartingPrice: true,
      discountOff,
    }
  }

  if (name.includes('minimax-h3') || name.includes('h3') || name.includes('hailuo') || isDurationBasedVideoModel(model)) {
    const durationTiers = getDurationVideoTiers(model)
    const minTier = durationTiers.length > 0 ? durationTiers[0] : null
    const baseEst5s = minTier ? minTier.est5sPrice : 0.400
    const billed = baseEst5s * rate
    const officialEst5s = (minTier?.officialEst5sPrice ?? 0.400) * rate
    return {
      priceText: `$${billed.toFixed(3)}`,
      officialPriceText: isGroupMode && discountOff != null ? `$${officialEst5s.toFixed(3)}` : null,
      unitText: '/ 5秒 起',
      unitKey: 'videoPricing.unitPer5sFrom',
      isStartingPrice: true,
      discountOff,
    }
  }

  if (name.includes('upscale') || name.includes('chaofen')) {
    const billedSecond = 0.0091 * rate
    const officialSecond = 0.013 * rate
    return {
      priceText: isGroupMode ? `$${billedSecond.toFixed(4)}` : `$${officialSecond.toFixed(4)}`,
      officialPriceText: isGroupMode ? `$${officialSecond.toFixed(4)}` : null,
      unitText: '/ s (Upscale)',
      unitKey: 'videoPricing.unitPerSecUpscale',
      isStartingPrice: true,
      discountOff,
    }
  }

  if (name.includes('mini')) {
    const billed = 1.026 * rate
    const official = 2.053 * rate
    return {
      priceText: isGroupMode ? `$${billed.toFixed(3)}` : `$${official.toFixed(3)}`,
      officialPriceText: isGroupMode ? `$${official.toFixed(3)}` : null,
      unitText: '/ 1M Tokens 起',
      unitKey: 'videoPricing.unitPer1MTokensFrom',
      isStartingPrice: true,
      discountOff,
    }
  }

  if (name.includes('fast')) {
    const billed = 2.581 * rate
    const official = 3.226 * rate
    return {
      priceText: isGroupMode ? `$${billed.toFixed(3)}` : `$${official.toFixed(3)}`,
      officialPriceText: isGroupMode ? `$${official.toFixed(3)}` : null,
      unitText: '/ 1M Tokens 起',
      unitKey: 'videoPricing.unitPer1MTokensFrom',
      isStartingPrice: true,
      discountOff,
    }
  }

  if ((name.includes('2.0') || name.includes('2-0')) && !name.includes('2.5') && !name.includes('2-5') && !name.includes('4k')) {
    const billed = 3.449 * rate
    const official = 4.106 * rate
    return {
      priceText: isGroupMode ? `$${billed.toFixed(3)}` : `$${official.toFixed(3)}`,
      officialPriceText: isGroupMode ? `$${official.toFixed(3)}` : null,
      unitText: '/ 1M Tokens 起',
      unitKey: 'videoPricing.unitPer1MTokensFrom',
      isStartingPrice: true,
      discountOff,
    }
  }

  if (name.includes('4k')) {
    const billed = 5.913 * rate
    const official = 6.57 * rate
    return {
      priceText: isGroupMode ? `$${billed.toFixed(3)}` : `$${official.toFixed(3)}`,
      officialPriceText: isGroupMode ? `$${official.toFixed(3)}` : null,
      unitText: '/ 1M Tokens',
      unitKey: 'videoPricing.unitPer1MTokens',
      isStartingPrice: false,
      discountOff,
    }
  }

  if (name.includes('2.5') || name.includes('2-5')) {
    const billed = 5.544 * rate
    const official = 6.16 * rate
    return {
      priceText: isGroupMode ? `$${billed.toFixed(3)}` : `$${official.toFixed(3)}`,
      officialPriceText: isGroupMode ? `$${official.toFixed(3)}` : null,
      unitText: '/ 1M Tokens 起',
      unitKey: 'videoPricing.unitPer1MTokensFrom',
      isStartingPrice: true,
      discountOff,
    }
  }

  return {
    priceText: '$1.026',
    officialPriceText: null,
    unitText: '/ 1M Tokens 起',
    unitKey: 'videoPricing.unitPer1MTokensFrom',
    isStartingPrice: true,
    discountOff: null,
  }
}

export interface DurationVideoTier {
  resolution: string
  resLabel: string
  est5sPrice: number
  secondPrice: number
  officialEst5sPrice?: number
  officialSecondPrice?: number
}

export function parseDurationVideoTiers(
  expression: string | null | undefined,
  schema?: BillingUsageSchema | null
): DurationVideoTier[] {
  const defaultTiers: DurationVideoTier[] = [
    {
      resolution: '768p',
      resLabel: '768P',
      est5sPrice: 0.400,
      secondPrice: 0.080,
      officialEst5sPrice: 0.400,
      officialSecondPrice: 0.080,
    },
    {
      resolution: '2k',
      resLabel: '2K',
      est5sPrice: 0.650,
      secondPrice: 0.130,
      officialEst5sPrice: 0.650,
      officialSecondPrice: 0.130,
    },
  ]

  if (!expression || typeof expression !== 'string' || !expression.trim()) {
    return defaultTiers
  }

  let sec768: number | null = null
  let sec2k: number | null = null

  // 1. Structured AST parsing using parseTaskTiersFromExpr
  if (schema) {
    try {
      const parsedTiers = parseTaskTiersFromExpr(expression, schema)
      for (const tier of parsedTiers) {
        const sec = tier.unitPrices['seconds']
        if (typeof sec === 'number' && Number.isFinite(sec) && sec > 0) {
          const resCond = tier.conditions.find((c) => c.field === 'resolution')?.value?.toUpperCase()
          const label = (tier.label || '').toUpperCase()
          if (resCond === '768P' || label.includes('768')) {
            sec768 = sec
          } else if (resCond === '2K' || label.includes('2K')) {
            sec2k = sec
          }
        }
      }
      // Check fallback tier (no conditions) in ternary chain
      const fallbackTier = parsedTiers.find((t) => t.conditions.length === 0)
      if (fallbackTier) {
        const sec = fallbackTier.unitPrices['seconds']
        if (typeof sec === 'number' && Number.isFinite(sec) && sec > 0) {
          const label = (fallbackTier.label || '').toUpperCase()
          if (label.includes('2K') && sec2k === null) {
            sec2k = sec
          } else if (label.includes('768') && sec768 === null) {
            sec768 = sec
          }
        }
      }
    } catch {
      // Proceed to regex fallback
    }
  }

  // 2. Regex fallback for any expression variants (e.g. raw expressions, partial schema)
  if (sec768 === null) {
    const m768 =
      expression.match(/tier\s*\(\s*["'](?:768[Pp]|768)["']\s*,\s*(?:u\("seconds"\)\s*\*\s*)?([\d.]+)/) ||
      expression.match(/(?:768[Pp]|768)[\s\S]*?u\("seconds"\)\s*\*\s*([\d.]+)/) ||
      expression.match(/u\("seconds"\)\s*\*\s*([\d.]+)[\s\S]*?(?:768[Pp]|768)/)
    if (m768 && m768[1]) {
      const parsed = parseFloat(m768[1])
      if (Number.isFinite(parsed) && parsed > 0) sec768 = parsed
    }
  }

  if (sec2k === null) {
    const m2k =
      expression.match(/tier\s*\(\s*["'](?:2[Kk])["']\s*,\s*(?:u\("seconds"\)\s*\*\s*)?([\d.]+)/) ||
      expression.match(/(?:2[Kk])[\s\S]*?u\("seconds"\)\s*\*\s*([\d.]+)/) ||
      expression.match(/u\("seconds"\)\s*\*\s*([\d.]+)[\s\S]*?(?:2[Kk])/)
    if (m2k && m2k[1]) {
      const parsed = parseFloat(m2k[1])
      if (Number.isFinite(parsed) && parsed > 0) sec2k = parsed
    }
  }

  // If uniform tier (single tier for seconds):
  if (sec768 === null && sec2k === null) {
    const mUniform = expression.match(/u\("seconds"\)\s*\*\s*([\d.]+)/)
    if (mUniform && mUniform[1]) {
      const parsed = parseFloat(mUniform[1])
      if (Number.isFinite(parsed) && parsed > 0) {
        sec768 = parsed
        sec2k = parsed
      }
    }
  }

  const final768 = sec768 ?? 0.080
  const final2k = sec2k ?? (sec768 !== null ? sec768 * 1.6 : 0.130)

  return [
    {
      resolution: '768p',
      resLabel: '768P',
      est5sPrice: final768 * 5,
      secondPrice: final768,
      officialEst5sPrice: 0.400,
      officialSecondPrice: 0.080,
    },
    {
      resolution: '2k',
      resLabel: '2K',
      est5sPrice: final2k * 5,
      secondPrice: final2k,
      officialEst5sPrice: 0.650,
      officialSecondPrice: 0.130,
    },
  ]
}

export function getDurationVideoTiers(model: PricingModel): DurationVideoTier[] {
  return parseDurationVideoTiers(model.billing_expr, model.billing_usage_schema)
}

export function getVideoModelEstimateNote(_modelName: string): string {
  return ''
}



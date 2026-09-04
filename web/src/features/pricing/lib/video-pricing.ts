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
import { isByteDancePricingVendor } from '../constants'
import type { PricingModel } from '../types'
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

export function isByteDanceOrVideoModel(model: PricingModel): boolean {
  if (isByteDancePricingVendor(model.vendor_name)) return true
  const name = model.model_name.toLowerCase()
  if (name.startsWith('seedance') || name.includes('seedance')) return true
  if (name === 'grok-imagine-video') return true
  const schema = model.billing_usage_schema
  return Boolean(schema?.resolution || schema?.video_input)
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
  if (name.includes('upscale') || name.includes('chaofen')) {
    return ['720p', '1080p', '2k']
  }
  if (name.includes('4k')) {
    return ['4k']
  }
  if (name.includes('fast') || name.includes('mini')) {
    return ['480p', '720p']
  }
  if (name.includes('seedance2.5') || name.includes('seedance 2.5')) {
    return ['480p', '720p', '1080p']
  }
  if (name.includes('seedance 2.0') || name.includes('seedance2.0')) {
    return ['480p', '720p', '1080p']
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
  if (clean === '480p') {
    return {
      label: '480p',
      className: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    }
  }
  if (clean === '720p') {
    return {
      label: '720p',
      className: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300',
    }
  }
  if (clean === '1080p') {
    return {
      label: '1080p',
      className: 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold',
    }
  }
  if (clean === '2k') {
    return {
      label: '2K',
      className: 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300 font-semibold',
    }
  }
  if (clean === '4k') {
    return {
      label: '4K',
      className: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 font-bold',
    }
  }
  return {
    label: res.toUpperCase(),
    className: 'border-muted bg-muted/40 text-muted-foreground',
  }
}

export function getVideoModelCapabilityTag(modelName: string): { label: string; className: string } | null {
  const name = modelName.toLowerCase()
  if (name.includes('upscale') || name.includes('chaofen')) {
    return {
      label: 'Upscale Image Reconstruction',
      className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
    }
  }
  if (name.includes('4k')) {
    return {
      label: '4K 旗舰',
      className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
    }
  }
  if (name.includes('fast')) {
    return {
      label: '极速出片',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
    }
  }
  if (name.includes('mini')) {
    return {
      label: '轻量性价比',
      className: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800',
    }
  }
  if (name === 'seedance2.5' || name === 'seedance 2.5') {
    return {
      label: '全能旗舰主力',
      className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    }
  }
  if (name === 'seedance 2.0' || name === 'seedance2.0') {
    return {
      label: '经典主力',
      className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    }
  }
  return null
}

export function getModelSpecificDiscountPercent(modelName: string): number {
  const name = modelName.toLowerCase()
  if (name.includes('mini')) return 50
  if (name.includes('upscale') || name.includes('chaofen')) return 30
  if (name.includes('fast')) return 20
  if (name.includes('2.0') && !name.includes('2.5') && !name.includes('4k')) return 16
  if (name.includes('2.5')) return 10
  if (name.includes('4k')) return 10
  return 10
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
  if (name.includes('mini')) {
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
    } else if (modelName.includes('mini')) {
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

export function formatHumanFriendlyCondition(field: string, value: string): string {
  if (field === 'resolution') {
    const val = value.toLowerCase()
    if (val === '480p') return '分辨率: 480p'
    if (val === '720p') return '分辨率: 720p'
    if (val === '1080p') return '分辨率: 1080p'
    if (val === '2k') return '分辨率: 2K'
    if (val === '4k') return '分辨率: 4K'
    return `分辨率: ${value.toUpperCase()}`
  }
  if (field === 'video_input') {
    if (value === 'none') return '模式: 无视频输入'
    if (value === 'video') return '模式: 有视频输入'
    return `模式: ${value}`
  }
  return `${field}: ${value}`
}

export function formatHumanFriendlyTierLabel(label: string): string {
  const parts = label.split('·').map((s) => s.trim())
  if (parts.length === 2) {
    const [res, mode] = parts
    const resText = res.toUpperCase()
    const lowerMode = mode.toLowerCase()
    const modeText =
      lowerMode === 'video'
        ? '有视频输入'
        : lowerMode === 'none'
        ? '无视频输入'
        : mode
    return `${resText} · ${modeText}`
  }
  return label
}

export function getVideoModelTagline(modelName: string): string {
  const name = modelName.toLowerCase()
  if (name.includes('upscale') || name.includes('chaofen')) {
    return 'Intelligent restoration & Upscale · Dual-track billing: Video Tokens + per-second fee'
  }
  if (name.includes('4k')) {
    return '专为 4K 大屏与精细画面定制出片'
  }
  if (name.includes('fast')) {
    return '极速秒级出片 · 高并发灵感快速捕捉与渲染'
  }
  if (name.includes('mini')) {
    return '轻量经济高性价比 · 极低成本满足日常视频内容生产'
  }
  if (name.includes('seedance2.5') || name.includes('seedance 2.5')) {
    return '新一代多模态主力 · 支持 1080p 生成、运镜与首尾帧控制'
  }
  if (name.includes('seedance 2.0') || name.includes('seedance2.0')) {
    return '经典视频主力 · 稳定支持文生/图生视频与首尾帧控制'
  }
  return '专业 AI 视频生成模型'
}

export function getVideoModelHeroPrice(
  model: PricingModel,
  isGroupMode = true,
  rate = 1
): {
  priceText: string
  officialPriceText: string | null
  unitText: string
  isStartingPrice: boolean
  discountOff: number | null
} {
  const name = model.model_name.toLowerCase()
  const discountOff = isGroupMode ? getModelSpecificDiscountPercent(name) : null

  if (name.includes('upscale') || name.includes('chaofen')) {
    const billedSecond = 0.0091 * rate
    const officialSecond = 0.013 * rate
    return {
      priceText: isGroupMode ? `$${billedSecond.toFixed(4)}` : `$${officialSecond.toFixed(4)}`,
      officialPriceText: isGroupMode ? `$${officialSecond.toFixed(4)}` : null,
      unitText: '/ s (Upscale)',
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
      isStartingPrice: true,
      discountOff,
    }
  }

  if (name.includes('2.0') && !name.includes('2.5') && !name.includes('4k')) {
    const billed = 3.449 * rate
    const official = 4.106 * rate
    return {
      priceText: isGroupMode ? `$${billed.toFixed(3)}` : `$${official.toFixed(3)}`,
      officialPriceText: isGroupMode ? `$${official.toFixed(3)}` : null,
      unitText: '/ 1M Tokens 起',
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
      isStartingPrice: false,
      discountOff,
    }
  }

  if (name.includes('2.5')) {
    const billed = 5.544 * rate
    const official = 6.16 * rate
    return {
      priceText: isGroupMode ? `$${billed.toFixed(3)}` : `$${official.toFixed(3)}`,
      officialPriceText: isGroupMode ? `$${official.toFixed(3)}` : null,
      unitText: '/ 1M Tokens 起',
      isStartingPrice: true,
      discountOff,
    }
  }

  return {
    priceText: '$1.026',
    officialPriceText: null,
    unitText: '/ 1M Tokens 起',
    isStartingPrice: true,
    discountOff: null,
  }
}

export function getVideoModelEstimateNote(_modelName: string): string {
  return ''
}


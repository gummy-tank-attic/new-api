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
import { compileBillingExpression } from './billing-expression/parser'
import type { ExpressionNode } from './billing-expression/types'
import { stripTrailingZeros } from './price'
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
  if (name.startsWith('gpt-image') || name.startsWith('dall-e')) return true
  if (name.includes('grok-imagine-image')) return true
  if (typeof model !== 'string') {
    if (model.supported_endpoint_types?.includes('image-generation') && !name.includes('video')) return true
  }
  return false
}

export function isByteDanceOrVideoModel(model: PricingModel): boolean {
  if (isImageModel(model)) return false
  // 1. 动态能力优先：Schema 声明或端点类型或表达式中包含视频任务维度
  const schema = model.billing_usage_schema
  if (schema?.seconds && (schema?.resolution || schema?.input_images || schema?.input_video_seconds)) {
    return true
  }
  if (schema?.resolution || schema?.video_input) {
    return true
  }
  if (model.supported_endpoint_types?.some((t) => t.includes('video') || t.includes('task'))) {
    return true
  }
  if (
    model.billing_expr &&
    (model.billing_expr.includes('duration') || model.billing_expr.includes('seconds')) &&
    !model.billing_expr.includes('prompt_tokens')
  ) {
    return true
  }

  // 2. 业务家族兜底（保留现有产品家族策略）
  const name = model.model_name.toLowerCase()
  if (name.startsWith('seedance') || name.includes('seedance')) return true
  if (name.includes('grok-imagine-video')) return true
  if (name.includes('minimax-h3') || name.includes('hailuo') || (name.includes('minimax') && name.includes('h3'))) return true
  if (isByteDancePricingVendor(model.vendor_name) && !name.includes('doubao-') && !name.includes('seedream')) {
    return true
  }
  return false
}

export function isDurationBasedVideoModel(model: PricingModel | string): boolean {
  // 1. 动态能力优先
  if (typeof model !== 'string') {
    const schema = model.billing_usage_schema
    if (schema?.seconds && !schema?.tokens) return true
    if (
      model.billing_expr &&
      (model.billing_expr.includes('duration') || model.billing_expr.includes('seconds')) &&
      !model.billing_expr.includes('tokens')
    ) {
      return true
    }
  }

  // 2. 业务家族兜底
  const name = (typeof model === 'string' ? model : model.model_name).toLowerCase()
  if (name.includes('minimax-h3') || name.includes('h3') || name.includes('hailuo')) return true
  if (name.includes('grok-imagine-video')) return true
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
 * 动态自适应优先（Schema 与 表达式 AST 自发现），业务字典保底。
 */
export function getModelSupportedResolutions(model: PricingModel): string[] {
  const name = model.model_name.toLowerCase().trim()

  // 1. 官方权威模型规格约束（优先级高于共享插件通配 Schema 枚举）
  if (name.includes('minimax-h3') || (name.includes('minimax') && name.includes('h3')) || name === 'h3') {
    return ['768P', '2K']
  }
  if (name.startsWith('gpt-image') || name.includes('gpt-image')) {
    // 官方 OpenAI 图像支持任意自定义尺寸至 4K，以单一规格胶囊呈现，避免小白用户误以为仅支持固定三档
    return ['custom_4k']
  }
  if (name.startsWith('dall-e-3') || name.includes('dall-e-3')) {
    return ['1024×1024', '1792×1024', '1024×1792']
  }
  if (name.startsWith('dall-e-2') || name.includes('dall-e-2')) {
    return ['1024×1024', '512×512', '256×256']
  }
  if (name.includes('seedream')) {
    return ['1k', '2k']
  }

  // 2. 动态时长/任务阶梯自适应：从已解析的时长阶梯中提取真实计费分辨率
  if (isDurationBasedVideoModel(model)) {
    const durationTiers = getDurationVideoTiers(model)
    if (durationTiers.length > 0) {
      return durationTiers.map((t) => t.resLabel)
    }
  }

  // 3. 动态自适应优先：直接从 billing_expr 中自发现 tier("480p", ...) 标签
  const expr = model.billing_expr || ''
  if (expr.includes('tier(')) {
    const tierMatches = [...expr.matchAll(/tier\s*\(\s*["']([^"']+)["']/g)].map((m) => m[1])
    // 过滤掉非分辨率维度的计费分级/服务等级（如 standard, long_context, default, base 等）
    const resolutionTiers = tierMatches.filter(
      (t) => !['standard', 'long_context', 'default', 'base'].includes(t.toLowerCase())
    )
    if (resolutionTiers.length > 0) {
      return [...new Set(resolutionTiers)]
    }
  }

  // 4. Schema 枚举自适应
  const schemaRes = model.billing_usage_schema?.resolution?.enum
  if (Array.isArray(schemaRes) && schemaRes.length > 0) {
    return schemaRes
  }

  // 5. 业务家族兜底（对齐官方权威规格）
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
    name.includes('seedance 1.0') ||
    name.includes('seedance1.0') ||
    name.includes('seedance-1.0') ||
    name.includes('seedance-1-0')
  ) {
    return ['480p', '720p']
  }
  if (name.includes('seedance')) {
    return ['480p', '720p', '1080p']
  }
  if (name.includes('grok-imagine-video')) {
    return ['480p', '720p']
  }
  return []
}

export function getResolutionBadgeStyle(res: string): { label: string; className: string } {
  const clean = res.trim().toLowerCase()
  const neutralClass =
    'border-[#E2E8F0] bg-[#F1F5F9] text-[#334155] dark:border-border dark:bg-muted dark:text-foreground font-semibold'

  if (clean === 'custom_4k' || clean === 'custom' || clean.includes('自定义')) {
    return {
      label: '自定义至 4K',
      className:
        'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300 font-semibold',
    }
  }
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
  if (clean.includes('x') || clean.includes('×')) {
    return { label: clean.replace(/x/g, '×'), className: neutralClass }
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
        label: '宽松审查',
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
  if (name.includes('grok-imagine-video')) {
    return {
      key: 'videoPricing.badge.grokVideo',
      label: 'xAI 视频生成',
      className:
        'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
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
  if (name.includes('gpt-image-2.5-sunburst') || name.includes('sunburst')) {
    return {
      key: 'imagePricing.badge.sunburst',
      label: '全能旗舰主力',
      className:
        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    }
  }
  if (name.includes('gpt-image-2.5-flare') || name.includes('flare')) {
    return {
      key: 'imagePricing.badge.flare',
      label: '极速出片',
      className:
        'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
    }
  }
  if (name.includes('gpt-image-2') || name.startsWith('gpt-image')) {
    return {
      key: 'imagePricing.badge.gptImageClassic',
      label: '经典主力',
      className:
        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
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
  if (name.includes('2.5') && !name.startsWith('gpt-image')) return 10
  if (name.includes('4k')) return 10
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
    let res = '720p'
    let name = '720p'
    if (rawKey === '2k') {
      res = '2k'
      name = '2K'
    } else if (rawKey === '1080p') {
      res = '1080p'
      name = '1080p'
    }
    const discountPercent = getModelSpecificDiscountPercent('seedance-2.5-upscale') || 30
    const discountMultiplier = 1 - discountPercent / 100
    const officialToken =
      discountMultiplier > 0
        ? Number((tokenPrice / discountMultiplier).toFixed(6))
        : tokenPrice
    const officialSec =
      discountMultiplier > 0
        ? Number((secondPrice / discountMultiplier).toFixed(4))
        : secondPrice
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
    return model.billing_expr?.trim()
      ? []
      : getDefaultVideoModelTierGroups(model.model_name)
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
    const entry = mapByRes.get(res) ?? { none: 0, video: 0 }
    mapByRes.set(res, entry)
    if (inputMode === 'video') entry.video = price
    else entry.none = price
  }

  const distinctTiers = new Map<string, { resList: string[]; none: number; video: number }>()
  for (const [res, prices] of mapByRes.entries()) {
    const key = `${prices.none.toFixed(4)}_${prices.video.toFixed(4)}`
    if (!distinctTiers.has(key)) {
      distinctTiers.set(key, { resList: [], none: prices.none, video: prices.video })
    }
    const group = distinctTiers.get(key)
    if (group) group.resList.push(res)
  }

  const hasValidDynamicPrice = [...distinctTiers.values()].some(
    (item) => item.none > 0
  )
  if (!hasValidDynamicPrice) {
    return model.billing_expr?.trim()
      ? []
      : getDefaultVideoModelTierGroups(model.model_name)
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

    if (item.resList.includes('480p') && item.resList.includes('720p')) {
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

    const discountPercent = getModelSpecificDiscountPercent(modelName)
    if (modelName.includes('fast') || modelName.includes('mini')) {
      // Expressions define billed prices
      billedNone = item.none
      billedVideo = item.video > 0 ? item.video : item.none
      officialNone = discountPercent > 0 ? Number((item.none / (1 - discountPercent / 100)).toFixed(4)) : item.none
      officialVideo = discountPercent > 0 ? Number((billedVideo / (1 - discountPercent / 100)).toFixed(4)) : billedVideo
    } else {
      // Expressions define official base prices (e.g. 2.5, 2.0, 4k)
      officialNone = item.none
      officialVideo = item.video > 0 ? item.video : item.none
      billedNone = discountPercent > 0 ? Number((item.none * (1 - discountPercent / 100)).toFixed(6)) : item.none
      billedVideo = discountPercent > 0 ? Number((officialVideo * (1 - discountPercent / 100)).toFixed(6)) : officialVideo
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
    return model.billing_expr?.trim()
      ? []
      : getDefaultVideoModelTierGroups(model.model_name)
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
    let modeText = mode
    if (lowerMode === 'video') {
      modeText = translate('With Video Input', '有视频输入')
    } else if (lowerMode === 'none') {
      modeText = translate('Without Video Input', '无视频输入')
    }
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
        defaultText: '宽松审查限制',
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
        defaultText: '真人免审 · 创作尺度更宽松',
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
        defaultText: '真人免审 · 创作尺度更宽松',
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
  if (name.includes('gpt-image-2.5-sunburst') || name.includes('sunburst')) {
    return {
      key: 'imagePricing.tagline.sunburst',
      defaultText: '新一代旗舰图像创作 · 卓越光影质感与复杂场景高精呈现',
    }
  }
  if (name.includes('gpt-image-2.5-flare') || name.includes('flare')) {
    return {
      key: 'imagePricing.tagline.flare',
      defaultText: '极速秒级生图出片 · 高并发灵感快速捕捉与敏捷渲染',
    }
  }
  if (name.includes('gpt-image-2') || name.startsWith('gpt-image')) {
    return {
      key: 'imagePricing.tagline.gptImageClassic',
      defaultText: '经典多模态生图主力 · 原生指令理解与稳定图文创作',
    }
  }
  if (name.startsWith('dall-e') || isImageModel(name)) {
    return {
      key: 'imagePricing.tagline.default',
      defaultText: '专业 AI 图像生成与创作模型',
    }
  }
  return {
    key: 'videoPricing.tagline.default',
    defaultText: '专业 AI 视频生成模型',
  }
}

export interface ImageResolutionPrice {
  priceText: string
  officialPriceText: string | null
  price: number
  officialPrice: number | null
  imgToImgPriceText?: string
  officialImgToImgPriceText?: string | null
}

export interface VideoModelHeroPriceResult {
  priceText: string
  officialPriceText: string | null
  unitText: string
  unitKey: string
  isStartingPrice: boolean
  discountOff: number | null
  isPerImage?: boolean
  resolutionPrices?: Record<string, ImageResolutionPrice>
}

export function parseImageModelPricing(
  model: PricingModel,
  isGroupMode = true,
  rate = 1
): VideoModelHeroPriceResult {
  const name = model.model_name.toLowerCase()
  const expr = (model.billing_expr || '').trim()

  const fixedMatch = expr.match(/fixed\(\s*["']?([\d.]+)["']?\s*\)/i)
  const tier1kMatch = expr.match(/tier\(\s*["'](?:1k|image|default)["']\s*,\s*fixed\(\s*["']?([\d.]+)["']?\s*\)\s*\)/i)
  const tier2kMatch = expr.match(/tier\(\s*["']2k["']\s*,\s*fixed\(\s*["']?([\d.]+)["']?\s*\)\s*\)/i)
  const isPerImageExpr = Boolean(fixedMatch || tier1kMatch || expr.includes('fixed('))

  const tokenMatch = expr.match(/u\("tokens"\)\s*\*\s*([\d.]+)\s*\/\s*1000000/)

  let officialBase1k = 0.045
  let officialBase2k = 0.090
  if (!name.includes('seedream')) {
    officialBase1k = 0.040
    officialBase2k = 0.080
  }

  const formatImgPrice = (v: number) => stripTrailingZeros(`$${v.toFixed(5)}`)

  if (isPerImageExpr || (model.quota_type === 1 && !tokenMatch)) {
    let basePrice = 0.02925
    if (tier1kMatch) {
      basePrice = Number(tier1kMatch[1])
    } else if (fixedMatch) {
      basePrice = Number(fixedMatch[1])
    } else if (typeof model.model_price === 'number' && model.model_price > 0) {
      basePrice = model.model_price
    }

    const actual1k = basePrice * rate
    let actual2k = actual1k * 2
    if (tier2kMatch) {
      actual2k = Number(tier2kMatch[1]) * rate
    } else {
      const multMatch = expr.match(/\?\s*([\d.]+)\s*:\s*1(?:\.0*)?(?:\b|\s|\))/i)
      if (multMatch) {
        const mult = Number(multMatch[1])
        if (!Number.isNaN(mult) && mult > 0) {
          actual2k = actual1k * mult
        }
      }
    }

    const official1k = officialBase1k * rate
    const official2k = officialBase2k * rate

    let discountOff: number | null = null
    if (isGroupMode) {
      const manualOff = lookupModelSavingsOff(model.model_name)
      if (manualOff != null) {
        discountOff = manualOff
      } else if (official1k > 0 && actual1k < official1k) {
        const computed = Math.round((1 - actual1k / official1k) * 100)
        if (computed > 0) {
          discountOff = computed
        }
      }
    }

    const display1k = isGroupMode ? actual1k : official1k
    const display2k = isGroupMode ? actual2k : official2k
    const displayOfficial1k = isGroupMode && discountOff != null ? official1k : null
    const displayOfficial2k = isGroupMode && discountOff != null ? official2k : null

    return {
      priceText: formatImgPrice(display1k),
      officialPriceText: displayOfficial1k != null ? formatImgPrice(displayOfficial1k) : null,
      unitText: '/ 张 起',
      unitKey: 'imagePricing.unitPerImageFrom',
      isStartingPrice: true,
      discountOff,
      isPerImage: true,
      resolutionPrices: {
        '1k': {
          priceText: formatImgPrice(display1k),
          officialPriceText: displayOfficial1k != null ? formatImgPrice(displayOfficial1k) : null,
          price: display1k,
          officialPrice: displayOfficial1k,
        },
        '2k': {
          priceText: formatImgPrice(display2k),
          officialPriceText: displayOfficial2k != null ? formatImgPrice(displayOfficial2k) : null,
          price: display2k,
          officialPrice: displayOfficial2k,
        },
      },
    }
  }

  const pMatch = expr.match(/\bp\s*\*\s*([\d.]+)/i)
  const cMatch = expr.match(/\bc\s*\*\s*([\d.]+)/i)
  const imgMatch = expr.match(/\bimg\s*\*\s*([\d.]+)/i)

  if (cMatch || pMatch) {
    const rawOutput = cMatch ? Number(cMatch[1]) : 30
    const rawInput = pMatch ? Number(pMatch[1]) : 5
    const rawImg = imgMatch ? Number(imgMatch[1]) : 8

    const billedInput = rawInput * rate
    const billedOutput = rawOutput * rate
    const billedImgToImg = (rawImg + rawOutput) * rate

    const officialInput = rawInput
    const officialOutput = rawOutput
    const officialImgToImg = rawImg + rawOutput

    const manualOff = isGroupMode
      ? (lookupModelSavingsOff(model.model_name) ?? null)
      : null

    const formatRate = (v: number) => `$${stripTrailingZeros(v.toFixed(3))}`

    const displayInput = isGroupMode ? billedInput : officialInput
    const displayOfficialInput = isGroupMode && rate !== 1 ? officialInput : null

    const displayOutput = isGroupMode ? billedOutput : officialOutput
    const displayOfficialOutput = isGroupMode && rate !== 1 ? officialOutput : null

    const displayImgToImg = isGroupMode ? billedImgToImg : officialImgToImg
    const displayOfficialImgToImg = isGroupMode && rate !== 1 ? officialImgToImg : null

    const standardPriceObj: ImageResolutionPrice = {
      priceText: formatRate(displayOutput),
      officialPriceText: displayOfficialOutput != null ? formatRate(displayOfficialOutput) : null,
      price: displayOutput,
      officialPrice: displayOfficialOutput,
      imgToImgPriceText: formatRate(displayImgToImg),
      officialImgToImgPriceText: displayOfficialImgToImg != null ? formatRate(displayOfficialImgToImg) : null,
    }

    return {
      priceText: formatRate(displayInput),
      officialPriceText: displayOfficialInput != null ? formatRate(displayOfficialInput) : null,
      unitText: '/ 1M Tokens 起',
      unitKey: 'videoPricing.unitPer1MTokensFrom',
      isStartingPrice: true,
      discountOff: manualOff,
      isPerImage: false,
      resolutionPrices: {
        standard: standardPriceObj,
        '1k': standardPriceObj,
        '2k': {
          priceText: formatRate(displayImgToImg),
          officialPriceText: displayOfficialImgToImg != null ? formatRate(displayOfficialImgToImg) : null,
          price: displayImgToImg,
          officialPrice: displayOfficialImgToImg,
          imgToImgPriceText: formatRate(displayImgToImg),
          officialImgToImgPriceText: displayOfficialImgToImg != null ? formatRate(displayOfficialImgToImg) : null,
        },
        '1024×1024': standardPriceObj,
        '1024x1024': standardPriceObj,
        '1536×1024': standardPriceObj,
        '1536x1024': standardPriceObj,
        '1024×1536': standardPriceObj,
        '1024x1536': standardPriceObj,
        '1792×1024': standardPriceObj,
        '1792x1024': standardPriceObj,
        '1024×1792': standardPriceObj,
        '1024x1792': standardPriceObj,
        '512×512': standardPriceObj,
        '512x512': standardPriceObj,
        '256×256': standardPriceObj,
        '256x256': standardPriceObj,
        custom_4k: standardPriceObj,
        '自定义至 4k': standardPriceObj,
      },
    }
  }

  let unitPrice = 1.026 * rate
  if (tokenMatch) {
    unitPrice = Number(tokenMatch[1]) * rate
  }
  const manualOff = isGroupMode
    ? (lookupModelSavingsOff(model.model_name) ?? (getModelSpecificDiscountPercent(name) || null))
    : null
  const officialUnitPrice = manualOff ? unitPrice / (1 - manualOff / 100) : 1.140 * rate
  const displayToken = isGroupMode ? unitPrice : officialUnitPrice
  const displayOfficialToken = isGroupMode && manualOff != null ? officialUnitPrice : null
  const tokenPriceFormatted = `$${displayToken.toFixed(3)}`
  const tokenOfficialFormatted = displayOfficialToken != null ? `$${displayOfficialToken.toFixed(3)}` : null

  return {
    priceText: tokenPriceFormatted,
    officialPriceText: tokenOfficialFormatted,
    unitText: '/ 1M Tokens 起',
    unitKey: 'videoPricing.unitPer1MTokensFrom',
    isStartingPrice: true,
    discountOff: manualOff,
    isPerImage: false,
    resolutionPrices: {
      '1k': {
        priceText: tokenPriceFormatted,
        officialPriceText: tokenOfficialFormatted,
        price: displayToken,
        officialPrice: displayOfficialToken,
      },
      '2k': {
        priceText: tokenPriceFormatted,
        officialPriceText: tokenOfficialFormatted,
        price: displayToken,
        officialPrice: displayOfficialToken,
      },
    },
  }
}

export function getVideoModelHeroPrice(
  model: PricingModel,
  isGroupMode = true,
  rate = 1
): VideoModelHeroPriceResult {
  if (isImageModel(model)) {
    return parseImageModelPricing(model, isGroupMode, rate)
  }

  const name = model.model_name.toLowerCase()
  const discountOff = isGroupMode
    ? (lookupModelSavingsOff(model.model_name) ?? (getModelSpecificDiscountPercent(name) || null))
    : null

  if (name.includes('minimax-h3') || name.includes('h3') || name.includes('hailuo') || isDurationBasedVideoModel(model)) {
    const durationTiers = getDurationVideoTiers(model)
    if (durationTiers.length === 0 && model.billing_expr?.trim()) {
      return {
        priceText: '-',
        officialPriceText: null,
        unitText: '',
        unitKey: 'Unable to parse structured pricing',
        isStartingPrice: false,
        discountOff: null,
      }
    }
    const minTier = durationTiers.reduce<DurationVideoTier | null>(
      (current, tier) =>
        current === null || tier.est5sPrice < current.est5sPrice ? tier : current,
      null
    )
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
    let billedSec = 0.0091
    let officialSec = 0.013
    if (model.billing_expr) {
      const m = model.billing_expr.match(/u\("seconds"\)\s*\*\s*([\d.]+)/)
      if (m && m[1]) {
        const val = Number.parseFloat(m[1])
        if (Number.isFinite(val) && val > 0) {
          billedSec = val
          officialSec = discountOff ? val / (1 - discountOff / 100) : val / 0.7
        }
      }
    }
    const billedSecond = billedSec * rate
    const officialSecond = officialSec * rate
    return {
      priceText: isGroupMode ? `$${billedSecond.toFixed(4)}` : `$${officialSecond.toFixed(4)}`,
      officialPriceText: isGroupMode ? `$${officialSecond.toFixed(4)}` : null,
      unitText: '/ s (Upscale)',
      unitKey: 'videoPricing.unitPerSecUpscale',
      isStartingPrice: true,
      discountOff,
    }
  }

  // Dynamic extraction from matrix tier groups if configured in backend billing_expr / schema
  const matrixTiers = getTaskMatrixDisplayTiers(model.billing_expr, model.billing_usage_schema)
  if (matrixTiers && matrixTiers.length > 0) {
    const groups = getVideoModelTierGroups(model)
    if (groups.length > 0) {
      const validBilled = groups.flatMap((g) =>
        [g.withVideoPrice, g.withoutVideoPrice].filter(
          (p): p is number => typeof p === 'number' && p > 0
        )
      )
      const validOfficial = groups.flatMap((g) =>
        [g.officialWithVideoPrice, g.officialWithoutVideoPrice].filter(
          (p): p is number => typeof p === 'number' && p > 0
        )
      )
      if (validBilled.length > 0) {
        const minBilled = Math.min(...validBilled) * rate
        let minOfficial: number | null = null
        if (validOfficial.length > 0) {
          minOfficial = Math.min(...validOfficial) * rate
        } else if (discountOff != null && discountOff < 100) {
          minOfficial = minBilled / (1 - discountOff / 100)
        }
        let effectiveDiscount = discountOff
        if (effectiveDiscount == null && minOfficial && minOfficial > minBilled) {
          const computed = Math.round((1 - minBilled / minOfficial) * 100)
          if (computed > 0) {
            effectiveDiscount = computed
          }
        }
        const is4k = name.includes('4k')
        let dynamicPriceText = `$${minBilled.toFixed(3)}`
        if (!isGroupMode && minOfficial) {
          dynamicPriceText = `$${minOfficial.toFixed(3)}`
        }
        return {
          priceText: dynamicPriceText,
          officialPriceText: isGroupMode && minOfficial ? `$${minOfficial.toFixed(3)}` : null,
          unitText: is4k ? '/ 1M Tokens' : '/ 1M Tokens 起',
          unitKey: is4k ? 'videoPricing.unitPer1MTokens' : 'videoPricing.unitPer1MTokensFrom',
          isStartingPrice: !is4k,
          discountOff: effectiveDiscount,
        }
      }
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

function containsDurationParam(node: ExpressionNode): boolean {
  if (node.kind === 'call') {
    return (
      (node.name === 'param' &&
        node.args[0]?.kind === 'literal' &&
        node.args[0].value === 'duration') ||
      node.args.some(containsDurationParam)
    )
  }
  if (node.kind === 'binary') {
    return containsDurationParam(node.left) || containsDurationParam(node.right)
  }
  if (node.kind === 'conditional') {
    return (
      containsDurationParam(node.condition) ||
      containsDurationParam(node.yes) ||
      containsDurationParam(node.no)
    )
  }
  if (node.kind === 'unary') return containsDurationParam(node.operand)
  return false
}

function numericLiteral(node: ExpressionNode): number | null {
  return node.kind === 'literal' && typeof node.value === 'number' && Number.isFinite(node.value)
    ? node.value
    : null
}

/** Extract the coefficient of param("duration") from a compiled official AST. */
function findDurationCoefficient(node: ExpressionNode): number | null {
  if (node.kind === 'binary' && node.operator === '*') {
    const left = numericLiteral(node.left)
    const right = numericLiteral(node.right)
    if (left !== null && containsDurationParam(node.right)) return left
    if (right !== null && containsDurationParam(node.left)) return right
    return findDurationCoefficient(node.left) ?? findDurationCoefficient(node.right)
  }
  if (node.kind === 'binary') {
    return findDurationCoefficient(node.left) ?? findDurationCoefficient(node.right)
  }
  if (node.kind === 'conditional') {
    return (
      findDurationCoefficient(node.yes) ??
      findDurationCoefficient(node.no) ??
      findDurationCoefficient(node.condition)
    )
  }
  if (node.kind === 'call') {
    for (const arg of node.args) {
      const coefficient = findDurationCoefficient(arg)
      if (coefficient !== null) return coefficient
    }
  }
  if (node.kind === 'unary') return findDurationCoefficient(node.operand)
  return null
}

function collectDurationTierNodes(node: ExpressionNode): ExpressionNode[] {
  if (node.kind === 'conditional') {
    return [
      ...collectDurationTierNodes(node.yes),
      ...collectDurationTierNodes(node.no),
    ]
  }
  if (node.kind === 'call' && node.name === 'tier') return [node]
  if (node.kind === 'binary') {
    return [
      ...collectDurationTierNodes(node.left),
      ...collectDurationTierNodes(node.right),
    ]
  }
  return []
}

function parseParamDurationTiers(expression: string): DurationVideoTier[] {
  const compiled = compileBillingExpression(expression)
  if (compiled.status !== 'ready') return []

  const tiers: DurationVideoTier[] = []
  for (const node of collectDurationTierNodes(compiled.ast)) {
    if (node.kind !== 'call' || node.args[0]?.kind !== 'literal') continue
    const label = node.args[0].value
    if (typeof label !== 'string' || node.args.length < 2) continue
    const coefficient = findDurationCoefficient(node.args[1])
    if (coefficient === null || coefficient <= 0) continue
    // Task expressions are settled in quota units; convert the AST
    // coefficient to the USD-per-second display unit used by this card.
    const secondPrice = coefficient / 1_000_000
    const resolution = label.trim().toLowerCase()
    tiers.push({
      resolution,
      resLabel: label.toUpperCase(),
      est5sPrice: secondPrice * 5,
      secondPrice,
      officialEst5sPrice: secondPrice * 5,
      officialSecondPrice: secondPrice,
    })
  }
  return tiers
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
  let sec480: number | null = null
  let sec720: number | null = null
  const dynamicTiers: DurationVideoTier[] = []

  // The shared parser requires a usage schema to validate fields and enum
  // conditions. Do not invent default prices for a non-empty expression that
  // cannot be validated against that schema.
  if (!schema) return parseParamDurationTiers(expression)

  // 1. 结构化官方原生 AST 解析（直接消费官方引擎结果）
  try {
    const parsedTiers = parseTaskTiersFromExpr(expression, schema)
    if (parsedTiers.length === 0) return parseParamDurationTiers(expression)
    let hasValidSecondPrice = false
    for (const tier of parsedTiers) {
      const sec = tier.unitPrices['seconds'] ?? tier.unitPrices['duration']
      if (typeof sec !== 'number' || !Number.isFinite(sec) || sec <= 0) continue
      hasValidSecondPrice = true

      const rawRes =
        tier.conditions.find((c) => c.field === 'resolution' || c.field === 'size')?.value ||
        tier.label ||
        ''
      const upper = rawRes.toUpperCase()
      if (upper === '768P' || upper.includes('768')) sec768 = sec
      else if (upper === '2K' || upper.includes('2K')) sec2k = sec
      else if (upper === '480P' || upper.includes('480')) sec480 = sec
      else if (upper === '720P' || upper.includes('720')) sec720 = sec
      else if (rawRes) {
        // Preserve valid AST tiers whose resolution is outside the built-in
        // presentation presets instead of replacing them with guessed prices.
        dynamicTiers.push({
          resolution: rawRes.toLowerCase(),
          resLabel: upper,
          est5sPrice: sec * 5,
          secondPrice: sec,
          officialEst5sPrice: sec * 5,
          officialSecondPrice: sec,
        })
      }
    }
    if (!hasValidSecondPrice) return []
    if (
      dynamicTiers.length > 0 &&
      sec480 === null &&
      sec720 === null &&
      sec768 === null &&
      sec2k === null
    ) {
      return dynamicTiers
    }

    // 容错兜底三元分支中无条件的末尾项（如 ... : tier("2K", ...)）
    const fallbackTier = parsedTiers.find((t) => t.conditions.length === 0)
    if (fallbackTier) {
      const sec = fallbackTier.unitPrices['seconds'] ?? fallbackTier.unitPrices['duration']
      if (typeof sec === 'number' && Number.isFinite(sec) && sec > 0) {
        const label = (fallbackTier.label || '').toUpperCase()
        if (label.includes('2K') && sec2k === null) sec2k = sec
        else if (label.includes('768') && sec768 === null) sec768 = sec
        else if (label.includes('480') && sec480 === null) sec480 = sec
        else if (label.includes('720') && sec720 === null) sec720 = sec
      }
    }
  } catch {
    return []
  }

  const resolvedTiers: DurationVideoTier[] = []
  const appendTier = (
    resolution: string,
    secondPrice: number | null,
    officialSecondPrice: number
  ) => {
    if (secondPrice === null) return
    resolvedTiers.push({
      resolution,
      resLabel: resolution.toUpperCase(),
      est5sPrice: secondPrice * 5,
      secondPrice,
      officialEst5sPrice: officialSecondPrice * 5,
      officialSecondPrice,
    })
  }

  // Keep the established presentation families, but only emit resolutions
  // that the AST actually provided. Missing tiers remain absent.
  if (sec768 !== null || sec2k !== null) {
    appendTier('768p', sec768, 0.080)
    appendTier('2k', sec2k, 0.130)
    return resolvedTiers
  }
  if (sec480 !== null || sec720 !== null) {
    appendTier('480p', sec480, 0.050)
    appendTier('720p', sec720, 0.070)
    return resolvedTiers
  }
  return dynamicTiers
}

export function getDurationVideoTiers(model: PricingModel): DurationVideoTier[] {
  return parseDurationVideoTiers(model.billing_expr, model.billing_usage_schema)
}

export function getVideoModelEstimateNote(_modelName: string): string {
  return ''
}

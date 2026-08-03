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
import { type TFunction } from 'i18next'

import type { TokenUnit } from './types'

// ----------------------------------------------------------------------------
// Pricing Constants
// ----------------------------------------------------------------------------

/** Sort options for pricing models */
export const SORT_OPTIONS = {
  NAME: 'name',
  PRICE_LOW: 'price-low',
  PRICE_HIGH: 'price-high',
} as const

export type SortOption = (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS]

export function getSortLabels(t: TFunction): Record<SortOption, string> {
  return {
    [SORT_OPTIONS.NAME]: t('Name'),
    [SORT_OPTIONS.PRICE_LOW]: t('Price: Low to High'),
    [SORT_OPTIONS.PRICE_HIGH]: t('Price: High to Low'),
  }
}

/** Filter values */
export const FILTER_ALL = 'all'

/** Quota type options */
export const QUOTA_TYPES = {
  ALL: 'all',
  TOKEN: 'token',
  REQUEST: 'request',
} as const

export type QuotaTypeOption = (typeof QUOTA_TYPES)[keyof typeof QUOTA_TYPES]

/** Quota type labels */
export function getQuotaTypeLabels(
  t: TFunction
): Record<QuotaTypeOption, string> {
  return {
    [QUOTA_TYPES.ALL]: t('All Models'),
    [QUOTA_TYPES.TOKEN]: t('Token-based'),
    [QUOTA_TYPES.REQUEST]: t('Per Request'),
  }
}

/** Endpoint type options */
export const ENDPOINT_TYPES = {
  ALL: 'all',
  OPENAI: 'openai',
  OPENAI_RESPONSE: 'openai-response',
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini',
  JINA_RERANK: 'jina-rerank',
  IMAGE_GENERATION: 'image-generation',
  EMBEDDINGS: 'embeddings',
  OPENAI_VIDEO: 'openai-video',
} as const

export type EndpointTypeOption =
  (typeof ENDPOINT_TYPES)[keyof typeof ENDPOINT_TYPES]

/** Endpoint type labels */
export function getEndpointTypeLabels(
  t: TFunction
): Record<EndpointTypeOption, string> {
  return {
    [ENDPOINT_TYPES.ALL]: t('All Types'),
    [ENDPOINT_TYPES.OPENAI]: 'Chat',
    [ENDPOINT_TYPES.OPENAI_RESPONSE]: 'Response',
    [ENDPOINT_TYPES.ANTHROPIC]: 'Anthropic',
    [ENDPOINT_TYPES.GEMINI]: 'Gemini',
    [ENDPOINT_TYPES.JINA_RERANK]: 'Rerank',
    [ENDPOINT_TYPES.IMAGE_GENERATION]: t('Image'),
    [ENDPOINT_TYPES.EMBEDDINGS]: t('Embeddings'),
    [ENDPOINT_TYPES.OPENAI_VIDEO]: t('Video'),
  }
}

/** Filter section keys */
export const FILTER_SECTIONS = {
  PRICING_TYPE: 'pricingType',
  ENDPOINT_TYPE: 'endpointType',
  VENDOR: 'vendor',
  GROUP: 'group',
  TAG: 'tag',
} as const

/** Maximum number of tags to display in model row */
export const MAX_TAGS_DISPLAY = 5

/** Maximum number of filter items to display before showing "More..." */
export const MAX_FILTER_ITEMS = 5

/** Sidebar width */
export const SIDEBAR_WIDTH = 'w-64'

/** Excluded groups */
export const EXCLUDED_GROUPS = ['', 'auto']

/**
 * Preferred vendor tab order on the pricing page (product convention).
 * Always use this order — do not sort by API order, name, or model count.
 * Doc: docs/PRICING_PAGE_DESIGN.md §2.3
 * Names are matched case-insensitively; aliases resolve to the same slot.
 * Vendors not listed appear after these, sorted by name.
 * When changing order or adding vendors: update this array AND the design doc.
 */
export const VENDOR_TAB_ORDER = [
  'Anthropic',
  'OpenAI',
  'xAI',
  'DeepSeek',
  'ZHIPU',
] as const

/** Aliases → canonical key used in VENDOR_TAB_ORDER matching */
export const VENDOR_NAME_ALIASES: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  xai: 'xAI',
  deepseek: 'DeepSeek',
  zhipu: 'ZHIPU',
  'zhipu ai': 'ZHIPU',
  智谱: 'ZHIPU',
  智谱ai: 'ZHIPU',
}

/** Rank for vendor tabs / table sort (lower first). Unknown vendors share the last bucket. */
export function getVendorTabRank(name: string): number {
  const trimmed = (name || '').trim()
  if (!trimmed) return VENDOR_TAB_ORDER.length
  const lower = trimmed.toLowerCase()
  const compact = lower.replace(/\s+/g, '')
  const key =
    VENDOR_NAME_ALIASES[lower] ||
    VENDOR_NAME_ALIASES[compact] ||
    (compact === '智谱' || compact === '智谱ai' ? 'ZHIPU' : trimmed)
  const idx = VENDOR_TAB_ORDER.findIndex(
    (v) => v.toLowerCase() === key.toLowerCase()
  )
  return idx === -1 ? VENDOR_TAB_ORDER.length : idx
}

/**
 * Preferred model row order on the pricing table (product convention).
 * Matched against model_name (case-insensitive). Listed models appear first
 * in this order within their vendor; unlisted models follow with natural sort.
 * Doc: docs/PRICING_PAGE_DESIGN.md §2.4
 * When changing order or adding models: update this array AND the design doc.
 *
 * Note: cross-vendor order still follows VENDOR_TAB_ORDER; this list only
 * controls relative order among models that share the same vendor filter.
 */
export const MODEL_DISPLAY_ORDER = [
  // Anthropic（自上而下）
  'claude-fable-5',
  'claude-opus-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-opus-4-5-20251101',
  'claude-sonnet-5',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  // OpenAI（自上而下）
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.3-codex-spark',
  'gpt-image-2',
  // xAI / Grok（自上而下：主推 → 系列 → 工具/生图视频）
  'grok-4.5',
  'grok-4.3',
  'grok-4.20-multi-agent-0309',
  'grok-4.20-0309-reasoning',
  'grok-4.20-0309-non-reasoning',
  'grok-build-0.1',
  'grok-imagine-image-quality',
  'grok-imagine-image',
  'grok-imagine-video',
  // DeepSeek
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  // 智谱
  'glm-5.2',
  'glm-5.1',
  // Kimi（自上而下）
  'kimi-k3',
  'kimi-k2.7-code',
  'kimi-k2.6',
  // MiniMax（自上而下）
  'minimax-m3',
  'minimax-m2.7',
  'minimax-m2.5',
] as const

/** Rank for pricing table rows (lower first). Unlisted models share the last bucket. */
export function getModelDisplayRank(modelName: string): number {
  const key = (modelName || '').trim().toLowerCase()
  if (!key) return MODEL_DISPLAY_ORDER.length
  const idx = MODEL_DISPLAY_ORDER.findIndex((m) => m.toLowerCase() === key)
  return idx === -1 ? MODEL_DISPLAY_ORDER.length : idx
}

/** Quota type values */
export const QUOTA_TYPE_VALUES = {
  TOKEN: 0,
  REQUEST: 1,
} as const

/** Token unit divisors */
export const TOKEN_UNIT_DIVISORS = {
  M: 1,
  K: 1000,
} as const

/** Default token unit for pricing display */
export const DEFAULT_TOKEN_UNIT: TokenUnit = 'M'

/** View mode options */
export const VIEW_MODES = {
  CARD: 'card',
  TABLE: 'table',
} as const

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES]

/** Default page size for pricing table */
export const DEFAULT_PRICING_PAGE_SIZE = 20

/**
 * Preferred pricing-group card order (product convention).
 * Matched against admin「分组定价」/ usable_group names (full/half-width
 * parentheses and case are normalized — see normalizeGroupName).
 * Doc: docs/PRICING_PAGE_DESIGN.md §2.5
 * Unlisted groups appear after these (then by ratio, then name).
 * When changing order: update this array AND the design doc.
 *
 * 约定：各供应商 Sale/便宜档在前；Claude 内 Premium 紧跟 Sale。
 * 名称与线上 group_ratio 对齐（Claude/Codex 常用中文全角括号）。
 */
export const GROUP_DISPLAY_ORDER = [
  // Anthropic — Sale → Premium → Max(CLI Only) → Max(External)
  'Claude lite（Sale）',
  'Claude Plus（Premium）',
  'Claude Max（CLI Only）',
  'Claude Max（External）',
  // OpenAI / Codex
  'Codex Pro(Codex Only)',
  'Codex Pro（External）',
  // 其它供应商
  'DeepSeek',
  'Grok',
  'Grok（Enterprise）',
  'Grok Enterprise',
  'Grok（Beta）',
  'Zhipu',
] as const

/**
 * Normalize group names for comparison:
 * trim, lower-case, unify full-width （） → half-width (), collapse spaces
 * and strip spaces around parentheses.
 * So "Claude lite（Sale）" / "Claude lite (Sale)" / "Claude lite(Sale)" match.
 */
export function normalizeGroupName(name: string): string {
  return (
    (name || '')
      .trim()
      .toLowerCase()
      .replace(/\uFF08/g, '(')
      .replace(/\uFF09/g, ')')
      .replace(/\s+/g, ' ')
      // 全角转半角后常出现 "lite(sale)" vs "lite (sale)"，统一去括号两侧空白
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')')
  )
}

/** Look up a group-keyed map with normalizeGroupName (case / 全角括号 tolerant). */
export function lookupGroupMapValue<T>(
  map: Record<string, T> | null | undefined,
  group: string
): T | undefined {
  if (!map || !group) return undefined
  if (Object.prototype.hasOwnProperty.call(map, group)) {
    return map[group]
  }
  const needle = normalizeGroupName(group)
  if (!needle) return undefined
  for (const [key, value] of Object.entries(map)) {
    if (normalizeGroupName(key) === needle) return value
  }
  return undefined
}

/** Rank for group cards (lower first). Unlisted groups share the last bucket. */
export function getGroupDisplayRank(groupName: string): number {
  const key = normalizeGroupName(groupName)
  if (!key) return GROUP_DISPLAY_ORDER.length
  const idx = GROUP_DISPLAY_ORDER.findIndex(
    (g) => normalizeGroupName(g) === key
  )
  return idx === -1 ? GROUP_DISPLAY_ORDER.length : idx
}

/**
 * 分组卡片角标「X折」（可选）。不配则不显示角标。
 * key 与后台分组名匹配时支持全角/半角括号。
 */
export const MANUAL_GROUP_ZHE: Record<string, number> = {
  // 可选：'Some Group': 1  → 角标「1折」
}

/**
 * 表格「节省幅度」/ 分组卡红字 off —— 手动覆盖（可选）。
 *
 * **默认：所有分组**（Claude / Codex / DeepSeek / Grok / 智谱 / 以后新增）
 * 一律按 group_ratio 自动换算：off% = round((1 - ratio) × 100)
 *   0.15 → 85% off · 0.13 → 87% off · 0.35 → 65% off · 0.1 → 90% off
 *
 * 仅当不想跟倍率走时再在此写固定值（例如 85）。
 * 仅在「分组价格」模式显示；「官方价格」模式始终留空。
 */
export const MANUAL_GROUP_SAVINGS_OFF: Record<string, number> = {
  // 默认留空：全部自动换算。需要固定文案时再写，例如：
  // 'Claude lite（Sale）': 85,
}

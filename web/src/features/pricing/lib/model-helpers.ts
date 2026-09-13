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
import {
  EXCLUDED_GROUPS,
  FILTER_ALL,
  getCanonicalVendorName,
  getVendorTabRank,
  lookupGroupMapValue,
  QUOTA_TYPE_VALUES,
  VENDOR_MODEL_DISPLAY_ORDER,
} from '../constants'
import type { PricingModel } from '../types'

// ----------------------------------------------------------------------------
// Model Helper Utilities
// ----------------------------------------------------------------------------

export function isPerImageExpressionModel(model: PricingModel): boolean {
  if (model.billing_mode !== 'tiered_expr') return false
  if (model.model_name === 'gpt-image-2') return true
  const schema = model.billing_usage_schema
  if (schema?.images || schema?.image) return true
  const name = model.model_name.toLowerCase()
  return (
    name.includes('image') ||
    name.startsWith('dall-e') ||
    name.includes('flux') ||
    name.includes('seedream')
  )
}

/**
 * Get available groups for a model
 */
export function getAvailableGroups(
  model: PricingModel,
  usableGroup: Record<string, string>
): string[] {
  const modelEnableGroups = Array.isArray(model.enable_groups)
    ? model.enable_groups
    : []

  return Object.keys(usableGroup)
    .filter((g) => !EXCLUDED_GROUPS.includes(g))
    .filter((g) => modelEnableGroups.includes(g))
}

/**
 * Read a configured group ratio while preserving valid zero ratios.
 */
export function getConfiguredGroupRatio(
  groupRatio: Record<string, number>,
  group: string
): number {
  const direct = groupRatio[group]
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct
  const lookedUp = lookupGroupMapValue(groupRatio, group)
  if (typeof lookedUp === 'number' && Number.isFinite(lookedUp)) return lookedUp
  return 1
}

/**
 * Resolve the group ratio used by model square summary prices.
 *
 * When no specific group is selected, the model square shows the best price
 * available to the viewer. When a group filter is active, it shows that
 * group's price instead.
 */
export function getDisplayGroupRatio(
  model: PricingModel,
  selectedGroup?: string
): number {
  const modelEnableGroups = Array.isArray(model.enable_groups)
    ? model.enable_groups
    : []
  const groupRatio = model.group_ratio || {}

  if (
    selectedGroup &&
    selectedGroup !== FILTER_ALL &&
    modelEnableGroups.includes(selectedGroup)
  ) {
    return getConfiguredGroupRatio(groupRatio, selectedGroup)
  }

  if (modelEnableGroups.length === 0) {
    return 1
  }

  let minRatio = Number.POSITIVE_INFINITY

  for (const group of modelEnableGroups) {
    const ratio = groupRatio[group]
    if (
      typeof ratio === 'number' &&
      Number.isFinite(ratio) &&
      ratio < minRatio
    ) {
      minRatio = ratio
    }
  }

  return minRatio === Number.POSITIVE_INFINITY ? 1 : minRatio
}

/**
 * Replace model placeholder in endpoint path
 */
export function replaceModelInPath(path: string, modelName: string): string {
  return path.replaceAll('{model}', modelName)
}

/**
 * Check if model is token-based pricing
 */
export function isTokenBasedModel(model: PricingModel): boolean {
  return model.quota_type === QUOTA_TYPE_VALUES.TOKEN
}

/**
 * Natural model-name compare (version-aware, descending):
 * Larger numbers sort first (top), e.g. gemini-3.6 before gemini-2.5, minimax-m3 before m2.5.
 */
/** Unlisted models: descending natural order (numeric-aware). */
export function compareModelNames(a: string, b: string): number {
  return (b || '').localeCompare(a || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

/**
 * 从模型名称中提取数字版本号序列（过滤日期后缀如 20251101 等噪音）。
 * 例如: "gpt-6-astra" -> [6], "gpt-5.6-sol" -> [5, 6], "claude-fable-5-1" -> [5, 1]
 */
export function extractModelVersion(modelName: string): number[] {
  if (!modelName) return []
  const cleaned = modelName
    .replaceAll(/(?:19|20)\d{6}/g, '')
    .replaceAll(/[-_](?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\b/g, '')
  const match = cleaned.match(
    /(?:[a-zA-Z]|^)[\s\-_vkm]*(\d+)(?:[.-](\d+))?(?:[.-](\d+))?/
  )
  if (!match) return []
  const parts: number[] = []
  if (match[1] !== undefined) parts.push(Number.parseInt(match[1], 10))
  if (match[2] !== undefined) parts.push(Number.parseInt(match[2], 10))
  if (match[3] !== undefined) parts.push(Number.parseInt(match[3], 10))
  return parts
}

/**
 * 自然语义版本比较（v1 > v2 返回 1，v1 < v2 返回 -1，相等返回 0）。
 */
export function compareModelVersions(v1: number[], v2: number[]): number {
  const len = Math.max(v1.length, v2.length)
  for (let i = 0; i < len; i++) {
    const a = v1[i] ?? 0
    const b = v2[i] ?? 0
    if (a !== b) return a > b ? 1 : -1
  }
  return 0
}

/**
 * 若模型未设置 vendor_name，尝试从模型名称前缀推断供应商。
 */
export function inferVendorFromModelName(modelName: string): string {
  const lower = (modelName || '').trim().toLowerCase()
  if (
    lower.startsWith('gpt-') ||
    lower.startsWith('chatgpt-') ||
    /^o\d(?:-|\b)/i.test(lower) ||
    lower.startsWith('dall-e') ||
    lower.startsWith('sora')
  ) {
    return 'OpenAI'
  }
  if (lower.startsWith('claude-')) return 'Anthropic'
  if (lower.startsWith('gemini-')) return 'Google'
  if (lower.startsWith('grok-')) return 'xAI'
  if (lower.startsWith('deepseek-')) return 'DeepSeek'
  if (lower.startsWith('glm-')) return 'ZHIPU'
  if (lower.startsWith('kimi-') || lower.startsWith('moonshot-')) return 'Moonshot'
  if (
    lower.startsWith('minimax-') ||
    lower.startsWith('hailuo-') ||
    lower.startsWith('hailuo')
  ) {
    return 'MiniMax'
  }
  if (
    lower.startsWith('seedance') ||
    lower.startsWith('doubao') ||
    lower.startsWith('seedream')
  ) {
    return 'ByteDance'
  }
  return ''
}

/**
 * 计算模型在其供应商基准列表中的动态排序权重。
 * 1. 若在基准表中已列出：按其索引固定排序 ((idx + 1) * 10000)。
 * 2. 若未在基准表中列出：排在基准表之后，由 comparePricingModels 按名称自然排序。
 *
 * 新模型是否是旗舰由产品配置显式决定，不能仅凭版本号越过已配置的产品层级。
 */
export function getModelEffectiveScore(
  modelName: string,
  vendorModels: readonly string[]
): number {
  const key = (modelName || '').trim().toLowerCase()
  const idx = vendorModels.findIndex((m) => m.toLowerCase() === key)
  if (idx !== -1) {
    return (idx + 1) * 10000
  }

  return (vendorModels.length + 1) * 10000
}

/**
 * 稳定且智能的定价表模型排序：
 * 供应商固定顺序 → 已配置模型顺序 → 未配置模型自然降序。
 */
export function comparePricingModels(a: PricingModel, b: PricingModel): number {
  const va = a.vendor_name || inferVendorFromModelName(a.model_name)
  const vb = b.vendor_name || inferVendorFromModelName(b.model_name)
  if (va !== vb) {
    const rankA = getVendorTabRank(va)
    const rankB = getVendorTabRank(vb)
    if (rankA !== rankB) return rankA - rankB
    return va.localeCompare(vb, undefined, { sensitivity: 'base' })
  }

  const ma = a.model_name || ''
  const mb = b.model_name || ''
  const canonicalVendor = getCanonicalVendorName(va)
  const vendorModels = VENDOR_MODEL_DISPLAY_ORDER[canonicalVendor] || []

  const scoreA = getModelEffectiveScore(ma, vendorModels)
  const scoreB = getModelEffectiveScore(mb, vendorModels)
  if (scoreA !== scoreB) {
    return scoreA - scoreB
  }
  return compareModelNames(ma, mb)
}

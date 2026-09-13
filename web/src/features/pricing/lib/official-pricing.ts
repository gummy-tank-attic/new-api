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
*/

/**
 * 官方标准定价基准项（单位：USD / 1M tokens）
 */
export interface OfficialPriceItem {
  input: number
  output: number
  cache?: number
  cache_write?: number
}

/**
 * Z.ai (智谱国际版) 官方标准定价字典
 * 数据来源：https://docs.z.ai/guides/overview/pricing
 */
export const ZAI_OFFICIAL_PRICES: Record<string, OfficialPriceItem> = {
  'glm-5.3': { input: 1.4, output: 4.4, cache: 0.26 },
  'glm-5.2': { input: 1.4, output: 4.4, cache: 0.26 },
  'glm-5.1': { input: 1.4, output: 4.4, cache: 0.26 },
  'glm-5.3-flash': { input: 0.15, output: 0.5, cache: 0.03 },
  'glm-5': { input: 1.0, output: 3.2, cache: 0.2 },
  'glm-5-turbo': { input: 1.2, output: 4.0, cache: 0.24 },
  'glm-4.7': { input: 0.6, output: 2.2, cache: 0.11 },
  'glm-4.7-flashx': { input: 0.07, output: 0.4, cache: 0.01 },
  'glm-4.6': { input: 0.6, output: 2.2, cache: 0.11 },
  'glm-4.5': { input: 0.6, output: 2.2, cache: 0.11 },
  'glm-4.5-x': { input: 2.2, output: 8.9, cache: 0.45 },
  'glm-4.5-air': { input: 0.2, output: 1.1, cache: 0.03 },
  'glm-4.5-airx': { input: 1.1, output: 4.5, cache: 0.22 },
  'glm-4-32b-0414-128k': { input: 0.1, output: 0.1 },
  'glm-4.6v': { input: 0.3, output: 0.9, cache: 0.05 },
  'glm-ocr': { input: 0.03, output: 0.03 },
  'glm-4.6v-flashx': { input: 0.04, output: 0.4, cache: 0.004 },
  'glm-4.5v': { input: 0.6, output: 1.8, cache: 0.11 },
}

/**
 * Kimi (月之暗面 / Moonshot) 国际版官方标准定价字典
 * 数据来源：https://platform.kimi.ai
 */
export const KIMI_OFFICIAL_PRICES: Record<string, OfficialPriceItem> = {
  'kimi-k3': { input: 3.0, output: 15.0, cache: 0.3 },
  'kimi-k2.7-code': { input: 0.95, output: 4.0, cache: 0.19 },
  'kimi-k2.7-code-highspeed': { input: 1.9, output: 8.0, cache: 0.38 },
  'kimi-k2.6': { input: 0.95, output: 4.0, cache: 0.16 },
  'kimi-k2.5': { input: 0.95, output: 4.0, cache: 0.16 },
  'kimi-k2': { input: 0.95, output: 4.0, cache: 0.16 },
  'moonshot-v1-8k': { input: 1.75, output: 1.75 },
  'moonshot-v1-32k': { input: 3.5, output: 3.5 },
  'moonshot-v1-128k': { input: 8.5, output: 8.5 },
}

/**
 * MiniMax 国际版官方标准定价字典
 * 数据来源：https://platform.minimax.io/docs/guides/pricing-paygo.md
 */
export const MINIMAX_OFFICIAL_PRICES: Record<string, OfficialPriceItem> = {
  'minimax-m3': { input: 0.30, output: 1.20, cache: 0.06 },
  'minimax-m2.7': { input: 0.30, output: 1.20, cache: 0.06, cache_write: 0.375 },
  'minimax-m2.7-highspeed': { input: 0.60, output: 2.40, cache: 0.06, cache_write: 0.375 },
  'minimax-m2.5': { input: 0.30, output: 1.20, cache: 0.03, cache_write: 0.375 },
  'minimax-m2.5-highspeed': { input: 0.60, output: 2.40, cache: 0.03, cache_write: 0.375 },
}

/**
 * 汇总官方标准字典（Z.ai + Kimi / Moonshot + MiniMax 等）
 */
export const ALL_OFFICIAL_PRICES: Record<string, OfficialPriceItem> = {
  ...ZAI_OFFICIAL_PRICES,
  ...KIMI_OFFICIAL_PRICES,
  ...MINIMAX_OFFICIAL_PRICES,
}

const ALL_OFFICIAL_ENTRIES = Object.entries(ALL_OFFICIAL_PRICES).sort(
  ([a], [b]) => b.length - a.length
)

/**
 * 获取模型的官方标准基准价
 */
export function getOfficialModelPrice(
  modelName: string
): OfficialPriceItem | undefined {
  const needle = (modelName || '').trim().toLowerCase()
  if (!needle) return undefined

  if (ALL_OFFICIAL_PRICES[needle]) {
    return ALL_OFFICIAL_PRICES[needle]
  }

  for (const [key, item] of ALL_OFFICIAL_ENTRIES) {
    if (
      needle.startsWith(`${key}-`) ||
      needle.startsWith(`${key}.`) ||
      needle.startsWith(`${key}_`)
    ) {
      return item
    }
  }

  return undefined
}

/**
 * 根据实际售价自动推导国际官方折扣率（百分比）
 * 公式：round((1 - actualPrice / officialPrice) * 100)
 */
export function computeAutoSavingsOff(
  modelName: string,
  actualInputPricePerM: number
): number | undefined {
  if (!Number.isFinite(actualInputPricePerM) || actualInputPricePerM <= 0) {
    return undefined
  }

  const official = getOfficialModelPrice(modelName)
  if (!official || official.input <= 0) {
    return undefined
  }

  if (actualInputPricePerM < official.input) {
    const off = Math.round((1 - actualInputPricePerM / official.input) * 100)
    if (off >= 1 && off <= 99) {
      return off
    }
  }

  return undefined
}

/**
 * 格式化官方原价字符串（保留合适小数位）
 */
export function formatOfficialPriceValue(
  val: number,
  currencySymbol = '$'
): string {
  if (!Number.isFinite(val) || val < 0) return ''
  let decimals = 2
  const parts = val.toString().split('.')
  if (parts[1] && parts[1].length > 2) {
    decimals = Math.min(parts[1].length, 4)
  }
  return `${currencySymbol}${val.toFixed(decimals)}`
}

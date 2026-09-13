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
 * DeepSeek 官方标准定价字典
 * 数据来源：https://api-docs.deepseek.com/quick_start/pricing
 */
export const DEEPSEEK_OFFICIAL_PRICES: Record<string, OfficialPriceItem> = {
  'deepseek-v4-pro': { input: 1.32, output: 3.96, cache: 0.044 },
  'deepseek-flash': { input: 0.30, output: 1.20, cache: 0.006 },
  'deepseek-chat': { input: 0.27, output: 1.10, cache: 0.07 },
  'deepseek-reasoner': { input: 0.55, output: 2.19, cache: 0.14 },
}

/**
 * Anthropic (Claude) 官方标准定价字典
 * 数据来源：https://www.anthropic.com/pricing
 */
export const ANTHROPIC_OFFICIAL_PRICES: Record<string, OfficialPriceItem> = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0, cache: 0.3, cache_write: 3.75 },
  'claude-3-7-sonnet': { input: 3.0, output: 15.0, cache: 0.3, cache_write: 3.75 },
  'claude-3-5-sonnet': { input: 3.0, output: 15.0, cache: 0.3, cache_write: 3.75 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0, cache: 0.1, cache_write: 1.25 },
  'claude-3-5-haiku': { input: 1.0, output: 5.0, cache: 0.1, cache_write: 1.25 },
  'claude-sonnet-5': { input: 2.0, output: 10.0, cache: 0.2, cache_write: 2.5 },
  'claude-opus-4-6': { input: 5.0, output: 25.0, cache: 0.5, cache_write: 6.25 },
  'claude-opus-4-7': { input: 5.0, output: 25.0, cache: 0.5, cache_write: 6.25 },
  'claude-opus-4-8': { input: 5.0, output: 25.0, cache: 0.5, cache_write: 6.25 },
  'claude-opus-5': { input: 5.0, output: 25.0, cache: 0.5, cache_write: 6.25 },
  'claude-3-opus': { input: 15.0, output: 75.0, cache: 1.5, cache_write: 18.75 },
  'claude-fable-5': { input: 10.0, output: 50.0, cache: 1.0, cache_write: 12.5 },
  'claude-fable-5-1': { input: 10.0, output: 50.0, cache: 0.25, cache_write: 12.5 },
}

/**
 * OpenAI 官方标准定价字典
 * 数据来源：https://openai.com/api/pricing/
 */
export const OPENAI_OFFICIAL_PRICES: Record<string, OfficialPriceItem> = {
  'gpt-6-astra': { input: 10.0, output: 50.0, cache: 1.0, cache_write: 12.5 },
  'gpt-5.5': { input: 5.0, output: 30.0, cache: 0.5 },
  'gpt-5.6-sol': { input: 4.0, output: 20.0, cache: 0.4, cache_write: 5.0 },
  'gpt-5.6-terra': { input: 2.0, output: 12.0, cache: 0.2, cache_write: 2.5 },
  'gpt-5.6-luna': { input: 0.2, output: 1.2, cache: 0.02, cache_write: 0.25 },
  'gpt-5.3-codex-spark': { input: 1.75, output: 14.0, cache: 0.175 },
  'gpt-image-2.5-sunburst': { input: 5.0, output: 30.0, cache: 1.25 },
  'gpt-image-2.5-flare': { input: 5.0, output: 30.0, cache: 1.25 },
  'gpt-image-2': { input: 5.0, output: 30.0, cache: 1.25 },
  'gpt-4o': { input: 2.5, output: 10.0, cache: 1.25 },
  'gpt-4o-mini': { input: 0.15, output: 0.6, cache: 0.075 },
  'o1': { input: 15.0, output: 60.0, cache: 7.5 },
  'o1-mini': { input: 1.1, output: 4.4, cache: 0.55 },
  'o3-mini': { input: 1.1, output: 4.4, cache: 0.55 },
}

/**
 * Google (Gemini) 官方标准定价字典
 * 数据来源：https://ai.google.dev/pricing
 */
export const GOOGLE_OFFICIAL_PRICES: Record<string, OfficialPriceItem> = {
  'gemini-3.7-flash': { input: 0.75, output: 3.75, cache: 0.075 },
  'gemini-3.1-pro': { input: 2.0, output: 12.0, cache: 0.2 },
  'gemini-3.1-flash-lite': { input: 0.25, output: 1.5, cache: 0.025 },
  'gemini-3.1-flash-lite-preview': { input: 0.25, output: 1.5, cache: 0.025 },
  'gemini-3.5-flash': { input: 1.5, output: 9.0, cache: 0.15 },
  'gemini-3.5-flash-lite': { input: 0.3, output: 2.5, cache: 0.03 },
  'gemini-3.6-flash': { input: 0.75, output: 3.75, cache: 0.075 },
  'gemini-3.8-flash': { input: 0.75, output: 3.75, cache: 0.075 },
  'gemini-3-flash': { input: 0.5, output: 3.0, cache: 0.05 },
  'gemini-3-flash-preview': { input: 0.5, output: 3.0, cache: 0.05 },
  'gemini-2.5-pro': { input: 1.25, output: 10.0, cache: 0.125 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5, cache: 0.03 },
  'gemini-2.5-flash-lite': { input: 0.1, output: 0.4, cache: 0.01 },
  'gemini-3-pro': { input: 75.0, output: 450.0, cache: 7.5 },
  'gemini-3-pro-preview': { input: 75.0, output: 450.0, cache: 7.5 },
}

/**
 * xAI (Grok) 官方标准定价字典
 * 数据来源：https://docs.x.ai/docs/overview
 */
export const XAI_OFFICIAL_PRICES: Record<string, OfficialPriceItem> = {
  'grok-4.6': { input: 2.0, output: 6.0, cache: 0.5 },
  'grok-4.5': { input: 2.0, output: 6.0, cache: 0.3 },
  'grok-4.3': { input: 1.25, output: 2.5, cache: 0.2 },
  'grok-build-0.1': { input: 1.0, output: 2.0, cache: 0.2 },
  'grok-4.20-multi-agent-0309': { input: 1.25, output: 2.5, cache: 0.2 },
  'grok-4.20-0309-reasoning': { input: 1.25, output: 2.5, cache: 0.2 },
  'grok-4.20-0309-non-reasoning': { input: 1.25, output: 2.5, cache: 0.2 },
  'grok-2': { input: 2.0, output: 10.0 },
  'grok-2-mini': { input: 0.2, output: 1.0 },
}

/**
 * 汇总官方标准字典（Z.ai + Kimi + MiniMax + DeepSeek + Anthropic + OpenAI + Google + xAI 等）
 */
export const ALL_OFFICIAL_PRICES: Record<string, OfficialPriceItem> = {
  ...ZAI_OFFICIAL_PRICES,
  ...KIMI_OFFICIAL_PRICES,
  ...MINIMAX_OFFICIAL_PRICES,
  ...DEEPSEEK_OFFICIAL_PRICES,
  ...ANTHROPIC_OFFICIAL_PRICES,
  ...OPENAI_OFFICIAL_PRICES,
  ...GOOGLE_OFFICIAL_PRICES,
  ...XAI_OFFICIAL_PRICES,
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

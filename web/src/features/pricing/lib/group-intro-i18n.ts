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
import type { TFunction } from 'i18next'

import { normalizeGroupName } from '../constants'

/**
 * Map admin group names → stable i18n keys for pricing “group intro” body
 * and other UI that shows group descriptions (API keys, playground).
 * Keys live in locales as `pricingGroupIntro.*`.
 * Unmapped groups fall back to the raw backend string (usually zh-CN).
 */
const GROUP_INTRO_I18N_BY_NORMALIZED: Record<string, string> = {
  'claude lite(sale)': 'pricingGroupIntro.claudeLiteSale',
  'claude plus(premium)': 'pricingGroupIntro.claudePlusPremium',
  'claude max(cli only)': 'pricingGroupIntro.claudeMaxCliOnly',
  'claude max(external)': 'pricingGroupIntro.claudeMaxExternal',
  'codex pro(codex only)': 'pricingGroupIntro.codexProCodexOnly',
  'codex pro(external)': 'pricingGroupIntro.codexProExternal',
  deepseek: 'pricingGroupIntro.deepseek',
  grok: 'pricingGroupIntro.grok',
  'grok(enterprise)': 'pricingGroupIntro.grok',
  'grok enterprise': 'pricingGroupIntro.grok',
  'grok(beta)': 'pricingGroupIntro.grokBeta',
  'grok(image video)': 'pricingGroupIntro.grokImageVideo',
  'codex pro(image)': 'pricingGroupIntro.imageVideo',
  zhipu: 'pricingGroupIntro.zhipu',
  kimi: 'pricingGroupIntro.kimi',
  'kimi(sale)': 'pricingGroupIntro.kimi',
  moonshot: 'pricingGroupIntro.kimi',
  minimax: 'pricingGroupIntro.minimax',
  'minimax(sale)': 'pricingGroupIntro.minimax',
  gemini: 'pricingGroupIntro.gemini',
  google: 'pricingGroupIntro.gemini',
}

/** Resolve i18n key for a pricing group intro, or null if none curated. */
export function getGroupIntroI18nKey(groupName: string): string | null {
  const key = normalizeGroupName(groupName)
  if (!key) return null
  return GROUP_INTRO_I18N_BY_NORMALIZED[key] ?? null
}

/**
 * Localized group description for end-user UI.
 * Prefer curated `pricingGroupIntro.*`; else backend/admin string; else fallback.
 */
export function resolveGroupDescription(
  t: TFunction,
  groupName: string,
  fallbackDesc?: string | null,
  options?: { emptyPlaceholder?: string }
): string {
  const i18nKey = getGroupIntroI18nKey(groupName)
  if (i18nKey) return t(i18nKey)

  const raw = (fallbackDesc ?? '').trim()
  if (raw) return raw

  if (options?.emptyPlaceholder !== undefined) {
    return options.emptyPlaceholder
  }
  return groupName
}

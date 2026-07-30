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
import { describe, expect, it, vi } from 'vitest'

import {
  getGroupIntroI18nKey,
  resolveGroupDescription,
} from '../group-intro-i18n'

describe('getGroupIntroI18nKey', () => {
  it('maps known groups with full-width parentheses', () => {
    expect(getGroupIntroI18nKey('Claude Max（CLI Only）')).toBe(
      'pricingGroupIntro.claudeMaxCliOnly'
    )
    expect(getGroupIntroI18nKey('Claude Max (CLI Only)')).toBe(
      'pricingGroupIntro.claudeMaxCliOnly'
    )
  })

  it('returns null for unmapped groups', () => {
    expect(getGroupIntroI18nKey('unknown-group')).toBeNull()
  })
})

describe('resolveGroupDescription', () => {
  it('prefers curated i18n over backend Chinese fallback', () => {
    const t = vi.fn((key: string) => `RU:${key}`)
    const result = resolveGroupDescription(
      t as never,
      'Claude Max（CLI Only）',
      'Claude官方 Max满血版，仅限 Claude Code (CLI) 使用'
    )
    expect(result).toBe('RU:pricingGroupIntro.claudeMaxCliOnly')
    expect(t).toHaveBeenCalledWith('pricingGroupIntro.claudeMaxCliOnly')
  })

  it('falls back to admin string when unmapped', () => {
    const t = vi.fn((key: string) => key)
    const result = resolveGroupDescription(
      t as never,
      'custom-group',
      '后台中文说明'
    )
    expect(result).toBe('后台中文说明')
    expect(t).not.toHaveBeenCalled()
  })

  it('uses emptyPlaceholder when no i18n and no fallback', () => {
    const t = vi.fn((key: string) => key)
    const result = resolveGroupDescription(t as never, 'x', '', {
      emptyPlaceholder: 'No description for this group',
    })
    expect(result).toBe('No description for this group')
  })
})

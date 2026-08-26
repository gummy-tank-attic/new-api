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
import { describe, expect, test } from 'vitest'

import type { ApiKey } from '../../types'
import {
  buildGroupSwitchPayload,
  checkGroupModelCompatibility,
} from '../api-key-group-cell'

describe('checkGroupModelCompatibility', () => {
  const samplePricingModels = [
    {
      model_name: 'claude-3-5-sonnet',
      enable_groups: ['Claude lite（Sale）', 'Claude Plus（Premium）'],
    },
    {
      model_name: 'claude-3-opus',
      enable_groups: ['Claude Plus（Premium）'],
    },
    {
      model_name: 'gpt-4o',
      enable_groups: ['default', 'vip'],
    },
  ]

  test('returns compatible when new group includes all old group models', () => {
    const result = checkGroupModelCompatibility(
      'Claude lite（Sale）',
      'Claude Plus（Premium）',
      samplePricingModels
    )
    expect(result.type).toBe('compatible')
  })

  test('returns partial when new group includes only some old group models', () => {
    const result = checkGroupModelCompatibility(
      'Claude Plus（Premium）',
      'Claude lite（Sale）',
      samplePricingModels
    )
    expect(result.type).toBe('partial')
  })

  test('returns incompatible when model sets are completely disjoint', () => {
    const result = checkGroupModelCompatibility(
      'Claude Plus（Premium）',
      'vip',
      samplePricingModels
    )
    expect(result.type).toBe('incompatible')
  })

  test('returns compatible when groups are identical or empty', () => {
    expect(
      checkGroupModelCompatibility('vip', 'vip', samplePricingModels).type
    ).toBe('compatible')
    expect(
      checkGroupModelCompatibility('', 'vip', samplePricingModels).type
    ).toBe('compatible')
  })
})

describe('buildGroupSwitchPayload', () => {
  const apiKey: ApiKey = {
    id: 7,
    name: 'my key',
    key: 'sk-masked',
    status: 1,
    remain_quota: 12345,
    used_quota: 42,
    unlimited_quota: false,
    expired_time: 1700000000,
    created_time: 1,
    accessed_time: 2,
    group: 'vip',
    auto_groups: ['vip', 'default'],
    cross_group_retry: true,
    model_limits_enabled: true,
    model_limits: 'gpt-4o,claude-3-5-sonnet',
    allow_ips: '1.2.3.4',
  }

  test('preserves every existing token field and only changes group', () => {
    // UpdateToken 非 status_only 分支是全量覆盖：漏传任何字段都会清空对应设置
    expect(buildGroupSwitchPayload(apiKey, 'default')).toEqual({
      id: 7,
      name: 'my key',
      remain_quota: 12345,
      expired_time: 1700000000,
      unlimited_quota: false,
      model_limits_enabled: true,
      model_limits: 'gpt-4o,claude-3-5-sonnet',
      allow_ips: '1.2.3.4',
      group: 'default',
      auto_groups: [],
      cross_group_retry: false,
    })
  })

  test('normalizes nullish optional fields to empty strings', () => {
    const sparse = {
      ...apiKey,
      model_limits: '',
      allow_ips: null as unknown as string,
    }
    const payload = buildGroupSwitchPayload(sparse, 'default')
    expect(payload.model_limits).toBe('')
    expect(payload.allow_ips).toBe('')
  })
})

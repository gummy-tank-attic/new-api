/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import { getGroupMaxDiscount } from '../components/group-price-cards'
import type { PricingModel } from '../types'

function h3(secondPrice: number): PricingModel {
  return {
    id: 1,
    model_name: 'MiniMax-H3',
    vendor_name: 'MiniMax',
    enable_groups: ['MiniMax'],
    billing_expr: `tier("768P", u("seconds") * ${secondPrice})`,
    billing_usage_schema: {
      seconds: { type: 'number', unit: 'second' },
      resolution: { enum: ['768P', '2K'] },
    },
    quota_type: 1,
    model_ratio: 1,
    model_price: 0,
    completion_ratio: 1,
  }
}

const m3: PricingModel = {
  id: 2,
  model_name: 'minimax-m3',
  vendor_name: 'MiniMax',
  enable_groups: ['MiniMax'],
  quota_type: 0,
  model_ratio: 0.0975,
  model_price: 0,
  completion_ratio: 1,
}

describe('getGroupMaxDiscount MiniMax capsule', () => {
  test('does not use static H3 25% OFF when billed equals official', () => {
    assert.equal(
      getGroupMaxDiscount('MiniMax', [h3(0.08)], { MiniMax: 1 }),
      0
    )
  })

  test('uses billed vs official duration discount for H3', () => {
    assert.equal(
      getGroupMaxDiscount('MiniMax', [h3(0.06)], { MiniMax: 1 }),
      25
    )
  })

  test('takes max of text auto-savings and real H3 discount', () => {
    assert.equal(
      getGroupMaxDiscount('MiniMax', [m3, h3(0.08)], { MiniMax: 1 }),
      35
    )
  })
})

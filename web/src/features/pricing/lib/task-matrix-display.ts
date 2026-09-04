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
import type { BillingUsageSchema, BillingUsageUnit } from '../types'
import type { ParsedTaskTier } from './billing-expr'
import {
  getTaskEnumFields,
  getTaskNumberFields,
  taskMatrixRowLabel,
  tryParseTaskMatrixConfig,
} from './task-expr'

/**
 * Marketplace display helper: expand a recognized task matrix (flat/uniform
 * or a full enum partition) into one row per combination. Returns null when
 * the schema has no enum fields or the expression is not a recognized matrix,
 * so callers keep the raw parsed-tier display.
 */
export function getTaskMatrixDisplayTiers(
  expression: string | null | undefined,
  schema: BillingUsageSchema | null | undefined
): ParsedTaskTier[] | null {
  if (!schema) return null
  if (getTaskEnumFields(schema).length === 0) return null

  const matrix = tryParseTaskMatrixConfig(expression, schema)
  if (!matrix) return null

  return matrix.rows.map((row) => ({
    label: taskMatrixRowLabel(row.combination),
    conditions: Object.entries(row.combination)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([field, value]) => ({ field, value })),
    constant: row.constant,
    unitPrices: { ...row.unitPrices },
  }))
}

const PRICE_SNAP = 1e-9

export const TASK_VIDEO_INPUT_TABLE_LABEL_KEYS: Record<string, string> = {
  none: 'Without video input',
  video: 'With video input',
}

export type TaskMatrixTableLine = {
  labelKey: string
  unitPrice: number
  unit: BillingUsageUnit
}

function conditionValue(
  tier: ParsedTaskTier,
  field: string
): string | undefined {
  return tier.conditions.find((condition) => condition.field === field)?.value
}

function pricesMatch(values: number[]): boolean {
  if (values.length === 0) return false
  const first = values[0]
  return values.every((value) => Math.abs(value - first) <= PRICE_SNAP)
}

function primaryNumberField(
  schema: BillingUsageSchema
): [string, BillingUsageUnit] | null {
  const fields = getTaskNumberFields(schema)
  const tokens = fields.find(([field]) => field === 'tokens')
  const picked = tokens ?? fields[0]
  if (!picked) return null
  const unit = picked[1].unit
  if (!unit) return null
  return [picked[0], unit]
}

/**
 * Collapse a Seedance-style token matrix for the public price table: when
 * unit price only depends on video_input, emit one line per mode so users
 * do not have to open the model drawer.
 */
export function getTaskMatrixTableLines(
  expression: string | null | undefined,
  schema: BillingUsageSchema | null | undefined
): TaskMatrixTableLine[] | null {
  if (!schema) return null
  const primary = primaryNumberField(schema)
  if (!primary) return null
  const [priceField, unit] = primary

  const tiers = getTaskMatrixDisplayTiers(expression, schema)
  if (!tiers?.length) return null

  const videoInput = schema.video_input?.enum
  if (videoInput?.length) {
    const lines: TaskMatrixTableLine[] = []
    for (const value of videoInput) {
      const prices = tiers
        .filter((tier) => conditionValue(tier, 'video_input') === value)
        .map((tier) => Number(tier.unitPrices[priceField]) || 0)
      if (!pricesMatch(prices)) return null
      lines.push({
        labelKey: TASK_VIDEO_INPUT_TABLE_LABEL_KEYS[value] ?? value,
        unitPrice: prices[0],
        unit,
      })
    }
    return lines
  }

  return null
}

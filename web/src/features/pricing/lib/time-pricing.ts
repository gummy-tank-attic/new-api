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
import type { PricingModel } from '../types'
import { TIME_TIERED_MODEL_NAMES } from '../constants'
import { isDynamicPricingModel } from './dynamic-price'

export function isTimeTieredModel(model: PricingModel): boolean {
  // Only dynamic expressions can use the time-tiered presentation.
  if (!isDynamicPricingModel(model)) return false
  const expr = model.billing_expr || ''
  const hasTimeRule =
    /(?:hour|minute|weekday|month|day|is_bj_daytime|is_bj_workday|time)\s*\(/i.test(
      expr
    )
  const name = (model.model_name || '').trim().toLowerCase()
  const isWhitelisted = TIME_TIERED_MODEL_NAMES.some((t) => t.toLowerCase() === name)
  return hasTimeRule || isWhitelisted
}

export function getOffPeakMultiplier(model: PricingModel): number {
  const expr = model.billing_expr || ''
  const m = expr.match(/\?\s*([\d.]+)\s*:\s*([\d.]+)/)
  if (m) {
    const v1 = Number(m[1])
    const v2 = Number(m[2])
    if (Number.isFinite(v1) && Number.isFinite(v2)) {
      const minVal = Math.min(v1, v2)
      const maxVal = Math.max(v1, v2)
      if (minVal > 0 && maxVal > 0 && minVal < maxVal) {
        return minVal / maxVal
      }
    }
  }
  return 0.5
}

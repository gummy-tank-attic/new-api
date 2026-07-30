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

/**
 * Chinese "折" badge from group ratio (0.5 → 5折, 0.14 → 1.4折).
 * Returns null when ratio is not a positive finite discount base.
 */
export function formatDiscountZhe(ratio: number): string | null {
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 1) return null
  const zhe = ratio * 10
  const label = Number.isInteger(zhe)
    ? String(zhe)
    : zhe.toFixed(1).replace(/\.0$/, '')
  return `${label}折`
}

/**
 * Savings percent vs baseline ratio 1.0. Only when 0 < ratio < 1.
 * e.g. 0.15 → 85, 0.2 → 80
 */
export function formatSavingsPercent(ratio: number): number | null {
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) return null
  return Math.round((1 - ratio) * 100)
}

/**
 * Resolve display "off %" for a pricing group.
 * Manual override wins; otherwise convert group_ratio (0.15 → 85).
 */
export function resolveGroupSavingsOffPercent(
  ratio: number,
  manualOff?: number | null
): number | null {
  if (typeof manualOff === 'number' && Number.isFinite(manualOff) && manualOff > 0) {
    return Math.round(manualOff)
  }
  return formatSavingsPercent(ratio)
}

/** Compact multiplier label, e.g. 0.5 → "0.5x" */
export function formatRatioMultiplier(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—'
  if (Number.isInteger(ratio)) return `${ratio}x`
  return `${ratio.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}x`
}

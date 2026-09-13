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
import { describe, expect, it } from 'vitest'

import {
  computeAutoSavingsOff,
  formatOfficialPriceValue,
  getOfficialModelPrice,
  lookupModelSavingsOff,
} from '../../constants'

describe('Official Pricing & Dynamic Savings', () => {
  describe('getOfficialModelPrice', () => {
    it('retrieves official international price for GLM models', () => {
      const glm53 = getOfficialModelPrice('glm-5.3')
      expect(glm53).toEqual({ input: 1.4, output: 4.4, cache: 0.26 })

      const glm52 = getOfficialModelPrice('glm-5.2')
      expect(glm52).toEqual({ input: 1.4, output: 4.4, cache: 0.26 })

      const glm51 = getOfficialModelPrice('glm-5.1')
      expect(glm51).toEqual({ input: 1.4, output: 4.4, cache: 0.26 })

      const flash = getOfficialModelPrice('glm-5.3-flash')
      expect(flash).toEqual({ input: 0.15, output: 0.5, cache: 0.03 })
    })

    it('supports case-insensitivity and prefix matching', () => {
      const upper = getOfficialModelPrice('GLM-5.3')
      expect(upper?.input).toBe(1.4)

      const dated = getOfficialModelPrice('glm-5.3-20260301')
      expect(dated?.input).toBe(1.4)
    })

    it('returns undefined for unmapped models', () => {
      expect(getOfficialModelPrice('custom-unknown-model')).toBeUndefined()
    })
  })

  describe('computeAutoSavingsOff', () => {
    it('accurately computes savings against international official baseline', () => {
      // Selling at $1.05 against official $1.40 -> 25% OFF
      expect(computeAutoSavingsOff('glm-5.3', 1.05)).toBe(25)

      // Selling at $0.91 against official $1.40 -> 35% OFF
      expect(computeAutoSavingsOff('glm-5.2', 0.91)).toBe(35)

      // Selling at $1.12 against official $1.40 -> 20% OFF
      expect(computeAutoSavingsOff('glm-5.1', 1.12)).toBe(20)
    })

    it('returns undefined if selling at or above official price', () => {
      expect(computeAutoSavingsOff('glm-5.3', 1.4)).toBeUndefined()
      expect(computeAutoSavingsOff('glm-5.3', 2.0)).toBeUndefined()
    })
  })

  describe('lookupModelSavingsOff', () => {
    it('uses actual price when passed to calculate auto savings', () => {
      // Dynamic adjustment based on current model ratio / selling price
      const savings = lookupModelSavingsOff('glm-5.3', 0.98) // (1 - 0.98/1.40) = 30%
      expect(savings).toBe(30)
    })

    it('falls back to manual table if actual price not passed', () => {
      expect(lookupModelSavingsOff('glm-5.3')).toBe(25)
      expect(lookupModelSavingsOff('glm-5.2')).toBe(35)
      expect(lookupModelSavingsOff('glm-5.1')).toBe(20)
    })
  })

  describe('formatOfficialPriceValue', () => {
    it('formats price with currency symbol and appropriate decimal places', () => {
      expect(formatOfficialPriceValue(1.4)).toBe('$1.40')
      expect(formatOfficialPriceValue(4.4)).toBe('$4.40')
      expect(formatOfficialPriceValue(0.26)).toBe('$0.26')
      expect(formatOfficialPriceValue(0.03)).toBe('$0.03')
    })
  })
})

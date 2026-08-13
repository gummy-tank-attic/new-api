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
import { api } from '@/lib/api'

import type { PricingData } from './types'

// ----------------------------------------------------------------------------
// Pricing APIs
// ----------------------------------------------------------------------------

function isPricingPayload(value: unknown): value is PricingData {
  if (!value || typeof value !== 'object') return false
  const v = value as PricingData
  return Array.isArray(v.data) && Array.isArray(v.vendors)
}

async function fetchPricingOnce(options?: {
  skipAuth?: boolean
}): Promise<PricingData> {
  const res = await api.get('/api/pricing', {
    // Avoid 401 → refresh loops hanging Model Square; we fall back anonymously below.
    skipAuthRefresh: true,
    skipBusinessError: true,
    skipErrorHandler: true,
    disableDuplicate: true,
    skipAuth: options?.skipAuth,
    timeout: 12_000,
  })
  if (!isPricingPayload(res.data)) {
    throw new Error('Invalid pricing response')
  }
  return res.data
}

/**
 * Get model pricing data.
 * Prefer the session (group-personalized list); if the token is expired/broken or
 * the authenticated request fails, fall back to the public list so the page never
 * sticks on the skeleton forever.
 */
export async function getPricing(): Promise<PricingData> {
  try {
    return await fetchPricingOnce()
  } catch (authenticatedError) {
    try {
      return await fetchPricingOnce({ skipAuth: true })
    } catch {
      throw authenticatedError
    }
  }
}

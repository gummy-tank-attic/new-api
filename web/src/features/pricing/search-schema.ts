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
import { redirect } from '@tanstack/react-router'
import z from 'zod'

import { bootstrapAuthentication } from '@/lib/auth-session'
import { getModuleAccess } from '@/lib/nav-modules'
import { useAuthStore } from '@/stores/auth-store'

export const pricingSearchSchema = z.object({
  search: z.string().optional(),
  sort: z.string().optional(),
  vendor: z.string().optional(),
  group: z.string().optional(),
  quotaType: z.string().optional(),
  endpointType: z.string().optional(),
  tag: z.string().optional(),
  tokenUnit: z.enum(['M', 'K']).optional(),
  view: z.enum(['card', 'table']).optional().catch(undefined),
  rechargePrice: z.boolean().optional(),
})

export type PricingSearch = z.infer<typeof pricingSearchSchema>

export async function ensurePricingAuth(locationHref: string): Promise<void> {
  const access = getModuleAccess('pricing')
  if (!access.requireAuth) return
  await bootstrapAuthentication()
  const { auth } = useAuthStore.getState()
  if (!auth.user) {
    throw redirect({
      to: '/sign-in',
      search: { redirect: locationHref },
    })
  }
}

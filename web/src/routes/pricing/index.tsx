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
import { createFileRoute, redirect } from '@tanstack/react-router'

import { Pricing } from '@/features/pricing'
import {
  ensurePricingAuth,
  pricingSearchSchema,
} from '@/features/pricing/search-schema'
import { getModuleAccess } from '@/lib/nav-modules'

export const Route = createFileRoute('/pricing/')({
  validateSearch: pricingSearchSchema,
  // Cache-only module flag — never block / hang the route on /api/status.
  // (Fresh status is still loaded by the app shell via useStatus.)
  // When pricing requires login, await session restore (root no longer does).
  beforeLoad: async ({ location }) => {
    const access = getModuleAccess('pricing')
    if (!access.enabled) {
      throw redirect({ to: '/' })
    }
    await ensurePricingAuth(location.href)
  },
  component: Pricing,
})

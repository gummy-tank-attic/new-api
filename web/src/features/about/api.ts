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

import type { AboutResponse } from './types'

export async function getAboutContent(): Promise<AboutResponse> {
  const res = await api.get<AboutResponse>('/api/about', {
    skipAuthRefresh: true,
    skipBusinessError: true,
    skipErrorHandler: true,
    timeout: 8_000,
    headers: { 'Cache-Control': null },
  })
  return res.data
}

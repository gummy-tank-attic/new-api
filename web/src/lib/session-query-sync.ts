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
import type { QueryClient } from '@tanstack/react-query'

export type SessionQuerySyncAction = 'none' | 'invalidate' | 'reset'

/**
 * How public/in-flight queries should react when the auth SID changes.
 * Cold start is undefined → sid: invalidate only. queryClient.clear() silently
 * cancels fetches; observers that do not subscribe to auth stay pending forever.
 */
export function sessionQuerySyncAction(
  previousSID: string | undefined,
  sid: string | undefined
): SessionQuerySyncAction {
  if (previousSID === sid) return 'none'
  if (previousSID && sid) return 'reset'
  return 'invalidate'
}

export function applySessionQuerySync(
  queryClient: QueryClient,
  previousSID: string | undefined,
  sid: string | undefined
): SessionQuerySyncAction {
  const action = sessionQuerySyncAction(previousSID, sid)
  if (action === 'reset') {
    void queryClient.resetQueries()
  } else if (action === 'invalidate') {
    void queryClient.invalidateQueries()
  }
  return action
}

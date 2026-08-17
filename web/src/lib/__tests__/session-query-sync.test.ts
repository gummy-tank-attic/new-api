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
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import { QueryClient } from '@tanstack/react-query'

import {
  applySessionQuerySync,
  sessionQuerySyncAction,
} from '../session-query-sync.ts'

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

describe('session query sync policy', () => {
  test('cold-start restore invalidates instead of resetting identity', () => {
    assert.equal(sessionQuerySyncAction(undefined, 'sid-1'), 'invalidate')
    assert.equal(sessionQuerySyncAction('sid-1', undefined), 'invalidate')
    assert.equal(sessionQuerySyncAction('sid-1', 'sid-2'), 'reset')
    assert.equal(sessionQuerySyncAction('sid-1', 'sid-1'), 'none')
  })

  test('bootstrap sid write does not drop an in-flight public query', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    let resolveFetch: ((value: { ok: true }) => void) | undefined
    const pending = new Promise<{ ok: true }>((resolve) => {
      resolveFetch = resolve
    })

    const resultPromise = queryClient.fetchQuery({
      queryKey: ['pricing', 'anon'],
      queryFn: () => pending,
    })

    assert.equal(
      applySessionQuerySync(queryClient, undefined, 'sid-1'),
      'invalidate'
    )
    assert.equal(
      queryClient.getQueryState(['pricing', 'anon'])?.fetchStatus,
      'fetching'
    )

    resolveFetch?.({ ok: true })
    assert.deepEqual(await resultPromise, { ok: true })
    assert.deepEqual(queryClient.getQueryData(['pricing', 'anon']), { ok: true })
    queryClient.clear()
  })

  test('clear() removes the in-flight public query from the cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const resultPromise = queryClient.fetchQuery({
      queryKey: ['pricing', 'anon'],
      queryFn: () => new Promise<{ ok: true }>(() => undefined),
    })

    queryClient.clear()
    assert.equal(queryClient.getQueryState(['pricing', 'anon']), undefined)
    await assert.rejects(resultPromise)
  })
})

describe('public pages keep session-aware queries', () => {
  test('root uses applySessionQuerySync and does not clear on sid change', () => {
    const root = read('../../routes/__root.tsx')
    assert.match(root, /applySessionQuerySync/)
    const subscribe = root.slice(
      root.indexOf('useAuthStore.subscribe'),
      root.indexOf('subscribeAuthSessionEvents')
    )
    assert.doesNotMatch(subscribe, /queryClient\.clear\(/)
  })

  test('pricing and rankings keep last payload across anon → session', () => {
    const pricing = read('../../features/pricing/hooks/use-pricing-data.ts')
    assert.match(pricing, /sessionSid \?\? 'anon'/)
    assert.match(pricing, /placeholderData/)

    const rankings = read('../../features/rankings/hooks/use-rankings.ts')
    assert.match(rankings, /sessionSid \?\? 'anon'/)
    assert.match(rankings, /placeholderData/)
    assert.match(rankings, /readRankingsCache/)
  })
})

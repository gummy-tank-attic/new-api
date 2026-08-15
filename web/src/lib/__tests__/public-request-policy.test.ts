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
import { test } from 'node:test'

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

test('global API clients do not force preflight-only headers', () => {
  for (const file of ['../http-client.ts', '../auth-session.ts']) {
    const source = read(file)
    assert.doesNotMatch(source, /['"]Cache-Control['"]\s*:/)
    assert.doesNotMatch(source, /import\.meta\.env\?\./)
  }
})

test('public startup reads use the public request policy', () => {
  const httpClient = read('../http-client.ts')
  assert.match(httpClient, /PUBLIC_API_REQUEST_CONFIG/)
  assert.match(httpClient, /skipAuth:\s*true/)

  for (const file of [
    '../api.ts',
    '../../features/home/api.ts',
    '../../features/setup/api.ts',
  ]) {
    assert.match(read(file), /PUBLIC_API_REQUEST_CONFIG/)
  }
})

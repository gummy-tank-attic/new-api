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
import { describe, test } from 'node:test'

import { shouldRedirectToSetup } from '../setup-redirect.ts'

describe('setup redirect policy', () => {
  test('redirects an uninitialized installation after status loads', () => {
    assert.equal(shouldRedirectToSetup({ setup: false }, '/'), true)
  })

  test('never redirects while already on the setup route', () => {
    assert.equal(shouldRedirectToSetup({ setup: false }, '/setup'), false)
  })

  test('does not block while status is unavailable or initialized', () => {
    assert.equal(shouldRedirectToSetup(null, '/'), false)
    assert.equal(shouldRedirectToSetup({ setup: true }, '/'), false)
  })
})

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
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { convertDetectedLanguage } from '../languages.ts'

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '../locales')

test('maps browser Chinese tags the same way the HTML boot script does', () => {
  assert.equal(convertDetectedLanguage('zh-CN'), 'zhCN')
  assert.equal(convertDetectedLanguage('zh'), 'zhCN')
  assert.equal(convertDetectedLanguage('zh-TW'), 'zhTW')
  assert.equal(convertDetectedLanguage('zh-HK'), 'zhTW')
  assert.equal(convertDetectedLanguage('zh-Hant'), 'zhTW')
  assert.equal(convertDetectedLanguage('fr-FR'), 'fr-FR')
  assert.equal(convertDetectedLanguage('en-US'), 'en-US')
})

test('stable public locale files exist for every shipped language', () => {
  for (const file of [
    'en.json',
    'zh.json',
    'zh-TW.json',
    'fr.json',
    'ja.json',
    'ru.json',
    'vi.json',
  ]) {
    assert.equal(existsSync(join(localesDir, file)), true, file)
  }
})

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
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.join(__dirname, '../src/i18n/locales')
const bad = 'Official prices use  = {{symbol}}{{rate}}'
const good = 'Official prices use $1 = {{symbol}}{{rate}}'

const translations = {
  en: 'Official prices use $1 = {{symbol}}{{rate}}',
  zh: '官方价格按 $1 = {{symbol}}{{rate}} 折算',
  'zh-TW': '官方價格按 $1 = {{symbol}}{{rate}} 折算',
  fr: 'Official prices use $1 = {{symbol}}{{rate}}',
  ja: 'Official prices use $1 = {{symbol}}{{rate}}',
  ru: 'Official prices use $1 = {{symbol}}{{rate}}',
  vi: 'Official prices use $1 = {{symbol}}{{rate}}',
}

for (const loc of Object.keys(translations)) {
  const p = path.join(localesDir, `${loc}.json`)
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  const t = j.translation || j
  if (t[bad] !== undefined) delete t[bad]
  t[good] = translations[loc]
  fs.writeFileSync(p, JSON.stringify(j, null, 4) + '\n')
  console.log('ok', loc)
}

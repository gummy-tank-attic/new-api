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

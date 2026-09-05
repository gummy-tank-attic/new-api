import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'

const root = process.cwd()

function fail(message) {
  console.error(`performance regression: ${message}`)
  process.exitCode = 1
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

const sourceChecks = [
  {
    file: 'src/routes/__root.tsx',
    forbidden: 'getSetupStatus',
    message: 'the root route must not block paint on /api/setup',
  },
  {
    file: 'src/i18n/config.ts',
    forbidden: 'preloadRest',
    message: 'unused locale packs must not preload during startup',
  },
  {
    file: 'src/i18n/config.ts',
    forbidden: "i18next-browser-languagedetector",
    message: 'LanguageDetector must not persist a temporary en locale',
  },
  {
    file: 'src/features/home/index.tsx',
    forbidden: 'if (!isLoaded)',
    message: 'the default home must paint before custom-content revalidation',
  },
  {
    file: 'src/features/home/components/hero-terminal-demo.tsx',
    forbidden: 'setInterval(',
    message: 'above-the-fold content must not auto-cycle and reset LCP',
  },
]

for (const check of sourceChecks) {
  if (read(check.file).includes(check.forbidden)) {
    fail(`${check.file}: ${check.message}`)
  }
}

for (const file of ['src/lib/auth-session.ts', 'src/lib/http-client.ts']) {
  const source = read(file)
  if (/['"]Cache-Control['"]\s*:/.test(source)) {
    fail(`${file}: global API headers must not force CORS preflights`)
  }
  if (source.includes('import.meta.env?.')) {
    fail(
      `${file}: optional chaining on import.meta.env breaks the production bundle`
    )
  }
}

for (const file of [
  'src/lib/api.ts',
  'src/features/home/api.ts',
  'src/features/setup/api.ts',
]) {
  if (!read(file).includes('PUBLIC_API_REQUEST_CONFIG')) {
    fail(`${file}: public reads must use PUBLIC_API_REQUEST_CONFIG`)
  }
}

const htmlPath = path.join(root, 'dist', 'index.html')
if (!fs.existsSync(htmlPath)) {
  fail('dist/index.html is missing; run the production build first')
} else {
  const html = fs.readFileSync(htmlPath, 'utf8')
  const assetMatches = [
    ...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))"/g),
  ]
  const assets = assetMatches.map((match) => match[1].replace(/^\//, ''))
  const scripts = assets.filter((asset) => asset.endsWith('.js'))
  const styles = assets.filter((asset) => asset.endsWith('.css'))

  for (const script of scripts.filter((asset) =>
    asset.startsWith('static/js/index.')
  )) {
    if (read(path.join('dist', script)).includes('(void 0)()')) {
      fail(`${script}: production entry contains an undefined function call`)
    }
  }

  const gzipBytes = (asset) =>
    gzipSync(fs.readFileSync(path.join(root, 'dist', asset))).byteLength
  const scriptBytes = scripts.reduce((sum, asset) => sum + gzipBytes(asset), 0)
  const styleBytes = styles.reduce((sum, asset) => sum + gzipBytes(asset), 0)
  const totalBytes = scriptBytes + styleBytes

  const limits = {
    scripts: 6,
    styles: 3,
    scriptBytes: 700 * 1024,
    styleBytes: 80 * 1024,
    totalBytes: 760 * 1024,
  }

  if (scripts.length > limits.scripts) {
    fail(`initial script count ${scripts.length} exceeds ${limits.scripts}`)
  }
  if (styles.length > limits.styles) {
    fail(`initial stylesheet count ${styles.length} exceeds ${limits.styles}`)
  }
  if (scriptBytes > limits.scriptBytes) {
    fail(`initial JS gzip ${scriptBytes} exceeds ${limits.scriptBytes} bytes`)
  }
  if (styleBytes > limits.styleBytes) {
    fail(`initial CSS gzip ${styleBytes} exceeds ${limits.styleBytes} bytes`)
  }
  if (totalBytes > limits.totalBytes) {
    fail(`initial asset gzip ${totalBytes} exceeds ${limits.totalBytes} bytes`)
  }

  const htmlSource = fs.readFileSync(htmlPath, 'utf8')
  if (!htmlSource.includes('__MR_I18N__')) {
    fail('index.html must start locale fetches before the app bundle')
  }

  const localeFiles = [
    'en.json',
    'zh.json',
    'zh-TW.json',
    'fr.json',
    'ja.json',
    'ru.json',
    'vi.json',
    'es.json',
    'pt.json',
  ]
  for (const file of localeFiles) {
    const localePath = path.join(root, 'dist', 'locales', file)
    if (!fs.existsSync(localePath)) {
      fail(`dist/locales/${file} is missing from the production build`)
    }
  }

  console.log(
    `performance check: ${scripts.length} scripts, ${styles.length} styles, ` +
      `${Math.round(totalBytes / 1024)} KiB initial gzip`
  )
}

if (process.exitCode) process.exit(process.exitCode)

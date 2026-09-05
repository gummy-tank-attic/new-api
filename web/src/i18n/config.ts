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
/**
 * i18n bootstrap — preferred-locale-first (no English flash).
 *
 * - index.html detects language and starts /locales/*.json in parallel with JS.
 * - This module consumes that in-flight fetch; it does not wait to start it.
 * - Other languages load only when the user selects them.
 * - Never init with temporary `en`, and never write `en` to i18nextLng first.
 */
import i18n, { type Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'

import {
  convertDetectedLanguage,
  INTERFACE_LANGUAGE_OPTIONS,
  type InterfaceLanguageCode,
} from './languages'

export const SUPPORTED_LANGS = INTERFACE_LANGUAGE_OPTIONS.map((l) => l.code)

/** Stable public filenames. Must match index.html boot + rsbuild copy. */
export const LOCALE_PUBLIC_FILES: Record<InterfaceLanguageCode, string> = {
  en: 'en',
  zhCN: 'zh',
  zhTW: 'zh-TW',
  fr: 'fr',
  ja: 'ja',
  ru: 'ru',
  vi: 'vi',
}

type LocaleFile = {
  translation?: Record<string, unknown>
  [key: string]: unknown
}

type LocaleModule = { default: LocaleFile }

const localeLoaders: Record<
  InterfaceLanguageCode,
  () => Promise<LocaleModule>
> = {
  en: () => import('./locales/en.json'),
  zhCN: () => import('./locales/zh.json'),
  fr: () => import('./locales/fr.json'),
  ru: () => import('./locales/ru.json'),
  ja: () => import('./locales/ja.json'),
  vi: () => import('./locales/vi.json'),
  zhTW: () => import('./locales/zh-TW.json'),
}

type BootPrefetch = {
  lng: string
  preferred: Promise<LocaleFile>
  en?: Promise<LocaleFile>
}

function getBootPrefetch(): BootPrefetch | undefined {
  if (typeof window === 'undefined') return undefined
  const boot = window.__MR_I18N__
  if (!boot || typeof boot.lng !== 'string' || !boot.preferred) return undefined
  return boot
}

function isSupportedLang(code: string): code is InterfaceLanguageCode {
  return (SUPPORTED_LANGS as readonly string[]).includes(code)
}

export function resolveInterfaceLanguage(
  raw?: string | null
): InterfaceLanguageCode {
  if (!raw) return 'en'
  const trimmed = raw.trim()
  if (isSupportedLang(trimmed)) return trimmed

  const converted = convertDetectedLanguage(trimmed)
  if (isSupportedLang(converted)) return converted

  const lower = trimmed.replaceAll('_', '-').toLowerCase()
  if (lower.startsWith('zh')) {
    return convertDetectedLanguage(trimmed) === 'zhTW' ? 'zhTW' : 'zhCN'
  }
  const base = lower.split('-')[0]
  if (isSupportedLang(base)) return base
  return 'en'
}

function persistResolvedLanguage(lng: InterfaceLanguageCode): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('i18nextLng', lng)
    }
  } catch {
    /* empty */
  }
}

export function detectPreferredLanguage(): InterfaceLanguageCode {
  try {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('i18nextLng')
      if (stored) return resolveInterfaceLanguage(stored)
    }
  } catch {
    /* empty */
  }

  try {
    if (typeof navigator !== 'undefined') {
      let list: string[] = []
      if (navigator.languages?.length > 0) {
        list = [...navigator.languages]
      } else if (navigator.language) {
        list = [navigator.language]
      }
      for (const tag of list) {
        return resolveInterfaceLanguage(tag)
      }
    }
  } catch {
    /* empty */
  }

  return 'en'
}

function localePublicUrl(code: InterfaceLanguageCode): string {
  return `/locales/${LOCALE_PUBLIC_FILES[code]}.json`
}

async function fetchLocaleFile(
  code: InterfaceLanguageCode
): Promise<LocaleFile> {
  const response = await fetch(localePublicUrl(code), {
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new Error(`Failed to load locale ${code}: ${response.status}`)
  }
  return (await response.json()) as LocaleFile
}

async function loadLocaleFile(
  code: InterfaceLanguageCode
): Promise<LocaleFile> {
  const boot = getBootPrefetch()
  if (boot) {
    if (boot.lng === code) {
      try {
        return await boot.preferred
      } catch {
        /* fall through */
      }
    }
    if (code === 'en' && boot.en) {
      try {
        return await boot.en
      } catch {
        /* fall through */
      }
    }
  }

  if (typeof fetch === 'function') {
    try {
      return await fetchLocaleFile(code)
    } catch {
      /* tests / missing public copy */
    }
  }

  const mod = await localeLoaders[code]()
  return mod.default
}

function registerLocale(code: InterfaceLanguageCode, data: LocaleFile): void {
  // Locale JSON shape: { translation: { ...keys } } (upstream)
  const bundle = (data.translation ?? data) as Record<string, unknown>
  i18n.addResourceBundle(code, 'translation', bundle, true, true)
}

export async function ensureLocaleLoaded(
  code: InterfaceLanguageCode
): Promise<void> {
  if (i18n.hasResourceBundle(code, 'translation')) return
  const data = await loadLocaleFile(code)
  registerLocale(code, data)
}

let initPromise: Promise<typeof i18n> | null = null

export function initI18n(): Promise<typeof i18n> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const boot = getBootPrefetch()
    const lng = boot
      ? resolveInterfaceLanguage(boot.lng)
      : detectPreferredLanguage()

    const [enFile, preferredFile] = await Promise.all([
      loadLocaleFile('en'),
      lng === 'en' ? Promise.resolve(null) : loadLocaleFile(lng),
    ])

    const resources: Record<string, LocaleFile> = {
      en: enFile,
    }
    if (lng !== 'en' && preferredFile) {
      resources[lng] = preferredFile
    }

    // Detect ourselves. LanguageDetector can persist a temporary `en` before
    // the real pack is ready — that is the new-tab / hard-refresh English bug.
    await i18n.use(initReactI18next).init({
      resources: resources as Resource,
      lng,
      fallbackLng: 'en',
      supportedLngs: [...SUPPORTED_LANGS],
      nonExplicitSupportedLngs: true,
      load: 'currentOnly',
      nsSeparator: false,
      debug: import.meta.env.DEV,
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    })

    persistResolvedLanguage(lng)

    const originalChangeLanguage = i18n.changeLanguage.bind(i18n)
    i18n.changeLanguage = async (next, callback) => {
      const resolved = resolveInterfaceLanguage(
        typeof next === 'string' ? next : undefined
      )
      await ensureLocaleLoaded(resolved)
      const result = await originalChangeLanguage(resolved, callback)
      persistResolvedLanguage(resolved)
      return result
    }

    return i18n
  })()

  return initPromise
}

export default i18n

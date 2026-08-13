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
 * - Detect language from localStorage / navigator *before* init.
 * - Load only that pack + `en` fallback, then render.
 * - Preload the rest after idle so switchers stay fast.
 * - Never init with temporary `en` while waiting for zh/etc (see FRONTEND_I18N.md).
 */
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import {
  convertDetectedLanguage,
  INTERFACE_LANGUAGE_OPTIONS,
  type InterfaceLanguageCode,
} from './languages'

export const SUPPORTED_LANGS = INTERFACE_LANGUAGE_OPTIONS.map((l) => l.code)

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

function isSupportedLang(code: string): code is InterfaceLanguageCode {
  return (SUPPORTED_LANGS as readonly string[]).includes(code)
}

export function resolveInterfaceLanguage(
  raw?: string | null
): InterfaceLanguageCode {
  if (!raw) return 'en'
  const trimmed = raw.trim()
  const converted = convertDetectedLanguage(trimmed)
  if (isSupportedLang(converted)) return converted
  if (isSupportedLang(trimmed)) return trimmed

  const lower = converted.replaceAll('_', '-').toLowerCase()
  if (lower.startsWith('zh')) {
    return convertDetectedLanguage(converted) === 'zhTW' ? 'zhTW' : 'zhCN'
  }
  const base = lower.split('-')[0]
  if (isSupportedLang(base)) return base
  return 'en'
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
      const list =
        navigator.languages?.length > 0
          ? [...navigator.languages]
          : navigator.language
            ? [navigator.language]
            : []
      for (const tag of list) {
        return resolveInterfaceLanguage(tag)
      }
    }
  } catch {
    /* empty */
  }

  return 'en'
}

async function loadLocaleFile(code: InterfaceLanguageCode): Promise<LocaleFile> {
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
    const lng = detectPreferredLanguage()

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

    await i18n.use(LanguageDetector).use(initReactI18next).init({
      resources: resources as any,
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
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        convertDetectedLanguage,
      },
      react: {
        useSuspense: false,
      },
    })

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('i18nextLng', lng)
      }
    } catch {
      /* empty */
    }

    // Ensure changeLanguage always has the pack before switching.
    const originalChangeLanguage = i18n.changeLanguage.bind(i18n)
    i18n.changeLanguage = async (next, callback) => {
      const resolved = resolveInterfaceLanguage(
        typeof next === 'string' ? next : undefined
      )
      await ensureLocaleLoaded(resolved)
      return originalChangeLanguage(resolved, callback)
    }

    const preloadRest = () => {
      void (async () => {
        for (const code of SUPPORTED_LANGS) {
          if (code === 'en' || code === lng) continue
          try {
            await ensureLocaleLoaded(code)
          } catch {
            /* ignore */
          }
        }
      })()
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => preloadRest(), { timeout: 5000 })
    } else {
      setTimeout(preloadRest, 1500)
    }

    return i18n
  })()

  return initPromise
}

export default i18n

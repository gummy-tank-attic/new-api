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

/** localStorage key for last custom home page body (markdown/html/url). */
export const HOME_PAGE_CONTENT_STORAGE_KEY = 'home_page_content'

/** localStorage key for server-provided content hash (sha256[:8]). */
export const HOME_PAGE_CONTENT_HASH_STORAGE_KEY = 'home_page_content_hash'

export type HomeContentCacheSnapshot = {
  content: string
  hasCache: boolean
}

function readStatusHomeContentHash(): string | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem('status')
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      home_page_content_hash?: unknown
      data?: { home_page_content_hash?: unknown }
    }
    const hash = parsed.home_page_content_hash ?? parsed.data?.home_page_content_hash
    return typeof hash === 'string' && hash.length > 0 ? hash : null
  } catch {
    return null
  }
}

export function clearHomePageContentCache(): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(HOME_PAGE_CONTENT_STORAGE_KEY)
    window.localStorage.removeItem(HOME_PAGE_CONTENT_HASH_STORAGE_KEY)
  } catch {
    /* empty */
  }
}

export function writeHomePageContentCache(
  content: string,
  hash?: string | null
): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(HOME_PAGE_CONTENT_STORAGE_KEY, content)
    if (hash) {
      window.localStorage.setItem(HOME_PAGE_CONTENT_HASH_STORAGE_KEY, hash)
    } else {
      window.localStorage.removeItem(HOME_PAGE_CONTENT_HASH_STORAGE_KEY)
    }
  } catch {
    /* empty */
  }
}

/**
 * Sync read for SWR first paint.
 * Drops the cache when a known status hash disagrees (or when legacy cache
 * lacks a hash while status already advertises one).
 */
export function readHomePageContentCache(): HomeContentCacheSnapshot {
  try {
    if (typeof window === 'undefined') {
      return { content: '', hasCache: false }
    }
    const content = window.localStorage.getItem(HOME_PAGE_CONTENT_STORAGE_KEY)
    if (content === null) {
      return { content: '', hasCache: false }
    }

    const localHash = window.localStorage.getItem(
      HOME_PAGE_CONTENT_HASH_STORAGE_KEY
    )
    const statusHash = readStatusHomeContentHash()

    if (statusHash) {
      if (!localHash || localHash !== statusHash) {
        clearHomePageContentCache()
        return { content: '', hasCache: false }
      }
    }

    return { content, hasCache: true }
  } catch {
    return { content: '', hasCache: false }
  }
}

/**
 * When /api/status returns a new hash, drop mismatched home content so the
 * next home mount (or in-session revalidate) does not keep deleted content.
 */
export function invalidateHomePageContentCacheIfHashMismatch(
  statusHash: unknown
): boolean {
  if (typeof statusHash !== 'string' || !statusHash) return false
  try {
    if (typeof window === 'undefined') return false
    const localHash = window.localStorage.getItem(
      HOME_PAGE_CONTENT_HASH_STORAGE_KEY
    )
    const hasContent =
      window.localStorage.getItem(HOME_PAGE_CONTENT_STORAGE_KEY) !== null
    if (!hasContent) return false
    if (localHash === statusHash) return false
    clearHomePageContentCache()
    return true
  } catch {
    return false
  }
}

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
import { useEffect, useState } from 'react'

import { isHttpUrl } from '@/lib/content-format'

import { getHomePageContent } from '../api'
import {
  clearHomePageContentCache,
  readHomePageContentCache,
  writeHomePageContentCache,
} from '../lib/home-content-cache'
import type { HomePageContentResult } from '../types'

/**
 * Hook to load and manage custom home page content.
 * Supports both Markdown/HTML content and iframe URLs.
 *
 * SWR: if localStorage has a previous value (and status hash still matches),
 * first paint uses it and revalidates in the background. First visit without
 * cache still waits on the API (or falls through to the default home on failure).
 */
export function useHomePageContent(): HomePageContentResult {
  const [snapshot] = useState(readHomePageContentCache)
  const [content, setContent] = useState(snapshot.content)
  const [isLoaded, setIsLoaded] = useState(snapshot.hasCache)

  useEffect(() => {
    let mounted = true

    const revalidate = async () => {
      try {
        const response = await getHomePageContent()
        const { success, data, hash } = response

        if (!mounted) return

        if (success && data) {
          setContent(data)
          writeHomePageContentCache(data, hash)
        } else if (success) {
          // Explicit empty from server: show default home and drop stale cache.
          setContent('')
          clearHomePageContentCache()
        }
      } catch (error) {
        if (!mounted) return
        // Keep cached content if any; don't toast on every refresh (slow/flaky API
        // made homepage reloads feel broken). Empty default home still works.
        // eslint-disable-next-line no-console
        console.warn('Failed to load home page content:', error)
      } finally {
        if (mounted) {
          setIsLoaded(true)
        }
      }
    }

    void revalidate()

    return () => {
      mounted = false
    }
  }, [])

  const isUrl = isHttpUrl(content)

  return { content, isLoaded, isUrl }
}

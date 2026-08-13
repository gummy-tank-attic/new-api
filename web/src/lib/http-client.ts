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
import axios, { type AxiosRequestConfig } from 'axios'
import { t } from 'i18next'
import { toast } from 'sonner'

import {
  applyAuthRotation,
  clearAuthentication,
  refreshAuthentication,
} from '@/lib/auth-session'
import { getServerErrorMessageKey } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipBusinessError?: boolean
    skipErrorHandler?: boolean
    disableDuplicate?: boolean
    skipAuthRefresh?: boolean
    /** Do not attach Authorization (public endpoints that must ignore stale tokens). */
    skipAuth?: boolean
    authRetry?: boolean
    acceptAuthRotation?: boolean
  }
}

export type ApiRequestConfig = AxiosRequestConfig

/** MetaRtr production: static site on www, API on api (no Pages BFF). */
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.PROD ? 'https://api.metartr.com' : '')

/** Default request timeout (ms). Prevents infinite pending skeleton on hung Tunnel/API. */
export const DEFAULT_API_TIMEOUT_MS = 20_000

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: DEFAULT_API_TIMEOUT_MS,
  headers: {
    'Cache-Control': 'no-store',
  },
})

const inFlightGet = new Map<string, Promise<unknown>>()
const originalGet = api.get.bind(api)

api.get = ((url: string, config: ApiRequestConfig = {}) => {
  if (config.disableDuplicate) return originalGet(url, config)

  const params = config.params ? JSON.stringify(config.params) : '{}'
  const sessionSID = useAuthStore.getState().auth.session?.sid || 'anonymous'
  const key = `${sessionSID}:${url}?${params}`
  const existingRequest = inFlightGet.get(key)
  if (existingRequest) return existingRequest

  const request = originalGet(url, config).finally(() => {
    inFlightGet.delete(key)
  })
  inFlightGet.set(key, request)
  return request
}) as typeof api.get

function redirectToSignIn(): void {
  if (
    typeof window !== 'undefined' &&
    window.location.pathname !== '/sign-in'
  ) {
    window.location.replace('/sign-in')
  }
}

/** Marketing / auth entry routes: never spam "session expired" toasts. */
function isPublicAppPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/') return true
  const prefixes = [
    '/pricing',
    '/about',
    '/docs',
    '/rankings',
    '/user-agreement',
    '/privacy-policy',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/reset-password-confirm',
    '/otp',
    '/oauth',
    '/setup',
    '/401',
    '/403',
    '/404',
    '/500',
    '/503',
  ]
  return prefixes.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  )
}

function isOnPublicAppPage(): boolean {
  return typeof window !== 'undefined' && isPublicAppPath(window.location.pathname)
}

/**
 * Session is gone (expired / revoked / refresh failed).
 * - Public pages: demote to guest quietly (no toast, no hard redirect).
 * - Console / authenticated app: toast + send user to sign-in.
 */
function handleSessionLost(options: {
  skipErrorHandler?: boolean
  /** When true, redirect to sign-in on non-public pages. */
  redirectToSignIn?: boolean
}): void {
  // Ensure local UI does not keep showing a ghost logged-in avatar.
  clearAuthentication(false)

  if (isOnPublicAppPage()) {
    return
  }

  if (!options.skipErrorHandler) {
    toast.error(t('Session expired!'))
  }
  if (options.redirectToSignIn !== false) {
    redirectToSignIn()
  }
}

api.interceptors.response.use(
  (response) => {
    if (response.config.acceptAuthRotation && response.data?.success === true) {
      applyAuthRotation(response.data.data)
    }

    if (
      !response.config.skipBusinessError &&
      typeof response.data?.success === 'boolean' &&
      !response.data.success
    ) {
      const messageKey = getServerErrorMessageKey(response.data)
      toast.error(
        messageKey
          ? t(messageKey)
          : response.data.message || t('Request failed')
      )
    }
    return response
  },
  async (error) => {
    const config = error?.config as ApiRequestConfig | undefined
    const skipErrorHandler = config?.skipErrorHandler
    const status = error?.response?.status

    if (status === 401) {
      if (config && !config.skipAuthRefresh && !config.authRetry) {
        config.authRetry = true
        const outcome = await refreshAuthentication()
        if (outcome.kind === 'authenticated') {
          const token = useAuthStore.getState().auth.accessToken
          if (token) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${token}`,
            }
          }
          return api.request(config)
        }

        if (outcome.kind === 'anonymous' || outcome.kind === 'out_of_sync') {
          // Silent on public pages; console still gets toast + sign-in.
          handleSessionLost({
            skipErrorHandler,
            redirectToSignIn: true,
          })
        }
        // transient_error: do not toast "session expired" — may be network blip
      } else if (config?.authRetry) {
        handleSessionLost({
          skipErrorHandler,
          redirectToSignIn: true,
        })
      } else {
        // skipAuthRefresh: public APIs often 401 on stale bearer (TryUserAuth).
        // Never toast on public pages; soft-clear ghost session if present.
        if (isOnPublicAppPage()) {
          if (useAuthStore.getState().auth.user) {
            clearAuthentication(false)
          }
        } else if (!skipErrorHandler) {
          toast.error(t('Session expired!'))
        }
      }
    } else if (!skipErrorHandler) {
      const messageKey = getServerErrorMessageKey(error)
      const message = messageKey
        ? t(messageKey)
        : error?.response?.data?.message ||
          error?.message ||
          t('Request failed')
      toast.error(message)
    }
    throw error
  }
)

api.interceptors.request.use((config) => {
  if (config.skipAuth) {
    if (config.headers) {
      delete (config.headers as Record<string, unknown>).Authorization
      delete (config.headers as Record<string, unknown>).authorization
    }
    return config
  }
  const accessToken = useAuthStore.getState().auth.accessToken
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

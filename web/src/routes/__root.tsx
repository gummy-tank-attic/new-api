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
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'

import { NavigationProgress } from '@/components/navigation-progress'
import { Toaster } from '@/components/ui/sonner'
import { ThemeCustomizationProvider } from '@/context/theme-customization-provider'
import { saveAffiliateCode } from '@/features/auth/lib/storage'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { shouldRedirectToSetup } from '@/features/setup/lib/setup-redirect'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import {
  bootstrapAuthentication,
  clearAuthenticatedClientState,
  clearAuthentication,
} from '@/lib/auth-session'
import { subscribeAuthSessionEvents } from '@/lib/auth-session-sync'
import { resolveLegacyRoute } from '@/lib/legacy-route'
import { useAuthStore } from '@/stores/auth-store'

/** Dev-only tooling — dynamic so production entry never pulls these packages. */
const DevtoolsLazy = lazy(async () => {
  const [{ ReactQueryDevtools }, { TanStackRouterDevtools }] =
    await Promise.all([
      import('@tanstack/react-query-devtools'),
      import('@tanstack/react-router-devtools'),
    ])
  return {
    default: function Devtools() {
      return (
        <>
          <ReactQueryDevtools buttonPosition='bottom-left' />
          <TanStackRouterDevtools position='bottom-right' />
        </>
      )
    },
  }
})

function RootComponent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Single /api/status load (react-query, correct API host). Syncs brand config into the store.
  // Do NOT useSystemConfig({ autoLoad: true }) — that used relative /api/status and hit Pages HTML.
  const { status } = useStatus()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  // Read store + preload logo only; no second status request.
  useSystemConfig({ autoLoad: false })

  useEffect(() => {
    if (!shouldRedirectToSetup(status, pathname)) return
    void navigate({ to: '/setup', replace: true })
  }, [navigate, pathname, status])

  useEffect(() => {
    const aff = new URLSearchParams(window.location.search).get('aff')?.trim()
    if (aff) {
      saveAffiliateCode(aff)
    }
  }, [])

  useEffect(
    () =>
      useAuthStore.subscribe((state, previousState) => {
        const sid = state.auth.session?.sid
        const previousSID = previousState.auth.session?.sid
        if (sid !== previousSID) {
          queryClient.clear()
        }
      }),
    [queryClient]
  )

  useEffect(
    () =>
      subscribeAuthSessionEvents((event) => {
        const currentSID = useAuthStore.getState().auth.session?.sid

        if (event.kind === 'authenticated') {
          if (event.sid === currentSID) return
          if (currentSID) {
            clearAuthentication(false)
          }
          window.location.reload()
          return
        }

        if (currentSID && event.sid === currentSID) {
          clearAuthenticatedClientState(queryClient, false)
          void navigate({ to: '/sign-in', replace: true })
        }
      }),
    [navigate, queryClient]
  )

  return (
    <ThemeCustomizationProvider>
      <NavigationProgress />
      <Outlet />
      <Toaster closeButton duration={5000} position='top-center' richColors />
      {import.meta.env.MODE === 'development' && (
        <Suspense fallback={null}>
          <DevtoolsLazy />
        </Suspense>
      )}
    </ThemeCustomizationProvider>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  // Start session restore early, but do NOT block public routes (e.g. home) on
  // auth refresh. Authenticated / sign-in routes await bootstrap themselves.
  beforeLoad: async ({ location }) => {
    const legacyTarget = resolveLegacyRoute(location.href)
    if (legacyTarget) {
      throw redirect({ href: legacyTarget, replace: true })
    }

    // Fire-and-forget: warms refresh for protected routes that will await the
    // shared promise. Public pages can paint without waiting on the network.
    void bootstrapAuthentication()
  },
  component: RootComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})

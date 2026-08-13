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
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { RichContent } from '@/components/rich-content'
import { useSystemConfig } from '@/hooks/use-system-config'
import { isHttpUrl, isLikelyHtml } from '@/lib/content-format'
import { cn } from '@/lib/utils'

import { getAboutContent } from './api'
import { ContactSection } from './components/contact-section'

function AboutHero() {
  const { t } = useTranslation()
  const { systemName, logo } = useSystemConfig()
  const brand = systemName || 'MetaRtr'

  return (
    <header className='border-border/50 mb-12 space-y-5 border-b pb-10 text-center sm:mb-14 sm:pb-12 sm:text-left'>
      <div className='flex flex-col items-center gap-4 sm:flex-row sm:items-center'>
        {logo ? (
          <img
            src={logo}
            alt={brand}
            className='border-border/60 size-14 rounded-2xl border object-contain shadow-sm sm:size-16'
            // Avoid a hung remote logo blocking first paint perception.
            loading='eager'
            decoding='async'
            referrerPolicy='no-referrer'
          />
        ) : null}
        <div className='space-y-1.5'>
          <p className='text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase'>
            {t('About')}
          </p>
          <h1 className='text-foreground text-3xl font-semibold tracking-tight sm:text-4xl'>
            {brand}
          </h1>
        </div>
      </div>
      <p className='text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed sm:mx-0 sm:text-lg'>
        {t(
          'MetaRtr is a unified AI API gateway — one endpoint for multiple models, transparent pricing, and reliable routing for builders.'
        )}
      </p>
    </header>
  )
}

function AboutShell(props: {
  children?: ReactNode
  showDefaultIntro?: boolean
  className?: string
}) {
  return (
    <PublicLayout showMainContainer={false} showFooter={false}>
      <div
        className={cn(
          'mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14',
          props.className
        )}
      >
        {props.showDefaultIntro !== false ? <AboutHero /> : null}
        {props.children}
        <div className={props.children ? 'mt-14 sm:mt-16' : undefined}>
          <ContactSection />
        </div>
      </div>
    </PublicLayout>
  )
}

export function About() {
  const { t } = useTranslation()
  // Do not gate first paint on /api/about (empty for MetaRtr). CMS content
  // only upgrades the page when present; failures fall back to brand shell.
  const { data } = useQuery({
    queryKey: ['about-content'],
    queryFn: getAboutContent,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
  })

  const rawContent = data?.data?.trim() ?? ''
  const hasContent = rawContent.length > 0
  const isUrl = hasContent && isHttpUrl(rawContent)
  const contentIsHtml = hasContent && isLikelyHtml(rawContent)

  if (isUrl) {
    return (
      <PublicLayout showMainContainer={false} showFooter={false}>
        <iframe
          src={rawContent}
          className='h-[calc(100vh-3.5rem-12rem)] w-full border-0'
          title={t('About')}
          sandbox='allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts'
        />
        <div className='border-border/50 border-t px-4 py-10 sm:px-6'>
          <ContactSection />
        </div>
      </PublicLayout>
    )
  }

  if (contentIsHtml) {
    return (
      <AboutShell showDefaultIntro={false}>
        <RichContent
          mode='html'
          htmlVariant='isolated'
          content={rawContent}
          className='prose-neutral dark:prose-invert max-w-none'
        />
      </AboutShell>
    )
  }

  if (hasContent) {
    return (
      <AboutShell showDefaultIntro={false}>
        <RichContent
          mode='markdown'
          content={rawContent}
          className='prose-neutral dark:prose-invert max-w-none'
        />
      </AboutShell>
    )
  }

  // Default MetaRtr about + contact: paints immediately (no skeleton wait).
  return <AboutShell />
}

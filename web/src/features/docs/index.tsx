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
import { getRouteApi, Link } from '@tanstack/react-router'
import { Check, Code, Copy, Image as ImageIcon, Menu, Server } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

import { DocsNav } from './components/docs-nav'
import { SectionContent } from './components/section-content'
import {
  API_BASE_URL,
  API_IMAGES_ENDPOINT,
  DEFAULT_DOCS_SECTION,
  DOCS_NAV,
  isDocsSectionId,
  type DocsSectionId,
} from './constants'

const docsRouteApi = getRouteApi('/docs/')

export function Docs() {
  const { t } = useTranslation()
  const search = docsRouteApi.useSearch()
  const activeSection: DocsSectionId = isDocsSectionId(search.s)
    ? search.s
    : DEFAULT_DOCS_SECTION

  const [copiedBase, setCopiedBase] = useState(false)
  const [copiedImages, setCopiedImages] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [activeSection])

  const handleCopyBaseUrl = () => {
    void navigator.clipboard.writeText(API_BASE_URL)
    setCopiedBase(true)
    setTimeout(() => setCopiedBase(false), 2000)
  }

  const handleCopyImagesUrl = () => {
    void navigator.clipboard.writeText(API_IMAGES_ENDPOINT)
    setCopiedImages(true)
    setTimeout(() => setCopiedImages(false), 2000)
  }

  const activeLabel =
    DOCS_NAV.find((item) => item.id === activeSection)?.labelKey ?? 'Quick start'

  return (
    <PublicLayout>
      <div className='mx-auto max-w-6xl px-4 py-8 sm:py-10'>
        <div className='mb-8 space-y-6'>
          <div className='space-y-2.5'>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold'>
                <Code className='size-3.5' />
                <span>{t('API Documentation')}</span>
              </div>
              <span className='text-muted-foreground text-xs'>
                {t('OpenAI API Compatible')}
              </span>
            </div>
            <h1 className='text-3xl font-extrabold tracking-tight sm:text-4xl'>
              {t('MetaRtr Docs')}
            </h1>
            <p className='text-muted-foreground max-w-3xl text-sm sm:text-base'>
              {t(
                'Guides for Base URL, API keys, Claude Code, Codex, Cursor, and OpenAI-compatible SDKs.'
              )}
            </p>
          </div>

          {/* Dual Endpoints Balanced Grid */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {/* Card 1: Base URL */}
            <div
              className={cn(
                'bg-card flex flex-col justify-between gap-3.5 rounded-2xl border p-4 shadow-sm transition-all hover:border-primary/40'
              )}
            >
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2.5'>
                  <div className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-xl shadow-sm shrink-0'>
                    <Server className='size-4' />
                  </div>
                  <div>
                    <div className='text-muted-foreground text-[11px] font-bold tracking-wider uppercase'>
                      {t('Base URL')}
                    </div>
                    <div className='text-muted-foreground text-xs'>
                      {t('Chat, Coding & SDKs')}
                    </div>
                  </div>
                </div>
                <Button onClick={handleCopyBaseUrl} size='sm' className='gap-1.5 shrink-0'>
                  {copiedBase ? (
                    <Check className='size-3.5 text-emerald-400' />
                  ) : (
                    <Copy className='size-3.5' />
                  )}
                  <span>{copiedBase ? t('Copied') : t('Copy Base URL')}</span>
                </Button>
              </div>
              <div className='bg-muted/60 text-primary flex items-center justify-between rounded-xl px-3.5 py-2.5 font-mono text-xs font-semibold sm:text-sm'>
                <span className='truncate'>{API_BASE_URL}</span>
              </div>
            </div>

            {/* Card 2: Image & Video Endpoint */}
            <div
              className={cn(
                'bg-card flex flex-col justify-between gap-3.5 rounded-2xl border p-4 shadow-sm transition-all hover:border-violet-500/40'
              )}
            >
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2.5'>
                  <div className='bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex size-8 items-center justify-center rounded-xl shadow-sm shrink-0'>
                    <ImageIcon className='size-4' />
                  </div>
                  <div>
                    <div className='text-muted-foreground text-[11px] font-bold tracking-wider uppercase'>
                      {t('Image & Video Endpoint')}
                    </div>
                    <div className='text-muted-foreground text-xs'>
                      {t('Images Generations & Grok Video')}
                    </div>
                  </div>
                </div>
                <Button onClick={handleCopyImagesUrl} size='sm' variant='outline' className='gap-1.5 shrink-0 hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-400'>
                  {copiedImages ? (
                    <Check className='size-3.5 text-emerald-500' />
                  ) : (
                    <Copy className='size-3.5' />
                  )}
                  <span>{copiedImages ? t('Copied') : t('Copy Endpoint')}</span>
                </Button>
              </div>
              <div className='bg-muted/60 text-violet-600 dark:text-violet-400 flex items-center justify-between rounded-xl px-3.5 py-2.5 font-mono text-xs font-semibold sm:text-sm'>
                <span className='truncate'>{API_IMAGES_ENDPOINT}</span>
              </div>
            </div>
          </div>
        </div>

        <div className='flex gap-8'>
          <aside className='hidden w-56 shrink-0 lg:block'>
            <div className='sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2'>
              <DocsNav activeSection={activeSection} />
              <div className='mt-8 border-t pt-4'>
                <Link
                  to='/pricing'
                  className='text-muted-foreground hover:text-primary text-xs font-medium'
                >
                  {t('Model Square')} →
                </Link>
              </div>
            </div>
          </aside>

          <div className='min-w-0 flex-1 space-y-6'>
            <div className='flex items-center gap-2 lg:hidden'>
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger
                  render={
                    <Button
                      variant='outline'
                      size='sm'
                      className='gap-2'
                      type='button'
                    />
                  }
                >
                  <Menu className='size-4' />
                  <span>{t(activeLabel)}</span>
                </SheetTrigger>
                <SheetContent side='left' className='w-[min(100%,20rem)]'>
                  <SheetHeader>
                    <SheetTitle>{t('Docs')}</SheetTitle>
                  </SheetHeader>
                  <div className='mt-4 px-2'>
                    <DocsNav
                      activeSection={activeSection}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <article className='bg-card rounded-2xl border p-5 shadow-sm sm:p-8'>
              <SectionContent section={activeSection} />
            </article>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}

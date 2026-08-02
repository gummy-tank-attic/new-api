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
import { Link } from '@tanstack/react-router'
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

interface FooterLink {
  text: string
  href: string
}

interface FooterColumnProps {
  title: string
  links: FooterLink[]
}

interface FooterProps {
  logo?: string
  name?: string
  columns?: FooterColumnProps[]
  copyright?: string
  className?: string
}

const TELEGRAM_SUPPORT_URL = 'https://t.me/MetaRtrSupport_bot'
const TELEGRAM_CHANNEL_URL = 'https://t.me/MetaRtr'

function FooterLinkItem(props: { link: FooterLink }) {
  const { t } = useTranslation()
  const isExternal = props.link.href.startsWith('http')
  const label = t(props.link.text)

  if (isExternal) {
    return (
      <a
        href={props.link.href}
        target='_blank'
        rel='noopener noreferrer'
        className='text-muted-foreground hover:text-foreground text-sm transition-colors duration-200'
      >
        {label}
      </a>
    )
  }

  return (
    <Link
      to={props.link.href}
      className='text-muted-foreground hover:text-foreground text-sm transition-colors duration-200'
    >
      {label}
    </Link>
  )
}

// Renders User Agreement / Privacy Policy links inline with the parent's
// copyright row when either is configured in System Settings → Site. Emits
// fragmented siblings so the parent flex container's gap controls spacing.
function LegalLinks(props: { leadingSeparator?: boolean }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const items: { key: string; label: string; href: string }[] = []
  if (status?.user_agreement_enabled) {
    items.push({
      key: 'user-agreement',
      label: t('User Agreement'),
      href: '/user-agreement',
    })
  }
  if (status?.privacy_policy_enabled) {
    items.push({
      key: 'privacy-policy',
      label: t('Privacy Policy'),
      href: '/privacy-policy',
    })
  }
  if (items.length === 0) {
    return null
  }
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {(props.leadingSeparator || index > 0) && (
            <span aria-hidden='true' className='text-muted-foreground/30'>
              ·
            </span>
          )}
          <Link
            to={item.href}
            className='hover:text-foreground transition-colors duration-200'
          >
            {item.label}
          </Link>
        </Fragment>
      ))}
    </>
  )
}

/** Plain brand copyright — no external project hyperlink. */
function BrandAttribution(props: {
  currentYear: number
  brandName: string
  inline?: boolean
}) {
  const content = (
    <span className='text-muted-foreground/45'>
      &copy; {props.currentYear} {props.brandName}
    </span>
  )
  if (props.inline) {
    return content
  }
  return (
    <div className='text-muted-foreground/45 text-center text-xs sm:text-right'>
      {content}
    </div>
  )
}

/** Clickable Telegram support + channel entries for the site footer. */
function TelegramFooterLinks(props: { className?: string }) {
  return (
    <div
      className={cn(
        'text-muted-foreground flex min-w-0 flex-col gap-1 text-sm leading-relaxed',
        props.className
      )}
    >
      <a
        href={TELEGRAM_SUPPORT_URL}
        target='_blank'
        rel='noopener noreferrer'
        className='text-foreground/80 hover:text-foreground underline underline-offset-4 transition-colors'
      >
        Telegram Support：MetaRtrSupport_bot
      </a>
      <a
        href={TELEGRAM_CHANNEL_URL}
        target='_blank'
        rel='noopener noreferrer'
        className='text-foreground/80 hover:text-foreground break-all underline underline-offset-4 transition-colors'
      >
        Telegram Channel：https://t.me/MetaRtr
      </a>
    </div>
  )
}

export function Footer(props: FooterProps) {
  const { t } = useTranslation()
  const { systemName, logo: systemLogo, demoSiteEnabled } = useSystemConfig()

  const displayLogo = systemLogo || props.logo || '/logo.png'
  const displayName = systemName || props.name || 'MetaRtr'
  const isDemoSiteMode = Boolean(demoSiteEnabled)
  const currentYear = new Date().getFullYear()

  const fallbackColumns = useMemo<FooterColumnProps[]>(
    () => [
      {
        title: t('footer.columns.about.title'),
        links: [
          {
            text: t('footer.columns.about.links.aboutProject'),
            href: 'https://docs.newapi.pro/wiki/project-introduction/',
          },
          {
            text: t('footer.columns.about.links.contact'),
            href: 'https://docs.newapi.pro/support/community-interaction/',
          },
          {
            text: t('footer.columns.about.links.features'),
            href: 'https://docs.newapi.pro/wiki/features-introduction/',
          },
        ],
      },
      {
        title: t('footer.columns.docs.title'),
        links: [
          {
            text: t('footer.columns.docs.links.quickStart'),
            href: 'https://docs.newapi.pro/getting-started/',
          },
          {
            text: t('footer.columns.docs.links.installation'),
            href: 'https://docs.newapi.pro/installation/',
          },
          {
            text: t('footer.columns.docs.links.apiDocs'),
            href: 'https://docs.newapi.pro/api/',
          },
        ],
      },
      {
        title: t('footer.columns.related.title'),
        links: [
          {
            text: t('footer.columns.related.links.oneApi'),
            href: 'https://github.com/songquanpeng/one-api',
          },
          {
            text: t('footer.columns.related.links.midjourney'),
            href: 'https://github.com/novicezk/midjourney-proxy',
          },
          {
            text: t('footer.columns.related.links.newApiKeyTool'),
            href: 'https://github.com/Calcium-Ion/new-api-key-tool',
          },
        ],
      },
    ],
    [t]
  )

  const displayColumns = props.columns ?? fallbackColumns

  // Compact bar used on MetaRtr (brand + Telegram + legal).
  return (
    <footer
      className={cn('border-border/40 relative z-10 border-t', props.className)}
    >
      <div className='mx-auto w-full max-w-6xl px-6 py-5'>
        <div className='bg-muted/20 border-border/50 flex flex-col items-center justify-between gap-4 rounded-2xl border px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:px-5'>
          <TelegramFooterLinks className='text-center sm:text-left' />
          <div className='border-border/60 text-muted-foreground/45 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t pt-4 text-xs sm:w-auto sm:justify-end sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5'>
            <LegalLinks />
            <BrandAttribution
              currentYear={currentYear}
              brandName={displayName}
              inline
            />
          </div>
        </div>

        {/* Keep full multi-column footer only in demo-site mode */}
        {isDemoSiteMode && (
          <div className='mt-10 flex flex-col justify-between gap-10 md:flex-row md:gap-16'>
            <div className='shrink-0'>
              <Link to='/' className='group flex items-center gap-2.5'>
                <img
                  src={displayLogo}
                  alt={displayName}
                  className='size-7 rounded-lg object-contain'
                />
                <span className='text-sm font-semibold tracking-tight'>
                  {displayName}
                </span>
              </Link>
            </div>
            <div className='grid grid-cols-3 gap-8 md:gap-16'>
              {displayColumns.map((column, index) => (
                <div key={index}>
                  <p className='text-muted-foreground/50 mb-3 text-xs font-medium tracking-wider uppercase'>
                    {t(column.title)}
                  </p>
                  <ul className='space-y-2.5'>
                    {column.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <FooterLinkItem link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}

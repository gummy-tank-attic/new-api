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
import { ArrowUpRight, Mail } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { IconTelegramBrand } from '@/assets/brand-icons'
import { CONTACT } from '@/lib/contact-links'
import { cn } from '@/lib/utils'

type ContactChannel = {
  id: string
  href: string
  handle: string
  titleKey: string
  descriptionKey: string
  ctaKey: string
  icon: ReactNode
  iconWrapClass: string
  isTelegram?: boolean
}

const channels: ContactChannel[] = [
  {
    id: 'support',
    href: CONTACT.supportTelegram.href,
    handle: CONTACT.supportTelegram.handle,
    titleKey: 'Telegram Support',
    descriptionKey:
      'Chat with our support bot for account, billing, and API help.',
    ctaKey: 'Open chat',
    icon: <IconTelegramBrand className='size-6' />,
    iconWrapClass:
      'bg-[#2AABEE]/12 text-[#2AABEE] dark:bg-[#2AABEE]/15 dark:text-[#5BC1F0]',
    isTelegram: true,
  },
  {
    id: 'channel',
    href: CONTACT.channelTelegram.href,
    handle: CONTACT.channelTelegram.handle,
    titleKey: 'Telegram Channel',
    descriptionKey: 'Announcements, product news, and service status updates.',
    ctaKey: 'Join channel',
    icon: <IconTelegramBrand className='size-6' />,
    iconWrapClass:
      'bg-[#2AABEE]/12 text-[#2AABEE] dark:bg-[#2AABEE]/15 dark:text-[#5BC1F0]',
    isTelegram: true,
  },
  {
    id: 'email',
    href: CONTACT.email.href,
    handle: CONTACT.email.handle,
    titleKey: 'Email',
    descriptionKey:
      'For non-urgent inquiries. We typically reply within 1–2 business days.',
    ctaKey: 'Send email',
    icon: <Mail className='size-5' strokeWidth={1.75} />,
    iconWrapClass:
      'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400',
  },
]

function ContactCard(props: { channel: ContactChannel }) {
  const { t } = useTranslation()
  const { channel } = props

  return (
    <a
      href={channel.href}
      target='_blank'
      rel='noopener noreferrer'
      data-contact-card={channel.id}
      className={cn(
        'group border-border/60 bg-card/60 hover:border-border hover:bg-card',
        'relative flex flex-col gap-4 rounded-2xl border p-5 sm:p-6',
        'shadow-sm transition-all duration-200',
        'hover:shadow-md focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
      )}
    >
      {/* Single brand icon only — no duplicate TG glyphs in title/CTA */}
      <div className='flex items-start justify-between gap-3'>
        <div
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-2xl',
            channel.iconWrapClass
          )}
          aria-hidden
        >
          {channel.icon}
        </div>
        <ArrowUpRight className='text-muted-foreground/50 group-hover:text-foreground size-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
      </div>

      <div className='space-y-1.5'>
        <h3 className='text-foreground text-base font-semibold tracking-tight'>
          {t(channel.titleKey)}
        </h3>
        <p className='text-primary/90 font-mono text-sm font-medium tracking-tight'>
          {channel.handle}
        </p>
        <p className='text-muted-foreground text-sm leading-relaxed'>
          {t(channel.descriptionKey)}
        </p>
      </div>

      <span className='text-foreground/80 group-hover:text-foreground mt-auto inline-flex items-center gap-1 text-sm font-medium transition-colors'>
        {t(channel.ctaKey)}
        <ArrowUpRight className='size-3.5 opacity-60' />
      </span>
    </a>
  )
}

export function ContactSection(props: { className?: string }) {
  const { t } = useTranslation()

  return (
    <section
      className={cn('mx-auto w-full max-w-5xl', props.className)}
      aria-labelledby='about-contact-heading'
    >
      <div className='mb-8 space-y-3 text-center sm:mb-10 sm:text-left'>
        <p className='text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase'>
          {t('Contact')}
        </p>
        <h2
          id='about-contact-heading'
          className='text-foreground text-2xl font-semibold tracking-tight sm:text-3xl'
        >
          {t('Get in touch')}
        </h2>
        <p className='text-muted-foreground mx-auto max-w-2xl text-sm leading-relaxed sm:mx-0 sm:text-base'>
          {t(
            'Prefer Telegram for the fastest response. Support bot and channel are open to everyone.'
          )}
        </p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {channels.map((channel) => (
          <ContactCard key={channel.id} channel={channel} />
        ))}
      </div>
    </section>
  )
}

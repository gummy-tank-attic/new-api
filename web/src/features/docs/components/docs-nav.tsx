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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { DOCS_NAV, type DocsSectionId } from '../constants'

type DocsNavProps = {
  activeSection: DocsSectionId
  className?: string
  onNavigate?: () => void
}

export function DocsNav(props: DocsNavProps) {
  const { t } = useTranslation()

  const groups = DOCS_NAV.reduce<
    Array<{ groupKey: string; items: typeof DOCS_NAV }>
  >((acc, item) => {
    const last = acc.at(-1)
    if (last && last.groupKey === item.groupKey) {
      last.items = [...last.items, item]
      return acc
    }
    acc.push({ groupKey: item.groupKey, items: [item] })
    return acc
  }, [])

  return (
    <nav className={cn('space-y-6', props.className)} aria-label={t('Docs')}>
      {groups.map((group) => (
        <div key={group.groupKey} className='space-y-1.5'>
          <div className='text-muted-foreground px-2 text-[11px] font-semibold tracking-wider uppercase'>
            {t(group.groupKey)}
          </div>
          <ul className='space-y-0.5'>
            {group.items.map((item) => {
              const isActive = item.id === props.activeSection
              return (
                <li key={item.id}>
                  <Link
                    to='/docs'
                    search={{ s: item.id }}
                    onClick={props.onNavigate}
                    className={cn(
                      'block rounded-lg px-2.5 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

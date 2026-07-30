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
import { useTranslation } from 'react-i18next'

import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { FILTER_ALL } from '../constants'

export type SupplierTabOption = {
  value: string
  label: string
  count: number
  icon?: string
}

export interface SupplierTabsProps {
  options: SupplierTabOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

function isAllVendorsTab(option: SupplierTabOption): boolean {
  const value = (option.value || '').trim()
  const label = (option.label || '').trim()
  if (value === FILTER_ALL) return true
  if (/^all(\s+vendors?)?$/i.test(value)) return true
  if (/^all(\s+vendors?)?$/i.test(label)) return true
  if (label === '所有供应商' || label === '所有供應商') return true
  return false
}

export function SupplierTabs(props: SupplierTabsProps) {
  const { t } = useTranslation()
  // Never render the synthetic "All Vendors" tab.
  const options = props.options.filter((o) => !isAllVendorsTab(o))

  return (
    <div
      role='tablist'
      aria-label={t('Vendors')}
      className={cn(
        // Surface: card + hairline border (Stripe/Linear chrome)
        'bg-card flex flex-wrap gap-1 rounded-2xl border border-border/70 p-1.5 shadow-sm',
        props.className
      )}
    >
      {options.map((option) => {
        const active = props.value === option.value
        const icon = option.icon ? getLobeIcon(option.icon, 16) : null

        return (
          <button
            key={option.value}
            type='button'
            role='tab'
            aria-selected={active}
            onClick={() => props.onChange(option.value)}
            className={cn(
              // UI 14px — chrome sits below table body
              'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all',
              active
                ? // Brand only for selection, not full solid fill
                  'bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/20'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            {icon}
            <span className='max-w-[11rem] truncate'>{option.label}</span>
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-xs tabular-nums leading-none',
                active
                  ? 'bg-background text-foreground/80 shadow-sm'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {option.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

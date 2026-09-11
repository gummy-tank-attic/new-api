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

import { FILTER_ALL, getDisplayVendorName } from '../constants'

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
        // Surface: Apple / Linear segmented control surface with mobile horizontal scroll track
        'flex w-full flex-nowrap overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap gap-1 rounded-[14px] border border-[#E2E8F0] bg-[#F1F5F9] p-[5px]',
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
              // UI 14px — Apple / Linear segmented item (touch-friendly on mobile, auto-flex on desktop)
              'shrink-0 sm:shrink sm:flex-1 sm:min-w-0 sm:basis-0 inline-flex items-center justify-center gap-2 rounded-[10px] px-3.5 py-[8.5px] text-sm font-medium whitespace-nowrap transition-all duration-150',
              active
                ? 'border border-[#E2E8F0] bg-white font-semibold text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
                : 'border border-transparent text-[#334155] hover:bg-white/75 hover:text-[#0F172A]'
            )}
          >
            {icon}
            <span className='truncate'>
              {getDisplayVendorName(option.label)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

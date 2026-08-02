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

import { cn } from '@/lib/utils'

import {
  lookupGroupMapValue,
  MANUAL_GROUP_SAVINGS_OFF,
  MANUAL_GROUP_ZHE,
} from '../constants'
import { resolveGroupSavingsOffPercent } from '../lib/group-discount'
import { getConfiguredGroupRatio } from '../lib/model-helpers'

export interface GroupPriceCardsProps {
  groups: string[]
  selectedGroup: string | null
  onSelect: (group: string) => void
  groupRatio: Record<string, number>
  usableGroup: Record<string, string>
  className?: string
}

/** Format manual 折 number for badge, e.g. 1 → "1折", 1.4 → "1.4折" */
function formatManualZhe(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  const label = Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, '')
  return `${label}折`
}

export function GroupPriceCards(props: GroupPriceCardsProps) {
  const { t } = useTranslation()

  if (props.groups.length === 0) {
    return (
      <div className='text-muted-foreground rounded-xl border border-dashed px-4 py-7 text-center text-sm'>
        {t('No pricing groups available for this vendor')}
      </div>
    )
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2.5', props.className)}
      role='listbox'
      aria-label={t('Pricing groups')}
    >
      {props.groups.map((group) => {
        const active = props.selectedGroup === group
        const ratio = getConfiguredGroupRatio(props.groupRatio, group)
        const zheRaw = lookupGroupMapValue(MANUAL_GROUP_ZHE, group)
        const zhe =
          typeof zheRaw === 'number' && Number.isFinite(zheRaw)
            ? formatManualZhe(zheRaw)
            : null
        // 任意分组：按倍率换算 N% off（Claude / Codex / DeepSeek / Grok / 智谱…）
        const savingsOff = resolveGroupSavingsOffPercent(
          ratio,
          lookupGroupMapValue(MANUAL_GROUP_SAVINGS_OFF, group)
        )
        // Fixed English copy — never i18n: "85% off"
        const offLabel = savingsOff != null ? `${savingsOff}%\u00A0off` : null

        return (
          <button
            key={group}
            type='button'
            role='option'
            aria-selected={active}
            onClick={() => props.onSelect(group)}
            className={cn(
              // 单行胶囊：名称 + 红色 off；选中用 brand soft
              'inline-flex max-w-full shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-left transition-all',
              active
                ? 'border-primary/40 bg-primary/[0.08] shadow-sm ring-1 ring-primary/15'
                : 'bg-background border-border/70 hover:border-border hover:bg-muted/50'
            )}
          >
            <span className='text-foreground text-[15px] font-medium tracking-tight whitespace-nowrap'>
              {group}
            </span>
            {zhe ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                  active
                    ? 'bg-primary/12 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {zhe}
              </span>
            ) : null}
            {offLabel ? (
              <span className='shrink-0 text-xs leading-none font-semibold tracking-tight whitespace-nowrap text-red-600 dark:text-red-400'>
                {offLabel}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

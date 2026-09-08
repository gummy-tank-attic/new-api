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
  MANUAL_GROUP_OFF_LABEL,
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

/** Clean up multi-line group names from backend (e.g. "Claude lite(Sale)\nClaude lite(促销)") */
function formatGroupDisplayName(group: string, isZh: boolean): string {
  const lines = (group || '')
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (lines.length <= 1) return group
  if (isZh) {
    const zhLine = lines.find((l) => /[\u4e00-\u9fa5]/.test(l))
    if (zhLine) return zhLine
  } else {
    const enLine = lines.find((l) => !/[\u4e00-\u9fa5]/.test(l))
    if (enLine) return enLine
  }
  return lines[0]
}

export function GroupPriceCards(props: GroupPriceCardsProps) {
  const { t, i18n } = useTranslation()
  const isZh = (i18n.language || '').toLowerCase().startsWith('zh')

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
        const displayName = formatGroupDisplayName(group, isZh)
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
        const manualLabel = lookupGroupMapValue(MANUAL_GROUP_OFF_LABEL, group)
        // Fixed English copy — never i18n: "UP TO 50% OFF" or "85% OFF"
        const offLabel =
          manualLabel ?? (savingsOff != null ? `${savingsOff}%\u00A0OFF` : null)

        return (
          <button
            key={group}
            type='button'
            role='option'
            aria-selected={active}
            onClick={() => props.onSelect(group)}
            className={cn(
              // 方案 A 极简流线药丸：轻量级主色边框 + 规整玫瑰红小标
              'inline-flex max-w-full shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-left transition-all duration-150',
              active
                ? 'border-primary/40 bg-primary/[0.06] text-foreground font-medium shadow-xs ring-1 ring-primary/15'
                : 'bg-background border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground'
            )}
          >
            <span
              translate='no'
              className='notranslate text-[14px] font-semibold text-foreground whitespace-nowrap sm:text-[14.5px]'
            >
              {displayName}
            </span>
            {zhe ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {zhe}
              </span>
            ) : null}
            {offLabel ? (
              <span
                translate='no'
                className='notranslate inline-flex shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0 h-[17px] text-[9.5px] font-bold tracking-tight whitespace-nowrap text-white tabular-nums shadow-xs leading-none'
              >
                {offLabel}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

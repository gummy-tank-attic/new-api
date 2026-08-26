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

import { Badge } from '@/components/ui/badge'
import { normalizeGroupName } from '@/features/pricing/constants'
import { resolveGroupDescription } from '@/features/pricing/lib/group-intro-i18n'
import { cn } from '@/lib/utils'

/**
 * 判断分组是否属于 CLI Only / Codex Only 分组
 */
export function isCliOnlyGroup(groupName: string): boolean {
  const norm = normalizeGroupName(groupName)
  return norm.includes('cli only') || norm.includes('codex only')
}

/**
 * 格式化倍率展示文本，如 ×1, ×0.15
 */
export function formatRatioDisplay(ratio?: number | string | null): string {
  if (ratio === undefined || ratio === null || ratio === '') return ''
  return `×${ratio}`
}

export type ApiKeyGroupOptionItemProps = {
  name: string
  desc?: string
  ratio?: number | string
  className?: string
  compact?: boolean
}

/**
 * 分组下拉选项与展示组件（T1 / T2 统一复用）
 * 包含三段：组名 + 中文介绍 + 倍率徽章（×{ratio}），含 CLI Only / Codex Only 红色徽章
 */
export function ApiKeyGroupOptionItem({
  name,
  desc,
  ratio,
  className,
  compact = false,
}: ApiKeyGroupOptionItemProps) {
  const { t } = useTranslation()
  const isCliOnly = isCliOnlyGroup(name)
  const localizedDesc = resolveGroupDescription(t, name, desc || name)
  const ratioText = formatRatioDisplay(ratio)

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center justify-between gap-2',
        className
      )}
    >
      <div className='min-w-0 flex-1 text-left'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <span className='font-medium truncate'>{name}</span>
          {isCliOnly && (
            <Badge
              variant='destructive'
              className='px-1.5 py-0 text-[10px] leading-tight font-normal'
            >
              {t(
                'Claude Code / Codex CLI only'
              )}
            </Badge>
          )}
        </div>
        {!compact && localizedDesc && (
          <p className='text-xs text-muted-foreground line-clamp-1 mt-0.5'>
            {localizedDesc}
          </p>
        )}
      </div>
      {ratioText && (
        <Badge
          variant='outline'
          className='shrink-0 text-xs font-mono font-normal'
        >
          {ratioText}
        </Badge>
      )}
    </div>
  )
}

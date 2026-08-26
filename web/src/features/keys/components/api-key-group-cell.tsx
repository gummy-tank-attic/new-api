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
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { GroupBadge } from '@/components/group-badge'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getPricing } from '@/features/pricing/api'
import { normalizeGroupName } from '@/features/pricing/constants'
import { resolveGroupDescription } from '@/features/pricing/lib/group-intro-i18n'
import { getUserGroups } from '@/lib/api'
import { cn } from '@/lib/utils'

import { updateApiKey } from '../api'
import { ERROR_MESSAGES } from '../constants'
import type { ApiKey, ApiKeyFormData } from '../types'
import {
  ApiKeyGroupOptionItem,
  formatRatioDisplay,
  isCliOnlyGroup,
} from './api-key-group-option-item'
import { useApiKeys } from './api-keys-provider'
import { type GroupRatio, GroupRatioBadge } from './auto-group-visuals'

export type ModelCompatibilityResult = {
  type: 'compatible' | 'partial' | 'incompatible'
}

/**
 * 检查两组的模型兼容性
 */
export function checkGroupModelCompatibility(
  oldGroup: string,
  newGroup: string,
  pricingModels: Array<{ model_name: string; enable_groups: string[] }>
): ModelCompatibilityResult {
  const normOld = normalizeGroupName(oldGroup)
  const normNew = normalizeGroupName(newGroup)
  if (!normOld || !normNew || normOld === normNew) {
    return { type: 'compatible' }
  }

  const oldModels = new Set<string>()
  const newModels = new Set<string>()

  for (const model of pricingModels) {
    const modelGroups = (model.enable_groups || []).map(normalizeGroupName)
    if (modelGroups.includes(normOld)) {
      oldModels.add(model.model_name)
    }
    if (modelGroups.includes(normNew)) {
      newModels.add(model.model_name)
    }
  }

  if (oldModels.size === 0 || newModels.size === 0) {
    return { type: 'compatible' }
  }

  let intersectionCount = 0
  for (const model of oldModels) {
    if (newModels.has(model)) {
      intersectionCount++
    }
  }

  if (intersectionCount === 0) {
    return { type: 'incompatible' }
  }

  if (intersectionCount < oldModels.size) {
    return { type: 'partial' }
  }

  return { type: 'compatible' }
}

/**
 * 构造切组提交载荷：保留令牌全部现有字段，仅变更 group
 */
export function buildGroupSwitchPayload(
  apiKey: ApiKey,
  targetGroup: string
): ApiKeyFormData & { id: number } {
  return {
    id: apiKey.id,
    name: apiKey.name,
    remain_quota: apiKey.remain_quota,
    expired_time: apiKey.expired_time,
    unlimited_quota: apiKey.unlimited_quota,
    model_limits_enabled: apiKey.model_limits_enabled,
    model_limits: apiKey.model_limits || '',
    allow_ips: apiKey.allow_ips || '',
    group: targetGroup,
    auto_groups: [],
    cross_group_retry: false,
  }
}

type ApiKeyGroupCellProps = {
  apiKey?: ApiKey
  crossGroupRetry: boolean
  group: string
  ratio?: GroupRatio
  shouldReduceMotion: boolean
}

export function ApiKeyGroupCell({
  apiKey,
  group,
  ratio,
  shouldReduceMotion,
}: ApiKeyGroupCellProps) {
  const { t } = useTranslation()
  const { triggerRefresh } = useApiKeys()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [targetGroup, setTargetGroup] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ['user-groups'],
    queryFn: getUserGroups,
    staleTime: 0,
  })

  // Fetch pricing data for model compatibility check
  const { data: pricingData } = useQuery({
    queryKey: ['pricing-data-for-group-switch'],
    queryFn: getPricing,
    staleTime: 60_000,
  })

  const groupOptions = useMemo(() => {
    return Object.entries(groupsData?.data || {})
      .filter(([key]) => key !== 'auto')
      .map(([key, info]) => ({
        value: key,
        label: key,
        desc: resolveGroupDescription(t, key, info.desc || key),
        ratio: info.ratio,
      }))
  }, [groupsData, t])

  const filteredOptions = useMemo(() => {
    const search = searchValue.trim().toLowerCase()
    if (!search) return groupOptions

    return groupOptions.filter((option) => {
      const ratioText = String(option.ratio ?? '').toLowerCase()
      return (
        option.value.toLowerCase().includes(search) ||
        option.label.toLowerCase().includes(search) ||
        option.desc?.toLowerCase().includes(search) ||
        ratioText.includes(search)
      )
    })
  }, [groupOptions, searchValue])

  const numericRatio = typeof ratio === 'number' ? ratio : undefined
  const currentRatio =
    numericRatio ??
    (group ? groupsData?.data?.[group]?.ratio : undefined)
  const targetRatio = targetGroup
    ? groupsData?.data?.[targetGroup]?.ratio
    : undefined

  const compatibility = useMemo(() => {
    if (!targetGroup) return { type: 'compatible' as const }
    return checkGroupModelCompatibility(
      group,
      targetGroup,
      pricingData?.data || []
    )
  }, [group, targetGroup, pricingData])

  const handleSelectGroup = (selectedGroup: string) => {
    if (selectedGroup === group) {
      setPopoverOpen(false)
      return
    }
    setTargetGroup(selectedGroup)
    setPopoverOpen(false)
    setConfirmDialogOpen(true)
  }

  const handleConfirmSwitch = async () => {
    if (!apiKey || !targetGroup) return
    setIsSubmitting(true)

    try {
      const res = await updateApiKey(buildGroupSwitchPayload(apiKey, targetGroup))
      if (res.success) {
        toast.success(
          t('Switched to {{group}}, no client configuration changes needed', {
            group: targetGroup,
          })
        )
        setConfirmDialogOpen(false)
        triggerRefresh()
      } else {
        toast.error(res.message || t(ERROR_MESSAGES.UPDATE_FAILED))
      }
    } catch {
      toast.error(t(ERROR_MESSAGES.UNEXPECTED))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <button
                    type='button'
                    className='group/cell inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -ml-1.5 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer'
                  />
                }
              />
            }
          >
            {group === 'auto' ? (
              <div className='flex items-center gap-1.5'>
                <StatusBadge
                  label={t('Cross-group')}
                  variant='info'
                  copyable={false}
                />
                <GroupRatioBadge
                  ratio={ratio}
                  isAuto
                  shouldReduceMotion={shouldReduceMotion}
                />
              </div>
            ) : (
              <GroupBadge group={group} ratio={numericRatio} />
            )}
            <ChevronDown className='size-3 text-muted-foreground transition-transform group-hover/cell:text-foreground shrink-0' />
          </TooltipTrigger>
          <TooltipContent>
            <span>{t('Click to switch group')}</span>
          </TooltipContent>
        </Tooltip>

        <PopoverContent
          className='w-[320px] p-0 shadow-lg'
          align='start'
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t('Search group...')}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList className='max-h-[280px]'>
              <CommandEmpty>{t('No group found.')}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => {
                  const isCurrent = option.value === group
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelectGroup(option.value)}
                      className='data-[selected=true]:bg-muted items-center gap-2.5 rounded-lg px-3 py-2 transition-colors cursor-pointer'
                    >
                      <Check
                        className={cn(
                          'size-4 shrink-0',
                          isCurrent ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <ApiKeyGroupOptionItem
                        name={option.label}
                        desc={option.desc}
                        ratio={option.ratio}
                        compact
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* 确认切换分组对话框 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {t('Confirm Group Switch')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'Please verify the group switch details before applying.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2'>
            {/* 价格倍率对比 */}
            <div className='rounded-lg border bg-muted/40 p-3 space-y-2 text-sm'>
              <div className='text-xs text-muted-foreground font-medium'>
                {t('Price Ratio Comparison')}
              </div>
              <div className='flex items-center justify-between font-medium'>
                <div className='flex items-center gap-1.5'>
                  <span>{group || '-'}</span>
                  {currentRatio !== undefined && (
                    <span className='text-xs font-mono text-muted-foreground'>
                      ({formatRatioDisplay(currentRatio)})
                    </span>
                  )}
                </div>
                <ArrowRight className='size-4 text-muted-foreground shrink-0' />
                <div className='flex items-center gap-1.5 text-primary'>
                  <span>{targetGroup}</span>
                  {targetRatio !== undefined && (
                    <span className='text-xs font-mono font-medium'>
                      ({formatRatioDisplay(targetRatio)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 模型兼容性警告 */}
            {compatibility.type === 'incompatible' && (
              <div className='flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive'>
                <AlertTriangle className='size-4 shrink-0 mt-0.5' />
                <span>
                  {t(
                    'New group does not contain your current models. You need to change model names in your client after switching; chat clients need to refresh model list.'
                  )}
                </span>
              </div>
            )}

            {compatibility.type === 'partial' && (
              <div className='flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground'>
                <AlertCircle className='size-4 shrink-0 mt-0.5' />
                <span>
                  {t(
                    'Some models are unavailable in the new group'
                  )}
                </span>
              </div>
            )}

            {/* CLI Only / Codex Only 目标组警告 */}
            {targetGroup && isCliOnlyGroup(targetGroup) && (
              <div className='flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive'>
                <AlertCircle className='size-4 shrink-0 mt-0.5' />
                <span>
                  {t(
                    'This group cannot be used in external clients such as Cherry Studio or Claude Desktop'
                  )}
                </span>
              </div>
            )}

            {/* 生效说明 */}
            <p className='text-xs text-muted-foreground leading-relaxed'>
              {t(
                'Takes effect immediately upon confirmation. The next request will be billed according to the new group; key and client configurations do not need to be modified.'
              )}
            </p>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isSubmitting}
            >
              {t('Cancel')}
            </Button>
            <Button
              type='button'
              onClick={handleConfirmSwitch}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t('Switching...')
                : t('Confirm Switch')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

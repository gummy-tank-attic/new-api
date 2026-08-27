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
import { Check, Copy, Server } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/features/docs/constants'
import { copyToClipboard } from '@/lib/copy-to-clipboard'

export function ApiKeysBaseUrlBanner() {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(API_BASE_URL)
    if (!ok) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='bg-card flex shrink-0 flex-col justify-between gap-3 rounded-2xl border p-3 shadow-sm sm:flex-row sm:items-center sm:p-4'>
      <div className='flex min-w-0 items-center gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm'>
          <Server className='size-5' />
        </div>
        <div className='min-w-0'>
          <div className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
            {t('Base URL')}
          </div>
          <div className='truncate font-mono text-sm font-semibold text-violet-600 sm:text-base dark:text-violet-400'>
            {API_BASE_URL}
          </div>
        </div>
      </div>
      <Button
        onClick={() => void handleCopy()}
        size='sm'
        variant='outline'
        className='shrink-0 gap-1.5 hover:border-violet-400 hover:bg-violet-500/10 hover:text-violet-600'
      >
        {copied ? (
          <Check className='size-3.5 text-emerald-500' />
        ) : (
          <Copy className='size-3.5' />
        )}
        <span>{copied ? t('Copied') : t('Copy Base URL')}</span>
      </Button>
    </div>
  )
}

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
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CodeBlockProps = {
  code: string
  title?: string
  className?: string
}

export function CodeBlock(props: CodeBlockProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(props.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-slate-100 shadow-sm',
        props.className
      )}
    >
      <div className='flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-3 py-2'>
        <span className='font-mono text-[11px] text-slate-400'>
          {props.title ?? t('Code')}
        </span>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={handleCopy}
          className='h-7 gap-1.5 px-2 text-xs text-slate-300 hover:text-white'
        >
          {copied ? (
            <Check className='size-3.5 text-emerald-400' />
          ) : (
            <Copy className='size-3.5' />
          )}
          {copied ? t('Copied') : t('Copy')}
        </Button>
      </div>
      <pre className='overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre'>
        {props.code}
      </pre>
    </div>
  )
}

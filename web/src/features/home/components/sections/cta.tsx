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
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()

  if (props.isAuthenticated) {
    return null
  }

  return (
    <section className='relative w-full py-12 sm:py-16 text-center'>
      <AnimateInView className='mx-auto max-w-2xl' animation='scale-in'>
        <div className='mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-1 text-xs font-medium text-[#52525b] shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'>
          <Sparkles className='size-3 text-amber-500' />
          <span>{t('Instant Integration Ready', '即开即用 · 全球边缘加速已就绪')}</span>
        </div>

        <h2 className='text-[30px] sm:text-[38px] font-bold tracking-[-0.035em] leading-tight text-[#111111] dark:text-slate-100'>
          Ready to build with MetaRtr?
        </h2>

        <p className='mt-2 text-base font-medium text-slate-800 dark:text-slate-200 tracking-tight'>
          {t('home_cta_tagline', '准备好开启极速大模型开发了吗？')}
        </p>

        <p className='mx-auto mt-2.5 max-w-lg text-[14px] sm:text-[15px] leading-[1.65] text-[#52525b] dark:text-slate-400'>
          {t(
            'Zero migration cost. Connect to all foundation models with standard protocol and transparent billing.',
            '零迁移成本。一套标准协议，尽享全球顶尖大模型算力与纯净透明计费。'
          )}
        </p>

        <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
          <Button
            className='group h-11 rounded-full bg-[#0F172A] px-7 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100'
            render={<Link to='/sign-up' />}
          >
            {t('Get Started', '开始使用')}
            <ArrowRight className='ml-1.5 size-4 transition-transform group-hover:translate-x-0.5' />
          </Button>
          <Button
            variant='outline'
            className='h-11 rounded-full border border-[#E2E8F0] bg-white px-7 text-sm font-medium text-[#111111] shadow-2xs transition-all hover:border-[#CBD5E1] hover:bg-[#FAFAFA] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'
            render={<Link to='/pricing' />}
          >
            {t('View Pricing', '探索模型价格')}
          </Button>
        </div>
      </AnimateInView>
    </section>
  )
}

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
import { KeyRound, Network, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

export function HowItWorks() {
  const { t } = useTranslation()

  const steps = [
    {
      num: '01',
      title: t('Generate API Token'),
      desc: t('Sign in to the console and create an API Token with custom budget quotas.'),
      icon: <KeyRound className='size-5 text-blue-600 dark:text-blue-400' strokeWidth={1.8} />,
      hint: 'Bearer sk-metartr-xxxxxxxx',
      badge: 'Step 1',
    },
    {
      num: '02',
      title: t('Configure Gateway Base URL'),
      desc: t('Point your SDK or desktop client baseURL to this unified endpoint.'),
      icon: <Network className='size-5 text-indigo-600 dark:text-indigo-400' strokeWidth={1.8} />,
      hint: 'https://api.metartr.com/v1',
      badge: 'Step 2',
    },
    {
      num: '03',
      title: t('Start Seamless Invocation'),
      desc: t('Immediately call all LLMs, text-to-image, and video models with standard syntax.'),
      icon: <Sparkles className='size-5 text-emerald-600 dark:text-emerald-400' strokeWidth={1.8} />,
      hint: 'model: "deepseek-chat" | "claude-3-7"',
      badge: 'Step 3',
    },
  ]

  return (
    <section className='relative w-full pt-4 pb-16 sm:pb-20'>
      <div className='w-full'>
        <AnimateInView className='mb-9 text-center md:mb-12'>
          <div className='mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-medium text-[#3f3f46] shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'>
            <span>{t('Quick Integration')}</span>
          </div>
          <h2 className='text-[24px] sm:text-[30px] font-bold tracking-[-0.025em] text-[#111111] dark:text-slate-100'>
            {t('Three steps to start building')}
          </h2>
          <p className='mx-auto mt-2 max-w-lg text-[14px] text-[#3f3f46] dark:text-slate-400'>
            {t('Simple, standardized, and ready to go in less than 2 minutes.')}
          </p>
        </AnimateInView>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          {steps.map((step) => (
            <div
              key={step.num}
              className='home-card group flex flex-col justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-6 text-left shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-all hover:border-[#CBD5E1] hover:bg-[#FAFAFA] dark:border-slate-800 dark:bg-slate-900 md:p-7'
            >
              <div>
                <div className='mb-4 flex items-center justify-between'>
                  <div className='flex size-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] dark:border-slate-800 dark:bg-slate-800'>
                    {step.icon}
                  </div>
                  <span className='font-mono text-xs font-semibold text-[#52525b] dark:text-slate-400'>
                    {step.num}
                  </span>
                </div>
                <h3 className='text-[16px] font-semibold text-[#111111] dark:text-slate-100'>
                  {step.title}
                </h3>
                <p className='mt-2 text-[13px] leading-relaxed text-[#3f3f46] dark:text-slate-400'>
                  {step.desc}
                </p>
              </div>

              <div className='mt-6 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-mono text-[12px] text-[#0F172A] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 truncate'>
                {step.hint}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

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
import { ArrowRight, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { getLobeIcon } from '@/lib/lobe-icon'

import { HeroTerminalDemo } from '../hero-terminal-demo'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const docsUrl = (status?.docs_link as string | undefined) || '/docs'

  const renderDocsButton = () => {
    const isExternal = docsUrl.startsWith('http')
    const buttonClass =
      'h-10 rounded-full border border-[#E2E8F0] bg-white px-5 text-sm font-medium text-[#111111] shadow-2xs transition-all hover:border-[#CBD5E1] hover:bg-[#FAFAFA] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 inline-flex items-center gap-2'

    if (isExternal) {
      return (
        <Button
          variant='outline'
          className={buttonClass}
          render={
            <a href={docsUrl} target='_blank' rel='noopener noreferrer' />
          }
        >
          <BookOpen className='size-4 text-slate-500 transition-colors dark:text-slate-400' />
          <span>{t('Docs')}</span>
        </Button>
      )
    }
    return (
      <Button
        variant='outline'
        className={buttonClass}
        render={<Link to={docsUrl} />}
      >
        <BookOpen className='size-4 text-slate-500 transition-colors dark:text-slate-400' />
        <span>{t('Docs')}</span>
      </Button>
    )
  }

  const vendors = [
    { name: 'Anthropic', icon: 'Claude.Color' },
    { name: 'OpenAI', icon: 'OpenAI' },
    { name: 'xAI', icon: 'Grok.Color' },
    { name: 'Google', icon: 'Gemini.Color' },
    { name: 'DeepSeek', icon: 'DeepSeek.Color' },
    { name: 'Z.ai', icon: 'Zhipu.Color' },
    { name: 'Moonshot', icon: 'Moonshot' },
    { name: 'MiniMax', icon: 'Minimax.Color' },
    { name: 'ByteDance', icon: 'ByteDance.Color' },
  ]

  return (
    <section className='relative w-full pb-10 sm:pb-14'>
      <div className='grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-12'>
        {/* Left Column: 6 cols on desktop */}
        <div className='flex flex-col items-start text-left lg:col-span-6'>
          {/* Status Badge */}
          <div className='mb-5 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-1 text-xs font-medium text-[#3f3f46] shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'>
            <span className='size-2 rounded-full bg-emerald-500 animate-pulse' />
            <span className='tracking-tight'>{t('home_hero_badge', 'MetaRtr Engine · The Intelligent AI Gateway')}</span>
          </div>

          {/* Heading */}
          <h1 className='text-[34px] sm:text-[46px] lg:text-[54px] font-bold tracking-[-0.038em] leading-[1.08] text-[#111111] dark:text-slate-100'>
            {t('home_hero_title_line1', 'One Endpoint.')}<br />
            {t('home_hero_title_line2', 'Every Frontier Model.')}
          </h1>

          {/* Subtitle */}
          <p className='mt-2 text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 tracking-tight'>
            {t('home_hero_tagline', '统一智能网关 · 直连全球前沿大模型')}
          </p>
          <p className='mt-3 max-w-xl text-[14px] sm:text-[15px] leading-[1.65] text-[#52525b] dark:text-slate-400'>
            {t(
              'home_hero_subtitle',
              '零门槛直连 Claude Sonnet 5、DeepSeek V4 Pro、GPT-6 Astra 与 Gemini 3.8 Flash。毫秒级多通道故障自愈，上游原价透明计费。'
            )}
          </p>

          {/* Action Buttons: Get Started + Direct Pricing Link + Docs */}
          <div className='mt-8 flex flex-wrap items-center gap-3'>
            {props.isAuthenticated ? (
              <Button
                className='group h-11 rounded-full bg-[#0F172A] px-6 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100'
                render={<Link to='/dashboard' />}
              >
                {t('Go to Dashboard', '进入工作台')}
                <ArrowRight className='ml-1.5 size-4 transition-transform group-hover:translate-x-0.5' />
              </Button>
            ) : (
              <Button
                className='group h-11 rounded-full bg-[#0F172A] px-6 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100'
                render={<Link to='/sign-up' />}
              >
                {t('Get Started', '立即接入')}
                <ArrowRight className='ml-1.5 size-4 transition-transform group-hover:translate-x-0.5' />
              </Button>
            )}

            <Button
              variant='outline'
              className='h-11 rounded-full border border-[#E2E8F0] bg-white px-6 text-sm font-medium text-[#111111] shadow-2xs transition-all hover:border-[#CBD5E1] hover:bg-[#FAFAFA] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'
              render={<Link to='/pricing' />}
            >
              {t('View Pricing', '探索模型价格')}
            </Button>

            {renderDocsButton()}
          </div>

          {/* Supported Vendors Ecosystem: 100% styled to match Pricing page segmented bar */}
          <div className='mt-8 pt-6 border-t border-[#E2E8F0]/80 dark:border-slate-800/80'>
            <div className='flex items-center justify-between mb-2.5'>
              <div className='text-[11px] font-semibold uppercase tracking-wider text-[#71717a] dark:text-slate-400'>
                {t('Supported AI Ecosystem', '支持主流顶尖厂商 · 原厂直连')}
              </div>
              <Link
                to='/pricing'
                className='text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors'
              >
                {t('View All Prices', '查看全量价格表 →')}
              </Link>
            </div>
            {/* Apple / Linear segmented control matching SupplierTabs on /pricing */}
            <div className='flex w-full flex-wrap gap-1 rounded-[14px] border border-[#E2E8F0] bg-[#F1F5F9] p-[5px] dark:border-slate-800 dark:bg-slate-900/60'>
              {vendors.map((v) => (
                <Link
                  key={v.name}
                  to='/pricing'
                  search={{ vendor: v.name }}
                  className='inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-medium text-[#334155] transition-all hover:bg-white hover:text-[#0F172A] hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                >
                  {getLobeIcon(v.icon, 14)}
                  <span>{v.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: 6 cols on desktop — Interactive Console */}
        <div className='w-full lg:col-span-6'>
          <HeroTerminalDemo className='w-full max-w-full' />
        </div>
      </div>
    </section>
  )
}

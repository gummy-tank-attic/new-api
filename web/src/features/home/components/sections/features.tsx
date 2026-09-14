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
import { ArrowRight, Layers, ShieldCheck, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

interface FeaturesProps {
  className?: string
}

export function Features(_props: FeaturesProps) {
  const { t } = useTranslation()

  const pillars = [
    {
      icon: <Layers className='size-5 text-[#0F172A] dark:text-slate-100' strokeWidth={1.8} />,
      badge: 'Unified Protocol',
      title: t('Unified Standard Protocol', '统一标准化接口'),
      desc: t(
        'A single OpenAI-compatible API protocol connects all major foundation models. Zero vendor lock-in across text, image, video, and audio.',
        '一套完全兼容 OpenAI 的标准化接口规范，无缝直通文本、代码、文生图与视频大模型。彻底消除碎片化接入成本与供应商锁定。'
      ),
      tags: ['Chat & Completions', 'Code Generation', 'Image & Video', 'Embeddings'],
    },
    {
      icon: <Zap className='size-5 text-[#0F172A] dark:text-slate-100' strokeWidth={1.8} />,
      badge: 'Smart Failover',
      title: t('Smart Failover & Auto Healing', '毫秒级容灾与自愈'),
      desc: t(
        'Continuous real-time upstream health detection. Automatically routes around 429 rate limits and channel errors with sub-20ms edge latency.',
        '实时动态监测多通道真实延时与健康度。遭遇上游 429 限流或服务抖动时，毫秒级自动热切备用线路，保障生产业务 24/7 永不中断。'
      ),
      tags: ['429 自动热重试', 'Anycast 边缘加速', '高并发负载均衡'],
    },
    {
      icon: <ShieldCheck className='size-5 text-[#0F172A] dark:text-slate-100' strokeWidth={1.8} />,
      badge: 'Zero Markup',
      title: t('Strict Pricing Alignment', '纯净计费 · 官方对齐'),
      desc: t(
        'Every token is transparently matched to official upstream list prices. Group discounts applied with zero hidden fees, audited in real time.',
        '严格对齐各厂商官方最新公布牌价，按用户分组倍率纯净扣费。零隐形附加费与溢价，支持精细到 Token 级别的实时账单与流水审计。'
      ),
      tags: ['官方原价透明对齐', '零隐形溢价', '实时账单可审计'],
      link: '/pricing',
      linkText: t('View Model Prices', '探索模型价格'),
    },
  ]

  return (
    <section className='relative w-full py-4 sm:py-6'>
      <div className='w-full'>
        {/* Section Heading: Calm, elegant, airy */}
        <AnimateInView className='mb-12 max-w-2xl text-left'>
          <div className='mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-medium text-[#71717a] shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'>
            <span>{t('Core Architecture', '核心技术架构')}</span>
          </div>
          <h2 className='text-[28px] sm:text-[34px] font-bold tracking-[-0.035em] leading-tight text-[#111111] dark:text-slate-100'>
            {t('Built for developers, engineered for scale', '为开发者而生，为高并发生产环境打造')}
          </h2>
          <p className='mt-3 text-[15px] sm:text-[16px] leading-[1.65] text-[#52525b] dark:text-slate-400'>
            {t(
              'A unified standard protocol, high-concurrency elastic dispatching, and enterprise-grade multi-tenant governance.',
              '精炼、稳健、纯净。以现代极简工程标准打造兼具极速响应与工业级容灾的智能中枢。'
            )}
          </p>
        </AnimateInView>

        {/* 3 Spacious Pillars Grid */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
          {pillars.map((p) => (
            <div
              key={p.title}
              className='home-card group flex flex-col justify-between rounded-[16px] border border-[#E2E8F0] bg-white p-7 sm:p-8 text-left shadow-[0_1px_3px_rgba(15,23,42,0.02)] transition-all hover:border-[#CBD5E1] hover:bg-[#FAFAFA] dark:border-slate-800 dark:bg-slate-900'
            >
              <div>
                <div className='mb-5 flex size-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] dark:border-slate-800 dark:bg-slate-800'>
                  {p.icon}
                </div>
                <h3 className='text-[17px] font-bold tracking-[-0.02em] text-[#111111] dark:text-slate-100'>
                  {p.title}
                </h3>
                <p className='mt-2.5 text-[13.5px] sm:text-[14px] leading-[1.65] text-[#52525b] dark:text-slate-400'>
                  {p.desc}
                </p>
              </div>

              <div className='mt-8 pt-5 border-t border-[#E2E8F0]/70 dark:border-slate-800/70'>
                <div className='flex flex-wrap gap-1.5'>
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className='rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {p.link && (
                  <div className='mt-4'>
                    <Link
                      to={p.link}
                      className='inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] hover:text-black dark:text-white group/link'
                    >
                      <span>{p.linkText}</span>
                      <ArrowRight className='size-3 transition-transform group-hover/link:translate-x-0.5' />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

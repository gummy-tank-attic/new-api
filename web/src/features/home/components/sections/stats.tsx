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
import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface CounterProps {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  decimals?: number
}

function Counter(props: CounterProps) {
  const { end, suffix = '', prefix = '', duration = 1600, decimals = 0 } = props
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  const formatValue = useCallback(
    (v: number) =>
      decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString(),
    [decimals]
  )

  const animate = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = `${prefix}${formatValue(eased * end)}${suffix}`
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, prefix, suffix, formatValue])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      el.textContent = `${prefix}${formatValue(end)}${suffix}`
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true
          animate()
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [animate, end, prefix, suffix, formatValue])

  return (
    <span ref={ref} className='tabular-nums'>
      {prefix}0{suffix}
    </span>
  )
}

interface StatsProps {
  className?: string
}

interface StatItem {
  end: number
  suffix: string
  prefix?: string
  label: string
  sublabel: string
  dotColor: string
  decimals?: number
}

export function Stats(_props: StatsProps) {
  const { t } = useTranslation()

  const stats: StatItem[] = [
    {
      end: 50,
      suffix: '+',
      label: t('Active Upstreams', '聚合主流厂商'),
      sublabel: t('home_stats_upstreams_sub', 'Claude / OpenAI / Gemini / DeepSeek 等'),
      dotColor: 'bg-blue-500',
    },
    {
      end: 100,
      suffix: '+',
      label: t('Frontier Models', '前沿模型覆盖'),
      sublabel: t('home_stats_models_sub', '推理 · 代码 · 生图 · 视频全模态'),
      dotColor: 'bg-emerald-500',
    },
    {
      end: 99.99,
      suffix: '%',
      decimals: 2,
      label: t('Target Availability', '服务可用性目标'),
      sublabel: t('home_stats_availability_sub', '双可用区部署 · 毫秒级故障自动容灾'),
      dotColor: 'bg-indigo-500',
    },
    {
      end: 20,
      prefix: '< ',
      suffix: 'ms',
      label: t('Edge Handshake', '边缘网关延时'),
      sublabel: t('home_stats_latency_sub', '全球高速边缘中继 · 智能动态分发'),
      dotColor: 'bg-violet-500',
    },
  ]

  return (
    <section className='relative w-full py-8 sm:py-10 border-y border-[#E2E8F0]/80 dark:border-slate-800/80'>
      <div className='grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-8 text-left'>
        {stats.map((s) => (
          <div key={s.label} className='flex flex-col justify-center'>
            <div className='flex items-center gap-1.5 mb-2'>
              <span className={`size-1.5 rounded-full ${s.dotColor}`} />
              <span className='text-[10.5px] font-semibold tracking-wider text-[#71717a] uppercase dark:text-slate-500 font-mono'>
                SYSTEM SPEC
              </span>
            </div>
            <div className='font-mono text-3xl sm:text-[34px] font-bold tracking-tight text-[#111111] dark:text-white'>
              <Counter
                end={s.end}
                prefix={s.prefix}
                suffix={s.suffix}
                decimals={s.decimals}
              />
            </div>
            <div className='mt-2 text-[14px] font-semibold text-[#111111] dark:text-slate-100 tracking-tight'>
              {s.label}
            </div>
            <div className='mt-1 text-[12px] leading-relaxed text-[#71717a] dark:text-slate-400'>
              {s.sublabel}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

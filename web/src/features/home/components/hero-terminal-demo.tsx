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
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { getLobeIcon } from '@/lib/lobe-icon'

type AccentTone = 'emerald' | 'amber' | 'blue' | 'violet'

interface ApiDemoConfig {
  id: string
  label: string
  icon: string
  method: 'POST' | 'GET'
  endpoint: string
  headers: string[]
  request: string[]
  response: string[]
  responseHighlights: string[]
  tokens: number
  latency: number
  cost: string
  discountBadge?: string
  accent: AccentTone
}

const ACCENT_CLASSES: Record<
  AccentTone,
  {
    activeText: string
    activeBorder: string
    badge: string
  }
> = {
  emerald: {
    activeText: 'text-emerald-600 dark:text-emerald-400',
    activeBorder: 'border-emerald-500 dark:border-emerald-400',
    badge:
      'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400',
  },
  amber: {
    activeText: 'text-amber-600 dark:text-amber-400',
    activeBorder: 'border-amber-500 dark:border-amber-400',
    badge:
      'bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400',
  },
  blue: {
    activeText: 'text-blue-600 dark:text-blue-400',
    activeBorder: 'border-blue-500 dark:border-blue-400',
    badge:
      'bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400',
  },
  violet: {
    activeText: 'text-violet-600 dark:text-violet-400',
    activeBorder: 'border-violet-500 dark:border-violet-400',
    badge:
      'bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400',
  },
}

const API_DEMOS: ApiDemoConfig[] = [
  {
    id: 'claude-sonnet-5',
    label: 'Claude 5',
    icon: 'Claude.Color',
    method: 'POST',
    endpoint: '/v1/chat/completions',
    headers: ['"Authorization: Bearer sk-••••"'],
    request: [
      '"model": "claude-sonnet-5",',
      '"messages": [',
      '  { "role": "user", "content": "Explain quantum computing in 1 sentence." }',
      ']',
    ],
    response: [
      '{',
      '  "choices": [{ "message": { "content": <text> } }],',
      '  "usage": { "total_tokens": <tokens> }',
      '}',
    ],
    responseHighlights: ['<text>', '<tokens>'],
    tokens: 27,
    latency: 18,
    cost: '$0.00005',
    discountBadge: '80% OFF',
    accent: 'amber',
  },
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4',
    icon: 'DeepSeek.Color',
    method: 'POST',
    endpoint: '/v1/chat/completions',
    headers: ['"Authorization: Bearer sk-••••"'],
    request: [
      '"model": "deepseek-v4-pro",',
      '"messages": [',
      '  { "role": "user", "content": "Solve IMO theorem proof with chain of thought." }',
      ']',
    ],
    response: [
      '{',
      '  "choices": [{ "message": { "content": <text> } }],',
      '  "usage": { "total_tokens": <tokens> }',
      '}',
    ],
    responseHighlights: ['<text>', '<tokens>'],
    tokens: 38,
    latency: 22,
    cost: '$0.00008',
    discountBadge: 'home.hero.direct_connect_badge',
    accent: 'blue',
  },
  {
    id: 'gpt-6-astra',
    label: 'GPT-6',
    icon: 'OpenAI',
    method: 'POST',
    endpoint: '/v1/chat/completions',
    headers: ['"Authorization: Bearer sk-••••"'],
    request: [
      '"model": "gpt-6-astra",',
      '"messages": [',
      '  { "role": "user", "content": "Synthesize autonomous multi-agent plan." }',
      ']',
    ],
    response: [
      '{',
      '  "choices": [{ "message": { "content": <text> } }],',
      '  "usage": { "total_tokens": <tokens> }',
      '}',
    ],
    responseHighlights: ['<text>', '<tokens>'],
    tokens: 34,
    latency: 20,
    cost: '$0.00012',
    discountBadge: '85% OFF',
    accent: 'emerald',
  },
  {
    id: 'gemini-3-8-flash',
    label: 'Gemini 3.8',
    icon: 'Gemini.Color',
    method: 'POST',
    endpoint: '/v1/chat/completions',
    headers: ['"Authorization: Bearer sk-••••"'],
    request: [
      '"model": "gemini-3.8-flash",',
      '"messages": [',
      '  { "role": "user", "content": "Analyze multimodal benchmark results." }',
      ']',
    ],
    response: [
      '{',
      '  "choices": [{ "message": { "content": <text> } }],',
      '  "usage": { "total_tokens": <tokens> }',
      '}',
    ],
    responseHighlights: ['<text>', '<tokens>'],
    tokens: 28,
    latency: 16,
    cost: '$0.00003',
    discountBadge: '35% OFF',
    accent: 'violet',
  },
]

const TRANSITION_MS = 220

interface HeroTerminalDemoProps {
  className?: string
}

export function HeroTerminalDemo(props: HeroTerminalDemoProps) {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleSelect = (index: number) => {
    if (index === activeIndex) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setTransitioning(true)
    timeoutRef.current = setTimeout(() => {
      setActiveIndex(index)
      setTransitioning(false)
    }, TRANSITION_MS)
  }

  const demo = API_DEMOS[activeIndex]
  const accent = ACCENT_CLASSES[demo.accent]

  return (
    <div className={cn('w-full', props.className)}>
      <div
        className={cn(
          'overflow-hidden rounded-[16px] border',
          'border-[#E2E8F0] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]',
          'dark:border-slate-800 dark:bg-[#0f172a]'
        )}
      >
        {/* Tab strip: Apple / Linear segmented style matching pricing header */}
        <div
          className={cn(
            'flex items-center border-b px-2 sm:px-3 overflow-x-auto no-scrollbar',
            'border-[#E2E8F0] bg-[#F8FAFC] dark:border-slate-800 dark:bg-slate-900/60'
          )}
        >
          {/* Subtle Window Controls */}
          <div className='flex shrink-0 items-center gap-1.5 py-2.5 pr-2'>
            <span className='size-2 rounded-full bg-slate-300 dark:bg-slate-700' />
            <span className='size-2 rounded-full bg-slate-300 dark:bg-slate-700' />
            <span className='size-2 rounded-full bg-slate-300 dark:bg-slate-700' />
          </div>
          <div className='mr-1 h-3.5 w-px shrink-0 bg-slate-200 dark:bg-slate-800' />

          <div className='flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar'>
            {API_DEMOS.map((item, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => handleSelect(index)}
                  className={cn(
                    'relative -mb-px flex shrink-0 whitespace-nowrap items-center gap-1.5 border-b-2 px-2 sm:px-2.5 py-2 text-xs font-semibold tracking-wide transition-colors',
                    isActive
                      ? 'border-[#0F172A] text-[#0F172A] dark:border-white dark:text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  {getLobeIcon(item.icon, 13)}
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
          <div className='ml-auto flex shrink-0 items-center gap-1.5 pl-2 pr-1'>
            <span className='inline-block size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' />
            <span className='font-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400'>
              200 OK
            </span>
          </div>
        </div>

        {/* Endpoint row */}
        <div
          className={cn(
            'flex items-center gap-2.5 border-b px-4 py-2',
            'border-[#E2E8F0] bg-white dark:border-slate-800 dark:bg-slate-900/30'
          )}
        >
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase',
              accent.badge
            )}
          >
            {demo.method}
          </span>
          <code
            className={cn(
              'truncate font-mono text-[12px] font-semibold text-slate-800 dark:text-slate-200 transition-opacity duration-200',
              transitioning ? 'opacity-0' : 'opacity-100'
            )}
          >
            {demo.endpoint}
          </code>
        </div>

        {/* Body — fixed rows so neither block shifts when switching demos */}
        <div className='grid h-[280px] grid-rows-[145px_minmax(0,1fr)] bg-white font-mono text-[11.5px] leading-[1.5] dark:bg-[#0f172a]'>
          {/* Request */}
          <RequestBlock demo={demo} transitioning={transitioning} />

          {/* Response */}
          <ResponseBlock demo={demo} transitioning={transitioning} />
        </div>

        {/* Footer metrics */}
        <div
          className={cn(
            'flex items-center justify-between border-t px-5 py-2.5',
            'border-[#E2E8F0] bg-[#F8FAFC] dark:border-slate-800 dark:bg-slate-900/50'
          )}
        >
          <div className='flex items-center gap-3 text-[11px] font-medium text-slate-500 tabular-nums dark:text-slate-400'>
            <span className='flex items-center gap-1'>
              <span className='font-mono font-semibold text-slate-700 dark:text-slate-300'>{demo.latency}</span>
              <span className='text-[10px] tracking-wider uppercase'>ms</span>
            </span>
            <span className='size-1 rounded-full bg-slate-300 dark:bg-slate-700' />
            <span className='flex items-center gap-1'>
              <span className='font-mono font-semibold text-slate-700 dark:text-slate-300'>{demo.tokens}</span>
              <span className='text-[10px] tracking-wider uppercase'>tokens</span>
            </span>
            <span className='size-1 rounded-full bg-slate-300 dark:bg-slate-700' />
            <span className='flex items-center gap-1.5'>
              <span className='text-[10px] tracking-wider uppercase'>cost</span>
              <span className='font-mono font-semibold text-emerald-600 dark:text-emerald-400'>
                {demo.cost}
              </span>
              {demo.discountBadge && (
                <span className='rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'>
                  {demo.discountBadge.startsWith('home.') ? t(demo.discountBadge) : demo.discountBadge}
                </span>
              )}
            </span>
          </div>
          <span className='font-mono text-[10.5px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400'>
            stream · sse
          </span>
        </div>
      </div>
    </div>
  )
}

function RequestBlock(props: { demo: ApiDemoConfig; transitioning: boolean }) {
  const { demo, transitioning } = props

  return (
    <div className='relative px-5 py-4'>
      <SectionLabel>Request</SectionLabel>
      <div
        className={cn(
          'mt-2 transition-opacity duration-200',
          transitioning ? 'opacity-0' : 'opacity-100'
        )}
      >
        <CodeLine>
          <Command>curl</Command> <Flag>-X</Flag> <Flag>POST</Flag>{' '}
          <StringText>&quot;{demo.endpoint}&quot;</StringText>{' '}
          <Muted>{'\\'}</Muted>
        </CodeLine>
        {demo.headers.map((header) => (
          <CodeLine key={header} indent={2}>
            <Flag>-H</Flag> <StringText>{header}</StringText>{' '}
            <Muted>{'\\'}</Muted>
          </CodeLine>
        ))}
        <CodeLine indent={2}>
          <Flag>-d</Flag> <StringText>&apos;{'{'}</StringText>
        </CodeLine>
        {demo.request.map((line, i) => (
          <CodeLine key={i} indent={4}>
            {renderJsonLine(line)}
          </CodeLine>
        ))}
        <CodeLine indent={2}>
          <StringText>{'}'}&apos;</StringText>
        </CodeLine>
      </div>
    </div>
  )
}

function ResponseBlock(props: { demo: ApiDemoConfig; transitioning: boolean }) {
  const { demo, transitioning } = props

  return (
    <div
      className={cn(
        'relative border-t px-5 py-4',
        'border-border/40 bg-muted/20 dark:border-white/[0.05] dark:bg-white/[0.015]'
      )}
    >
      <SectionLabel>Response</SectionLabel>
      <div
        className={cn(
          'mt-2 transition-opacity duration-200',
          transitioning ? 'opacity-0' : 'opacity-100'
        )}
      >
        {demo.response.map((line, i) => (
          <CodeLine key={i}>{renderResponseLine(line, demo)}</CodeLine>
        ))}
      </div>
    </div>
  )
}

function SectionLabel(props: { children: ReactNode }) {
  return (
    <span className='text-foreground/30 font-sans text-[10px] font-semibold tracking-[0.18em] uppercase'>
      {props.children}
    </span>
  )
}

const STRING_RE = /"[^"]*"/g
const PLACEHOLDER_RE = /<[a-z]+>/gi

function renderJsonLine(line: string): ReactNode {
  if (!line.trim()) return <Muted> </Muted>
  return tokenize(line)
}

function renderResponseLine(line: string, demo: ApiDemoConfig): ReactNode {
  if (!line.trim()) return <Muted> </Muted>

  const segments: ReactNode[] = []
  let cursor = 0
  const matches = [...line.matchAll(PLACEHOLDER_RE)]

  if (matches.length === 0) return tokenize(line)

  matches.forEach((match, idx) => {
    const start = match.index ?? 0
    if (start > cursor) {
      segments.push(
        <span key={`pre-${idx}`}>{tokenize(line.slice(cursor, start))}</span>
      )
    }
    const placeholder = match[0]
    if (placeholder === '<text>') {
      segments.push(
        <Accent key={`ph-${idx}`} accent={demo.accent}>
          {`"${truncateResponse(demo)}"`}
        </Accent>
      )
    } else if (placeholder === '<tokens>') {
      segments.push(<NumberText key={`ph-${idx}`}>{demo.tokens}</NumberText>)
    } else if (placeholder === '<in>') {
      segments.push(
        <NumberText key={`ph-${idx}`}>
          {Math.floor(demo.tokens * 0.4)}
        </NumberText>
      )
    } else if (placeholder === '<out>') {
      segments.push(
        <NumberText key={`ph-${idx}`}>
          {Math.ceil(demo.tokens * 0.6)}
        </NumberText>
      )
    } else {
      segments.push(<Muted key={`ph-${idx}`}>{placeholder}</Muted>)
    }
    cursor = start + placeholder.length
  })

  if (cursor < line.length) {
    segments.push(<span key='tail'>{tokenize(line.slice(cursor))}</span>)
  }

  return segments
}

function truncateResponse(demo: ApiDemoConfig): string {
  const map: Record<string, string> = {
    'claude-sonnet-5': 'Quantum superposition enables exponential parallelism.',
    'deepseek-v4-pro': 'Chain of thought verified: contradiction reached. Q.E.D.',
    'gpt-6-astra': 'Autonomous multi-agent orchestration planned and verified.',
    'gemini-3-8-flash': 'Multimodal benchmarks evaluated across vision tasks.',
  }
  return map[demo.id] ?? 'Request routed successfully.'
}

function tokenize(input: string): ReactNode {
  // Split string into "..." string runs and the rest, then color keys/punct.
  const segments: ReactNode[] = []
  let cursor = 0
  const matches = [...input.matchAll(STRING_RE)]

  matches.forEach((match, idx) => {
    const start = match.index ?? 0
    if (start > cursor) {
      segments.push(
        <Muted key={`m-${idx}`}>{input.slice(cursor, start)}</Muted>
      )
    }
    const text = match[0]
    const after = input.slice(start + text.length).trimStart()
    const isKey = after.startsWith(':')
    if (isKey) {
      segments.push(<Key key={`k-${idx}`}>{text}</Key>)
    } else {
      segments.push(<StringText key={`s-${idx}`}>{text}</StringText>)
    }
    cursor = start + text.length
  })

  if (cursor < input.length) {
    segments.push(<Muted key='tail'>{input.slice(cursor)}</Muted>)
  }

  return segments
}

function CodeLine(props: { children: ReactNode; indent?: number }) {
  return (
    <div className='break-words whitespace-pre-wrap'>
      {props.indent ? (
        <span
          aria-hidden
          className='inline-block'
          style={{ width: `${props.indent}ch` }}
        />
      ) : null}
      {props.children}
    </div>
  )
}

function Command(props: { children: ReactNode }) {
  return (
    <span className='font-semibold text-blue-600 dark:text-blue-400'>
      {props.children}
    </span>
  )
}

function Flag(props: { children: ReactNode }) {
  return (
    <span className='font-medium text-slate-600 dark:text-slate-400'>{props.children}</span>
  )
}

function Key(props: { children: ReactNode }) {
  return (
    <span className='font-semibold text-slate-900 dark:text-slate-100'>{props.children}</span>
  )
}

function StringText(props: { children: ReactNode }) {
  return (
    <span className='font-medium text-emerald-700 dark:text-emerald-400'>{props.children}</span>
  )
}

function NumberText(props: { children: ReactNode }) {
  return (
    <span className='font-semibold text-indigo-600 dark:text-indigo-400'>
      {props.children}
    </span>
  )
}

function Muted(props: { children: ReactNode }) {
  return <span className='text-slate-400 dark:text-slate-500'>{props.children}</span>
}

function Accent(props: { children: ReactNode; accent: AccentTone }) {
  const tone = ACCENT_CLASSES[props.accent]
  return (
    <span className={cn('font-medium', tone.activeText)}>{props.children}</span>
  )
}

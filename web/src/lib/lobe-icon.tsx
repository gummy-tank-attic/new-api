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
/**
 * LobeHub Icon Loader
 *
 * @lobehub/icons is multi-MB if star-imported into the entry graph.
 * Load the package once via dynamic import so the initial route shell
 * (home / layout) does not pay for every vendor glyph up front.
 */
import type React from 'react'
import { useEffect, useState } from 'react'

import { IconSub2api } from '@/assets/custom/icon-sub2api'

const CUSTOM_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  Sub2API: IconSub2api,
}

type LobeModule = Record<string, unknown>

let lobeIconsPromise: Promise<LobeModule> | null = null

function loadLobeIcons(): Promise<LobeModule> {
  if (!lobeIconsPromise) {
    lobeIconsPromise = import(
      /* webpackChunkName: "vendor-lobehub-icons" */
      '@lobehub/icons'
    ).then((mod) => mod as unknown as LobeModule)
  }
  return lobeIconsPromise
}

function parseValue(raw: string | undefined | null): string | number | boolean {
  if (raw == null) return true

  let v = String(raw).trim()

  if (v.startsWith('{') && v.endsWith('}')) {
    v = v.slice(1, -1).trim()
  }

  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1)
  }

  if (v === 'true') return true
  if (v === 'false') return false

  if (/^-?\d+(?:\.\d+)?$/.test(v)) return Number(v)

  return v
}

function LetterFallback({
  letter,
  size,
}: {
  letter: string
  size: number
}) {
  return (
    <div
      className='bg-muted text-muted-foreground flex items-center justify-center rounded-full text-xs font-medium'
      style={{ width: size, height: size }}
    >
      {letter}
    </div>
  )
}

function resolveIcon(
  LobeIcons: LobeModule,
  iconName: string,
  size: number
): React.ReactNode {
  const trimmedName = iconName.trim()
  if (!trimmedName) {
    return <LetterFallback letter='?' size={size} />
  }

  const segments = trimmedName.split('.')
  const baseKey = segments[0]
  const CustomIcon = CUSTOM_ICONS[baseKey]
  if (CustomIcon) {
    return <CustomIcon size={size} />
  }

  const BaseIcon = LobeIcons[baseKey] as Record<string, unknown> | undefined

  let IconComponent: React.ComponentType<Record<string, unknown>> | undefined
  let propStartIndex: number

  if (BaseIcon && segments.length > 1 && BaseIcon[segments[1]]) {
    IconComponent = BaseIcon[segments[1]] as React.ComponentType<
      Record<string, unknown>
    >
    propStartIndex = 2
  } else {
    IconComponent = LobeIcons[baseKey] as
      | React.ComponentType<Record<string, unknown>>
      | undefined
    propStartIndex = segments.length > 1 && /^[A-Z]/.test(segments[1]) ? 2 : 1
  }

  if (
    !IconComponent ||
    (typeof IconComponent !== 'function' && typeof IconComponent !== 'object')
  ) {
    return (
      <LetterFallback letter={trimmedName.charAt(0).toUpperCase()} size={size} />
    )
  }

  const props: Record<string, string | number | boolean> = {}

  for (let i = propStartIndex; i < segments.length; i++) {
    const seg = segments[i]
    if (!seg) continue

    const eqIdx = seg.indexOf('=')
    if (eqIdx === -1) {
      props[seg.trim()] = true
      continue
    }

    const key = seg.slice(0, eqIdx).trim()
    const valRaw = seg.slice(eqIdx + 1).trim()
    props[key] = parseValue(valRaw)
  }

  if (props.size == null && size != null) {
    props.size = size
  }

  return <IconComponent {...props} />
}

export function LobeIcon({
  iconName,
  size = 20,
}: {
  iconName?: string | null
  size?: number
}) {
  const [mod, setMod] = useState<LobeModule | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadLobeIcons().then((m) => {
      if (!cancelled) setMod(m)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!iconName || typeof iconName !== 'string') {
    return <LetterFallback letter='?' size={size} />
  }

  const trimmed = iconName.trim()
  if (!trimmed) {
    return <LetterFallback letter='?' size={size} />
  }

  const baseKey = trimmed.split('.')[0]
  const CustomIcon = CUSTOM_ICONS[baseKey]
  if (CustomIcon) {
    return <CustomIcon size={size} />
  }

  if (!mod) {
    return (
      <LetterFallback letter={trimmed.charAt(0).toUpperCase()} size={size} />
    )
  }

  return <>{resolveIcon(mod, trimmed, size)}</>
}

/**
 * Sync API used across pricing/home tables — returns a node that loads
 * @lobehub/icons asynchronously (does not block the main entry chunk).
 */
export function getLobeIcon(
  iconName: string | undefined | null,
  size: number = 20
): React.ReactNode {
  return <LobeIcon iconName={iconName} size={size} />
}

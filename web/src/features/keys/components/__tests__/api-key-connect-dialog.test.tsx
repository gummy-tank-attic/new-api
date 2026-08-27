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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { GROUP_DISPLAY_ORDER } from '@/features/pricing/constants'

import { ApiKeyConnectDialog } from '../dialogs/api-key-connect-dialog'
import {
  hasConnectGuide,
  resolveConnectPlan,
} from '../dialogs/api-key-connect-plan'

// 分流矩阵唯一来源：docs/PLAN_CONNECT_DIALOG_GROUP_AWARE.md §2

describe('resolveConnectPlan', () => {
  test('missing group never defaults to Claude Code commands', () => {
    expect(resolveConnectPlan(undefined)).toEqual({
      tabs: ['app'],
      defaultTab: 'app',
      notice: 'external',
    })
    expect(resolveConnectPlan('')).toEqual(resolveConnectPlan(undefined))
  })

  test('image/video groups show the fill-into-app guide', () => {
    expect(resolveConnectPlan('Codex Pro (image)')).toEqual({
      tabs: ['app'],
      defaultTab: 'app',
      notice: 'image-video',
    })
    expect(hasConnectGuide('Grok (image video)')).toBe(true)
  })

  test('claude groups only show Claude Code', () => {
    expect(resolveConnectPlan('Claude Max（CLI Only）')).toEqual({
      tabs: ['claude-code'],
      defaultTab: 'claude-code',
      notice: 'cli-only',
    })
    expect(resolveConnectPlan('Claude lite（Sale）')).toEqual({
      tabs: ['claude-code'],
      defaultTab: 'claude-code',
      notice: null,
    })
    expect(resolveConnectPlan('Claude Max（External）').tabs).toEqual([
      'claude-code',
    ])
  })

  test('full-width and half-width parentheses are equivalent', () => {
    expect(resolveConnectPlan('Claude Max (CLI Only)')).toEqual(
      resolveConnectPlan('Claude Max（CLI Only）')
    )
  })

  test('codex groups only show Codex CLI', () => {
    expect(resolveConnectPlan('Codex Pro(Codex Only)')).toEqual({
      tabs: ['codex-cli'],
      defaultTab: 'codex-cli',
      notice: 'cli-only',
    })
    expect(resolveConnectPlan('Codex Pro（External）')).toEqual({
      tabs: ['codex-cli'],
      defaultTab: 'codex-cli',
      notice: null,
    })
  })

  test('every GROUP_DISPLAY_ORDER vendor is classified', () => {
    const cliByGroup: Record<string, string[]> = {
      'Claude lite（Sale）': ['claude-code'],
      'Claude Plus（Premium）': ['claude-code'],
      'Claude Max（CLI Only）': ['claude-code'],
      'Claude Max（External）': ['claude-code'],
      'Codex Pro(Codex Only)': ['codex-cli'],
      'Codex Pro（External）': ['codex-cli'],
      'Codex Pro (image)': ['app'],
      DeepSeek: ['app'],
      Grok: ['app'],
      'Grok（Enterprise）': ['app'],
      'Grok Enterprise': ['app'],
      'Grok（Beta）': ['app'],
      'Grok (image video)': ['app'],
      Gemini: ['app'],
      Zhipu: ['app'],
      Kimi: ['app'],
      MiniMax: ['app'],
    }
    expect(Object.keys(cliByGroup).sort()).toEqual(
      [...GROUP_DISPLAY_ORDER].sort()
    )
    for (const group of GROUP_DISPLAY_ORDER) {
      expect(resolveConnectPlan(group).tabs, group).toEqual(cliByGroup[group])
      expect(hasConnectGuide(group), group).toBe(cliByGroup[group].length > 0)
    }
  })
})

function renderDialog(tokenGroup?: string) {
  return render(
    <ApiKeyConnectDialog
      open
      onOpenChange={() => undefined}
      tokenKey='sk-test'
      keyName='t'
      tokenGroup={tokenGroup}
    />
  )
}

describe('ApiKeyConnectDialog group-aware tabs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(navigator, 'clipboard')
  })

  test('Grok and DeepSeek show where to paste URL and key', () => {
    renderDialog('Grok')
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(
      screen.getByText(/This key works inside an AI chat app/)
    ).toBeInTheDocument()
    expect(
      screen.getByText('Install a free AI chat app on your computer.')
    ).toBeInTheDocument()
    expect(screen.queryByText(/Cherry Studio/)).not.toBeInTheDocument()
    expect(screen.queryByText(/NextChat/)).not.toBeInTheDocument()
    expect(screen.getByText('API Base URL')).toBeInTheDocument()
    expect(screen.getByText('https://api.metartr.com')).toBeInTheDocument()
    expect(screen.queryByText(/Claude Code/)).not.toBeInTheDocument()
    expect(screen.queryByText('Desktop apps')).not.toBeInTheDocument()
  })

  test('Claude Max (CLI Only) shows Claude Code command without tab chrome', () => {
    renderDialog('Claude Max（CLI Only）')
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByText('Claude Code only')).toBeInTheDocument()
    expect(screen.queryByText(/Codex CLI/)).not.toBeInTheDocument()
    expect(screen.getByText(/ANTHROPIC_BASE_URL/)).toBeInTheDocument()
    expect(
      screen.getAllByText(
        'This command configures your API base URL and key for Claude Code.'
      )
    ).toHaveLength(1)
  })

  test('PowerShell copy writes the readable command as plain text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    renderDialog('Claude Max（CLI Only）')

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).toContain(
      "[Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', $metartrBaseUrl, 'Process')"
    )
    expect(copied).toContain(
      "[Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', $metartrAuthToken, 'User')"
    )
    expect(copied).toContain("$metartrBaseUrl = 'https://api.metartr.com'")
    expect(copied).not.toContain('\\_')
    expect(copied).not.toContain('[https://')
    expect(copied).not.toMatch(/&#(?:x[\da-f]+|\d+);|&nbsp;/i)
  })

  test('copy-for-AI text never includes the real key or a second base URL', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    renderDialog('Grok')

    fireEvent.click(
      screen.getByRole('button', { name: 'Copy all info for AI' })
    )

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).not.toContain('sk-test')
    expect(copied).not.toContain('https://api.metartr.com/v1')
    expect(copied).not.toContain('Claude provider')
    expect(copied).not.toMatch(/&#(?:x[\da-f]+|\d+);|&nbsp;/i)
    expect(copied).toContain('https://api.metartr.com')
  })

  test('Claude lite (Sale) shows Claude Code only, no desktop-apps tab', () => {
    renderDialog('Claude lite（Sale）')
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByText(/ANTHROPIC_BASE_URL/)).toBeInTheDocument()
    expect(screen.queryByText('Desktop apps')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        /✅ MetaRtr setup complete\. Fully quit and restart the terminal and Claude Code\./
      )
    ).toBeInTheDocument()
    expect(screen.queryByText(/配置完成/)).not.toBeInTheDocument()
    expect(document.querySelector('pre')?.className.includes('break-all')).toBe(
      false
    )
  })

  test('missing group shows fill-into-app guide, not Claude Code', () => {
    renderDialog(undefined)
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.getByText('API Base URL')).toBeInTheDocument()
    expect(screen.queryByText(/ANTHROPIC_BASE_URL/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pick a .* model/)).not.toBeInTheDocument()
  })
})

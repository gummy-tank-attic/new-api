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
import i18next from 'i18next'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { GROUP_DISPLAY_ORDER } from '@/features/pricing/constants'
import zhLocale from '@/i18n/locales/zh.json'

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
    expect(screen.getByText(/claude-windows-v1\.txt/)).toBeInTheDocument()
    expect(
      screen.getByText('Group this command will use: Claude Max（CLI Only）')
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(
        'Follow the four steps below. This command connects the key for the current group to Claude Code; you do not need to edit any settings yourself.'
      )
    ).toHaveLength(1)
  })

  test('PowerShell copy writes the one-line bootstrap as plain text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    renderDialog('Claude Max（CLI Only）')

    fireEvent.click(screen.getByRole('button', { name: 'Copy command' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).toBe(
      "$env:MTRKEY='sk-test';irm https://www.metartr.com/setup/claude-windows-v1.txt|iex"
    )
    expect(copied.split(/\r?\n/)).toHaveLength(1)
    expect(copied).not.toContain('\\_')
    expect(copied).not.toContain('[https://')
    expect(copied).not.toMatch(/&#(?:x[\da-f]+|\d+);|&nbsp;/i)
  })

  test('manual command selection copies only the full plain-text command', () => {
    renderDialog('Claude Max（CLI Only）')
    const commandBlock = document.querySelector('pre')
    expect(commandBlock).not.toBeNull()
    if (!commandBlock) throw new Error('Command block not found')

    const clearData = vi.fn()
    const setData = vi.fn()
    fireEvent.copy(commandBlock, {
      clipboardData: { clearData, setData },
    })

    expect(clearData).toHaveBeenCalledOnce()
    expect(setData).toHaveBeenCalledOnce()
    expect(setData).toHaveBeenCalledWith(
      'text/plain',
      expect.stringContaining('claude-windows-v1.txt')
    )
    const copied = setData.mock.calls[0][1] as string
    expect(copied).toContain("$env:MTRKEY='sk-test'")
    expect(copied.split(/\r?\n/)).toHaveLength(1)
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
      screen.getByRole('button', { name: 'Copy help info (key excluded)' })
    )

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).not.toContain('sk-test')
    expect(copied).not.toContain('https://api.metartr.com/v1')
    expect(copied).not.toContain('Claude provider')
    expect(copied).not.toMatch(/&#(?:x[\da-f]+|\d+);|&nbsp;/i)
    expect(copied).toContain('https://api.metartr.com')
  })

  test('copy-for-AI text gives CLI instructions for Claude groups', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    renderDialog('Claude Max（External）')

    fireEvent.click(
      screen.getByRole('button', { name: 'Copy help info (key excluded)' })
    )

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).toContain('- Client: Claude Code')
    expect(copied).toContain("open this key's connection guide")
    expect(copied).not.toContain('add a custom provider')
    expect(copied).not.toContain('sk-test')
  })

  test('Claude lite (Sale) shows Claude Code only, no desktop-apps tab', () => {
    renderDialog('Claude lite（Sale）')
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByText(/claude-windows-v1\.txt/)).toBeInTheDocument()
    expect(screen.queryByText('Desktop apps')).not.toBeInTheDocument()
    expect(
      screen.getByText(/line beginning with ✅.*Claude Code/)
    ).toBeInTheDocument()
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

  test('Chinese beginner guide is complete and never falls back to English', async () => {
    i18next.addResourceBundle(
      'zh',
      'translation',
      zhLocale.translation,
      true,
      true
    )
    await i18next.changeLanguage('zh')

    try {
      const { unmount } = renderDialog('Claude Max（External）')

      expect(screen.getByText('配置 Claude Code：t')).toBeInTheDocument()
      expect(
        screen.getByText('这条命令将使用的分组：Claude Max（External）')
      ).toBeInTheDocument()
      expect(
        screen.getByText(/点击 Windows 左下角的“开始”/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/点击一次鼠标右键.*按 Enter（回车）/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/一直没有看到以“✅”开头的提示/)
      ).toBeInTheDocument()
      expect(screen.getByText('以后如何切换分组')).toBeInTheDocument()
      expect(
        screen.getByText(/最后执行的是哪个分组的命令.*就会使用哪个分组/)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: '复制命令' })
      ).toBeInTheDocument()
      expect(screen.queryByText(/Paste into the terminal/)).toBeNull()
      expect(screen.queryByText(/MetaRtr setup complete/)).toBeNull()

      fireEvent.click(screen.getByRole('button', { name: 'macOS / Linux' }))
      expect(
        screen.getByText(/如果使用 macOS.*如果使用 Linux/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          /macOS 请按 Command \+ V.*Linux 请按 Ctrl \+ Shift \+ V/
        )
      ).toBeInTheDocument()

      unmount()
      renderDialog('Codex Pro（External）')
      expect(screen.getByText('配置 Codex CLI：t')).toBeInTheDocument()
      expect(screen.getByText(/已有设置会自动备份/)).toBeInTheDocument()
    } finally {
      await i18next.changeLanguage('en')
    }
  })
})

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
import { AppWindow, Check, Copy, ShieldCheck, Terminal } from 'lucide-react'
import { type ClipboardEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { copyToClipboard } from '@/lib/copy-to-clipboard'

import {
  buildClaudePosixCommand,
  buildClaudePowerShellCommand,
  buildCodexPosixCommand,
  buildCodexPowerShellCommand,
} from './api-key-connect-commands'
import {
  resolveAppIntegrationGuide,
  resolveConnectPlan,
  type ConnectPlan,
} from './api-key-connect-plan'

const BASE_API_URL = 'https://api.metartr.com'

function detectIsWindows(): boolean {
  if (typeof navigator === 'undefined') return true
  return /win/i.test(navigator.userAgent || navigator.platform || '')
}

type OsType = 'windows' | 'posix'

type Translate = (key: string, options?: Record<string, unknown>) => string

function describeGroupUsage(plan: ConnectPlan, t: Translate): string {
  if (plan.notice === 'image-video') {
    return t(
      'Image/video generation group. Use it in a supported image/video client or API.'
    )
  }
  if (plan.notice === 'external') {
    return t(
      'For this MetaRtr group, the recommended setup is an AI chat app that supports the OpenAI-compatible API. WeChat/QQ will not work.'
    )
  }
  if (plan.tabs.length === 1 && plan.tabs[0] === 'claude-code') {
    return t('Claude Code only')
  }
  if (plan.tabs.length === 1 && plan.tabs[0] === 'codex-cli') {
    return t('Codex CLI only')
  }
  if (plan.defaultTab === 'codex-cli') {
    return t('Works with Codex CLI or a graphical client')
  }
  return t('Works with Claude Code or a graphical client')
}

const TAB_GRID_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
}

interface ApiKeyConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenKey: string
  keyName?: string
  tokenGroup?: string
}

export function ApiKeyConnectDialog({
  open,
  onOpenChange,
  tokenKey,
  keyName,
  tokenGroup,
}: ApiKeyConnectDialogProps) {
  const { t } = useTranslation()
  const plan = useMemo(() => resolveConnectPlan(tokenGroup), [tokenGroup])
  const appIntegrationGuide = useMemo(
    () => resolveAppIntegrationGuide(tokenGroup),
    [tokenGroup]
  )
  const [activeTab, setActiveTab] = useState<string>(plan.defaultTab)
  const [osType, setOsType] = useState<OsType>(() =>
    detectIsWindows() ? 'windows' : 'posix'
  )
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  // 重新打开或换令牌时回到该分组的默认 Tab
  useEffect(() => {
    if (open) setActiveTab(plan.defaultTab)
  }, [open, plan.defaultTab])

  const cleanKey = useMemo(() => {
    if (!tokenKey) return 'sk-...'
    return tokenKey.startsWith('sk-') ? tokenKey : `sk-${tokenKey}`
  }, [tokenKey])

  const handleCopy = async (text: string, sectionKey: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopiedSection(sectionKey)
      toast.success(t('Copied'))
      setTimeout(() => {
        setCopiedSection((prev) => (prev === sectionKey ? null : prev))
      }, 2000)
    }
  }

  const handleCommandSelectionCopy = (
    event: ClipboardEvent<HTMLPreElement>,
    text: string,
    sectionKey: string
  ) => {
    event.preventDefault()
    event.clipboardData.clearData()
    event.clipboardData.setData('text/plain', text)
    setCopiedSection(sectionKey)
    toast.success(t('Copied'))
    setTimeout(() => {
      setCopiedSection((prev) => (prev === sectionKey ? null : prev))
    }, 2000)
  }

  const claudeCodeCommands = useMemo<Record<OsType, string>>(
    () => ({
      windows: buildClaudePowerShellCommand({ apiKey: cleanKey }),
      posix: buildClaudePosixCommand({ apiKey: cleanKey }),
    }),
    [cleanKey]
  )

  const codexCliCommands = useMemo<Record<OsType, string>>(
    () => ({
      windows: buildCodexPowerShellCommand({ apiKey: cleanKey }),
      posix: buildCodexPosixCommand({ apiKey: cleanKey }),
    }),
    [cleanKey]
  )

  const copyAllAiPrompt = () => {
    const lines = [
      t('MetaRtr connection info (site: https://www.metartr.com):'),
      t('- API base URL: {{url}}', {
        url: BASE_API_URL,
        interpolation: { escapeValue: false },
      }),
      t(
        '- API Key: copy it from the MetaRtr key page and do not send it in chat.'
      ),
    ]
    if (tokenGroup) {
      lines.push(
        t('- Group: {{group}} ({{usage}})', {
          group: tokenGroup,
          usage: describeGroupUsage(plan, t),
          interpolation: { escapeValue: false },
        })
      )
    }
    if (plan.defaultTab === 'claude-code' || plan.defaultTab === 'codex-cli') {
      lines.push(
        t('- Client: {{client}}', {
          client:
            plan.defaultTab === 'claude-code' ? 'Claude Code' : 'Codex CLI',
        })
      )
      lines.push(
        t(
          "- Setup: open this key's connection guide in MetaRtr, copy the command for your system, and run it once."
        )
      )
    } else {
      lines.push(
        t(
          '- Client setup: add a custom provider in your AI tool and enter the API base URL above plus your API key.'
        )
      )
    }
    void handleCopy(lines.join('\n'), 'all')
  }

  const osSwitch = (
    <div className='bg-muted inline-flex shrink-0 rounded-lg p-1'>
      <button
        type='button'
        onClick={() => setOsType('windows')}
        className={`cursor-pointer rounded-md px-3 py-1.5 text-base transition-colors ${
          osType === 'windows'
            ? 'bg-primary text-primary-foreground font-medium shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        PowerShell
      </button>
      <button
        type='button'
        onClick={() => setOsType('posix')}
        className={`cursor-pointer rounded-md px-3 py-1.5 text-base transition-colors ${
          osType === 'posix'
            ? 'bg-primary text-primary-foreground font-medium shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        macOS / Linux
      </button>
    </div>
  )

  const osLabel = (
    <span className='text-muted-foreground min-w-0 text-base'>
      {osType === 'windows'
        ? t('Windows PowerShell')
        : t('macOS / Linux Terminal')}
    </span>
  )

  let dialogDescription = t(
    'Paste the API address and key into an AI chat app on your computer — not WeChat or QQ.'
  )
  if (plan.defaultTab === 'claude-code') {
    dialogDescription = t(
      'Follow the four steps below. This command connects the key for the current group to Claude Code; you do not need to edit any settings yourself.'
    )
  } else if (plan.defaultTab === 'codex-cli') {
    dialogDescription = t(
      'Follow the four steps below. This command connects the key for the current group to Codex CLI; your existing settings are backed up automatically.'
    )
  }

  const defaultClient =
    plan.defaultTab === 'claude-code'
      ? 'Claude Code'
      : plan.defaultTab === 'codex-cli'
        ? 'Codex CLI'
        : null

  const dialogTitle = defaultClient
    ? keyName
      ? t('Set up {{client}}: {{name}}', {
          client: defaultClient,
          name: keyName,
        })
      : t('Set up {{client}}', { client: defaultClient })
    : keyName
      ? t('How to use this key: {{name}}', { name: keyName })
      : t('How to use this key')

  const cliOnlyLabel =
    plan.defaultTab === 'claude-code'
      ? t('Claude Code only')
      : t('Codex CLI only')

  const renderCommandBlock = (
    commands: Record<OsType, string>,
    sectionKey: string
  ) => (
    <div className='max-w-full min-w-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 dark:bg-zinc-900'>
      <div className='flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-2'>
        <span className='text-sm font-medium text-zinc-300'>
          {t('Command to copy')}
        </span>
        <Button
          size='sm'
          variant='ghost'
          className='gap-1.5 text-zinc-200 hover:bg-zinc-800 hover:text-white'
          onClick={() => handleCopy(commands[osType], sectionKey)}
        >
          {copiedSection === sectionKey ? (
            <Check className='size-4 text-emerald-400' />
          ) : (
            <Copy className='size-4' />
          )}
          {copiedSection === sectionKey ? t('Copied') : t('Copy command')}
        </Button>
      </div>
      <div className='max-w-full overflow-x-auto'>
        <pre
          className='min-w-max p-4 font-mono text-sm leading-6 whitespace-pre select-all'
          onCopy={(event) =>
            handleCommandSelectionCopy(event, commands[osType], sectionKey)
          }
        >
          {commands[osType]}
        </pre>
      </div>
    </div>
  )

  const renderTerminalSteps = (client: 'Claude Code' | 'Codex CLI') => (
    <div className='min-w-0 space-y-3'>
      {tokenGroup && (
        <p className='text-base font-medium'>
          {t('Group this command will use: {{group}}', { group: tokenGroup })}
        </p>
      )}
      <ol className='text-muted-foreground ml-5 list-outside list-decimal space-y-2 text-base leading-7'>
        <li>{t('Click "Copy command" below.')}</li>
        <li>
          {osType === 'windows'
            ? t(
                'Click Windows Start, type "PowerShell", then open Windows PowerShell. You do not need to open a project folder or type a path; leave the window at its default location.'
              )
            : t(
                'On macOS, press Command + Space, search for "Terminal", and open it. On Linux, open Terminal from the applications menu. You do not need to open a project folder or type a path.'
              )}
        </li>
        <li>
          {osType === 'windows'
            ? t(
                'In the PowerShell window, right-click where the cursor is blinking on the last line to paste the copied command, then press Enter. Paste only; do not type a path, add text, or change anything.'
              )
            : t(
                'In Terminal, paste the copied command where the cursor is blinking on the last line, then press Enter. On macOS use Command + V; on Linux use Ctrl + Shift + V. Paste only; do not type a path, add text, or change anything.'
              )}
        </li>
        <li>
          {osType === 'windows'
            ? t(
                'Wait until a line beginning with ✅ appears. Then fully close PowerShell and {{client}}, and reopen {{client}}.',
                { client }
              )
            : t(
                'Wait until a line beginning with ✅ appears. Then fully close Terminal and {{client}}, and reopen {{client}}.',
                { client }
              )}
        </li>
      </ol>
      <p className='text-sm leading-6 text-amber-700 dark:text-amber-400'>
        {t(
          'If red error text appears, or no ✅ line appears, setup did not finish. Keep the window open and send a screenshot to support.'
        )}
      </p>
    </div>
  )

  const renderSwitchGroupHelp = (client: 'Claude Code' | 'Codex CLI') => (
    <div className='min-w-0 space-y-2 border-t pt-4'>
      <p className='text-base font-medium'>{t('How to switch groups later')}</p>
      <ol className='text-muted-foreground ml-5 list-outside list-decimal space-y-1.5 text-sm leading-6'>
        <li>{t('Return to the MetaRtr Console and open "API Keys".')}</li>
        <li>
          {t(
            'Find a key for the group you want to use, click "⋯" on its right, then click "View Connection Guide".'
          )}
        </li>
        <li>
          {t(
            "Copy that group's command and run it once. The last command you run is the group {{client}} will use.",
            { client }
          )}
        </li>
      </ol>
    </div>
  )

  const renderCopyRow = (label: string, value: string, sectionKey: string) => (
    <div className='bg-muted/30 space-y-2 rounded-xl border p-4'>
      <div className='flex items-center justify-between gap-3'>
        <span className='text-muted-foreground text-base font-medium'>
          {label}
        </span>
        <Button
          variant='ghost'
          size='sm'
          className='gap-1.5'
          onClick={() => handleCopy(value, sectionKey)}
        >
          {copiedSection === sectionKey ? (
            <>
              <Check className='size-3.5 text-emerald-500' />
              <span>{t('Copied')}</span>
            </>
          ) : (
            <>
              <Copy className='size-3.5' />
              <span>{t('Copy')}</span>
            </>
          )}
        </Button>
      </div>
      <div className='font-mono text-base font-medium break-all select-all'>
        {value}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl min-w-0 gap-6 overflow-x-hidden overflow-y-auto p-6 sm:max-w-4xl sm:p-8'>
        <DialogHeader className='min-w-0'>
          <div className='flex min-w-0 items-center gap-2.5'>
            <ShieldCheck className='size-6 shrink-0 text-emerald-500' />
            <DialogTitle className='truncate text-xl'>
              {dialogTitle}
            </DialogTitle>
          </div>
          <DialogDescription className='text-base'>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {plan.tabs.length > 0 && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='w-full min-w-0'
          >
            {plan.tabs.length > 1 && (
              <TabsList
                className={`grid h-11 w-full min-w-0 ${TAB_GRID_CLASS[plan.tabs.length] ?? 'grid-cols-2'} group-data-horizontal/tabs:h-11`}
              >
                {plan.tabs.includes('claude-code') && (
                  <TabsTrigger
                    value='claude-code'
                    className='min-w-0 text-base'
                  >
                    <Terminal className='mr-1.5 size-4' />
                    Claude Code
                  </TabsTrigger>
                )}
                {plan.tabs.includes('codex-cli') && (
                  <TabsTrigger value='codex-cli' className='min-w-0 text-base'>
                    <Terminal className='mr-1.5 size-4' />
                    Codex CLI
                  </TabsTrigger>
                )}
                {plan.tabs.includes('app') && (
                  <TabsTrigger value='app' className='min-w-0 text-base'>
                    <AppWindow className='mr-1.5 size-4' />
                    {t('Fill into an app')}
                  </TabsTrigger>
                )}
              </TabsList>
            )}

            {plan.tabs.includes('claude-code') && (
              <TabsContent
                value='claude-code'
                className='min-w-0 space-y-4 pt-4'
              >
                {plan.notice === 'cli-only' && (
                  <p className='text-destructive text-base font-medium'>
                    {cliOnlyLabel}
                  </p>
                )}
                <div className='flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  {osLabel}
                  {osSwitch}
                </div>
                {renderTerminalSteps('Claude Code')}
                {renderCommandBlock(claudeCodeCommands, 'claude-code')}
                <p className='text-muted-foreground text-sm leading-6'>
                  {t(
                    'No download is needed. This command completes the setup automatically.'
                  )}
                </p>
                {renderSwitchGroupHelp('Claude Code')}
              </TabsContent>
            )}

            {plan.tabs.includes('codex-cli') && (
              <TabsContent value='codex-cli' className='min-w-0 space-y-4 pt-4'>
                {plan.notice === 'cli-only' && (
                  <p className='text-destructive text-base font-medium'>
                    {cliOnlyLabel}
                  </p>
                )}
                <div className='flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  {osLabel}
                  {osSwitch}
                </div>
                {renderTerminalSteps('Codex CLI')}
                {renderCommandBlock(codexCliCommands, 'codex-cli')}
                <p className='text-muted-foreground text-sm leading-6'>
                  {t(
                    'No download is needed. This command completes the setup automatically.'
                  )}
                </p>
                {renderSwitchGroupHelp('Codex CLI')}
              </TabsContent>
            )}

            {plan.tabs.includes('app') && (
              <TabsContent value='app' className='min-w-0 space-y-4 pt-4'>
                {plan.notice === 'image-video' && (
                  <p className='text-base font-medium text-amber-600 dark:text-amber-500'>
                    {t(
                      'This group generates images/videos. Enter the two fields below into an app that supports image/video generation.'
                    )}
                  </p>
                )}
                {plan.notice === 'external' && (
                  <>
                    <p className='text-base font-medium'>
                      {t(
                        'For this MetaRtr {{group}} group, we recommend an AI chat app that supports the OpenAI-compatible API. Do not enter the key in WeChat or QQ. Follow these three steps:',
                        { group: tokenGroup || 'AI' }
                      )}
                    </p>
                    <ol className='text-muted-foreground list-inside list-decimal space-y-1.5 text-base'>
                      <li>
                        {t(
                          'On your computer, install an AI chat app that supports a custom provider, OpenAI-compatible API, or custom API endpoint.'
                        )}
                      </li>
                      <li>
                        {t(
                          'Open Settings > Model Provider (or Providers), add a provider, choose OpenAI-compatible or Custom, then paste the API Base URL and API Key shown below.'
                        )}
                      </li>
                      {tokenGroup && (
                        <li>
                          {t(
                            "Pick a {{group}} model in the app's model list and start chatting.",
                            { group: tokenGroup }
                          )}
                        </li>
                      )}
                    </ol>
                    {appIntegrationGuide === 'gemini' && (
                      <p className='text-muted-foreground text-base'>
                        {t(
                          'Gemini groups support both OpenAI-compatible and native Gemini API formats. For most apps, choose OpenAI-compatible; use Gemini native only when the app specifically asks for Google Gemini.'
                        )}
                      </p>
                    )}
                  </>
                )}
                <div className='min-w-0 space-y-3'>
                  {renderCopyRow(t('API Base URL'), BASE_API_URL, 'url')}
                  {renderCopyRow(t('API Key'), cleanKey, 'key')}
                </div>
                {plan.notice === 'external' && (
                  <p className='text-muted-foreground text-base'>
                    {t(
                      'Not sure how? Click "Copy help info (key excluded)" at the bottom left and send it to support or any AI for step-by-step help. Full guide:'
                    )}{' '}
                    <a
                      href='/docs?s=clients'
                      target='_blank'
                      rel='noreferrer'
                      className='text-primary underline underline-offset-2'
                    >
                      {t('Setup guide')}
                    </a>
                  </p>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}

        <div className='flex min-w-0 flex-wrap items-center justify-between gap-3 border-t pt-5'>
          <Button
            variant='outline'
            className='gap-1.5'
            onClick={copyAllAiPrompt}
          >
            {copiedSection === 'all' ? (
              <Check className='size-4 text-emerald-500' />
            ) : (
              <Copy className='size-4' />
            )}
            {t('Copy help info (key excluded)')}
          </Button>

          <Button variant='default' onClick={() => onOpenChange(false)}>
            {t('Done')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

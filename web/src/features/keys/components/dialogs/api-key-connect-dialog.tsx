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
import { useMemo, useState } from 'react'
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

const BASE_API_URL = 'https://api.metartr.com'
const OPENAI_API_URL = 'https://api.metartr.com/v1'

function detectIsWindows(): boolean {
  if (typeof navigator === 'undefined') return true
  return /win/i.test(navigator.userAgent || navigator.platform || '')
}

type OsType = 'windows' | 'posix'

interface ApiKeyConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenKey: string
  keyName?: string
}

export function ApiKeyConnectDialog({
  open,
  onOpenChange,
  tokenKey,
  keyName,
}: ApiKeyConnectDialogProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<string>('claude-code')
  const [osType, setOsType] = useState<OsType>(() =>
    detectIsWindows() ? 'windows' : 'posix'
  )
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

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

  // 命令末尾的 ✅ 成功行是客服判断配置成功的依据，保持中文、勿改措辞。
  const claudeCodeCommands = useMemo<Record<OsType, string>>(
    () => ({
      windows: [
        `[System.Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', '${BASE_API_URL}', 'User')`,
        `[System.Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', '${cleanKey}', 'User')`,
        `Write-Host "✅ MetaRtr 配置完成，请完全退出并重启终端和 Claude Code" -ForegroundColor Green`,
      ].join('\n'),
      posix: [
        `for f in ~/.zshrc ~/.bashrc; do`,
        `  touch "$f"`,
        `  grep -v 'ANTHROPIC_BASE_URL\\|ANTHROPIC_AUTH_TOKEN' "$f" > "$f.metartr"`,
        `  mv "$f.metartr" "$f"`,
        `  printf 'export ANTHROPIC_BASE_URL="%s"\\nexport ANTHROPIC_AUTH_TOKEN="%s"\\n' '${BASE_API_URL}' '${cleanKey}' >> "$f"`,
        `done`,
        `export ANTHROPIC_BASE_URL='${BASE_API_URL}' ANTHROPIC_AUTH_TOKEN='${cleanKey}'`,
        `echo "✅ MetaRtr 配置完成，请完全退出并重启终端和 Claude Code"`,
      ].join('\n'),
    }),
    [cleanKey]
  )

  // Codex CLI 走 ~/.codex/config.toml + auth.json（与本站渠道的 responses 协议匹配），
  // 原有 config.toml 自动备份为 config.toml.bak。
  const codexCliCommands = useMemo<Record<OsType, string>>(
    () => ({
      windows: [
        `$codexDir = "$env:USERPROFILE\\.codex"`,
        `New-Item -ItemType Directory -Force $codexDir | Out-Null`,
        `if (Test-Path "$codexDir\\config.toml") { Copy-Item "$codexDir\\config.toml" "$codexDir\\config.toml.bak" -Force }`,
        `@'`,
        `model_provider = "metartr"`,
        ``,
        `[model_providers.metartr]`,
        `name = "MetaRtr"`,
        `base_url = "${OPENAI_API_URL}"`,
        `wire_api = "responses"`,
        `requires_openai_auth = true`,
        `'@ | Set-Content -Path "$codexDir\\config.toml" -Encoding utf8`,
        `'{"OPENAI_API_KEY":"${cleanKey}"}' | Set-Content -Path "$codexDir\\auth.json" -Encoding utf8`,
        `Write-Host "✅ MetaRtr 配置完成，请完全退出并重启 Codex CLI" -ForegroundColor Green`,
      ].join('\n'),
      posix: [
        `mkdir -p ~/.codex`,
        `[ -f ~/.codex/config.toml ] && cp ~/.codex/config.toml ~/.codex/config.toml.bak`,
        `cat > ~/.codex/config.toml <<'METARTR_EOF'`,
        `model_provider = "metartr"`,
        ``,
        `[model_providers.metartr]`,
        `name = "MetaRtr"`,
        `base_url = "${OPENAI_API_URL}"`,
        `wire_api = "responses"`,
        `requires_openai_auth = true`,
        `METARTR_EOF`,
        `printf '{"OPENAI_API_KEY":"%s"}\\n' '${cleanKey}' > ~/.codex/auth.json`,
        `echo "✅ MetaRtr 配置完成，请完全退出并重启 Codex CLI"`,
      ].join('\n'),
    }),
    [cleanKey]
  )

  // 自包含接入信息：小白可整段粘给任意 AI，AI 能据此指导配置。保持中文。
  const copyAllAiPrompt = () => {
    const text = [
      `MetaRtr 接入信息（官网：https://www.metartr.com）：`,
      `- API 基础地址: ${BASE_API_URL}`,
      `- OpenAI 协议地址: ${OPENAI_API_URL}`,
      `- API Key: ${cleanKey}`,
      `- 客户端配置: 在任意第三方 AI 工具中新增 OpenAI 或 Claude 供应商，填入上述地址与 API Key 即可。`,
    ].join('\n')
    void handleCopy(text, 'all')
  }

  const osSwitch = (
    <div className='flex gap-1 text-[11px]'>
      <button
        type='button'
        onClick={() => setOsType('windows')}
        className={`px-2 py-0.5 rounded cursor-pointer ${
          osType === 'windows'
            ? 'bg-primary text-primary-foreground font-medium'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        PowerShell
      </button>
      <button
        type='button'
        onClick={() => setOsType('posix')}
        className={`px-2 py-0.5 rounded cursor-pointer ${
          osType === 'posix'
            ? 'bg-primary text-primary-foreground font-medium'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        macOS / Linux
      </button>
    </div>
  )

  const osLabel = (
    <span className='text-xs font-medium text-muted-foreground'>
      {osType === 'windows'
        ? t('Windows PowerShell (Search PowerShell in Start Menu to open):')
        : t('macOS / Linux (Terminal):')}
    </span>
  )

  const renderCommandBlock = (
    commands: Record<OsType, string>,
    sectionKey: string
  ) => (
    <div className='relative rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100 dark:bg-zinc-900 border border-zinc-800'>
      <pre className='overflow-x-auto whitespace-pre-wrap break-all pr-12 select-all'>
        {commands[osType]}
      </pre>
      <Button
        size='icon-sm'
        variant='ghost'
        className='absolute right-2 top-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
        onClick={() => handleCopy(commands[osType], sectionKey)}
      >
        {copiedSection === sectionKey ? (
          <Check className='size-4 text-emerald-400' />
        ) : (
          <Copy className='size-4' />
        )}
      </Button>
    </div>
  )

  const renderCopyRow = (label: string, value: string, sectionKey: string) => (
    <div className='rounded-lg border bg-muted/30 p-3 space-y-1'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-medium text-muted-foreground'>
          {label}
        </span>
        <Button
          variant='ghost'
          size='xs'
          className='h-6 text-xs gap-1'
          onClick={() => handleCopy(value, sectionKey)}
        >
          {copiedSection === sectionKey ? (
            <>
              <Check className='size-3 text-emerald-500' />
              <span>{t('Copied')}</span>
            </>
          ) : (
            <>
              <Copy className='size-3' />
              <span>{t('Copy')}</span>
            </>
          )}
        </Button>
      </div>
      <div className='font-mono text-sm font-medium break-all select-all'>
        {value}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='size-5 text-emerald-500 shrink-0' />
            <DialogTitle>
              {keyName
                ? t('Connect API Key: {{name}}', { name: keyName })
                : t('Client Connection Guide')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t(
              'Copy one-line setup command or configure your graphical client directly.'
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full mt-2'
        >
          <TabsList className='grid grid-cols-3 w-full'>
            <TabsTrigger value='claude-code' className='text-xs sm:text-sm'>
              <Terminal className='size-3.5 mr-1.5' />
              Claude Code
            </TabsTrigger>
            <TabsTrigger value='codex-cli' className='text-xs sm:text-sm'>
              <Terminal className='size-3.5 mr-1.5' />
              Codex CLI
            </TabsTrigger>
            <TabsTrigger value='gui' className='text-xs sm:text-sm'>
              <AppWindow className='size-3.5 mr-1.5' />
              {t('GUI Clients')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='claude-code' className='space-y-4 pt-3'>
            <p className='text-xs text-muted-foreground'>
              {t(
                'This command configures your API base URL and key for Claude Code.'
              )}
            </p>
            <div className='flex items-center justify-between'>
              {osLabel}
              {osSwitch}
            </div>
            {renderCommandBlock(claudeCodeCommands, 'claude-code')}
          </TabsContent>

          <TabsContent value='codex-cli' className='space-y-4 pt-3'>
            <p className='text-xs text-muted-foreground'>
              {t(
                'This command writes the Codex CLI config files; your existing config is backed up automatically.'
              )}
            </p>
            <div className='flex items-center justify-between'>
              {osLabel}
              {osSwitch}
            </div>
            {renderCommandBlock(codexCliCommands, 'codex-cli')}
          </TabsContent>

          <TabsContent value='gui' className='space-y-4 pt-3'>
            <p className='text-xs text-muted-foreground'>
              {t(
                'In Cherry Studio, Claude Desktop, NextChat or other clients, add a new model provider and enter the two fields below:'
              )}
            </p>
            <div className='space-y-3'>
              {renderCopyRow(t('API Base URL'), BASE_API_URL, 'url')}
              {renderCopyRow(t('API Key'), cleanKey, 'key')}
            </div>
          </TabsContent>
        </Tabs>

        <div className='mt-3 flex items-center justify-between border-t pt-3'>
          <Button
            variant='outline'
            size='sm'
            className='text-xs gap-1.5'
            onClick={copyAllAiPrompt}
          >
            {copiedSection === 'all' ? (
              <Check className='size-3.5 text-emerald-500' />
            ) : (
              <Copy className='size-3.5' />
            )}
            {t('Copy all info for AI')}
          </Button>

          <Button variant='default' size='sm' onClick={() => onOpenChange(false)}>
            {t('Done')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

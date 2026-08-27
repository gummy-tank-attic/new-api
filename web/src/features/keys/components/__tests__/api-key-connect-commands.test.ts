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
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import {
  buildClaudePosixCommand,
  buildClaudePowerShellCommand,
  buildCodexPosixCommand,
  buildCodexPowerShellCommand,
} from '../dialogs/api-key-connect-commands'

const options = {
  baseUrl: 'https://api.metartr.com/v1',
  apiKey: 'sk-test',
  successMessage: 'setup succeeded',
  failureMessage: 'setup failed',
}

function toPosixPath(path: string): string {
  return path
    .replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`)
    .replaceAll('\\', '/')
}

function findGitBash(): string | null {
  const candidates = [
    'D:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\bin\\bash.exe',
  ]
  return (
    candidates.find((candidate) =>
      statSync(candidate, { throwIfNoEntry: false })?.isFile()
    ) ?? null
  )
}

describe('setup command generation', () => {
  test('PowerShell commands survive rich-text chat forwarding unchanged', () => {
    const claude = buildClaudePowerShellCommand({
      ...options,
      baseUrl: 'https://api.metartr.com',
    })
    const codex = buildCodexPowerShellCommand(options)

    expect(claude).toContain(
      "$metartrBaseName = 'ANTHROPIC' + [char]95 + 'BASE' + [char]95 + 'URL'"
    )
    expect(claude).toContain("'Process'")
    expect(claude).toContain("'User'")
    expect(claude).toContain('$PSItem.Exception.Message')
    expect(codex).toContain('codex login --with-api-key')
    expect(codex).toContain(
      "$metartrProviderTable = '[model' + [char]95 + 'providers.metartr]'"
    )
    expect(codex).toContain("$ErrorActionPreference = 'Stop'")
    for (const command of [claude, codex]) {
      expect(command).not.toContain('_')
      expect(command).not.toContain('https://')
      expect(command).not.toContain('\\_')
      expect(command).not.toContain('[https://')
      expect(command).not.toMatch(/&#(?:x[\da-f]+|\d+);|&nbsp;/i)
      const chatSerialized = command
        .replaceAll(/https:\/\/\S+/g, (url) => `[${url}](${url})`)
        .replaceAll('_', '\\_')
      expect(chatSerialized).toBe(command)
    }
  })

  test.skipIf(process.platform !== 'win32')(
    'PowerShell 5.1 parses both commands',
    () => {
      const commands = [
        buildClaudePowerShellCommand({
          ...options,
          baseUrl: 'https://api.metartr.com',
        }),
        buildCodexPowerShellCommand(options),
      ]

      for (const command of commands) {
        const source = Buffer.from(command, 'utf8').toString('base64')
        const parser = [
          `$source = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${source}'))`,
          `$tokens = $null`,
          `$errors = $null`,
          `[Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$errors) | Out-Null`,
          `if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 }`,
        ].join('; ')
        const result = spawnSync(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-Command', parser],
          { encoding: 'utf8' }
        )
        expect(result.status, result.stderr).toBe(0)
      }
    }
  )

  test.skipIf(process.platform !== 'win32')(
    'Codex PowerShell preserves existing settings and original backups across switches',
    () => {
      const codexDir = mkdtempSync(join(tmpdir(), 'metartr-codex-'))
      const configPath = join(codexDir, 'config.toml')
      const authPath = join(codexDir, 'auth.json')
      const originalConfig = [
        'model = "gpt-existing"',
        'sandbox_mode = "read-only"',
        '',
        '[mcp_servers.demo]',
        'command = "demo"',
        '',
      ].join('\n')
      const originalAuth =
        '{"auth_mode":"chatgpt","tokens":{"access_token":"old"}}\n'
      writeFileSync(configPath, originalConfig, 'utf8')
      writeFileSync(authPath, originalAuth, 'utf8')

      try {
        for (const apiKey of ['sk-first', 'sk-second']) {
          const command = buildCodexPowerShellCommand({ ...options, apiKey })
          const encoded = Buffer.from(command, 'utf16le').toString('base64')
          const result = spawnSync(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
            {
              encoding: 'utf8',
              env: { ...process.env, CODEX_HOME: codexDir },
            }
          )
          expect(result.status, result.stderr).toBe(0)
        }

        const savedConfig = readFileSync(configPath, 'utf8')
        expect(savedConfig).toContain('model = "gpt-existing"')
        expect(savedConfig).toContain('[mcp_servers.demo]')
        expect(savedConfig).toContain('model_provider = "metartr"')
        expect(savedConfig.match(/\[model_providers\.metartr\]/g)).toHaveLength(
          1
        )
        expect(readFileSync(configPath).subarray(0, 3)).not.toEqual(
          Buffer.from([0xef, 0xbb, 0xbf])
        )
        expect(readFileSync(`${configPath}.metartr-original.bak`, 'utf8')).toBe(
          originalConfig
        )
        expect(readFileSync(`${authPath}.metartr-original.bak`, 'utf8')).toBe(
          originalAuth
        )
        expect(
          readdirSync(codexDir).filter((name) =>
            /^config\.toml\.metartr-\d.*\.bak$/.test(name)
          ).length
        ).toBeGreaterThanOrEqual(2)
        expect(
          readdirSync(codexDir).filter((name) =>
            /^auth\.json\.metartr-\d.*\.bak$/.test(name)
          ).length
        ).toBeGreaterThanOrEqual(2)
        expect(JSON.parse(readFileSync(authPath, 'utf8'))).toMatchObject({
          auth_mode: 'apikey',
          OPENAI_API_KEY: 'sk-second',
        })
      } finally {
        rmSync(codexDir, { recursive: true, force: true })
      }
    }
  )

  test('POSIX commands parse, preserve files, and suppress success on failure', () => {
    const bash = findGitBash()
    if (!bash) return

    const home = mkdtempSync(join(tmpdir(), 'metartr-posix-'))
    const codexDir = join(home, '.codex')
    const binDir = join(home, 'bin')
    mkdirSync(codexDir)
    mkdirSync(binDir)
    const configPath = join(codexDir, 'config.toml')
    const authPath = join(codexDir, 'auth.json')
    const originalConfig =
      'model = "gpt-existing"\n\n[mcp_servers.demo]\ncommand = "demo"\n'
    const originalAuth = '{"auth_mode":"chatgpt"}\n'
    writeFileSync(configPath, originalConfig, 'utf8')
    writeFileSync(authPath, originalAuth, 'utf8')
    const fakeCodex = join(binDir, 'codex')
    writeFileSync(
      fakeCodex,
      [
        '#!/bin/sh',
        'if [ "$1 $2" = "login --with-api-key" ]; then',
        '  IFS= read -r key',
        '  printf \'{"auth_mode":"apikey","OPENAI_API_KEY":"%s"}\\n\' "$key" > "$CODEX_HOME/auth.json"',
        '  exit 0',
        'fi',
        'if [ "$1 $2" = "login status" ]; then exit 0; fi',
        'exit 1',
      ].join('\n'),
      'utf8'
    )
    chmodSync(fakeCodex, 0o755)

    try {
      const claude = buildClaudePosixCommand({
        ...options,
        baseUrl: 'https://api.metartr.com',
      })
      const codex = buildCodexPosixCommand(options)
      for (const command of [claude, codex]) {
        const parsed = spawnSync(bash, ['-n'], {
          input: command,
          encoding: 'utf8',
        })
        expect(parsed.status, parsed.stderr).toBe(0)
      }

      const env = {
        ...process.env,
        HOME: toPosixPath(home),
        CODEX_HOME: toPosixPath(codexDir),
        PATH: `${toPosixPath(binDir)}:/usr/bin`,
      }
      for (const apiKey of ['sk-first', 'sk-second']) {
        const result = spawnSync(
          bash,
          ['-c', buildCodexPosixCommand({ ...options, apiKey })],
          { encoding: 'utf8', env }
        )
        expect(result.status, result.stderr).toBe(0)
        expect(result.stdout).toContain(options.successMessage)
      }
      expect(readFileSync(configPath, 'utf8')).toContain('[mcp_servers.demo]')
      expect(readFileSync(`${configPath}.metartr-original.bak`, 'utf8')).toBe(
        originalConfig
      )
      expect(readFileSync(`${authPath}.metartr-original.bak`, 'utf8')).toBe(
        originalAuth
      )
      expect(buildCodexPosixCommand(options)).toContain(
        'chmod 600 "$metartr_auth" || return 1'
      )
      if (process.platform !== 'win32') {
        expect(statSync(authPath).mode & 0o777).toBe(0o600)
      }

      const blockedCodexHome = join(home, 'blocked-codex-home')
      writeFileSync(blockedCodexHome, 'not a directory', 'utf8')
      const failed = spawnSync(bash, ['-c', buildCodexPosixCommand(options)], {
        encoding: 'utf8',
        env: { ...env, CODEX_HOME: toPosixPath(blockedCodexHome) },
      })
      expect(failed.status).not.toBe(0)
      expect(failed.stdout).not.toContain(options.successMessage)
      expect(failed.stderr).toContain(options.failureMessage)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test('rejects commands already corrupted by rich-text rendering', () => {
    expect(() =>
      buildClaudePowerShellCommand({
        ...options,
        baseUrl: '[https://api.metartr.com](https://api.metartr.com)',
      })
    ).toThrow('rendered rich-text markup')
  })
})

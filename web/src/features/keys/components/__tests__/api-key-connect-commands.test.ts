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

const setupDir = join(process.cwd(), 'public', 'setup')
const options = { apiKey: 'sk-test' }

function readSetupScript(name: string): string {
  return readFileSync(join(setupDir, name), 'utf8')
}

function toPosixPath(path: string): string {
  return path
    .replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`)
    .replaceAll('\\', '/')
}

function findBash(): string | null {
  if (process.platform !== 'win32') return 'bash'
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

describe('one-line setup command generation', () => {
  test('all visible commands are one readable line with fixed-version URLs', () => {
    const commands = [
      buildClaudePowerShellCommand(options),
      buildClaudePosixCommand(options),
      buildCodexPowerShellCommand(options),
      buildCodexPosixCommand(options),
    ]

    for (const command of commands) {
      expect(command.split(/\r?\n/)).toHaveLength(1)
      expect(command).toContain('https://www.metartr.com/setup/')
      expect(command).toContain('-v1.txt')
      expect(command).toContain('MTRKEY=')
      expect(command).toContain('sk-test')
      expect(command).not.toContain('\\_')
      expect(command).not.toContain('[https://')
      expect(command).not.toMatch(/&#(?:x[\da-f]+|\d+);|&nbsp;/i)
    }
  })

  test('the public helpers contain logic but never contain a generated key', () => {
    const scripts = [
      readSetupScript('claude-windows-v1.txt'),
      readSetupScript('claude-posix-v1.txt'),
      readSetupScript('codex-windows-v1.txt'),
      readSetupScript('codex-posix-v1.txt'),
    ]

    for (const script of scripts) {
      expect(script).toContain('MTRKEY')
      expect(script).not.toContain(options.apiKey)
      expect(script).toContain('MetaRtr setup complete')
    }
    expect(scripts[0]).toContain('ANTHROPIC_BASE_URL')
    expect(scripts[1]).toContain('ANTHROPIC_AUTH_TOKEN')
    expect(scripts[2]).toContain('codex login --with-api-key')
    expect(scripts[3]).toContain('[model_providers.metartr]')
  })

  test.skipIf(process.platform !== 'win32')(
    'PowerShell 5.1 parses bootstraps and both downloaded helpers',
    () => {
      const sources = [
        buildClaudePowerShellCommand(options),
        buildCodexPowerShellCommand(options),
        readSetupScript('claude-windows-v1.txt'),
        readSetupScript('codex-windows-v1.txt'),
      ]

      for (const sourceText of sources) {
        const source = Buffer.from(sourceText, 'utf8').toString('base64')
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
    'Codex PowerShell helper preserves settings and backups across switches',
    () => {
      const home = mkdtempSync(join(tmpdir(), 'metartr-codex-ps-'))
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
      writeFileSync(
        join(binDir, 'codex.cmd'),
        ['@echo off', 'node "%~dp0codex-stub.cjs" %*'].join('\r\n'),
        'utf8'
      )
      writeFileSync(
        join(binDir, 'codex-stub.cjs'),
        [
          "const fs = require('node:fs')",
          "const path = require('node:path')",
          "const command = process.argv.slice(2).join(' ')",
          "if (command === 'login --with-api-key') {",
          "  const key = fs.readFileSync(0, 'utf8').trim()",
          "  fs.writeFileSync(path.join(process.env.CODEX_HOME, 'auth.json'), JSON.stringify({ auth_mode: 'apikey', OPENAI_API_KEY: key }) + '\\n')",
          '  process.exit(0)',
          '}',
          "if (command === 'login status') process.exit(0)",
          'process.exit(1)',
        ].join('\n'),
        'utf8'
      )

      try {
        const script = readSetupScript('codex-windows-v1.txt')
        const encoded = Buffer.from(script, 'utf16le').toString('base64')
        for (const apiKey of ['sk-first', 'sk-second']) {
          const result = spawnSync(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
            {
              encoding: 'utf8',
              env: {
                ...process.env,
                CODEX_HOME: codexDir,
                MTRKEY: apiKey,
                PATH: `${binDir};${process.env.PATH ?? ''}`,
              },
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
        expect(JSON.parse(readFileSync(authPath, 'utf8'))).toMatchObject({
          auth_mode: 'apikey',
          OPENAI_API_KEY: 'sk-second',
        })
      } finally {
        rmSync(home, { recursive: true, force: true })
      }
    }
  )

  test('POSIX helpers parse and preserve Claude/Codex configuration', () => {
    const bash = findBash()
    if (!bash) return

    const home = mkdtempSync(join(tmpdir(), 'metartr-setup-sh-'))
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

    const claudeScript = readSetupScript('claude-posix-v1.txt')
    const codexScript = readSetupScript('codex-posix-v1.txt')
    try {
      for (const script of [claudeScript, codexScript]) {
        const parsed = spawnSync(bash, ['-n'], {
          input: script,
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
      const claude = spawnSync(bash, ['-s'], {
        input: claudeScript,
        encoding: 'utf8',
        env: { ...env, MTRKEY: 'sk-claude' },
      })
      expect(claude.status, claude.stderr).toBe(0)
      expect(readFileSync(join(home, '.bashrc'), 'utf8')).toContain(
        "export ANTHROPIC_AUTH_TOKEN='sk-claude'"
      )

      for (const apiKey of ['sk-first', 'sk-second']) {
        const result = spawnSync(bash, ['-s'], {
          input: codexScript,
          encoding: 'utf8',
          env: { ...env, MTRKEY: apiKey },
        })
        expect(result.status, result.stderr).toBe(0)
        expect(result.stdout).toContain('MetaRtr setup complete')
      }
      expect(readFileSync(configPath, 'utf8')).toContain('[mcp_servers.demo]')
      expect(readFileSync(`${configPath}.metartr-original.bak`, 'utf8')).toBe(
        originalConfig
      )
      expect(readFileSync(`${authPath}.metartr-original.bak`, 'utf8')).toBe(
        originalAuth
      )
      expect(JSON.parse(readFileSync(authPath, 'utf8'))).toMatchObject({
        OPENAI_API_KEY: 'sk-second',
      })
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})

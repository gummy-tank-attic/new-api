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
type SetupCommandOptions = {
  apiKey: string
}

const SETUP_BASE_URL = 'https://www.metartr.com/setup'

function psSingleQuoted(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function shSingleQuoted(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

function assertPlainOneLineCommand(command: string): string {
  if (
    command.includes('\n') ||
    command.includes('\\_') ||
    /\[https?:\/\/[^\]]+\]\(https?:\/\/[^)]+\)/.test(command) ||
    /&#(?:x[\da-f]+|\d+);|&nbsp;/i.test(command)
  ) {
    throw new Error('Setup command is not safe plain text')
  }
  return command
}

function buildPowerShellCommand(scriptName: string, apiKey: string): string {
  return assertPlainOneLineCommand(
    `$env:MTRKEY=${psSingleQuoted(apiKey)};irm ${SETUP_BASE_URL}/${scriptName}|iex`
  )
}

function buildPosixCommand(scriptName: string, apiKey: string): string {
  return assertPlainOneLineCommand(
    `curl -fsSL ${SETUP_BASE_URL}/${scriptName}|MTRKEY=${shSingleQuoted(apiKey)} sh`
  )
}

export function buildClaudePowerShellCommand({
  apiKey,
}: SetupCommandOptions): string {
  return buildPowerShellCommand('claude-windows-v1.txt', apiKey)
}

export function buildClaudePosixCommand({
  apiKey,
}: SetupCommandOptions): string {
  return buildPosixCommand('claude-posix-v1.txt', apiKey)
}

export function buildCodexPowerShellCommand({
  apiKey,
}: SetupCommandOptions): string {
  return buildPowerShellCommand('codex-windows-v1.txt', apiKey)
}

export function buildCodexPosixCommand({
  apiKey,
}: SetupCommandOptions): string {
  return buildPosixCommand('codex-posix-v1.txt', apiKey)
}

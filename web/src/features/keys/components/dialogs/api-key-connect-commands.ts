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
  baseUrl: string
  apiKey: string
  successMessage: string
  failureMessage: string
}

function psSingleQuoted(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function shSingleQuoted(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

function assertPlainCommand(command: string): string {
  if (
    command.includes('\\_') ||
    /\[https?:\/\/[^\]]+\]\(https?:\/\/[^)]+\)/.test(command) ||
    /&#(?:x[\da-f]+|\d+);|&nbsp;/i.test(command)
  ) {
    throw new Error('Setup command contains rendered rich-text markup')
  }
  return command
}

export function buildClaudePowerShellCommand(
  options: SetupCommandOptions
): string {
  return assertPlainCommand(
    [
      `$metartrBaseUrl = ${psSingleQuoted(options.baseUrl)}`,
      `$metartrAuthToken = ${psSingleQuoted(options.apiKey)}`,
      `$metartrFailureMessage = ${psSingleQuoted(options.failureMessage)}`,
      `$metartrPreviousErrorActionPreference = $ErrorActionPreference`,
      `$ErrorActionPreference = 'Stop'`,
      `try {`,
      `  [Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', $metartrBaseUrl, 'Process')`,
      `  [Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', $metartrAuthToken, 'Process')`,
      `  [Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', $metartrBaseUrl, 'User')`,
      `  [Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', $metartrAuthToken, 'User')`,
      `  if (`,
      `    [Environment]::GetEnvironmentVariable('ANTHROPIC_BASE_URL', 'Process') -ne $metartrBaseUrl -or`,
      `    [Environment]::GetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', 'Process') -ne $metartrAuthToken -or`,
      `    [Environment]::GetEnvironmentVariable('ANTHROPIC_BASE_URL', 'User') -ne $metartrBaseUrl -or`,
      `    [Environment]::GetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', 'User') -ne $metartrAuthToken`,
      `  ) {`,
      `    throw $metartrFailureMessage`,
      `  }`,
      `  Write-Host ${psSingleQuoted(options.successMessage)} -ForegroundColor Green`,
      `} catch {`,
      `  throw ($metartrFailureMessage + ' ' + $_.Exception.Message)`,
      `} finally {`,
      `  $ErrorActionPreference = $metartrPreviousErrorActionPreference`,
      `}`,
    ].join('\n')
  )
}

export function buildClaudePosixCommand(options: SetupCommandOptions): string {
  const baseExport = `export ANTHROPIC_BASE_URL=${shSingleQuoted(options.baseUrl)}`
  const tokenExport = `export ANTHROPIC_AUTH_TOKEN=${shSingleQuoted(options.apiKey)}`

  return assertPlainCommand(
    [
      `metartr_claude_setup() {`,
      `  umask 077`,
      `  for metartr_file in "$HOME/.zshrc" "$HOME/.bashrc"; do`,
      `    touch "$metartr_file" || return 1`,
      `    if [ ! -e "$metartr_file.metartr-original.bak" ]; then`,
      `      cp -p "$metartr_file" "$metartr_file.metartr-original.bak" || return 1`,
      `    fi`,
      `    metartr_tmp=$(mktemp "$metartr_file.metartr.XXXXXX") || return 1`,
      `    awk '!/ANTHROPIC_BASE_URL|ANTHROPIC_AUTH_TOKEN/' "$metartr_file" > "$metartr_tmp" || return 1`,
      `    printf '%s\n' ${shSingleQuoted(baseExport)} ${shSingleQuoted(tokenExport)} >> "$metartr_tmp" || return 1`,
      `    mv "$metartr_tmp" "$metartr_file" || return 1`,
      `    grep -Fqx ${shSingleQuoted(baseExport)} "$metartr_file" || return 1`,
      `    grep -Fqx ${shSingleQuoted(tokenExport)} "$metartr_file" || return 1`,
      `  done`,
      `  ${baseExport}`,
      `  ${tokenExport}`,
      `  [ "$ANTHROPIC_BASE_URL" = ${shSingleQuoted(options.baseUrl)} ] || return 1`,
      `  [ "$ANTHROPIC_AUTH_TOKEN" = ${shSingleQuoted(options.apiKey)} ] || return 1`,
      `}`,
      `if metartr_claude_setup; then`,
      `  printf '%s\n' ${shSingleQuoted(options.successMessage)}`,
      `else`,
      `  printf '%s\n' ${shSingleQuoted(options.failureMessage)} >&2`,
      `  false`,
      `fi`,
    ].join('\n')
  )
}

export function buildCodexPowerShellCommand(
  options: SetupCommandOptions
): string {
  const managedStart = '# >>> MetaRtr managed configuration >>>'
  const managedEnd = '# <<< MetaRtr managed configuration <<<'

  return assertPlainCommand(
    [
      `$metartrAuthToken = ${psSingleQuoted(options.apiKey)}`,
      `$metartrFailureMessage = ${psSingleQuoted(options.failureMessage)}`,
      `$metartrPreviousErrorActionPreference = $ErrorActionPreference`,
      `$ErrorActionPreference = 'Stop'`,
      `try {`,
      `  $metartrCodexDir = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }`,
      `  New-Item -ItemType Directory -Force $metartrCodexDir -ErrorAction Stop | Out-Null`,
      `  $metartrConfig = Join-Path $metartrCodexDir 'config.toml'`,
      `  $metartrAuthFile = Join-Path $metartrCodexDir 'auth.json'`,
      `  if ((Test-Path -LiteralPath $metartrConfig) -and !(Test-Path -LiteralPath $metartrConfig -PathType Leaf)) { throw 'config.toml is not a file' }`,
      `  if ((Test-Path -LiteralPath $metartrAuthFile) -and !(Test-Path -LiteralPath $metartrAuthFile -PathType Leaf)) { throw 'auth.json is not a file' }`,
      `  $metartrTimestamp = Get-Date -Format 'yyyyMMdd-HHmmssfff'`,
      `  if (Test-Path -LiteralPath $metartrConfig -PathType Leaf) {`,
      `    if (!(Test-Path -LiteralPath ($metartrConfig + '.metartr-original.bak'))) {`,
      `      Copy-Item -LiteralPath $metartrConfig -Destination ($metartrConfig + '.metartr-original.bak') -ErrorAction Stop`,
      `    }`,
      `    Copy-Item -LiteralPath $metartrConfig -Destination ($metartrConfig + '.metartr-' + $metartrTimestamp + '.bak') -ErrorAction Stop`,
      `  }`,
      `  if (Test-Path -LiteralPath $metartrAuthFile -PathType Leaf) {`,
      `    if (!(Test-Path -LiteralPath ($metartrAuthFile + '.metartr-original.bak'))) {`,
      `      Copy-Item -LiteralPath $metartrAuthFile -Destination ($metartrAuthFile + '.metartr-original.bak') -ErrorAction Stop`,
      `    }`,
      `    Copy-Item -LiteralPath $metartrAuthFile -Destination ($metartrAuthFile + '.metartr-' + $metartrTimestamp + '.bak') -ErrorAction Stop`,
      `  }`,
      `  $metartrInputLines = if (Test-Path -LiteralPath $metartrConfig -PathType Leaf) { [IO.File]::ReadAllLines($metartrConfig) } else { @() }`,
      `  $metartrOutputLines = [Collections.Generic.List[string]]::new()`,
      `  $metartrInTable = $false`,
      `  $metartrSkipManaged = $false`,
      `  $metartrSkipProvider = $false`,
      `  $metartrProviderSet = $false`,
      `  foreach ($metartrLine in $metartrInputLines) {`,
      `    if ($metartrLine -eq ${psSingleQuoted(managedStart)}) { $metartrSkipManaged = $true; continue }`,
      `    if ($metartrSkipManaged) {`,
      `      if ($metartrLine -eq ${psSingleQuoted(managedEnd)}) { $metartrSkipManaged = $false }`,
      `      continue`,
      `    }`,
      `    if ($metartrLine -match '^\\s*\\[model_providers\\.metartr(?:\\.[^\\]]+)?\\]\\s*$') { $metartrSkipProvider = $true; continue }`,
      `    if ($metartrSkipProvider) {`,
      `      if ($metartrLine -match '^\\s*\\[') { $metartrSkipProvider = $false } else { continue }`,
      `    }`,
      `    if ($metartrLine -match '^\\s*\\[') {`,
      `      if (!$metartrInTable -and !$metartrProviderSet) {`,
      `        $metartrOutputLines.Add('model_provider = "metartr"')`,
      `        $metartrOutputLines.Add('')`,
      `        $metartrProviderSet = $true`,
      `      }`,
      `      $metartrInTable = $true`,
      `    }`,
      `    if (!$metartrInTable -and $metartrLine -match '^\\s*model_provider\\s*=') {`,
      `      if (!$metartrProviderSet) { $metartrOutputLines.Add('model_provider = "metartr"'); $metartrProviderSet = $true }`,
      `      continue`,
      `    }`,
      `    $metartrOutputLines.Add($metartrLine)`,
      `  }`,
      `  if (!$metartrProviderSet) { $metartrOutputLines.Add('model_provider = "metartr"') }`,
      `  $metartrOutputLines.Add('')`,
      `  $metartrOutputLines.Add(${psSingleQuoted(managedStart)})`,
      `  $metartrOutputLines.Add('[model_providers.metartr]')`,
      `  $metartrOutputLines.Add('name = "MetaRtr"')`,
      `  $metartrOutputLines.Add(${psSingleQuoted(`base_url = "${options.baseUrl}"`)})`,
      `  $metartrOutputLines.Add('wire_api = "responses"')`,
      `  $metartrOutputLines.Add('requires_openai_auth = true')`,
      `  $metartrOutputLines.Add(${psSingleQuoted(managedEnd)})`,
      `  $metartrUtf8NoBom = [Text.UTF8Encoding]::new($false)`,
      `  $metartrTempConfig = $metartrConfig + '.metartr.tmp'`,
      `  [IO.File]::WriteAllLines($metartrTempConfig, $metartrOutputLines, $metartrUtf8NoBom)`,
      `  Move-Item -LiteralPath $metartrTempConfig -Destination $metartrConfig -Force -ErrorAction Stop`,
      `  $metartrAuthToken | & codex login --with-api-key`,
      `  if ($LASTEXITCODE -ne 0) { throw 'codex login failed' }`,
      `  & codex login status | Out-Null`,
      `  if ($LASTEXITCODE -ne 0) { throw 'codex login status failed' }`,
      `  $metartrSavedConfig = [IO.File]::ReadAllText($metartrConfig)`,
      `  if (!$metartrSavedConfig.Contains('model_provider = "metartr"') -or !$metartrSavedConfig.Contains(${psSingleQuoted(`base_url = "${options.baseUrl}"`)})) { throw 'config verification failed' }`,
      `  Write-Host ${psSingleQuoted(options.successMessage)} -ForegroundColor Green`,
      `} catch {`,
      `  throw ($metartrFailureMessage + ' ' + $_.Exception.Message)`,
      `} finally {`,
      `  $ErrorActionPreference = $metartrPreviousErrorActionPreference`,
      `}`,
    ].join('\n')
  )
}

export function buildCodexPosixCommand(options: SetupCommandOptions): string {
  const managedStart = '# >>> MetaRtr managed configuration >>>'
  const managedEnd = '# <<< MetaRtr managed configuration <<<'

  return assertPlainCommand(
    [
      `metartr_codex_setup() {`,
      `  umask 077`,
      `  metartr_codex_dir=\${CODEX_HOME:-"$HOME/.codex"}`,
      `  mkdir -p "$metartr_codex_dir" || return 1`,
      `  metartr_config="$metartr_codex_dir/config.toml"`,
      `  metartr_auth="$metartr_codex_dir/auth.json"`,
      `  { [ ! -e "$metartr_config" ] || [ -f "$metartr_config" ]; } || return 1`,
      `  { [ ! -e "$metartr_auth" ] || [ -f "$metartr_auth" ]; } || return 1`,
      `  metartr_backup() {`,
      `    metartr_source=$1`,
      `    [ -f "$metartr_source" ] || return 0`,
      `    if [ ! -e "$metartr_source.metartr-original.bak" ]; then`,
      `      cp -p "$metartr_source" "$metartr_source.metartr-original.bak" || return 1`,
      `    fi`,
      `    metartr_stamp=$(date +%Y%m%d-%H%M%S) || return 1`,
      `    metartr_backup_path="$metartr_source.metartr-$metartr_stamp.bak"`,
      `    metartr_counter=0`,
      `    while [ -e "$metartr_backup_path" ]; do`,
      `      metartr_counter=$((metartr_counter + 1))`,
      `      metartr_backup_path="$metartr_source.metartr-$metartr_stamp-$metartr_counter.bak"`,
      `    done`,
      `    cp -p "$metartr_source" "$metartr_backup_path" || return 1`,
      `  }`,
      `  metartr_backup "$metartr_config" || return 1`,
      `  metartr_backup "$metartr_auth" || return 1`,
      `  metartr_tmp=$(mktemp "$metartr_codex_dir/config.toml.metartr.XXXXXX") || return 1`,
      `  metartr_input=/dev/null`,
      `  [ ! -f "$metartr_config" ] || metartr_input=$metartr_config`,
      `  awk -v managed_start=${shSingleQuoted(managedStart)} -v managed_end=${shSingleQuoted(managedEnd)} '`,
      `    BEGIN { in_table = 0; skip_managed = 0; skip_provider = 0; provider_set = 0 }`,
      `    $0 == managed_start { skip_managed = 1; next }`,
      `    skip_managed { if ($0 == managed_end) skip_managed = 0; next }`,
      `    /^[[:space:]]*\\[model_providers\\.metartr([.][^]]+)?\\][[:space:]]*$/ { skip_provider = 1; next }`,
      `    skip_provider && $0 !~ /^[[:space:]]*\\[/ { next }`,
      `    skip_provider { skip_provider = 0 }`,
      `    /^[[:space:]]*\\[/ {`,
      `      if (!in_table && !provider_set) { print "model_provider = \\"metartr\\""; print ""; provider_set = 1 }`,
      `      in_table = 1`,
      `    }`,
      `    !in_table && /^[[:space:]]*model_provider[[:space:]]*=/ {`,
      `      if (!provider_set) { print "model_provider = \\"metartr\\""; provider_set = 1 }`,
      `      next`,
      `    }`,
      `    { print }`,
      `    END { if (!provider_set) print "model_provider = \\"metartr\\"" }`,
      `  ' "$metartr_input" > "$metartr_tmp" || return 1`,
      `  printf '\n%s\n' ${shSingleQuoted(managedStart)} >> "$metartr_tmp" || return 1`,
      `  printf '%s\n' '[model_providers.metartr]' 'name = "MetaRtr"' ${shSingleQuoted(`base_url = "${options.baseUrl}"`)} 'wire_api = "responses"' 'requires_openai_auth = true' ${shSingleQuoted(managedEnd)} >> "$metartr_tmp" || return 1`,
      `  mv "$metartr_tmp" "$metartr_config" || return 1`,
      `  printf '%s\n' ${shSingleQuoted(options.apiKey)} | codex login --with-api-key || return 1`,
      `  codex login status >/dev/null || return 1`,
      `  grep -Fqx 'model_provider = "metartr"' "$metartr_config" || return 1`,
      `  grep -Fqx ${shSingleQuoted(`base_url = "${options.baseUrl}"`)} "$metartr_config" || return 1`,
      `  if [ -f "$metartr_auth" ]; then chmod 600 "$metartr_auth" || return 1; fi`,
      `}`,
      `if metartr_codex_setup; then`,
      `  printf '%s\n' ${shSingleQuoted(options.successMessage)}`,
      `else`,
      `  printf '%s\n' ${shSingleQuoted(options.failureMessage)} >&2`,
      `  false`,
      `fi`,
    ].join('\n')
  )
}

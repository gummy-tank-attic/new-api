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
import { normalizeGroupName } from '@/features/pricing/constants'

export type ConnectTab = 'claude-code' | 'codex-cli' | 'app'

export type ConnectPlan = {
  tabs: ConnectTab[]
  defaultTab: ConnectTab
  notice: 'image-video' | 'cli-only' | 'external' | null
}

export type AppIntegrationGuide =
  | 'openai-compatible'
  | 'gemini'
  | 'image-video'

/**
 * Return the protocol guidance shown for non-CLI groups.
 * Keep this based on the public group name so the connect dialog does not
 * depend on pricing data loading or provider metadata.
 */
export function resolveAppIntegrationGuide(
  tokenGroup?: string
): AppIntegrationGuide {
  const norm = normalizeGroupName(tokenGroup || '')
  if (norm.includes('image') || norm.includes('video')) {
    return 'image-video'
  }
  if (norm === 'gemini' || norm === 'google' || norm.includes('gemini')) {
    return 'gemini'
  }
  return 'openai-compatible'
}

export function resolveConnectPlan(tokenGroup?: string): ConnectPlan {
  const norm = normalizeGroupName(tokenGroup || '')
  if (!norm) {
    return { tabs: ['app'], defaultTab: 'app', notice: 'external' }
  }
  if (norm.includes('image') || norm.includes('video')) {
    return { tabs: ['app'], defaultTab: 'app', notice: 'image-video' }
  }
  if (norm.includes('claude')) {
    return {
      tabs: ['claude-code'],
      defaultTab: 'claude-code',
      notice: norm.includes('cli only') ? 'cli-only' : null,
    }
  }
  if (norm.includes('codex')) {
    return {
      tabs: ['codex-cli'],
      defaultTab: 'codex-cli',
      notice: norm.includes('codex only') ? 'cli-only' : null,
    }
  }
  return { tabs: ['app'], defaultTab: 'app', notice: 'external' }
}

export function hasConnectGuide(tokenGroup?: string): boolean {
  return resolveConnectPlan(tokenGroup).tabs.length > 0
}

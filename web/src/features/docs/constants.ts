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
/** OpenAI-compatible base (includes /v1). */
export const API_BASE_URL = 'https://api.metartr.com/v1'

/** OpenAI-compatible image and video generation direct endpoint. */
export const API_IMAGES_ENDPOINT =
  'https://api.metartr.com/v1/images/generations'

/**
 * Host without /v1 — for Anthropic-style clients that append paths themselves
 * (e.g. Claude Code → /v1/messages).
 */
export const API_HOST = 'https://api.metartr.com'

/** Public website (Pages only — not for API clients or account-manager tools). */
export const SITE_URL = 'https://www.metartr.com'

export const PRICING_PATH = '/pricing'

export const DOCS_SECTION_IDS = [
  'quickstart',
  'base-url',
  'sdk',
  'images',
  'claude-code',
  'codex',
  'cursor',
  'clients',
  'models',
  'troubleshooting',
] as const

export type DocsSectionId = (typeof DOCS_SECTION_IDS)[number]

export const DEFAULT_DOCS_SECTION: DocsSectionId = 'quickstart'

/** Nav labels use English keys so i18n can translate them. */
export const DOCS_NAV: ReadonlyArray<{
  id: DocsSectionId
  labelKey: string
  groupKey: string
}> = [
  {
    id: 'quickstart',
    labelKey: 'Quick start',
    groupKey: 'Getting started',
  },
  {
    id: 'base-url',
    labelKey: 'Base URL & API Key',
    groupKey: 'Getting started',
  },
  {
    id: 'sdk',
    labelKey: 'SDK & cURL',
    groupKey: 'Getting started',
  },
  {
    id: 'images',
    labelKey: 'Image & Video',
    groupKey: 'Getting started',
  },
  {
    id: 'claude-code',
    labelKey: 'Claude Code',
    groupKey: 'Coding tools',
  },
  {
    id: 'codex',
    labelKey: 'Codex',
    groupKey: 'Coding tools',
  },
  {
    id: 'cursor',
    labelKey: 'Cursor / Windsurf',
    groupKey: 'Coding tools',
  },
  {
    id: 'clients',
    labelKey: 'Chat clients',
    groupKey: 'Coding tools',
  },
  {
    id: 'models',
    labelKey: 'Models & pricing',
    groupKey: 'Reference',
  },
  {
    id: 'troubleshooting',
    labelKey: 'Troubleshooting',
    groupKey: 'Reference',
  },
]

/**
 * Public product model IDs for copy-paste demos only.
 * Always tell users to copy live IDs from Model Square—do not imply supply chain.
 */
export const EXAMPLE_MODEL_OPENAI = 'gpt-5.4'
export const EXAMPLE_MODEL_ANTHROPIC = 'claude-sonnet-4-6'
export const EXAMPLE_MODEL_IMAGE = 'grok-imagine-image-quality'
export const EXAMPLE_MODEL_VIDEO = 'grok-imagine-video'
export const EXAMPLE_API_KEY = 'sk-metartr-your-api-key'
export const IMAGE_GENERATIONS_ENDPOINT = `${API_BASE_URL}/images/generations`

export function isDocsSectionId(
  value: string | undefined
): value is DocsSectionId {
  return (
    value !== undefined &&
    (DOCS_SECTION_IDS as readonly string[]).includes(value)
  )
}

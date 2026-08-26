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
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

const { useState } = await import('react')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { ApiKeyGroupCombobox } = await import('../api-key-group-combobox')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Search...': 'Search...',
        'No group found.': 'No group found.',
        'Select a group': 'Select a group',
        'Claude Code / Codex CLI only': 'Claude Code / Codex CLI only',
      },
    },
  },
})

const options = [
  { value: 'default', label: 'default', desc: 'User group', ratio: 1 },
  { value: 'vip', label: 'vip', desc: 'Priority group', ratio: 3 },
  {
    value: 'Claude Max(CLI Only)',
    label: 'Claude Max(CLI Only)',
    desc: 'Official Max, CLI clients only',
    ratio: 2,
  },
]

function Harness(props: { initialValue: string }) {
  const [value, setValue] = useState(props.initialValue)

  return (
    <I18nextProvider i18n={i18n}>
      <ApiKeyGroupCombobox
        options={options}
        value={value}
        onValueChange={setValue}
      />
      <output data-testid='selected-group'>{value}</output>
    </I18nextProvider>
  )
}

function getTrigger(): HTMLButtonElement {
  return screen.getByRole('combobox')
}

function getCommandItem(label: string): HTMLElement {
  const item = [
    ...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]'),
  ].find((candidate) => candidate.textContent?.includes(label))
  if (!item) {
    throw new Error(`Expected command item containing "${label}"`)
  }
  return item
}

describe('API key group combobox (T1)', () => {
  test('shows placeholder when empty and renders name, description, and ratio badge per option', () => {
    render(<Harness initialValue='' />)

    const trigger = getTrigger()
    expect(trigger).toHaveTextContent('Select a group')

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const vipOption = getCommandItem('vip')
    expect(vipOption).toHaveTextContent('Priority group')
    expect(vipOption).toHaveTextContent('×3')

    const defaultOption = getCommandItem('User group')
    expect(defaultOption).toHaveTextContent('×1')
  })

  test('selects a group, closes the list, and search filters options', () => {
    const { container } = render(<Harness initialValue='' />)

    const trigger = getTrigger()
    fireEvent.click(trigger)

    fireEvent.input(screen.getByPlaceholderText('Search...'), {
      target: { value: 'vip' },
    })
    const visibleOptions = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]'),
    ]
    expect(
      visibleOptions.some((option) => option.textContent?.includes('User group'))
    ).toBe(false)

    fireEvent.click(getCommandItem('Priority group'))
    expect(within(container).getByTestId('selected-group')).toHaveTextContent(
      'vip'
    )
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveTextContent('vip')
    expect(trigger).toHaveTextContent('Priority group')
  })

  test('keeps showing the raw current value when it is not among the options', () => {
    render(<Harness initialValue='auto' />)

    const trigger = getTrigger()
    expect(trigger).toHaveTextContent('auto')
    expect(trigger).not.toHaveTextContent('Select a group')
  })

  test('marks CLI-only groups with the restriction badge', () => {
    render(<Harness initialValue='' />)

    fireEvent.click(getTrigger())
    const cliOption = getCommandItem('Claude Max(CLI Only)')
    expect(cliOption).toHaveTextContent('Claude Code / Codex CLI only')

    const vipOption = getCommandItem('Priority group')
    expect(vipOption).not.toHaveTextContent('Claude Code / Codex CLI only')
  })
})

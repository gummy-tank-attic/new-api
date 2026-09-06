import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

import { ImageTierPrices } from '../components/image-tier-prices'
import { ModelCard } from '../components/model-card'
import { SupplierPriceTable } from '../components/supplier-price-table'
import { parseImageTiersFromExpr } from '../lib/billing-expr'
import type { PricingModel } from '../types'

const expression =
  '(has(param("size") ?? "", "2048") || has(param("resolution") ?? "", "2K")) ? tier("2K", 200000 * (param("n") ?? 1.0)) : tier("1K", 133333.3333333333 * (param("n") ?? 1.0))'
const clampedExpression = expression.replaceAll(
  '(param("n") ?? 1.0)',
  'max(param("n") ?? 1.0, 1.0)'
)
const model: PricingModel = {
  id: 1,
  model_name: 'gpt-image-2',
  quota_type: 0,
  model_ratio: 37.5,
  completion_ratio: 2,
  enable_groups: ['Codex Pro（External）', 'Codex Pro (image)'],
  billing_mode: 'tiered_expr',
  billing_expr: expression,
}

afterEach(cleanup)

describe('per-image pricing', () => {
  test('table quotes match the existing token price column grid and type size', () => {
    const { container } = render(
      <ImageTierPrices model={model} groupRatio={0.15} layout='table' />
    )
    expect(container.querySelector('dl')).toHaveClass(
      'grid',
      'grid-cols-2',
      'sm:grid-cols-3'
    )
    expect(container.querySelectorAll('dt')).toHaveLength(2)
    expect(container.querySelector('dt')).toHaveClass(
      'text-foreground',
      'text-sm',
      'font-semibold'
    )
    expect(container.querySelector('dt')).not.toHaveClass('order-2')
    expect(container.querySelector('dt')?.parentElement).toHaveClass(
      'flex',
      'items-center'
    )
    expect(container.querySelector('dd')).toHaveClass(
      'text-[15px]',
      'sm:text-[16px]',
      'tabular-nums'
    )
  })
  test('model cards show both image prices without a token unit', () => {
    const group = model.enable_groups[0]
    render(
      <ModelCard
        model={{ ...model, group_ratio: { [group]: 0.15 } }}
        selectedGroup={group}
        onClick={() => {}}
      />
    )
    expect(screen.getByText(/\$0\.02\b/)).toBeTruthy()
    expect(screen.getByText(/\$0\.03\b/)).toBeTruthy()
    expect(screen.queryByText('1M')).toBeNull()
  })
  test.each(model.enable_groups)(
    '%s shows image tiers instead of legacy token prices',
    (group) => {
      render(
        <SupplierPriceTable
          models={[model]}
          priceMode='group'
          selectedGroup={group}
          groupRatio={{ [group]: 0.15 }}
        />
      )
      expect(screen.getByText('1K')).toBeTruthy()
      expect(screen.getByText('2K')).toBeTruthy()
      expect(screen.getByText(/\$0\.02\b/)).toBeTruthy()
      expect(screen.getByText(/\$0\.03\b/)).toBeTruthy()
      expect(screen.queryByText(/11\.25|22\.5|85% OFF/)).toBeNull()
      expect(screen.queryByText('Input price')).toBeNull()
    }
  )

  test('extracts per-image USD prices in resolution order', () => {
    const tiers = parseImageTiersFromExpr(`v1:${expression}`)
    expect(tiers.map((tier) => tier.label)).toEqual(['1K', '2K'])
    expect(tiers[0]?.price).toBeCloseTo(0.1333333333333333)
    expect(tiers[1]?.price).toBe(0.2)
  })

  test('extracts prices when image count is clamped to at least one', () => {
    const tiers = parseImageTiersFromExpr(clampedExpression)
    expect(tiers.map((tier) => tier.label)).toEqual(['1K', '2K'])
    expect(tiers[0]?.price).toBeCloseTo(0.1333333333333333)
    expect(tiers[1]?.price).toBe(0.2)
  })

  test.each([
    `(${expression}) * 2`,
    expression.replace('200000 *', 'p * 200000 *'),
    expression.replace('1.0', '2.0'),
    clampedExpression.replace(', 1.0)', ', 2.0)'),
    `v2:${expression}`,
    `${expression}|||when(header("x") has "y") * 2`,
  ])('does not invent prices for unsupported expression %s', (expr) => {
    expect(parseImageTiersFromExpr(expr)).toEqual([])
  })

  test('unsupported image expressions never fall back to token rates', () => {
    render(
      <SupplierPriceTable
        models={[{ ...model, billing_expr: '200000 * param("n")' }]}
        priceMode='group'
        selectedGroup='default'
        groupRatio={{ default: 0.15 }}
      />
    )
    expect(screen.getByText('Unable to parse structured pricing')).toBeTruthy()
    expect(screen.queryByText(/11\.25|22\.5/)).toBeNull()
  })

  test('switching group ratios recomputes the quote without hardcoded prices', () => {
    const { rerender } = render(
      <SupplierPriceTable
        models={[model]}
        priceMode='group'
        selectedGroup='default'
        groupRatio={{ default: 0.3 }}
      />
    )
    expect(screen.getByText(/\$0\.04\b/)).toBeTruthy()
    expect(screen.getByText(/\$0\.06\b/)).toBeTruthy()
    rerender(
      <SupplierPriceTable
        models={[model]}
        priceMode='group'
        selectedGroup='default'
        groupRatio={{ default: 0 }}
      />
    )
    expect(screen.getAllByText(/^\$0$/)).toHaveLength(2)
  })

  test('official mode labels custom coefficients as base prices without a discount', () => {
    render(
      <SupplierPriceTable
        models={[model]}
        priceMode='official'
        selectedGroup='default'
        groupRatio={{ default: 0.15 }}
      />
    )
    expect(screen.getByText('Base Price')).toBeTruthy()
    expect(screen.getByText(/\$0\.2\b/)).toBeTruthy()
    expect(screen.queryByText(/OFF/)).toBeNull()
  })

  test('a mixed table retains token pricing for ordinary chat models', () => {
    render(
      <SupplierPriceTable
        models={[
          model,
          {
            ...model,
            id: 2,
            model_name: 'chat-model',
            billing_mode: undefined,
            billing_expr: undefined,
          },
        ]}
        priceMode='official'
        selectedGroup={null}
        groupRatio={{}}
      />
    )
    expect(screen.getByText('Input price')).toBeTruthy()
    expect(screen.getByText('$75')).toBeTruthy()
    expect(screen.getByText('$150')).toBeTruthy()
    expect(screen.getByText('2K')).toBeTruthy()
  })
})

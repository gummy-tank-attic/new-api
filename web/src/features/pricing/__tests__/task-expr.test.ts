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
import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  combineBillingExpr,
  parseTaskTiersFromExpr,
  splitBillingExprAndRequestRules,
} from '../lib/billing-expr'
import {
  evaluateTaskUsageExamples,
  evaluateTaskVisualConfig,
  generateTaskExprFromConfig,
  tryParseTaskVisualConfig,
  type TaskVisualConfig,
} from '../lib/task-expr'
import {
  getModelSpecificDiscountPercent,
  getVideoModelHeroPrice,
  getVideoModelTierGroups,
  parseDurationVideoTiers,
} from '../lib/video-pricing'
import type { BillingUsageSchema, PricingModel } from '../types'

const schema: BillingUsageSchema = {
  seconds: { type: 'number', unit: 'second' },
  clips: { type: 'number', unit: 'count' },
  mode: { enum: ['std', 'pro'] },
}

function assertConfigRoundTrip(config: TaskVisualConfig) {
  const expression = generateTaskExprFromConfig(config, schema)
  const parsed = tryParseTaskVisualConfig(expression, schema)
  assert.ok(parsed)
  assert.equal(generateTaskExprFromConfig(parsed, schema), expression)
}

describe('task billing expressions', () => {
  test('round-trips flat, enum-tiered, and additive canonical shapes', () => {
    assertConfigRoundTrip({
      tiers: [
        {
          label: 'base',
          conditions: [],
          constant: 0,
          unitPrices: { seconds: 0.4, clips: 0 },
        },
      ],
    })
    assertConfigRoundTrip({
      tiers: [
        {
          label: 'pro',
          conditions: [{ field: 'mode', value: 'pro' }],
          constant: 0,
          unitPrices: { seconds: 0.8, clips: 0 },
        },
        {
          label: 'std',
          conditions: [],
          constant: 0,
          unitPrices: { seconds: 0.4, clips: 0 },
        },
      ],
    })
    assertConfigRoundTrip({
      tiers: [
        {
          label: 'base',
          conditions: [],
          constant: 0.1,
          unitPrices: { seconds: 0.4, clips: 0.05 },
        },
      ],
    })
  })

  test('preserves request-rule factors around a canonical task expression', () => {
    const baseExpression = generateTaskExprFromConfig(
      {
        tiers: [
          {
            label: 'base',
            conditions: [],
            constant: 0,
            unitPrices: { seconds: 0.4, clips: 0 },
          },
        ],
      },
      schema
    )
    const requestRules = '(header("x-priority") == "high" ? 2 : 1)'
    const combined = combineBillingExpr(baseExpression, requestRules)
    const split = splitBillingExprAndRequestRules(combined)

    assert.equal(split.requestRuleExpr, requestRules)
    const parsed = tryParseTaskVisualConfig(split.billingExpr, schema)
    assert.ok(parsed)
    assert.equal(
      combineBillingExpr(
        generateTaskExprFromConfig(parsed, schema),
        requestRules
      ),
      combined
    )
  })

  test('rejects expressions outside the frozen task shapes', () => {
    assert.equal(tryParseTaskVisualConfig('u("seconds") * 0.4', schema), null)
    assert.equal(
      tryParseTaskVisualConfig(
        'u("seconds") > 30 ? tier("long", u("seconds") * 0.3) : tier("short", u("seconds") * 0.4)',
        schema
      ),
      null
    )
    assert.equal(
      tryParseTaskVisualConfig('tier("base", u("unknown") * 0.4)', schema),
      null
    )
  })
})

describe('task visual pricing preview', () => {
  test('totals a base charge and usage price for a single tier', () => {
    const tier = {
      label: 'base',
      conditions: [],
      constant: 0.02,
      unitPrices: { seconds: 0.1 },
    }

    const result = evaluateTaskVisualConfig({ tiers: [tier] }, { seconds: 5 })

    assert.ok(result)
    assert.equal(result.tier, tier)
    assert.equal(result.total, 0.52)
    assert.deepEqual(result.parts, [
      { kind: 'constant', amount: 0.02 },
      {
        kind: 'usage',
        field: 'seconds',
        amount: 0.5,
        quantity: 5,
        unitPrice: 0.1,
      },
    ])
  })

  test('matches enum tiers in order and otherwise uses the fallback', () => {
    const config: TaskVisualConfig = {
      tiers: [
        {
          label: 'pro',
          conditions: [{ field: 'mode', value: 'pro' }],
          constant: 0,
          unitPrices: { seconds: 0.8 },
        },
        {
          label: 'std',
          conditions: [],
          constant: 0,
          unitPrices: { seconds: 0.4 },
        },
      ],
    }

    assert.equal(
      evaluateTaskVisualConfig(config, { mode: 'pro', seconds: 1 })?.tier.label,
      'pro'
    )
    assert.equal(
      evaluateTaskVisualConfig(config, { mode: 'std', seconds: 1 })?.tier.label,
      'std'
    )
    assert.equal(
      evaluateTaskVisualConfig(config, { mode: 'unknown', seconds: 1 })?.tier
        .label,
      'std'
    )
  })

  test('requires every enum condition on a multi-condition tier', () => {
    const config: TaskVisualConfig = {
      tiers: [
        {
          label: 'extend-two',
          conditions: [
            { field: 'action', value: 'extend' },
            { field: 'quality', value: 'high' },
          ],
          constant: 0,
          unitPrices: { clips: 0.2 },
        },
        {
          label: 'base',
          conditions: [],
          constant: 0,
          unitPrices: { clips: 0.1 },
        },
      ],
    }

    assert.equal(
      evaluateTaskVisualConfig(config, {
        action: 'extend',
        quality: 'high',
        clips: 2,
      })?.tier.label,
      'extend-two'
    )
    assert.equal(
      evaluateTaskVisualConfig(config, {
        action: 'extend',
        quality: 'standard',
        clips: 2,
      })?.tier.label,
      'base'
    )
  })

  test('selects the same tier after round-tripping through the expression grammar', () => {
    const config: TaskVisualConfig = {
      tiers: [
        {
          label: 'pro',
          conditions: [{ field: 'mode', value: 'pro' }],
          constant: 0.05,
          unitPrices: { seconds: 0.8, clips: 0.1 },
        },
        {
          label: 'std',
          conditions: [],
          constant: 0.02,
          unitPrices: { seconds: 0.4, clips: 0.05 },
        },
      ],
    }
    const sample = { mode: 'pro', seconds: 5, clips: 2 }
    const expression = generateTaskExprFromConfig(config, schema)
    const parsedTiers = parseTaskTiersFromExpr(expression, schema)
    assert.ok(parsedTiers.length > 0)
    const grammarTier =
      parsedTiers
        .slice(0, -1)
        .find((tier) =>
          tier.conditions.every(
            (condition) =>
              sample[condition.field as keyof typeof sample] === condition.value
          )
        ) ?? parsedTiers.at(-1)
    assert.ok(grammarTier)

    const result = evaluateTaskVisualConfig(config, sample)

    assert.ok(result)
    assert.equal(result.tier.label, grammarTier.label)
  })

  test('round-trips a token field at the $/1M editor scale', () => {
    const tokenSchema: BillingUsageSchema = {
      tokens: { type: 'number', unit: 'token' },
    }
    const config: TaskVisualConfig = {
      tiers: [
        {
          label: 'base',
          conditions: [],
          constant: 0,
          unitPrices: { tokens: 9.8 },
        },
      ],
    }

    const expression = generateTaskExprFromConfig(config, tokenSchema)
    assert.match(expression, /\/ 1000000/)
    assert.equal(expression, 'tier("base", u("tokens") * 9.8 / 1000000)')

    const parsed = tryParseTaskVisualConfig(expression, tokenSchema)
    assert.ok(parsed)
    assert.equal(parsed.tiers[0].unitPrices.tokens, 9.8)
    assert.equal(generateTaskExprFromConfig(parsed, tokenSchema), expression)
  })

  test('treats a bare token term as unparseable so old $/token expressions stay raw', () => {
    const tokenSchema: BillingUsageSchema = {
      tokens: { type: 'number', unit: 'token' },
    }
    assert.equal(
      tryParseTaskVisualConfig(
        'tier("base", u("tokens") * 0.0000098)',
        tokenSchema
      ),
      null
    )
    assert.deepEqual(
      parseTaskTiersFromExpr('tier("base", u("tokens") * 0.0000098)', tokenSchema),
      []
    )
  })

  test('round-trips a credit field without a /1M division', () => {
    const creditSchema: BillingUsageSchema = {
      units: { type: 'number', unit: 'credit' },
    }
    const config: TaskVisualConfig = {
      tiers: [
        {
          label: 'base',
          conditions: [],
          constant: 0,
          unitPrices: { units: 0.14 },
        },
      ],
    }

    const expression = generateTaskExprFromConfig(config, creditSchema)
    assert.equal(expression, 'tier("base", u("units") * 0.14)')
    assert.doesNotMatch(expression, /\/ 1000000/)

    const parsed = tryParseTaskVisualConfig(expression, creditSchema)
    assert.ok(parsed)
    assert.equal(parsed.tiers[0].unitPrices.units, 0.14)
  })

  test('maps declared usage example labels to evaluated prices', () => {
    const tokenSchema: BillingUsageSchema = {
      tokens: { type: 'number', unit: 'token' },
    }
    const config = tryParseTaskVisualConfig(
      'tier("base", u("tokens") * 9.8 / 1000000)',
      tokenSchema
    )
    assert.ok(config)

    const result = evaluateTaskVisualConfig(
      config,
      { tokens: 108000 },
      tokenSchema
    )
    assert.ok(result)
    assert.equal(result.total, (108000 * 9.8) / 1_000_000)

    assert.deepEqual(
      evaluateTaskUsageExamples(
        'tier("base", u("tokens") * 9.8 / 1000000)',
        tokenSchema,
        [
          { label: '720p · 5s', facts: { tokens: 108000 } },
          { label: '1080p · 5s', facts: { tokens: 243000 } },
        ]
      ),
      [
        { label: '720p · 5s', total: (108000 * 9.8) / 1_000_000 },
        { label: '1080p · 5s', total: (243000 * 9.8) / 1_000_000 },
      ]
    )
  })

  test('returns no usage example prices for a raw unparseable expression', () => {
    assert.deepEqual(
      evaluateTaskUsageExamples(
        'u("tokens") * 0.00007 * (u("tokens") > 100000 ? 0.8 : 1)',
        { tokens: { type: 'number', unit: 'token' } },
        [{ label: '720p · 5s', facts: { tokens: 108000 } }]
      ),
      []
    )
  })

  test('parses MiniMax-H3 duration video tiers from expression', () => {
    const expr =
      'u("resolution") == "512P" ? tier("512P", u("seconds") * 0.06) : u("resolution") == "768P" ? tier("768P", u("seconds") * 0.06) : u("resolution") == "720P" ? tier("720P", u("seconds") * 0.06) : u("resolution") == "1080P" ? tier("1080P", u("seconds") * 0.06) : tier("2K", u("seconds") * 0.0975)'
    const schema: BillingUsageSchema = {
      seconds: { type: 'number', unit: 'second' },
      resolution: { enum: ['512P', '768P', '720P', '1080P', '2K'] },
    }
    const tiers = parseDurationVideoTiers(expr, schema)
    assert.equal(tiers.length, 2)
    assert.equal(tiers[0].resolution, '768p')
    assert.equal(tiers[0].secondPrice, 0.06)
    assert.equal(tiers[0].est5sPrice, 0.3)
    assert.equal(tiers[1].resolution, '2k')
    assert.equal(tiers[1].secondPrice, 0.0975)
    assert.equal(tiers[1].est5sPrice, 0.0975 * 5)
  })

  test('parses MiniMax-H3 duration video tiers from live compound expression with zero fields', () => {
    const expr =
      'u("resolution") == "512P" ? tier("512P", u("input_images") * 0 + u("input_video_seconds") * 0 + u("seconds") * 0.06) : u("resolution") == "768P" ? tier("768P", u("input_images") * 0 + u("input_video_seconds") * 0 + u("seconds") * 0.06) : u("resolution") == "720P" ? tier("720P", u("input_images") * 0 + u("input_video_seconds") * 0 + u("seconds") * 0.06) : u("resolution") == "1080P" ? tier("1080P", u("input_images") * 0 + u("input_video_seconds") * 0 + u("seconds") * 0.06) : tier("2K", u("input_images") * 0 + u("input_video_seconds") * 0 + u("seconds") * 0.0975)'
    const schema: BillingUsageSchema = {
      seconds: { type: 'number', unit: 'second' },
      input_images: { type: 'number', unit: 'count' },
      input_video_seconds: { type: 'number', unit: 'second' },
      resolution: { enum: ['512P', '768P', '720P', '1080P', '2K'] },
    }
    const tiers = parseDurationVideoTiers(expr, schema)
    assert.equal(tiers.length, 2)
    assert.equal(tiers[0].resolution, '768p')
    assert.equal(tiers[0].secondPrice, 0.06)
    assert.equal(tiers[0].est5sPrice, 0.3)
    assert.equal(tiers[1].resolution, '2k')
    assert.equal(tiers[1].secondPrice, 0.0975)
    assert.equal(tiers[1].est5sPrice, 0.0975 * 5)
  })

  test('correctly sets MiniMax-H3 discount to 25% and generates strikethrough official starting price', () => {
    assert.equal(getModelSpecificDiscountPercent('MiniMax-H3'), 25)
    assert.equal(getModelSpecificDiscountPercent('hailuo-h3'), 25)

    const model: PricingModel = {
      id: 1,
      model_name: 'MiniMax-H3',
      vendor_name: 'MiniMax',
      billing_expr: 'tier("768P", u("seconds") * 0.06)',
      billing_usage_schema: {
        seconds: { type: 'number', unit: 'second' },
        resolution: { enum: ['768P', '2K'] },
      },
      quota_type: 1,
      model_ratio: 1,
      model_price: 0,
      completion_ratio: 1,
    }

    const hero = getVideoModelHeroPrice(model, true, 1)
    assert.equal(hero.priceText, '$0.300')
    assert.equal(hero.officialPriceText, '$0.400')
    assert.equal(hero.discountOff, 25)

    // Ensure MiniMax-H3 does NOT get misclassified into Seedance 2.0 Mini token table
    const groups = getVideoModelTierGroups(model)
    assert.equal(groups.length, 0)
  })

  test('dynamically parses Doubao Seedream fixed image pricing without hardcoding', () => {
    const model: PricingModel = {
      id: 2,
      model_name: 'doubao-seedream-5-0-pro',
      vendor_name: 'ByteDance',
      billing_expr:
        'tier("image", fixed(0.02925)) * image_count * ((has(param("size"), "2048") || has(param("size"), "2560") || has(param("size"), "2K")) ? 2 : 1)',
      quota_type: 1,
      model_ratio: 1,
      model_price: 0,
      completion_ratio: 1,
    }

    // 1. Group Mode: selling at $0.02925 (1K) and $0.0585 (2K), official is $0.045 / $0.09
    // Discount is dynamically calculated: (1 - 0.02925 / 0.045) * 100 = 35%
    const hero = getVideoModelHeroPrice(model, true, 1)
    assert.equal(hero.isPerImage, true)
    assert.equal(hero.priceText, '$0.02925')
    assert.equal(hero.officialPriceText, '$0.045')
    assert.equal(hero.discountOff, 35)
    assert.equal(hero.unitText, '/ 张 起')
    assert.equal(hero.resolutionPrices?.['1k']?.priceText, '$0.02925')
    assert.equal(hero.resolutionPrices?.['1k']?.officialPriceText, '$0.045')
    assert.equal(hero.resolutionPrices?.['2k']?.priceText, '$0.0585')
    assert.equal(hero.resolutionPrices?.['2k']?.officialPriceText, '$0.09')

    // 2. Official Mode: shows official benchmarks ($0.045 / $0.09), discount is null
    const officialHero = getVideoModelHeroPrice(model, false, 1)
    assert.equal(officialHero.priceText, '$0.045')
    assert.equal(officialHero.officialPriceText, null)
    assert.equal(officialHero.discountOff, null)
    assert.equal(officialHero.resolutionPrices?.['1k']?.priceText, '$0.045')
    assert.equal(officialHero.resolutionPrices?.['1k']?.officialPriceText, null)
    assert.equal(officialHero.resolutionPrices?.['2k']?.priceText, '$0.09')
    assert.equal(officialHero.resolutionPrices?.['2k']?.officialPriceText, null)

    // 3. Dynamic test: If user changes to 50% discount (selling at $0.0225)
    const model50: PricingModel = {
      ...model,
      billing_expr:
        'tier("image", fixed(0.0225)) * image_count * ((has(param("size"), "2048")) ? 2 : 1)',
    }
    const hero50 = getVideoModelHeroPrice(model50, true, 1)
    assert.equal(hero50.priceText, '$0.0225')
    assert.equal(hero50.officialPriceText, '$0.045')
    assert.equal(hero50.discountOff, 50)
    assert.equal(hero50.resolutionPrices?.['1k']?.priceText, '$0.0225')
    assert.equal(hero50.resolutionPrices?.['2k']?.priceText, '$0.045')
  })

  test('dynamically inherits model family savings without manual dictionary bloat', async () => {
    const { lookupModelSavingsOff } = await import('../constants')
    assert.equal(lookupModelSavingsOff('deepseek-v4-pro-0813'), 35)
    assert.equal(lookupModelSavingsOff('deepseek-v4.1-flash'), 35)
    assert.equal(lookupModelSavingsOff('deepseek-v4-flash-vision-exp'), 35)
    assert.equal(lookupModelSavingsOff('glm-5.3-flash'), 25)
    assert.equal(lookupModelSavingsOff('glm-5.3-turbo'), 25)
    assert.equal(lookupModelSavingsOff('kimi-k3-pro'), 25)
    assert.equal(lookupModelSavingsOff('minimax-h3-v2'), 25)
    assert.equal(lookupModelSavingsOff('unknown-brand-new'), undefined)
  })

  test('correctly infers vendor from new and expanded model prefixes', async () => {
    const { inferVendorFromModelName } = await import('../lib/model-helpers')
    assert.equal(inferVendorFromModelName('o4-mini'), 'OpenAI')
    assert.equal(inferVendorFromModelName('sora-2'), 'OpenAI')
    assert.equal(inferVendorFromModelName('seedream-5-0-pro'), 'ByteDance')
    assert.equal(inferVendorFromModelName('hailuo-01'), 'MiniMax')
    assert.equal(inferVendorFromModelName('moonshot-v1-8k'), 'Moonshot')
  })

  test('correctly slots new version models into their sub-family bracket without breaking product hierarchy', async () => {
    const { getModelEffectiveScore } = await import('../lib/model-helpers')
    const { VENDOR_MODEL_DISPLAY_ORDER } = await import('../constants')
    const anthropicModels = VENDOR_MODEL_DISPLAY_ORDER.Anthropic

    // claude-fable-5-1 is index 0 -> score 10000
    // claude-fable-5 is index 1 -> score 20000
    // claude-opus-5 is index 2 -> score 30000
    // claude-sonnet-5 is index 7 -> score 80000
    // claude-sonnet-4-6 is index 8 -> score 90000

    // claude-sonnet-5.2 should slot above claude-sonnet-5 (score 75000), NOT above fable or opus!
    const sonnetScore = getModelEffectiveScore('claude-sonnet-5.2', anthropicModels)
    const opusScore = getModelEffectiveScore('claude-opus-5', anthropicModels)
    const sonnetBaseScore = getModelEffectiveScore('claude-sonnet-5', anthropicModels)

    assert.ok(sonnetScore > opusScore, 'Sonnet 5.2 must stay below Opus')
    assert.ok(sonnetScore < sonnetBaseScore, 'Sonnet 5.2 must slot above Sonnet 5')
  })
})


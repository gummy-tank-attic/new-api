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
  getModelSupportedResolutions,
  getVideoModelHeroPrice,
  getVideoModelTierGroups,
  parseDurationVideoTiers,
  parseVideoUpscaleTiers,
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

  test('does not fabricate a missing duration resolution tier', () => {
    const tiers = parseDurationVideoTiers(
      'tier("768P", u("seconds") * 0.06)',
      {
        seconds: { type: 'number', unit: 'second' },
        resolution: { enum: ['768P', '2K'] },
      }
    )
    assert.deepEqual(tiers, [
      {
        resolution: '768p',
        resLabel: '768P',
        est5sPrice: 0.3,
        secondPrice: 0.06,
        officialEst5sPrice: 0.4,
        officialSecondPrice: 0.08,
      },
    ])
  })

  test('reads Grok Imagine video param-duration prices from the official AST', () => {
    const expression =
      '(has(param("size"), "720") || has(param("resolution"), "720")) ? tier("720p", 138889.0 * (param("duration") == nil ? 8.0 : max(param("duration"), 1.0))) : tier("480p", 99206.0 * (param("duration") == nil ? 8.0 : max(param("duration"), 1.0)))'
    const tiers = parseDurationVideoTiers(expression)
    assert.deepEqual(
      tiers.map((tier) => [tier.resolution, tier.secondPrice]),
      [
        ['720p', 0.138889],
        ['480p', 0.099206],
      ]
    )

    const hero = getVideoModelHeroPrice(
      {
        id: 7,
        model_name: 'grok-imagine-video',
        billing_mode: 'tiered_expr',
        billing_expr: expression,
        quota_type: 0,
        model_ratio: 37.5,
        model_price: 0,
        completion_ratio: 1,
      },
      true,
      1
    )
    assert.equal(hero.priceText, '$0.496')
    assert.equal(hero.unitKey, 'videoPricing.unitPer5sFrom')
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

  test('preserves AST tiers for resolutions outside built-in presets', () => {
    const tiers = parseDurationVideoTiers(
      'tier("1080P", u("seconds") * 0.2)',
      {
        seconds: { type: 'number', unit: 'second' },
        resolution: { enum: ['1080P'] },
      }
    )
    assert.deepEqual(tiers, [
      {
        resolution: '1080p',
        resLabel: '1080P',
        est5sPrice: 1,
        secondPrice: 0.2,
        officialEst5sPrice: 1,
        officialSecondPrice: 0.2,
      },
    ])
  })

  test('does not invent duration prices when the expression has no usage schema', () => {
    assert.deepEqual(
      parseDurationVideoTiers('tier("1080P", u("seconds") * 0.2)'),
      []
    )
  })

  test('does not use video defaults when AST has no duration unit price', () => {
    assert.deepEqual(
      parseDurationVideoTiers('tier("1080P", u("clips") * 0.2)', {
        clips: { type: 'number', unit: 'count' },
        resolution: { enum: ['1080P'] },
      }),
      []
    )
  })

  test('does not show a default hero price for an unparseable duration expression', () => {
    const hero = getVideoModelHeroPrice(
      {
        id: 3,
        model_name: 'custom-h3-video',
        billing_expr: 'tier("1080P", u("seconds") * 0.2)',
        quota_type: 1,
        model_ratio: 1,
        model_price: 0,
        completion_ratio: 1,
      },
      true,
      1
    )
    assert.equal(hero.priceText, '-')
    assert.equal(hero.unitKey, 'Unable to parse structured pricing')
    assert.equal(hero.isStartingPrice, false)
  })

  test('correctly sets MiniMax-H3 discount to 25% and generates strikethrough official starting price', () => {
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

    // Ensure MiniMax-H3 strictly returns 768P and 2K supported resolutions even with generic Hailuo schema
    const h3WithGenericSchema: PricingModel = {
      ...model,
      billing_usage_schema: {
        seconds: { type: 'number', unit: 'second' },
        resolution: { enum: ['512P', '768P', '720P', '1080P', '2K'] },
      },
    }
    assert.deepEqual(getModelSupportedResolutions(h3WithGenericSchema), ['768P', '2K'])

    // Ensure MiniMax-H3 does NOT get misclassified into Seedance 2.0 Mini token table
    const groups = getVideoModelTierGroups(model)
    assert.equal(groups.length, 0)

    const originalPrice: PricingModel = {
      ...model,
      billing_expr: 'tier("768P", u("seconds") * 0.08)',
    }
    const originalHero = getVideoModelHeroPrice(originalPrice, true, 1)
    assert.equal(originalHero.priceText, '$0.400')
    assert.equal(originalHero.officialPriceText, '$0.400')
    assert.equal(originalHero.discountOff, null)
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

  test('dynamically inherits model family savings with deterministic prefix match', async () => {
    const { lookupModelSavingsOff } = await import('../constants')
    assert.equal(lookupModelSavingsOff('deepseek-v4-pro-0813'), 35)
    assert.equal(lookupModelSavingsOff('deepseek-v4.1-flash'), 35)
    assert.equal(lookupModelSavingsOff('deepseek-v4-flash-vision-exp'), 35)
    assert.equal(lookupModelSavingsOff('glm-5.3-flash'), 25)
    assert.equal(lookupModelSavingsOff('glm-5.3-turbo'), 25)
    assert.equal(lookupModelSavingsOff('kimi-k3-pro'), 25)
    assert.equal(lookupModelSavingsOff('minimax-h3-v2'), undefined)
    assert.equal(lookupModelSavingsOff('glm-50-preview'), undefined)
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

  test('keeps unlisted models below the explicit benchmark order', async () => {
    const { getModelEffectiveScore } = await import('../lib/model-helpers')
    const { VENDOR_MODEL_DISPLAY_ORDER } = await import('../constants')
    const anthropicModels = VENDOR_MODEL_DISPLAY_ORDER.Anthropic

    // Listed benchmark models retain exact designated index score
    const fableScore = getModelEffectiveScore('claude-fable-5-1', anthropicModels)
    const opusScore = getModelEffectiveScore('claude-opus-5', anthropicModels)
    assert.equal(fableScore, 10000)
    assert.equal(opusScore, 30000)

    // New versions do not cross the explicit product hierarchy automatically.
    const nextGenScore = getModelEffectiveScore('claude-6-preview', anthropicModels)
    assert.equal(nextGenScore, (anthropicModels.length + 1) * 10000)

    const sonnetScore = getModelEffectiveScore('claude-sonnet-5.2', anthropicModels)
    assert.equal(sonnetScore, (anthropicModels.length + 1) * 10000)
    assert.ok(sonnetScore > opusScore, 'unlisted Sonnet must stay below Opus')

    // Unlisted legacy model falls behind the curated list
    const legacyScore = getModelEffectiveScore('claude-2.1', anthropicModels)
    assert.ok(legacyScore >= ((anthropicModels.length + 1) * 10000))
  })

  test('accurately parses GPT image models with token-based tiered expressions', async () => {
    const {
      getVideoModelHeroPrice,
      getVideoModelTagline,
      getVideoModelCapabilityTag,
      getModelSupportedResolutions,
      getResolutionBadgeStyle,
      isImageModel,
    } = await import('../lib/video-pricing')

    assert.equal(isImageModel('gpt-image-2'), true)
    assert.equal(isImageModel('gpt-image-2.5-sunburst'), true)
    assert.equal(isImageModel('gpt-image-2.5-flare'), true)

    assert.equal(
      getVideoModelCapabilityTag('gpt-image-2.5-sunburst')?.label,
      '全能旗舰主力'
    )
    assert.equal(
      getVideoModelCapabilityTag('gpt-image-2.5-flare')?.label,
      '极速出片'
    )
    assert.equal(
      getVideoModelCapabilityTag('gpt-image-2')?.label,
      '经典主力'
    )

    assert.equal(
      getVideoModelTagline('gpt-image-2.5-sunburst').defaultText,
      '新一代旗舰图像创作 · 卓越光影质感与复杂场景高精呈现'
    )
    assert.equal(
      getVideoModelTagline('gpt-image-2.5-flare').defaultText,
      '极速秒级生图出片 · 高并发灵感快速捕捉与敏捷渲染'
    )
    assert.equal(
      getVideoModelTagline('gpt-image-2').defaultText,
      '经典多模态生图主力 · 原生指令理解与稳定图文创作'
    )

    const model: PricingModel = {
      id: 101,
      model_name: 'gpt-image-2.5-sunburst',
      quota_type: 0,
      model_ratio: 1,
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("standard", p * 5 + cr * 1.25 + img * 8 + img_cr * 2 + c * 30)',
    }

    // 官方 OpenAI 图像支持任意自定义尺寸至 4K，以单一规格呈现
    assert.deepEqual(getModelSupportedResolutions(model), ['custom_4k'])
    assert.equal(getResolutionBadgeStyle('custom_4k').label, '自定义至 4K')

    // At rate = 0.15 (Group mode)
    const hero015 = getVideoModelHeroPrice(model, true, 0.15)
    assert.equal(hero015.priceText, '$0.75')
    assert.equal(hero015.officialPriceText, '$5')
    assert.equal(hero015.unitText, '/ 1M Tokens 起')
    assert.equal(hero015.discountOff, null)
    assert.equal(hero015.resolutionPrices?.['standard']?.priceText, '$4.5')
    assert.equal(hero015.resolutionPrices?.['standard']?.officialPriceText, '$30')
    assert.equal(hero015.resolutionPrices?.['standard']?.imgToImgPriceText, '$5.7')
    assert.equal(hero015.resolutionPrices?.['standard']?.officialImgToImgPriceText, '$38')
    assert.equal(hero015.resolutionPrices?.['1024×1024']?.priceText, '$4.5')
    assert.equal(hero015.resolutionPrices?.['1024×1024']?.imgToImgPriceText, '$5.7')

    // At rate = 1 (Official mode)
    const heroOfficial = getVideoModelHeroPrice(model, false, 1)
    assert.equal(heroOfficial.priceText, '$5')
    assert.equal(heroOfficial.officialPriceText, null)
    assert.equal(heroOfficial.resolutionPrices?.['standard']?.priceText, '$30')
    assert.equal(heroOfficial.resolutionPrices?.['standard']?.imgToImgPriceText, '$38')
    assert.equal(heroOfficial.resolutionPrices?.['1024×1024']?.priceText, '$30')
    assert.equal(heroOfficial.resolutionPrices?.['1024×1024']?.imgToImgPriceText, '$38')
  })

  test('Seedance models strictly return authoritative resolutions and resist generic schema 4K pollution', () => {
    const genericDoubaoSchema = {
      resolution: { enum: ['480p', '720p', '1080p', '4k'] },
    }

    const seedance25: PricingModel = {
      id: 201,
      model_name: 'seedance2.5',
      quota_type: 0,
      model_ratio: 1,
      billing_usage_schema: genericDoubaoSchema,
    }
    assert.deepEqual(getModelSupportedResolutions(seedance25), ['480p', '720p', '1080p'])

    const seedanceFast: PricingModel = {
      id: 202,
      model_name: 'seedance2.0-fast',
      quota_type: 0,
      model_ratio: 1,
      billing_usage_schema: genericDoubaoSchema,
    }
    assert.deepEqual(getModelSupportedResolutions(seedanceFast), ['480p', '720p'])

    const seedance4k: PricingModel = {
      id: 203,
      model_name: 'Seedance2.0-4k',
      quota_type: 0,
      model_ratio: 1,
      billing_usage_schema: genericDoubaoSchema,
    }
    assert.deepEqual(getModelSupportedResolutions(seedance4k), ['4k'])

    const seedanceUpscale: PricingModel = {
      id: 204,
      model_name: 'seedance-2.5-upscale',
      quota_type: 0,
      model_ratio: 1,
      billing_usage_schema: genericDoubaoSchema,
    }
    assert.deepEqual(getModelSupportedResolutions(seedanceUpscale), ['720p', '1080p', '2k'])
  })

  test('upscale expression splits token prices by video_input', () => {
    const expr =
      'u("resolution") == "720p" && u("video_input") == "none" ? tier("720p", u("tokens") * 6.671554 / 1000000 + u("seconds") * 0.0143) : u("resolution") == "720p" && u("video_input") == "video" ? tier("720p", u("tokens") * 4.002932 / 1000000 + u("seconds") * 0.0143) : u("resolution") == "1080p" && u("video_input") == "none" ? tier("1080p", u("tokens") * 6.671554 / 1000000 + u("seconds") * 0.030799) : u("resolution") == "1080p" && u("video_input") == "video" ? tier("1080p", u("tokens") * 4.002932 / 1000000 + u("seconds") * 0.030799) : u("resolution") == "2k" && u("video_input") == "none" ? tier("2k", u("tokens") * 7.338709 / 1000000 + u("seconds") * 0.0561) : tier("2k", u("tokens") * 4.384046 / 1000000 + u("seconds") * 0.0561)'
    const tiers = parseVideoUpscaleTiers(expr)
    assert.equal(tiers.length, 3)
    const p720 = tiers.find((tier) => tier.resolution === '720p')
    const p2k = tiers.find((tier) => tier.resolution === '2k')
    assert.ok(p720)
    assert.ok(p2k)
    assert.equal(p720.tokenPricePerM, 6.671554)
    assert.equal(p720.tokenPriceWithVideoPerM, 4.002932)
    assert.equal(p720.secondPrice, 0.0143)
    assert.equal(p2k.tokenPricePerM, 7.338709)
    assert.equal(p2k.tokenPriceWithVideoPerM, 4.384046)
    assert.equal(p2k.officialTokenPriceWithVideoPerM, 6.744686)
  })

  test('Seedance 2.5 aligns directly with expression billed prices and dynamically derives discount off official benchmarks', () => {
    const liveExpression =
      'u("resolution") == "480p" && u("video_input") == "none" ? tier("480p·none", u("tokens") * 10.165 / 1000000) : u("resolution") == "480p" && u("video_input") == "video" ? tier("480p·video", u("tokens") * 6.08 / 1000000) : u("resolution") == "720p" && u("video_input") == "none" ? tier("720p·none", u("tokens") * 10.165 / 1000000) : u("resolution") == "720p" && u("video_input") == "video" ? tier("720p·video", u("tokens") * 6.08 / 1000000) : u("resolution") == "1080p" && u("video_input") == "none" ? tier("1080p·none", u("tokens") * 11.115 / 1000000) : tier("1080p·video", u("tokens") * 6.65 / 1000000)'
    const schema = {
      tokens: { type: 'number' as const, unit: 'token' },
      resolution: { enum: ['480p', '720p', '1080p', '4k'] },
      video_input: { enum: ['none', 'video'] },
    }

    const model: PricingModel = {
      id: 301,
      model_name: 'seedance2.5',
      vendor_name: 'ByteDance',
      billing_mode: 'tiered_expr',
      billing_expr: liveExpression,
      billing_usage_schema: schema,
      quota_type: 0,
      model_ratio: 1,
    }

    // 1. Tier groups verification:
    // Expression prices are 100% directly treated as actual billed prices without secondary discounts
    const groups = getVideoModelTierGroups(model)
    assert.equal(groups.length, 2)

    const group720 = groups.find((g) => g.resolutions.includes('720p'))
    assert.ok(group720)
    assert.equal(group720.withoutVideoPrice, 10.165)
    assert.equal(group720.withVideoPrice, 6.08)
    assert.equal(group720.officialWithoutVideoPrice, 10.7)
    assert.equal(group720.officialWithVideoPrice, 6.4)

    const group1080 = groups.find((g) => g.resolutions.includes('1080p'))
    assert.ok(group1080)
    assert.equal(group1080.withoutVideoPrice, 11.115)
    assert.equal(group1080.withVideoPrice, 6.65)
    assert.equal(group1080.officialWithoutVideoPrice, 11.7)
    assert.equal(group1080.officialWithVideoPrice, 7.0)

    // 2. Hero starting price and dynamic discount badge:
    // Min billed is $6.080, official benchmark is $6.400 -> (1 - 6.08 / 6.40) * 100 = 5% OFF!
    const hero = getVideoModelHeroPrice(model, true, 1)
    assert.equal(hero.priceText, '$6.080')
    assert.equal(hero.officialPriceText, '$6.400')
    assert.equal(hero.discountOff, 5)
    assert.equal(hero.unitText, '/ 1M Tokens 起')

    // 3. Official mode:
    const officialHero = getVideoModelHeroPrice(model, false, 1)
    assert.equal(officialHero.priceText, '$6.400')
    assert.equal(officialHero.officialPriceText, null)
    assert.equal(officialHero.discountOff, null)

    // 4. Dynamic discount responsiveness: if admin changes expression to 10% off (5.76 / 9.63)
    const expr10 =
      'u("resolution") == "480p" && u("video_input") == "none" ? tier("480p·none", u("tokens") * 9.63 / 1000000) : u("resolution") == "480p" && u("video_input") == "video" ? tier("480p·video", u("tokens") * 5.76 / 1000000) : u("resolution") == "720p" && u("video_input") == "none" ? tier("720p·none", u("tokens") * 9.63 / 1000000) : u("resolution") == "720p" && u("video_input") == "video" ? tier("720p·video", u("tokens") * 5.76 / 1000000) : u("resolution") == "1080p" && u("video_input") == "none" ? tier("1080p·none", u("tokens") * 10.53 / 1000000) : tier("1080p·video", u("tokens") * 6.30 / 1000000)'
    const model10: PricingModel = {
      ...model,
      billing_expr: expr10,
    }
    const hero10 = getVideoModelHeroPrice(model10, true, 1)
    assert.equal(hero10.priceText, '$5.760')
    assert.equal(hero10.officialPriceText, '$6.400')
    assert.equal(hero10.discountOff, 10)
  })

  test('seedance-2.5-unfiltered shows official price with null discountOff', () => {
    const unfilteredExpr =
      'u("resolution") == "480p" && u("video_input") == "none" ? tier("480p·none", u("tokens") * 10.7 / 1000000) : u("resolution") == "480p" && u("video_input") == "video" ? tier("480p·video", u("tokens") * 6.4 / 1000000) : u("resolution") == "720p" && u("video_input") == "none" ? tier("720p·none", u("tokens") * 10.7 / 1000000) : u("resolution") == "720p" && u("video_input") == "video" ? tier("720p·video", u("tokens") * 6.4 / 1000000) : u("resolution") == "1080p" && u("video_input") == "none" ? tier("1080p·none", u("tokens") * 11.7 / 1000000) : tier("1080p·video", u("tokens") * 7 / 1000000)'
    const schema = {
      tokens: { type: 'number' as const, unit: 'token' },
      resolution: { enum: ['480p', '720p', '1080p', '4k'] },
      video_input: { enum: ['none', 'video'] },
    }

    const model: PricingModel = {
      id: 302,
      model_name: 'seedance-2.5-unfiltered',
      vendor_name: 'ByteDance',
      billing_mode: 'tiered_expr',
      billing_expr: unfilteredExpr,
      billing_usage_schema: schema,
      quota_type: 0,
      model_ratio: 1,
    }

    const groups = getVideoModelTierGroups(model)
    assert.equal(groups.length, 2)
    const g720 = groups.find((g) => g.resolutions.includes('720p'))
    assert.ok(g720)
    assert.equal(g720.withoutVideoPrice, 10.7)
    assert.equal(g720.withVideoPrice, 6.4)
    assert.equal(g720.officialWithoutVideoPrice, 10.7)
    assert.equal(g720.officialWithVideoPrice, 6.4)

    // In Group Mode, since selling price == official base price, discountOff and officialPriceText MUST be null (no strikethrough identical price, no 10% OFF badge)
    const hero = getVideoModelHeroPrice(model, true, 1)
    assert.equal(hero.priceText, '$6.400')
    assert.equal(hero.officialPriceText, null)
    assert.equal(hero.discountOff, null)
  })

  test('dreamina-seedance-2-0 correctly extracts 10% off prices against official 2.0 benchmarks', () => {
    const expr20_10off =
      'u("resolution") == "480p" && u("video_input") == "none" ? tier("480p·none", u("tokens") * 6.3 / 1000000) : u("resolution") == "480p" && u("video_input") == "video" ? tier("480p·video", u("tokens") * 3.87 / 1000000) : u("resolution") == "720p" && u("video_input") == "none" ? tier("720p·none", u("tokens") * 6.3 / 1000000) : u("resolution") == "720p" && u("video_input") == "video" ? tier("720p·video", u("tokens") * 3.87 / 1000000) : u("resolution") == "1080p" && u("video_input") == "none" ? tier("1080p·none", u("tokens") * 6.93 / 1000000) : tier("1080p·video", u("tokens") * 4.23 / 1000000)'
    const schema = {
      tokens: { type: 'number' as const, unit: 'token' },
      resolution: { enum: ['480p', '720p', '1080p'] },
      video_input: { enum: ['none', 'video'] },
    }

    const model: PricingModel = {
      id: 303,
      model_name: 'dreamina-seedance-2-0',
      vendor_name: 'ByteDance',
      billing_mode: 'tiered_expr',
      billing_expr: expr20_10off,
      billing_usage_schema: schema,
      quota_type: 0,
      model_ratio: 1,
    }

    const groups = getVideoModelTierGroups(model)
    assert.equal(groups.length, 2)

    const g720 = groups.find((g) => g.resolutions.includes('720p'))
    assert.ok(g720)
    assert.equal(g720.withoutVideoPrice, 6.3)
    assert.equal(g720.withVideoPrice, 3.87)
    assert.equal(g720.officialWithoutVideoPrice, 7.0)
    assert.equal(g720.officialWithVideoPrice, 4.3)

    const g1080 = groups.find((g) => g.resolutions.includes('1080p'))
    assert.ok(g1080)
    assert.equal(g1080.withoutVideoPrice, 6.93)
    assert.equal(g1080.withVideoPrice, 4.23)
    assert.equal(g1080.officialWithoutVideoPrice, 7.7)
    assert.equal(g1080.officialWithVideoPrice, 4.7)

    // Hero: min billed is $3.870, official benchmark is $4.300 -> 10% OFF
    const hero = getVideoModelHeroPrice(model, true, 1)
    assert.equal(hero.priceText, '$3.870')
    assert.equal(hero.officialPriceText, '$4.300')
    assert.equal(hero.discountOff, 10)
    assert.equal(hero.unitText, '/ 1M Tokens 起')
  })

  test('Seedance2.0-4k accurately derives 8% off against upstream official benchmarks', () => {
    const expr =
      'u("video_input") == "none" ? tier("4k·none", u("tokens") * 3.507331 / 1000000) : tier("4k·video", u("tokens") * 2.158358 / 1000000)'

    const model: PricingModel = {
      id: 205,
      model_name: 'Seedance2.0-4k',
      quota_type: 0,
      model_ratio: 1,
      billing_mode: 'tiered_expr',
      billing_expr: expr,
      billing_usage_schema: {
        resolution: { enum: ['4k'] },
        video_input: { enum: ['none', 'video'] },
        tokens: { type: 'number', unit: 'token' },
      },
    }

    const groups = getVideoModelTierGroups(model)
    assert.equal(groups.length, 1)
    const g4k = groups[0]
    assert.equal(g4k.title, '4K')
    assert.equal(g4k.withoutVideoPrice, 3.507331)
    assert.equal(g4k.withVideoPrice, 2.158358)
    assert.equal(g4k.officialWithoutVideoPrice, 3.812316)
    assert.equal(g4k.officialWithVideoPrice, 2.346041)

    // Hero price: minBilled is 2.158358, minOfficial is 2.346041 -> exactly 8% OFF
    const hero = getVideoModelHeroPrice(model, true, 1)
    assert.equal(hero.priceText, '$2.158')
    assert.equal(hero.officialPriceText, '$2.346')
    assert.equal(hero.discountOff, 8)
    assert.equal(hero.isStartingPrice, false)
  })

  test('seedance2.0-mini accurately derives 55% off against official mini benchmarks', () => {
    const expr =
      'u("video_input") == "none" ? tier("480p·720p·none", u("tokens") * 1.575 / 1000000) : tier("480p·720p·video", u("tokens") * 0.945 / 1000000)'

    const model: PricingModel = {
      id: 206,
      model_name: 'seedance2.0-mini',
      quota_type: 0,
      model_ratio: 1,
      billing_mode: 'tiered_expr',
      billing_expr: expr,
      billing_usage_schema: {
        resolution: { enum: ['480p', '720p'] },
        video_input: { enum: ['none', 'video'] },
        tokens: { type: 'number', unit: 'token' },
      },
    }

    const groups = getVideoModelTierGroups(model)
    assert.equal(groups.length, 1)
    const g = groups[0]
    assert.equal(g.title, '480p · 720p')
    assert.equal(g.withoutVideoPrice, 1.575)
    assert.equal(g.withVideoPrice, 0.945)
    assert.equal(g.officialWithoutVideoPrice, 3.5)
    assert.equal(g.officialWithVideoPrice, 2.1)

    // Hero price: minBilled is 0.945, minOfficial is 2.1 -> exactly 55% OFF
    const hero = getVideoModelHeroPrice(model, true, 1)
    assert.equal(hero.priceText, '$0.945')
    assert.equal(hero.officialPriceText, '$2.100')
    assert.equal(hero.discountOff, 55)
  })

  test('seedance2.0-fast accurately derives 20% off against official fast benchmarks', () => {
    const expr =
      'u("video_input") == "none" ? tier("480p·720p·none", u("tokens") * 4.48 / 1000000) : tier("480p·720p·video", u("tokens") * 2.64 / 1000000)'

    const model: PricingModel = {
      id: 207,
      model_name: 'seedance2.0-fast',
      quota_type: 0,
      model_ratio: 1,
      billing_mode: 'tiered_expr',
      billing_expr: expr,
      billing_usage_schema: {
        resolution: { enum: ['480p', '720p'] },
        video_input: { enum: ['none', 'video'] },
        tokens: { type: 'number', unit: 'token' },
      },
    }

    const groups = getVideoModelTierGroups(model)
    assert.equal(groups.length, 1)
    const g = groups[0]
    assert.equal(g.title, '480p · 720p')
    assert.equal(g.withoutVideoPrice, 4.48)
    assert.equal(g.withVideoPrice, 2.64)
    assert.equal(g.officialWithoutVideoPrice, 5.6)
    assert.equal(g.officialWithVideoPrice, 3.3)

    // Hero price: minBilled is 2.64, minOfficial is 3.3 -> exactly 20% OFF
    const hero = getVideoModelHeroPrice(model, true, 1)
    assert.equal(hero.priceText, '$2.640')
    assert.equal(hero.officialPriceText, '$3.300')
    assert.equal(hero.discountOff, 20)
  })
})



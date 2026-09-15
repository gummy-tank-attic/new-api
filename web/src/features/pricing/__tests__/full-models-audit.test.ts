import { describe, expect, it } from 'vitest'

import {
  getModelSupportedResolutions,
  getResolutionBadgeStyle,
  getVideoModelCapabilityTag,
  getVideoModelHeroPrice,
  getVideoModelTagline,
  isByteDanceOrVideoModel,
  isImageModel,
} from '../lib/video-pricing'
import type { PricingModel } from '../types'

describe('Comprehensive Pricing Models Audit', () => {
  const modelsToTest: Partial<PricingModel>[] = [
    {
      model_name: 'gpt-image-2.5-sunburst',
      billing_mode: 'tiered_expr',
      billing_expr: 'p * 5 + c * 30 + img * 8',
      quota_type: 0,
    },
    {
      model_name: 'gpt-image-2.5-flare',
      billing_mode: 'tiered_expr',
      billing_expr: 'p * 3 + c * 15 + img * 4',
      quota_type: 0,
    },
    {
      model_name: 'gpt-image-2',
      billing_mode: 'tiered_expr',
      billing_expr:
        '(has(param("size") ?? "", "2048") || has(param("resolution") ?? "", "2K")) ? tier("2K", 200000 * (param("n") ?? 1.0)) : tier("1K", 133333.3333333333 * (param("n") ?? 1.0))',
      quota_type: 0,
    },
    {
      model_name: 'seedream-pro',
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("1k", fixed(0.02925)):tier("2k", fixed(0.0585))',
      quota_type: 1,
    },
    {
      model_name: 'seedream-unfiltered',
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("1k", fixed(0.035)):tier("2k", fixed(0.070))',
      quota_type: 1,
    },
    {
      model_name: 'flux.1-dev',
      billing_mode: 'fixed',
      model_price: 0.04,
      quota_type: 1,
      supported_endpoint_types: ['image-generation'],
    },
    {
      model_name: 'dall-e-3',
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("1024x1024", fixed(0.040)):tier("1024x1792", fixed(0.080))',
      quota_type: 1,
    },
    {
      model_name: 'grok-imagine-image',
      billing_mode: 'fixed',
      model_price: 0.05,
      quota_type: 1,
    },
    {
      model_name: 'seedance-2.5',
      billing_mode: 'tiered_expr',
      billing_expr:
        'tier("720p", u("video_input") == "video" ? 1.4 : 1.0):tier("1080p", u("video_input") == "video" ? 2.8 : 2.0)',
      quota_type: 0,
    },
    {
      model_name: 'minimax-h3',
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("768P", u("seconds") * 0.06)',
      billing_usage_schema: {
        seconds: { type: 'number', unit: 'second' },
        resolution: { enum: ['768P', '2K'] },
      },
      quota_type: 1,
    },
    {
      model_name: 'grok-imagine-video',
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("1080P", param("duration") * 200000)',
      quota_type: 0,
    },
    {
      model_name: 'upscale-v1',
      billing_mode: 'tiered_expr',
      billing_expr:
        'tier("1080p", u("tokens") * 7.18475 / 1000000 + u("seconds") * 0.0196)',
      quota_type: 0,
    },
  ]

  for (const partial of modelsToTest) {
    const model = {
      id: 1,
      enable_groups: ['default', 'Codex Pro (External)'],
      group_ratio: { default: 1, 'Codex Pro (External)': 0.15 },
      ...partial,
    } as PricingModel

    it(`audits ${model.model_name}`, () => {
      const isImg = isImageModel(model)
      const isVid = isByteDanceOrVideoModel(model)

      // 1. Must be identified as either image or video model
      expect(isImg || isVid).toBe(true)

      // 2. Must produce non-empty hero price
      const hero = getVideoModelHeroPrice(model, true, 0.15)
      expect(hero.priceText).toBeTruthy()
      expect(hero.priceText).not.toBe('-')
      expect(hero.unitText).toBeTruthy()

      // 3. Must have tagline
      const tagline = getVideoModelTagline(model.model_name)
      expect(tagline.key).toBeTruthy()
      expect(tagline.defaultText).toBeTruthy()

      // 4. If image model, must have supported resolutions or valid hero fallback
      if (isImg) {
        const resolutions = getModelSupportedResolutions(model)
        expect(Array.isArray(resolutions)).toBe(true)
        for (const r of resolutions) {
          const style = getResolutionBadgeStyle(r)
          expect(style.label).toBeTruthy()
        }
      }

      // 5. Capability tag if present must have key and label
      const capTag = getVideoModelCapabilityTag(model.model_name)
      if (capTag) {
        expect(capTag.label).toBeTruthy()
        expect(capTag.key).toBeTruthy()
        expect(capTag.className).toBeTruthy()
      }
    })
  }
})

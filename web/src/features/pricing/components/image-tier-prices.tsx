import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { parseImageTiersFromExpr } from '../lib/billing-expr'
import { formatTaskUsageUnitPrice } from '../lib/dynamic-price'
import { stripTrailingZeros } from '../lib/price'
import type { PricingModel } from '../types'

export function ImageTierPrices(props: {
  model: PricingModel
  groupRatio: number
  showRechargePrice?: boolean
  priceRate?: number
  usdExchangeRate?: number
  layout?: 'compact' | 'table'
}) {
  const { t } = useTranslation()
  const tiers = parseImageTiersFromExpr(props.model.billing_expr ?? '')
  if (!tiers.length) {
    return (
      <span className='text-muted-foreground text-sm'>
        {t('Unable to parse structured pricing')}
      </span>
    )
  }
  return (
    <dl
      className={cn(
        'grid min-w-0 grid-cols-2',
        props.layout === 'table'
          ? 'min-h-[52px] gap-2 sm:grid-cols-3'
          : 'gap-x-8 gap-y-3'
      )}
    >
      {tiers.map((tier) => (
        <div
          key={tier.label}
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1',
            props.layout === 'table' && 'content-center justify-center py-1'
          )}
        >
          <dt className='text-foreground text-sm font-semibold break-words'>
            {tier.label}
            <span
              aria-hidden='true'
              className='text-muted-foreground/60 ml-2 text-xs'
            >
              ·
            </span>
          </dt>
          <dd
            className={cn(
              'text-foreground font-semibold break-words tabular-nums',
              props.layout === 'table'
                ? 'text-[15px] sm:text-[16px]'
                : 'text-base'
            )}
          >
            {stripTrailingZeros(
              formatTaskUsageUnitPrice(tier.price, {
                tokenUnit: 'M',
                groupRatioMultiplier: props.groupRatio,
                showRechargePrice: props.showRechargePrice,
                priceRate: props.priceRate,
                usdExchangeRate: props.usdExchangeRate,
              })
            )}
            <span className='text-muted-foreground ml-1 inline-block text-xs font-normal'>
              / {t('image (unit)')}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

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
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Spinner } from '@/components/ui/spinner'
import { getStatus } from '@/lib/api'

type TelegramLoginDialogProps = {
  open: boolean
  botName: string
  pending: boolean
  onOpenChange: (open: boolean) => void
  onAuthorization: (authorization: unknown) => void
}

let telegramCallbackSequence = 0

export function TelegramLoginDialog(props: TelegramLoginDialogProps) {
  const { t } = useTranslation()
  const authorizationHandler = useRef(props.onAuthorization)
  const widgetRef = useRef<HTMLDivElement>(null)
  const [fetchedBotName, setFetchedBotName] = useState('')
  const [callbackName] = useState(
    () => `newApiTelegramLogin${++telegramCallbackSequence}`
  )

  const rawBotName = props.botName || fetchedBotName
  const cleanBotName = rawBotName.trim().replace(/^@/, '')

  useEffect(() => {
    authorizationHandler.current = props.onAuthorization
  }, [props.onAuthorization])

  useEffect(() => {
    if (!props.open) return

    if (!props.botName) {
      getStatus()
        .then((statusData) => {
          const name = (statusData?.telegram_bot_name as string) || ''
          if (name) {
            setFetchedBotName(name)
          }
        })
        .catch(() => {})
    }

    const callback = (authorization: unknown) => {
      authorizationHandler.current(authorization)
    }
    const browserWindow = window as unknown as Record<string, unknown>
    browserWindow[callbackName] = callback

    return () => {
      delete browserWindow[callbackName]
    }
  }, [callbackName, props.open, props.botName])

  useEffect(() => {
    const container = widgetRef.current
    if (!container || !props.open || !cleanBotName) return

    container.replaceChildren()
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', cleanBotName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-onauth', `${callbackName}(user)`)
    script.setAttribute('data-request-access', 'write')
    container.appendChild(script)

    return () => {
      container.replaceChildren()
    }
  }, [cleanBotName, props.open, callbackName])

  const cleanBotName = props.botName.trim().replace(/^@/, '')

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t('Telegram Login Widget')}
      description={t('Continue with Telegram')}
      contentClassName='max-w-sm'
      contentHeight='auto'
      bodyClassName='space-y-4'
    >
      <div className='flex min-h-16 flex-col items-center justify-center gap-2 py-4'>
        {props.pending && <Spinner />}
        {!cleanBotName && (
          <p className='text-muted-foreground text-sm'>
            {t('Telegram Bot Username is not configured.')}
          </p>
        )}
        <div
          ref={widgetRef}
          className='flex min-h-12 w-full items-center justify-center'
        />
      </div>
    </Dialog>
  )
}

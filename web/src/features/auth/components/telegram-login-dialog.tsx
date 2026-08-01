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
  const [callbackName] = useState(
    () => `newApiTelegramLogin${++telegramCallbackSequence}`
  )

  useEffect(() => {
    authorizationHandler.current = props.onAuthorization
  }, [props.onAuthorization])

  useEffect(() => {
    if (!props.open) return

    const callback = (authorization: unknown) => {
      authorizationHandler.current(authorization)
    }
    const browserWindow = window as unknown as Record<string, unknown>
    browserWindow[callbackName] = callback

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://oauth.telegram.org') return
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (data && (data.event === 'auth_result' || data.result)) {
          authorizationHandler.current(data.result || data)
        }
      } catch {
        // ignore non-json messages
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      delete browserWindow[callbackName]
    }
  }, [callbackName, props.open])

  const botName = props.botName.trim().replace(/^@/, '')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const iframeSrc = botName && props.open
    ? `https://oauth.telegram.org/embed/${botName}?origin=${encodeURIComponent(origin)}&size=large&radius=8&onauth=${callbackName}(user)`
    : ''

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
      <div className='flex min-h-16 flex-col items-center justify-center gap-2 py-2'>
        {props.pending && <Spinner />}
        {iframeSrc ? (
          <iframe
            title='Telegram Login'
            src={iframeSrc}
            width='240'
            height='40'
            style={{ border: 'none', overflow: 'hidden', colorScheme: 'light' }}
            scrolling='no'
          />
        ) : (
          <p className='text-muted-foreground text-sm'>
            {t('Telegram Bot Username is not configured.')}
          </p>
        )}
      </div>
    </Dialog>
  )
}

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
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  KeyRound,
  Terminal,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import {
  API_BASE_URL,
  API_HOST,
  EXAMPLE_API_KEY,
  EXAMPLE_MODEL_ANTHROPIC,
  EXAMPLE_MODEL_IMAGE,
  EXAMPLE_MODEL_OPENAI,
  EXAMPLE_MODEL_VIDEO,
  IMAGE_GENERATIONS_ENDPOINT,
  PRICING_PATH,
  SITE_URL,
  type DocsSectionId,
} from '../constants'
import { CodeBlock } from './code-block'

type SectionContentProps = {
  section: DocsSectionId
}

function SectionTitle(props: { title: string; description: string }) {
  return (
    <div className='space-y-2'>
      <h1 className='text-2xl font-extrabold tracking-tight sm:text-3xl'>
        {props.title}
      </h1>
      <p className='text-muted-foreground text-sm leading-relaxed sm:text-base'>
        {props.description}
      </p>
    </div>
  )
}

function StepList(props: { steps: string[] }) {
  return (
    <ol className='space-y-3'>
      {props.steps.map((step, index) => (
        <li key={step} className='flex gap-3 text-sm leading-relaxed'>
          <span className='bg-primary/10 text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold'>
            {index + 1}
          </span>
          <span className='text-foreground/90 pt-0.5'>{step}</span>
        </li>
      ))}
    </ol>
  )
}

function Callout(props: {
  tone?: 'info' | 'warn'
  title: string
  children: ReactNode
}) {
  const tone = props.tone ?? 'info'
  const Icon = tone === 'warn' ? AlertTriangle : BookOpen
  return (
    <div
      className={
        tone === 'warn'
          ? 'rounded-xl border border-amber-500/30 bg-amber-500/5 p-4'
          : 'bg-muted/40 rounded-xl border p-4'
      }
    >
      <div className='mb-2 flex items-center gap-2 text-sm font-semibold'>
        <Icon className='size-4' />
        {props.title}
      </div>
      <div className='text-muted-foreground text-sm leading-relaxed'>
        {props.children}
      </div>
    </div>
  )
}

function InlineCode(props: { children: string }) {
  return (
    <code className='bg-muted rounded px-1.5 py-0.5 font-mono text-[12px]'>
      {props.children}
    </code>
  )
}

function QuickstartSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Quick start')}
        description={t(
          'Get your first successful request on MetaRtr in a few minutes. OpenAI-compatible: replace Base URL and API Key in most tools.'
        )}
      />

      <div className='grid gap-3 sm:grid-cols-3'>
        <Link
          to='/sign-up'
          className='bg-card hover:border-primary/40 group rounded-xl border p-4 transition-colors'
        >
          <KeyRound className='text-primary mb-3 size-5' />
          <div className='mb-1 text-sm font-semibold'>
            {t('Create an account')}
          </div>
          <p className='text-muted-foreground text-xs leading-relaxed'>
            {t('Register on MetaRtr, then open the console.')}
          </p>
          <span className='text-primary mt-3 inline-flex items-center gap-1 text-xs font-medium'>
            {t('Open')}
            <ArrowRight className='size-3 transition-transform group-hover:translate-x-0.5' />
          </span>
        </Link>
        <Link
          to='/keys'
          className='bg-card hover:border-primary/40 group rounded-xl border p-4 transition-colors'
        >
          <Terminal className='text-primary mb-3 size-5' />
          <div className='mb-1 text-sm font-semibold'>
            {t('Create an API key')}
          </div>
          <p className='text-muted-foreground text-xs leading-relaxed'>
            {t('Generate a token in API Keys and copy it securely.')}
          </p>
          <span className='text-primary mt-3 inline-flex items-center gap-1 text-xs font-medium'>
            {t('Open')}
            <ArrowRight className='size-3 transition-transform group-hover:translate-x-0.5' />
          </span>
        </Link>
        <Link
          to='/pricing'
          className='bg-card hover:border-primary/40 group rounded-xl border p-4 transition-colors'
        >
          <BookOpen className='text-primary mb-3 size-5' />
          <div className='mb-1 text-sm font-semibold'>{t('Pick a model')}</div>
          <p className='text-muted-foreground text-xs leading-relaxed'>
            {t('Use exact model IDs from the Model Square pricing page.')}
          </p>
          <span className='text-primary mt-3 inline-flex items-center gap-1 text-xs font-medium'>
            {t('Open')}
            <ArrowRight className='size-3 transition-transform group-hover:translate-x-0.5' />
          </span>
        </Link>
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Minimal checklist')}</h2>
        <StepList
          steps={[
            t('Sign up and top up or obtain trial quota if available.'),
            t('Create an API key in Console → API Keys.'),
            t('Set Base URL to {{url}}.', { url: API_BASE_URL }),
            t(
              'Send a chat completion with a model ID from Model Square, e.g. {{model}}.',
              { model: EXAMPLE_MODEL_OPENAI }
            ),
          ]}
        />
      </div>

      <CodeBlock
        title='Python'
        code={`from openai import OpenAI

client = OpenAI(
    api_key="${EXAMPLE_API_KEY}",
    base_url="${API_BASE_URL}",
)

response = client.chat.completions.create(
    model="${EXAMPLE_MODEL_OPENAI}",
    messages=[{"role": "user", "content": "Hello from MetaRtr!"}],
)

print(response.choices[0].message.content)`}
      />

      <Callout title={t('About prices')}>
        {t(
          'Model Square shows reference prices for each plan. Your final charges depend on the API key and plan assigned to your account—always confirm in the console.'
        )}
      </Callout>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('If it fails, check these 5 first')}</h2>
        <StepList
          steps={[
            t('Base URL is {{url}} for every client.', {
              url: API_BASE_URL,
            }),
            t(
              'Model ID: copy the exact string from Model Square — doc examples are placeholders only.'
            ),
            t(
              'Auth header matches the protocol: OpenAI uses Authorization Bearer; Claude native uses x-api-key + anthropic-version; Gemini native uses x-goog-api-key.'
            ),
            t(
              'Wallet / quota is positive and the API key is enabled in Console → API Keys.'
            ),
            t(
              'Save the request id from the error message or response headers before contacting support.'
            ),
          ]}
        />
      </div>
    </div>
  )
}

function BaseUrlSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Base URL & API Key')}
        description={t(
          'Use this Base URL for OpenAI-compatible clients. Claude Code uses the API host without /v1. Do not use www.'
        )}
      />

      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full min-w-[520px] text-left text-sm'>
          <thead className='bg-muted/50 border-b'>
            <tr>
              <th className='px-4 py-3 font-semibold'>{t('Client type')}</th>
              <th className='px-4 py-3 font-semibold'>{t('Value')}</th>
              <th className='px-4 py-3 font-semibold'>{t('Notes')}</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            <tr>
              <td className='px-4 py-3'>{t('Base URL')}</td>
              <td className='px-4 py-3 font-mono text-xs'>{API_BASE_URL}</td>
              <td className='text-muted-foreground px-4 py-3 text-xs'>
                {t(
                  'OpenAI-compatible clients (OpenAI SDK, Cursor, Codex, and most AI clients)'
                )}
              </td>
            </tr>
            <tr>
              <td className='px-4 py-3'>
                {t('Account managers (All API Hub, etc.)')}
              </td>
              <td className='px-4 py-3 font-mono text-xs'>{SITE_URL}</td>
              <td className='text-muted-foreground px-4 py-3 text-xs'>
                {t(
                  'Site URL for login-based tools only — not for SDK Base URL.'
                )}
              </td>
            </tr>
            <tr>
              <td className='px-4 py-3'>{t('API Key')}</td>
              <td className='px-4 py-3 font-mono text-xs'>{EXAMPLE_API_KEY}</td>
              <td className='text-muted-foreground px-4 py-3 text-xs'>
                {t('Create in Console → API Keys')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout tone='warn' title={t('Third-party account managers')}>
        {t(
          'Login-based tools (e.g. All API Hub): open {{www}} and sign in first. SDK Base URL is {{url}}. Prefer a dedicated revocable API key. Never paste console passwords or secrets into browser extensions.',
          { www: SITE_URL, url: API_BASE_URL }
        )}
      </Callout>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Auth header')}</h2>
        <CodeBlock
          title='HTTP'
          code={`Authorization: Bearer ${EXAMPLE_API_KEY}`}
        />
        <p className='text-muted-foreground text-sm'>
          {t(
            'Never commit keys to git. Prefer environment variables or the tool’s secret store.'
          )}
        </p>
      </div>
    </div>
  )
}

function ProtocolsSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Protocols & auth')}
        description={t(
          'MetaRtr is a multi-protocol gateway. Prefer OpenAI-compatible for most apps; use Claude or Gemini native when the client requires that wire format.'
        )}
      />

      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full min-w-[560px] text-left text-sm'>
          <thead className='bg-muted/50 border-b'>
            <tr>
              <th className='px-4 py-3 font-semibold'>{t('Protocol')}</th>
              <th className='px-4 py-3 font-semibold'>{t('Base / path')}</th>
              <th className='px-4 py-3 font-semibold'>{t('Auth')}</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            <tr>
              <td className='px-4 py-3'>{t('OpenAI compatible')}</td>
              <td className='px-4 py-3 font-mono text-xs'>{API_BASE_URL}</td>
              <td className='px-4 py-3 font-mono text-xs'>
                Authorization: Bearer …
              </td>
            </tr>
            <tr>
              <td className='px-4 py-3'>{t('Claude native (Messages)')}</td>
              <td className='px-4 py-3 font-mono text-xs'>
                {API_HOST}/v1/messages
              </td>
              <td className='px-4 py-3 font-mono text-xs'>
                x-api-key + anthropic-version
              </td>
            </tr>
            <tr>
              <td className='px-4 py-3'>{t('Gemini native')}</td>
              <td className='px-4 py-3 font-mono text-xs'>
                {`${API_HOST}/v1beta/models/{model}:generateContent`}
              </td>
              <td className='px-4 py-3 font-mono text-xs'>x-goog-api-key</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout title={t('When to use which')}>
        {t(
          'Most SDKs and IDEs: OpenAI compatible with {{url}}. Keep Anthropic request body (tools, system blocks): Claude native on the API host without /v1. Keep Google contents format or Gemini SDK: Gemini native on the API host.',
          { url: API_BASE_URL }
        )}
      </Callout>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Claude native example')}</h2>
        <CodeBlock
          title='bash'
          code={`curl ${API_HOST}/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${EXAMPLE_API_KEY}" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "${EXAMPLE_MODEL_ANTHROPIC}",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Summarize MetaRtr in one sentence."}
    ]
  }'`}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Gemini native example')}</h2>
        <CodeBlock
          title='bash'
          code={`curl "${API_HOST}/v1beta/models/{model}:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: ${EXAMPLE_API_KEY}" \\
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "One practical API testing tip."}]}
    ]
  }'`}
        />
        <p className='text-muted-foreground text-sm'>
          {t(
            'Replace {model} with a live Gemini model ID from Model Square. Some clients accept ?key=… instead of x-goog-api-key.'
          )}
        </p>
      </div>
    </div>
  )
}

function SdkSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('SDK & cURL')}
        description={t(
          'Standard OpenAI Chat Completions. Swap base_url and api_key only — keep your application code.'
        )}
      />

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Python SDK')}</h2>
        <CodeBlock
          title='Python'
          code={`from openai import OpenAI

client = OpenAI(
    api_key="${EXAMPLE_API_KEY}",
    base_url="${API_BASE_URL}",
)

response = client.chat.completions.create(
    model="${EXAMPLE_MODEL_OPENAI}",
    messages=[
        {"role": "user", "content": "Explain MetaRtr in one sentence."}
    ],
)

print(response.choices[0].message.content)`}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Node.js SDK')}</h2>
        <CodeBlock
          title='JavaScript'
          code={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.METARTR_API_KEY,
  baseURL: "${API_BASE_URL}",
});

const response = await client.chat.completions.create({
  model: "${EXAMPLE_MODEL_OPENAI}",
  messages: [{ role: "user", content: "Hello from MetaRtr!" }],
});

console.log(response.choices[0].message.content);`}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>cURL</h2>
        <CodeBlock
          title='bash'
          code={`curl ${API_BASE_URL}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${EXAMPLE_API_KEY}" \\
  -d '{
    "model": "${EXAMPLE_MODEL_OPENAI}",
    "messages": [
      {"role": "user", "content": "Hello from MetaRtr API!"}
    ]
  }'`}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Streaming')}</h2>
        <p className='text-muted-foreground text-sm leading-relaxed'>
          {t(
            'Set stream=true (or stream=True). Clients should raise read timeouts for long answers. Final usage may appear in the stream or only in non-stream mode depending on the model path.'
          )}
        </p>
        <CodeBlock
          title='Python'
          code={`from openai import OpenAI

client = OpenAI(
    api_key="${EXAMPLE_API_KEY}",
    base_url="${API_BASE_URL}",
)

stream = client.chat.completions.create(
    model="${EXAMPLE_MODEL_OPENAI}",
    messages=[{"role": "user", "content": "Write a 50-word joke."}],
    stream=True,
)

for chunk in stream:
    delta = chunk.choices[0].delta.content or ""
    print(delta, end="", flush=True)`}
        />
      </div>

      <Callout title={t('Model IDs')}>
        {t(
          'Model names must match Model Square exactly (case-sensitive). Prefer live IDs from {{path}} over outdated tutorial names.',
          { path: PRICING_PATH }
        )}
      </Callout>
    </div>
  )
}

function EndpointsSection() {
  const { t } = useTranslation()

  /** Public product surface only — do not list internal/niche task routes. */
  const groups: Array<{
    title: string
    rows: Array<{ method: string; path: string; note: string }>
  }> = [
    {
      title: t('Chat & protocols'),
      rows: [
        {
          method: 'POST',
          path: '/v1/chat/completions',
          note: t('OpenAI chat, streaming, and tool calls (default path)'),
        },
        {
          method: 'POST',
          path: '/v1/responses',
          note: t('OpenAI Responses API (agents / multi-step)'),
        },
        {
          method: 'POST',
          path: '/v1/messages',
          note: t('Claude Messages API (x-api-key + anthropic-version)'),
        },
        {
          method: 'POST',
          path: '/v1beta/models/{model}:generateContent',
          note: t('Gemini generateContent (x-goog-api-key)'),
        },
      ],
    },
    {
      title: t('Media & embeddings'),
      rows: [
        {
          method: 'POST',
          path: '/v1/images/generations',
          note: t('Image generation (some video models use this path too)'),
        },
        {
          method: 'POST',
          path: '/v1/embeddings',
          note: t('Text embeddings — only if the model is on Model Square'),
        },
      ],
    },
    {
      title: t('Models'),
      rows: [
        {
          method: 'GET',
          path: '/v1/models',
          note: t('List models available to the current API key'),
        },
      ],
    },
  ]

  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Endpoints')}
        description={t(
          'Common public paths on {{host}}. OpenAI SDK uses the same Base URL and appends these paths.',
          { host: API_HOST }
        )}
      />

      <Callout title={t('Availability')}>
        {t(
          'This list is the supported product surface, not an internal route dump. A call works only when the model appears on Model Square for your plan and key. Prefer Model Square over guessing extra paths.'
        )}
      </Callout>

      {groups.map((group) => (
        <div key={group.title} className='space-y-3'>
          <h2 className='text-lg font-bold'>{group.title}</h2>
          <div className='overflow-x-auto rounded-xl border'>
            <table className='w-full min-w-[560px] text-left text-sm'>
              <thead className='bg-muted/50 border-b'>
                <tr>
                  <th className='px-4 py-3 font-semibold'>{t('Method')}</th>
                  <th className='px-4 py-3 font-semibold'>{t('Path')}</th>
                  <th className='px-4 py-3 font-semibold'>{t('Notes')}</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {group.rows.map((row) => (
                  <tr key={row.path}>
                    <td className='px-4 py-3 font-mono text-xs'>
                      {row.method}
                    </td>
                    <td className='px-4 py-3 font-mono text-xs'>{row.path}</td>
                    <td className='text-muted-foreground px-4 py-3 text-xs'>
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('List models')}</h2>
        <CodeBlock
          title='bash'
          code={`curl ${API_BASE_URL}/models \\
  -H "Authorization: Bearer ${EXAMPLE_API_KEY}"`}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Responses API example')}</h2>
        <CodeBlock
          title='bash'
          code={`curl ${API_BASE_URL}/responses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${EXAMPLE_API_KEY}" \\
  -d '{
    "model": "${EXAMPLE_MODEL_OPENAI}",
    "input": "Draft a short internal note about API gateways."
  }'`}
        />
      </div>
    </div>
  )
}

function ImagesSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Image & Video')}
        description={t(
          'Generate images and video via the OpenAI-compatible /v1/images/generations endpoint. Use exact model IDs from Model Square — examples below are placeholders only.'
        )}
      />

      <div className='overflow-x-auto rounded-xl border'>
        <table className='w-full min-w-[520px] text-left text-sm'>
          <thead className='bg-muted/50 border-b'>
            <tr>
              <th className='px-4 py-3 font-semibold'>{t('Type')}</th>
              <th className='px-4 py-3 font-semibold'>{t('URL / Endpoint')}</th>
              <th className='px-4 py-3 font-semibold'>{t('Usage')}</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            <tr>
              <td className='px-4 py-3'>{t('SDK Base URL')}</td>
              <td className='px-4 py-3 font-mono text-xs'>{API_BASE_URL}</td>
              <td className='text-muted-foreground px-4 py-3 text-xs'>
                {t(
                  'For Python / Node.js OpenAI SDKs (auto-appends /images/generations)'
                )}
              </td>
            </tr>
            <tr>
              <td className='px-4 py-3'>{t('Direct Endpoint')}</td>
              <td className='px-4 py-3 font-mono text-xs'>
                {IMAGE_GENERATIONS_ENDPOINT}
              </td>
              <td className='text-muted-foreground px-4 py-3 text-xs'>
                {t(
                  'For raw HTTP POST requests, cURL, webhooks, or custom tools'
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-bold'>{t('Image Generation')}</h2>
        <p className='text-muted-foreground text-sm leading-relaxed'>
          {t(
            'Compatible with standard OpenAI client.images.generate. Copy the image model ID from Model Square (examples in code are placeholders).'
          )}
        </p>

        <div className='space-y-3'>
          <h3 className='text-sm font-semibold'>{t('Python SDK')}</h3>
          <CodeBlock
            title='Python'
            code={`from openai import OpenAI

client = OpenAI(
    api_key="${EXAMPLE_API_KEY}",
    base_url="${API_BASE_URL}",
)

# Standard image generation
response = client.images.generate(
    model="${EXAMPLE_MODEL_IMAGE}",  # placeholder — copy live ID from Model Square
    prompt="A futuristic neon cyberpunk city with flying vehicles, ultra-detailed 8k",
    n=1,
    size="1024x1024",
)

image_url = response.data[0].url
print("Image URL:", image_url)`}
          />
        </div>

        <div className='space-y-3'>
          <h3 className='text-sm font-semibold'>{t('Node.js SDK')}</h3>
          <CodeBlock
            title='JavaScript'
            code={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.METARTR_API_KEY,
  baseURL: "${API_BASE_URL}",
});

const response = await client.images.generate({
  model: "${EXAMPLE_MODEL_IMAGE}",
  prompt: "A futuristic neon cyberpunk city with flying vehicles, ultra-detailed 8k",
  n: 1,
  size: "1024x1024",
});

console.log("Image URL:", response.data[0].url);`}
          />
        </div>

        <div className='space-y-3'>
          <h3 className='text-sm font-semibold'>cURL</h3>
          <CodeBlock
            title='bash'
            code={`curl ${IMAGE_GENERATIONS_ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${EXAMPLE_API_KEY}" \\
  -d '{
    "model": "${EXAMPLE_MODEL_IMAGE}",
    "prompt": "A futuristic neon cyberpunk city with flying vehicles, ultra-detailed 8k",
    "size": "1024x1024",
    "n": 1
  }'`}
          />
        </div>
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-bold'>
          {t('Video generation')}
        </h2>
        <p className='text-muted-foreground text-sm leading-relaxed'>
          {t(
            'Some video models accept POST on the same /v1/images/generations path with duration and resolution. Use the live video model ID from Model Square.'
          )}
        </p>

        <div className='space-y-3'>
          <h3 className='text-sm font-semibold'>cURL (Video Generation)</h3>
          <CodeBlock
            title='bash'
            code={`curl ${IMAGE_GENERATIONS_ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${EXAMPLE_API_KEY}" \\
  -d '{
    "model": "${EXAMPLE_MODEL_VIDEO}",
    "prompt": "A cinematic drone shot through futuristic neon skyscrapers at sunset",
    "duration": 5,
    "resolution": "480p",
    "aspect_ratio": "16:9"
  }'`}
          />
        </div>
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Parameters Reference')}</h2>
        <div className='overflow-x-auto rounded-xl border'>
          <table className='w-full min-w-[520px] text-left text-sm'>
            <thead className='bg-muted/50 border-b'>
              <tr>
                <th className='px-4 py-3 font-semibold'>{t('Parameter')}</th>
                <th className='px-4 py-3 font-semibold'>{t('Type')}</th>
                <th className='px-4 py-3 font-semibold'>{t('Description')}</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              <tr>
                <td className='px-4 py-3 font-mono text-xs'>model</td>
                <td className='text-muted-foreground px-4 py-3 text-xs'>
                  string (required)
                </td>
                <td className='px-4 py-3 text-xs'>
                  {t('Exact model ID from Model Square (placeholder in examples)')}
                </td>
              </tr>
              <tr>
                <td className='px-4 py-3 font-mono text-xs'>prompt</td>
                <td className='text-muted-foreground px-4 py-3 text-xs'>
                  string (required)
                </td>
                <td className='px-4 py-3 text-xs'>
                  {t('Text description of the desired image or video')}
                </td>
              </tr>
              <tr>
                <td className='px-4 py-3 font-mono text-xs'>size</td>
                <td className='text-muted-foreground px-4 py-3 text-xs'>
                  string (optional)
                </td>
                <td className='px-4 py-3 text-xs'>
                  {t(
                    'Image resolution (e.g. 1024x1024 for 1K, 2048x2048 for 2K)'
                  )}
                </td>
              </tr>
              <tr>
                <td className='px-4 py-3 font-mono text-xs'>duration</td>
                <td className='text-muted-foreground px-4 py-3 text-xs'>
                  integer (video)
                </td>
                <td className='px-4 py-3 text-xs'>
                  {t('Video duration in seconds (model-dependent)')}
                </td>
              </tr>
              <tr>
                <td className='px-4 py-3 font-mono text-xs'>resolution</td>
                <td className='text-muted-foreground px-4 py-3 text-xs'>
                  string (video)
                </td>
                <td className='px-4 py-3 text-xs'>
                  {t('Video resolution (model-dependent; example: 480p)')}
                </td>
              </tr>
              <tr>
                <td className='px-4 py-3 font-mono text-xs'>aspect_ratio</td>
                <td className='text-muted-foreground px-4 py-3 text-xs'>
                  string (video)
                </td>
                <td className='px-4 py-3 text-xs'>
                  {t('Aspect ratio (model-dependent; example: 16:9)')}
                </td>
              </tr>
              <tr>
                <td className='px-4 py-3 font-mono text-xs'>n</td>
                <td className='text-muted-foreground px-4 py-3 text-xs'>
                  integer (optional)
                </td>
                <td className='px-4 py-3 text-xs'>
                  {t('Number of images to generate (default 1)')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Callout title={t('Image & Video Models')}>
        {t(
          'Check Model Square at {{path}} for supported image and video model IDs and list prices.',
          { path: PRICING_PATH }
        )}
      </Callout>
    </div>
  )
}

function ClaudeCodeSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Claude Code')}
        description={t(
          'Point Anthropic CLI environment variables at MetaRtr.'
        )}
      />

      <StepList
        steps={[
          t('Install Claude Code from the official Anthropic docs.'),
          t('Create a MetaRtr API key in Console → API Keys.'),
          t('Export ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN.'),
          t(
            'Optional: set default model env vars to a Model Square Claude model ID.'
          ),
          t('Restart the terminal (or IDE terminal) and run claude.'),
        ]}
      />

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('macOS / Linux / WSL')}</h2>
        <CodeBlock
          title='bash'
          code={`export ANTHROPIC_BASE_URL="${API_HOST}"
export ANTHROPIC_AUTH_TOKEN="${EXAMPLE_API_KEY}"

# Optional defaults (use exact IDs from Model Square)
# export ANTHROPIC_DEFAULT_SONNET_MODEL="${EXAMPLE_MODEL_ANTHROPIC}"
# export ANTHROPIC_DEFAULT_OPUS_MODEL="claude-opus-4-6"

claude`}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Windows PowerShell')}</h2>
        <CodeBlock
          title='PowerShell'
          code={`$env:ANTHROPIC_BASE_URL = "${API_HOST}"
$env:ANTHROPIC_AUTH_TOKEN = "${EXAMPLE_API_KEY}"
claude`}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>
          {t('Persist for the current user')}
        </h2>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Add the same exports to your shell profile (~/.zshrc, ~/.bashrc) or Windows User environment variables so they survive restarts.'
          )}
        </p>
      </div>

      <Callout title={t('Same Base URL')}>
        {t(
          'Use {{url}} for Claude Code. OpenAI-compatible clients use {{openaiUrl}}.',
          { url: API_HOST, openaiUrl: API_BASE_URL }
        )}
      </Callout>
    </div>
  )
}

function CodexSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Codex')}
        description={t(
          'Connect OpenAI Codex CLI / App to MetaRtr via a custom model provider in ~/.codex.'
        )}
      />

      <StepList
        steps={[
          t('Install Codex CLI or the Codex app from OpenAI.'),
          t('Create a MetaRtr API key.'),
          t('Write provider config under ~/.codex (see below).'),
          t('Restart Codex so it reloads config.'),
          t('Select a model ID that exists on MetaRtr Model Square.'),
        ]}
      />

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('config.toml example')}</h2>
        <CodeBlock
          title='~/.codex/config.toml'
          code={`model_provider = "metartr"
model = "${EXAMPLE_MODEL_OPENAI}"

[model_providers.metartr]
name = "MetaRtr"
base_url = "${API_BASE_URL}"
wire_api = "responses"
env_key = "METARTR_API_KEY"`}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('API key env')}</h2>
        <CodeBlock
          title='bash'
          code={`export METARTR_API_KEY="${EXAMPLE_API_KEY}"`}
        />
        <CodeBlock
          title='PowerShell'
          code={`$env:METARTR_API_KEY = "${EXAMPLE_API_KEY}"`}
        />
      </div>

      <Callout title={t('CLI and App')}>
        {t(
          'Config under ~/.codex is shared by Codex CLI and Codex App on most setups. Restart already-open sessions after editing.'
        )}
      </Callout>

      <Callout tone='warn' title={t('Model compatibility')}>
        {t(
          'If a request fails with an unsupported endpoint error, pick another model from Model Square or check the model’s supported API format in the console.'
        )}
      </Callout>
    </div>
  )
}

function CursorSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Cursor / Windsurf')}
        description={t(
          'Override the OpenAI endpoint so the IDE routes model calls through MetaRtr.'
        )}
      />

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>Cursor</h2>
        <StepList
          steps={[
            t('Open Cursor Settings → Models.'),
            t('Enable Override OpenAI Base URL.'),
            t('Set Base URL to {{url}}.', { url: API_BASE_URL }),
            t('Paste your MetaRtr API key into OpenAI API Key.'),
            t(
              'Add or select custom models using exact Model Square IDs when required.'
            ),
            t('Save and start a new chat to verify connectivity.'),
          ]}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>Windsurf</h2>
        <StepList
          steps={[
            t('Open Windsurf settings for AI / providers.'),
            t('Choose an OpenAI-compatible provider or custom endpoint.'),
            t('Base URL: {{url}}', { url: API_BASE_URL }),
            t('API Key: your MetaRtr token.'),
            t('Confirm with a short completion request.'),
          ]}
        />
      </div>

      <CodeBlock
        title={t('Values')}
        code={`Base URL: ${API_BASE_URL}
API Key:  ${EXAMPLE_API_KEY}
Model:    ${EXAMPLE_MODEL_OPENAI}   # example — copy from Model Square`}
      />

      <Callout title={t('Tip')}>
        {t(
          'If the IDE silently falls back to built-in providers, double-check that override is enabled and the Base URL is {{url}}.',
          { url: API_BASE_URL }
        )}
      </Callout>
    </div>
  )
}

function ClientsSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Chat clients')}
        description={t(
          'Any OpenAI-compatible client works. Fill Provider = OpenAI (or Custom), Base URL, and API Key.'
        )}
      />

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>NextChat / ChatBox / Lobe Chat</h2>
        <StepList
          steps={[
            t('Open Settings → Provider (or API).'),
            t('Select OpenAI or a custom OpenAI-compatible provider.'),
            t('Base URL: {{url}}', { url: API_BASE_URL }),
            t('API Key: your MetaRtr token.'),
            t('Pick a model ID from Model Square.'),
          ]}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>
          Cherry Studio / CC Switch / DeepChat
        </h2>
        <p className='text-muted-foreground text-sm leading-relaxed'>
          {t(
            'After login, the console can offer one-click import links for several desktop clients. You can also add MetaRtr manually as an OpenAI-compatible provider with the same Base URL and key.'
          )}
        </p>
      </div>

      <div className='bg-card rounded-xl border p-4'>
        <div className='mb-2 text-sm font-semibold'>{t('Shared fields')}</div>
        <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
          <li>
            {t('Base URL')}: <InlineCode>{API_BASE_URL}</InlineCode>
          </li>
          <li>
            {t('API Key')}: <InlineCode>{EXAMPLE_API_KEY}</InlineCode>
          </li>
          <li>{t('API format')}: OpenAI Chat Completions</li>
        </ul>
      </div>
    </div>
  )
}

function ModelsSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Models & pricing')}
        description={t(
          'Model Square lists live model IDs and list prices for your selection. Always copy IDs from there.'
        )}
      />

      <StepList
        steps={[
          t('Open Model Square (/pricing).'),
          t('Browse models by provider tab and pick a plan you can use.'),
          t('Copy the exact model ID shown on Model Square.'),
          t('Paste that ID into your client or SDK—do not invent names.'),
        ]}
      />

      <div className='flex flex-wrap gap-3'>
        <Button render={<Link to='/pricing' />}>
          {t('Open Model Square')}
          <ArrowRight className='size-4' />
        </Button>
      </div>

      <Callout title={t('Plans and prices')}>
        {t(
          'Plans and list prices on Model Square are for your selection. Do not reverse-engineer costs or suppliers from public pages—only use the model IDs and Base URL we publish.'
        )}
      </Callout>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Billing & usage')}</h2>
        <p className='text-muted-foreground text-sm leading-relaxed'>
          {t(
            'Successful calls (and many failed ones) appear in Console logs with model, token usage, and charged amount. Model Square list prices are guidance; final charges follow your plan and key settings.'
          )}
        </p>
        <StepList
          steps={[
            t('Open Console → Logs (or usage) after a test call.'),
            t(
              'Match rows by time or by the request id shown in errors / response headers.'
            ),
            t(
              'Top up the wallet when balance or quota is insufficient; disabled keys will not spend.'
            ),
          ]}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Example model IDs')}</h2>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Placeholders only. Always copy the live model ID from Model Square for your account:'
          )}
        </p>
        <CodeBlock
          title='examples'
          code={`${EXAMPLE_MODEL_OPENAI}
${EXAMPLE_MODEL_ANTHROPIC}`}
        />
      </div>
    </div>
  )
}

function TroubleshootingSection() {
  const { t } = useTranslation()
  const rows: Array<{ problem: string; fix: string }> = [
    {
      problem: t('401 Unauthorized'),
      fix: t(
        'Missing/wrong key, disabled key, or auth header does not match the protocol (Bearer vs x-api-key vs x-goog-api-key).'
      ),
    },
    {
      problem: t('403 / insufficient quota'),
      fix: t(
        'Balance or plan quota is insufficient. Top up, check plan limits, and confirm your key can use that model.'
      ),
    },
    {
      problem: t('404 or HTML instead of JSON'),
      fix: t('Use {{url}}. Do not use www.', { url: API_BASE_URL }),
    },
    {
      problem: t('model_not_found / model not allowed'),
      fix: t(
        'Copy the exact Model Square ID, confirm the model is online for your plan, or GET /v1/models with the same key.'
      ),
    },
    {
      problem: t('429 Too Many Requests'),
      fix: t(
        'Rate limited. Back off with retries, lower concurrency, or use a dedicated key / contact support.'
      ),
    },
    {
      problem: t('5xx / stream interrupt'),
      fix: t(
        'Temporary gateway or model-side timeout. Retry once; if it repeats, send support the request id from the error or response headers.'
      ),
    },
    {
      problem: t('Account manager auto-detect fails / returns HTML'),
      fix: t(
        'Sign in at {{www}} and use site URL {{www}} (not the API host). Prefer a dedicated revocable API key for tools — never paste console passwords into extensions.',
        { www: SITE_URL }
      ),
    },
  ]

  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Troubleshooting')}
        description={t(
          'Prefer HTTP status, error code, and request id before opening a ticket. Most issues are Base URL, model ID, auth header, or quota.'
        )}
      />

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>{t('Error body shape')}</h2>
        <p className='text-muted-foreground text-sm leading-relaxed'>
          {t(
            'Errors are usually OpenAI-style JSON. The message may include “(request id: …)”. Copy that id (also present on response headers) when contacting support.'
          )}
        </p>
        <CodeBlock
          title='JSON'
          code={`{
  "error": {
    "message": "model not found or not available (request id: …)",
    "type": "invalid_request_error",
    "param": "model",
    "code": "model_not_found"
  }
}`}
        />
      </div>

      <div className='space-y-3'>
        {rows.map((row) => (
          <div key={row.problem} className='bg-card rounded-xl border p-4'>
            <div className='mb-1 text-sm font-semibold'>{row.problem}</div>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {row.fix}
            </p>
          </div>
        ))}
      </div>

      <Callout title={t('Support')}>
        <div className='space-y-1.5'>
          <p>
            {t('Contact')}:{' '}
            <a
              className='text-primary font-medium hover:underline'
              href='mailto:support@metartr.com'
            >
              support@metartr.com
            </a>
          </p>
          <p>
            Telegram Support：
            <a
              className='text-primary font-medium hover:underline'
              href='https://t.me/MetaRtrSupport_bot'
              target='_blank'
              rel='noopener noreferrer'
            >
              MetaRtrSupport_bot
            </a>
          </p>
          <p>
            Telegram Channel：
            <a
              className='text-primary font-medium hover:underline'
              href='https://t.me/MetaRtr'
              target='_blank'
              rel='noopener noreferrer'
            >
              https://t.me/MetaRtr
            </a>
          </p>
          <p className='text-muted-foreground text-xs'>
            {t(
              'Include request id, model id, Base URL you used, and approximate time (UTC).'
            )}
          </p>
        </div>
      </Callout>
    </div>
  )
}

function SwitchGroupSection() {
  const { t } = useTranslation()
  return (
    <div className='space-y-8'>
      <SectionTitle
        title={t('Switch groups')}
        description={t(
          'Change the group of an existing key on the web console — the key and client configuration stay unchanged.'
        )}
      />

      <StepList
        steps={[
          t('Open Console → API Keys.'),
          t(
            'Click the group badge on the key row and pick the target group; each option shows its description and price ratio.'
          ),
          t(
            'Confirm the change. The next request is billed by the new group; the key and client configuration stay the same.'
          ),
        ]}
      />

      <Callout title={t('Same model, different price')}>
        {t(
          'The same model can have different price ratios in different groups. The confirmation dialog always shows the before and after ratios.'
        )}
      </Callout>

      <Callout tone='warn' title={t('Switching vendors')}>
        {t(
          'If the new group serves different models, also change the model name in your client; chat clients need to refresh their model list.'
        )}
      </Callout>

      <Callout tone='warn' title={t('CLI Only groups')}>
        {t(
          'Groups marked CLI Only can only be used inside Claude Code or Codex CLI; do not switch a key used by a GUI client to them.'
        )}
      </Callout>

      <div className='space-y-3'>
        <h2 className='text-lg font-bold'>
          {t('Advanced: switch groups from a script')}
        </h2>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Generate a system access token in Console → Personal Settings, then call the same API the web dropdown uses. The update is a full overwrite — always send every existing field of the token.'
          )}
        </p>
        <CodeBlock
          title='bash'
          code={`ACCESS_TOKEN="<your system access token>"  # Console -> Personal Settings
TOKEN_ID=123                                # key id shown in the API Keys list

# 1) Read the token's current fields
curl -s ${API_HOST}/api/token/$TOKEN_ID \\
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 2) PUT the FULL object back with only "group" changed.
#    Missing fields are treated as empty and will wipe that setting.
curl -s -X PUT ${API_HOST}/api/token/ \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"id":123,"name":"my-key","group":"Claude Plus(Premium)","remain_quota":0,"unlimited_quota":true,"expired_time":-1,"model_limits_enabled":false,"model_limits":"","allow_ips":"","auto_groups":[],"cross_group_retry":false}'`}
        />
      </div>
    </div>
  )
}

export function SectionContent(props: SectionContentProps) {
  switch (props.section) {
    case 'quickstart':
      return <QuickstartSection />
    case 'base-url':
      return <BaseUrlSection />
    case 'switch-group':
      return <SwitchGroupSection />
    case 'protocols':
      return <ProtocolsSection />
    case 'sdk':
      return <SdkSection />
    case 'endpoints':
      return <EndpointsSection />
    case 'images':
      return <ImagesSection />
    case 'claude-code':
      return <ClaudeCodeSection />
    case 'codex':
      return <CodexSection />
    case 'cursor':
      return <CursorSection />
    case 'clients':
      return <ClientsSection />
    case 'models':
      return <ModelsSection />
    case 'troubleshooting':
      return <TroubleshootingSection />
    default:
      return <QuickstartSection />
  }
}

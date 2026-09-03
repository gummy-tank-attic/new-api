import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { tanstackRouter } from '@tanstack/router-plugin/rspack'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ envMode }) => {
  const env = loadEnv({ mode: envMode, prefixes: ['VITE_'] })
  const serverUrl =
    process.env.VITE_REACT_APP_SERVER_URL ||
    env.rawPublicVars.VITE_REACT_APP_SERVER_URL ||
    'http://localhost:3000'

  const isProd = envMode === 'production'
  const devProxy = Object.fromEntries(
    (['/api', '/v1', '/mj', '/pg'] as const).map((key) => [
      key,
      { target: serverUrl, changeOrigin: true },
    ])
  ) as Record<string, { target: string; changeOrigin: boolean }>

  return {
    plugins: [pluginReact(), pluginTailwindcss({ optimize: false })],
    // Rsbuild 2: replaces deprecated `performance.chunkSplit` (RSPack 2 aligned)
    splitChunks: {
      preset: 'default',
      cacheGroups: {
        'vendor-react': {
          test: /node_modules[\\/](react|react-dom)[\\/]/,
          name: 'vendor-react',
          chunks: 'all',
          priority: 0,
          enforce: true,
        },
        'vendor-ui-primitives': {
          test: /node_modules[\\/](@base-ui|@radix-ui)[\\/]/,
          name: 'vendor-ui-primitives',
          chunks: 'all',
          priority: 0,
          enforce: true,
        },
        'vendor-tanstack': {
          test: /node_modules[\\/]@tanstack[\\/]/,
          name: 'vendor-tanstack',
          chunks: 'all',
          priority: 0,
          enforce: true,
        },
        // Ant Design is one of the heaviest UI libraries; keep async to avoid initial bundle bloat.
        'vendor-antd': {
          test: /node_modules[\\/](antd|antd-style|@ant-design)[\\/]/,
          name: 'vendor-antd',
          chunks: 'async',
          priority: 0,
          enforce: true,
        },
        // Charting libraries (VChart, Recharts) are large; keep async — only needed on chart pages.
        'vendor-chart': {
          test: /node_modules[\\/](@visactor|recharts)[\\/]/,
          name: 'vendor-chart',
          chunks: 'async',
          priority: 0,
          enforce: true,
        },
        // Syntax highlighting, math rendering, markdown — keep async, only needed in specific views.
        'vendor-rendering': {
          test: /node_modules[\\/](shiki|katex|marked|@codemirror|@lezer)[\\/]/,
          name: 'vendor-rendering',
          chunks: 'async',
          priority: 0,
          enforce: true,
        },
        // Multi-MB icon pack — only via dynamic import in lobe-icon.tsx
        'vendor-lobehub-icons': {
          test: /node_modules[\\/]@lobehub[\\/]icons[\\/]/,
          name: 'vendor-lobehub-icons',
          chunks: 'async',
          priority: 10,
          enforce: true,
        },
      },
    },
    source: {
      entry: {
        index: './src/main.tsx',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    html: {
      template: './index.html',
    },
    server: {
      host: '0.0.0.0',
      strictPort: false,
      // SPA: refresh on /pricing etc. must serve index.html (default htmlFallback
      // can miss some paths depending on Accept headers / proxy order).
      historyApiFallback: true,
      proxy: devProxy,
    },
    output: {
      // Production optimizations
      minify: isProd,
      target: 'web',
      distPath: {
        root: 'dist',
      },
      copy: [
        'en.json',
        'zh.json',
        'zh-TW.json',
        'fr.json',
        'ja.json',
        'ru.json',
        'vi.json',
      ].map((file) => ({
        from: path.resolve(__dirname, 'src/i18n/locales', file),
        to: path.join('locales', file),
      })),
      // Rely on Rsbuild default legalComments ("linked" → per-chunk *.LICENSE.txt) in all modes.
      // Do not set "none" in production: that strips minifier-preserved third-party notices and
      // extracted license files, which some distributions require for open-source compliance.
    },
    performance: {
      // Remove console in production
      removeConsole: isProd ? ['log'] : false,
      buildCache: false,
    },
    tools: {
      rspack: {
        plugins: [
          tanstackRouter({
            target: 'react',
            // Dev: avoid per-route async chunks (reduces white flash on navigation + faster HMR feedback).
            // Prod: keep route-based code splitting.
            autoCodeSplitting: isProd,
          }),
        ],
      },
    },
  }
})

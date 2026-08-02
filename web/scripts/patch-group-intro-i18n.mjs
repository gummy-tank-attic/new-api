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
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.join(__dirname, '../src/i18n/locales')

/** @type {Record<string, Record<string, string>>} */
const keys = {
  'Group intro': {
    en: 'About this group',
    zh: '分组介绍',
    'zh-TW': '分組介紹',
    ja: 'グループ説明',
    fr: 'À propos du groupe',
    ru: 'О группе',
    vi: 'Giới thiệu nhóm',
  },
  'No description for this group': {
    en: 'No description for this group yet.',
    zh: '暂无分组说明',
    'zh-TW': '暫無分組說明',
    ja: 'このグループの説明はまだありません。',
    fr: 'Aucune description pour ce groupe pour le moment.',
    ru: 'Описание этой группы пока не добавлено.',
    vi: 'Nhóm này chưa có mô tả.',
  },
  'pricingGroupIntro.claudeLiteSale': {
    en: 'Third-party Claude access that can stand in for official Max. A solid default for everyday coding.',
    zh: 'Claude 第三方渠道，可平替官方 Max，日常编码首选。',
    'zh-TW': 'Claude 第三方渠道，可平替官方 Max，日常編碼首選。',
    ja: '公式 Max の代替にもなるサードパーティの Claude 接続。日常のコーディング向けの定番です。',
    fr: 'Accès Claude tiers pouvant remplacer le Max officiel. Un choix fiable pour le code au quotidien.',
    ru: 'Сторонний доступ к Claude, способный заменить официальный Max. Надёжный выбор для повседневной разработки.',
    vi: 'Kênh Claude bên thứ ba, có thể thay thế Max chính hãng. Lựa chọn ổn cho lập trình hàng ngày.',
  },
  'pricingGroupIntro.claudePlusPremium': {
    en: 'Higher-quality third-party Claude access that can stand in for official Max. Switch here if the Sale group is unstable.',
    zh: 'Claude 更加优质的第三方渠道，可平替官方 Max，建议在 Sale 分组不稳定时切换使用。',
    'zh-TW':
      'Claude 更優質的第三方渠道，可平替官方 Max，建議在 Sale 分組不穩定時切換使用。',
    ja: 'より高品質なサードパーティの Claude 接続で、公式 Max の代替にもなります。Sale グループが不安定なときに切り替えてください。',
    fr: 'Accès Claude tiers de meilleure qualité, pouvant remplacer le Max officiel. Basculez ici si le groupe Sale est instable.',
    ru: 'Более качественный сторонний доступ к Claude, способный заменить официальный Max. Переключайтесь сюда, если группа Sale нестабильна.',
    vi: 'Kênh Claude bên thứ ba chất lượng cao hơn, có thể thay thế Max chính hãng. Nên chuyển sang khi nhóm Sale không ổn định.',
  },
  'pricingGroupIntro.claudeMaxCliOnly': {
    en: 'Official Claude Max at full capacity. Claude Code (CLI) only. Switch to the External group if you need Claude Desktop.',
    zh: 'Claude 官方 Max 满血版，仅限 Claude Code（CLI）使用；如需使用 Claude Desktop，需切换至外接分组。',
    'zh-TW':
      'Claude 官方 Max 滿血版，僅限 Claude Code（CLI）使用；如需使用 Claude Desktop，請切換至外接分組。',
    ja: '公式 Claude Max のフル性能版。Claude Code（CLI）専用。Claude Desktop を使う場合は外接グループに切り替えてください。',
    fr: 'Claude Max officiel à capacité complète. Réservé à Claude Code (CLI). Pour Claude Desktop, basculez vers le groupe External.',
    ru: 'Официальный Claude Max на полной мощности. Только Claude Code (CLI). Для Claude Desktop переключитесь на группу External.',
    vi: 'Claude Max chính hãng full. Chỉ dùng Claude Code (CLI). Cần Claude Desktop thì chuyển sang nhóm External.',
  },
  'pricingGroupIntro.claudeMaxExternal': {
    en: 'Official Claude Max at full capacity. Works with Claude Desktop and fits a wider range of workflows.',
    zh: 'Claude 官方 Max 满血版，可以在 Claude Desktop 使用，也能适配更多场景。',
    'zh-TW':
      'Claude 官方 Max 滿血版，可在 Claude Desktop 使用，也能適配更多場景。',
    ja: '公式 Claude Max のフル性能版。Claude Desktop で使え、より幅広い用途に対応します。',
    fr: 'Claude Max officiel à capacité complète. Compatible avec Claude Desktop et adapté à davantage de cas d’usage.',
    ru: 'Официальный Claude Max на полной мощности. Работает с Claude Desktop и подходит для большего числа сценариев.',
    vi: 'Claude Max chính hãng full. Dùng được trên Claude Desktop và phù hợp nhiều tình huống hơn.',
  },
  'pricingGroupIntro.codexProCodexOnly': {
    en: 'Full-price ChatGPT Pro account pool. For the Codex app and Codex CLI only—external clients are not supported.',
    zh: 'ChatGPT 正价 Pro 号池，仅限在 Codex APP 和 Codex CLI 上使用，不支持外接。',
    'zh-TW':
      'ChatGPT 正價 Pro 號池，僅限在 Codex APP 與 Codex CLI 上使用，不支援外接。',
    ja: '定価の ChatGPT Pro アカウントプール。Codex アプリおよび Codex CLI 専用で、外部接続は非対応です。',
    fr: 'Pool de comptes ChatGPT Pro au tarif officiel. Réservé à l’app Codex et au CLI Codex — les clients externes ne sont pas pris en charge.',
    ru: 'Пул аккаунтов ChatGPT Pro по полной цене. Только приложение Codex и Codex CLI — внешние клиенты не поддерживаются.',
    vi: 'Pool tài khoản ChatGPT Pro giá đầy đủ. Chỉ dùng trên app Codex và Codex CLI — không hỗ trợ client ngoài.',
  },
  'pricingGroupIntro.codexProExternal': {
    en: 'Full-price ChatGPT Pro account pool. Works in the Codex client, supports external scripts, and image generation.',
    zh: 'ChatGPT 正价 Pro 号池，不仅能在 Codex 客户端使用，支持外接脚本，支持生图。',
    'zh-TW':
      'ChatGPT 正價 Pro 號池，不僅能在 Codex 客戶端使用，支援外接腳本與生圖。',
    ja: '定価の ChatGPT Pro アカウントプール。Codex クライアントに加え、外部スクリプトや画像生成にも対応します。',
    fr: 'Pool de comptes ChatGPT Pro au tarif officiel. Utilisable dans le client Codex, avec scripts externes et génération d’images.',
    ru: 'Пул аккаунтов ChatGPT Pro по полной цене. Работает в клиенте Codex, поддерживает внешние скрипты и генерацию изображений.',
    vi: 'Pool tài khoản ChatGPT Pro giá đầy đủ. Dùng được trên client Codex, hỗ trợ script ngoài và tạo ảnh.',
  },
  'pricingGroupIntro.deepseek': {
    en: 'Full-capacity DeepSeek v4-pro with 1M context. Official API.',
    zh: 'DeepSeek 满血 v4-pro 模型，支持 1M 上下文。官方 API！',
    'zh-TW': 'DeepSeek 滿血 v4-pro 模型，支援 1M 上下文。官方 API！',
    ja: 'フル性能の DeepSeek v4-pro。1M コンテキスト対応。公式 API です。',
    fr: 'DeepSeek v4-pro à capacité complète, contexte 1M. API officielle.',
    ru: 'Полномощный DeepSeek v4-pro с контекстом 1M. Официальный API.',
    vi: 'DeepSeek v4-pro full, hỗ trợ ngữ cảnh 1M. API chính thức.',
  },
  'pricingGroupIntro.grokBeta': {
    en: 'Grok 4.5—fast, sharp, fewer limits; comparable to Opus 4.8. Great for coding. [Beta group may be unstable—not recommended for production.]',
    zh: 'Grok 4.5 速度快、智商高、限制少，完全媲美 Opus 4.8，推荐用于编码。【测试分组可能不稳定，不建议用于生产环境】',
    'zh-TW':
      'Grok 4.5 速度快、智商高、限制少，完全媲美 Opus 4.8，推薦用於編碼。【測試分組可能不穩定，不建議用於生產環境】',
    ja: 'Grok 4.5 は高速・高性能で制限が少なく、Opus 4.8 に匹敵。コーディング向け。【ベータのため不安定な場合があり、本番利用は非推奨】',
    fr: 'Grok 4.5 — rapide, performant, peu de limites ; comparable à Opus 4.8. Idéal pour le code. [Groupe bêta parfois instable — déconseillé en production.]',
    ru: 'Grok 4.5 — быстрый, сильный, меньше ограничений; сопоставим с Opus 4.8. Удобен для кода. [Бета-группа может быть нестабильной — не для продакшена.]',
    vi: 'Grok 4.5 — nhanh, mạnh, ít giới hạn; ngang tầm Opus 4.8. Rất hợp coding. [Nhóm beta có thể không ổn định — không khuyến nghị production.]',
  },
  'pricingGroupIntro.zhipu': {
    en: 'Full-capacity GLM-5.2 with 1M long context. Coding quality comparable to Opus 4.8 and GPT-5.5.',
    zh: '满血 GLM-5.2 支持 1M 长上下文！编程媲美 Opus 4.8 与 GPT-5.5。',
    'zh-TW': '滿血 GLM-5.2 支援 1M 長上下文！編程媲美 Opus 4.8 與 GPT-5.5。',
    ja: 'フル性能の GLM-5.2。1M 長コンテキスト対応。コーディングは Opus 4.8 や GPT-5.5 に匹敵。',
    fr: 'GLM-5.2 à capacité complète, long contexte 1M. Qualité de code comparable à Opus 4.8 et GPT-5.5.',
    ru: 'Полномощный GLM-5.2 с длинным контекстом 1M. Качество кода сопоставимо с Opus 4.8 и GPT-5.5.',
    vi: 'GLM-5.2 full, hỗ trợ ngữ cảnh dài 1M. Lập trình ngang tầm Opus 4.8 và GPT-5.5.',
  },
}

const locales = ['en', 'zh', 'zh-TW', 'ja', 'fr', 'ru', 'vi']

for (const loc of locales) {
  const file = path.join(localesDir, `${loc}.json`)
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const root =
    data.translation && typeof data.translation === 'object'
      ? data.translation
      : data
  for (const [k, byLoc] of Object.entries(keys)) {
    root[k] = byLoc[loc] ?? byLoc.en
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 4) + '\n', 'utf8')
  console.log('updated', path.basename(file))
}

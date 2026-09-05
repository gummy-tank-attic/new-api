# MetaRtr Upgrade Policy

This private deployment keeps a deliberately customized frontend. Upstream
updates must preserve the established MetaRtr frontend layout and visual
behavior unless the operator explicitly approves a layout change.

## Protected frontend contract

Before merging or deploying an upstream update, preserve and regression-check:

- page structure, navigation, header, footer, and responsive layout;
- custom homepage architecture in `web/src/features/home/`:
  - modular React sections (`hero.tsx`, `stats.tsx`, `features.tsx`, `how-it-works.tsx`, `cta.tsx`, and `hero-terminal-demo.tsx`);
  - client-side SWR caching in `home-content-cache.ts` (`localStorage` fast-boot + hash invalidation);
  - upstream New API/One API changes to root `/` or home routes must NEVER overwrite `web/src/features/home/`; merge conflicts must unconditionally keep MetaRtr (`ours`);
  - database `options.HomePageContent` is maintained empty so that dynamic client rendering is 100% driven by MetaRtr React code;
- pricing page grouping, ordering (including `VENDOR_MODEL_DISPLAY_ORDER` in `constants.ts` and intelligent version self-adaptation `getModelEffectiveScore` in `model-helpers.ts`), presentation, group descriptions, and i18n;
- pricing page title and subtitle contract: the subtitle under the main `h1` must strictly display the official upstream price & transparent ratio commitment (`t('Each model is quoted at the upstream official list price. Actual billing uses only your group ratio—with no hidden multipliers or extra fees.')`) instead of the upstream model count text (`This site currently has...`); the bottom duplicate text is removed to maintain a compact, clean layout;
- group pill single-line defensive sanitation: `formatGroupDisplayName` in `group-price-cards.tsx` must be preserved to prevent multi-line or bilingual newline inputs from expanding pill heights unevenly;
- Inter Variable typography system and antialiasing contract:
  - `@fontsource-variable/inter` package in `web/package.json` and `@import '@fontsource-variable/inter';` in `web/src/styles/index.css` must NEVER be removed;
  - `--font-sans` and `--font-inter` in `web/src/styles/theme.css` must remain Inter-first with complete CJK fallbacks (`'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Source Han Sans SC', sans-serif;`) to prevent Windows faux-bold rendering bugs;
  - `html` and `body` in `web/src/styles/index.css` must retain `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility;` to eliminate DirectWrite subpixel color fringing;
  - small-size typography in `supplier-price-table.tsx` (model names, prices, badges) must NOT have `tracking-tight` re-applied, and callout banner in `supplier-pricing-layout.tsx` must maintain `font-medium` (500) rather than heavy `font-bold` (700);
- 9-language i18n architecture and anti-contamination iron laws:
  - `web/src/i18n/locales/` contains all 9 audited locales (`zh`, `zh-TW`, `en`, `es`, `pt`, `ja`, `fr`, `ru`, `vi`); upstream merges must NEVER overwrite `web/src/i18n/` wholesale;
  - **MANDATORY AI-TRANSLATION (NO BATCH SCRIPTS)**: All audits and new translations must strictly be performed via neural LLM comprehension and reasoning. Automated batch translation scripts are strictly prohibited as they previously contaminated Chinese/English files with French strings;
  - **Zero contamination**: English and Chinese dictionaries must remain 100% free of French/other language leaks; Traditional Chinese (`zh-TW`) must remain 100% free of Simplified Chinese and strictly adhere to Taiwan local IT terminology (`快取`, `分組價格`, `官方價格`, `節省幅度`, `計價規則`, `介面`, `存取`, `停用`, `啟用`, `自訂`, `即時`, `備用版本`);
  - Minor/regional languages (`ja`, `fr`, `ru`, `vi`, `es`, `pt`) must maintain complete pricing, vendor, and protocol keys without falling back to raw English;
  - Backend multi-locale error guidance: `i18n/locales/{zh-CN,zh-TW,en}.yaml` must retain MetaRtr custom user guidance (e.g., `quota.insufficient` pointing users to `www.metartr.com → 控制台/Console` to recharge);
- custom pricing consumers of `getDynamicPricingTiers` must narrow
  `DynamicPricingTier` before reading token-price fields (for example,
  `'inputPrice' in tier` or a shared type guard), because task tiers expose a
  different price shape;
- production API origin (`https://api.metartr.com`) and the existing
  authentication/session flow;
- `skipAuthRefresh` 401 on public pages must **not** call `clearAuthentication`
  (that logs users out ~15 minutes after Access Token expiry);
- SID restore (`undefined → sid`) must use `applySessionQuerySync` /
  `invalidateQueries`, never `queryClient.clear()` (that leaves /pricing and
  /rankings on an infinite skeleton after logged-in Ctrl+F5);
- anonymous startup reads must remain CORS-simple: do not add global
  `Cache-Control` request headers or attach stale authorization to public APIs;
- the root route must not block first paint on `/api/setup`, notices, custom
  home content, or unused locale packs;
- above-the-fold content must not auto-cycle after paint and reset LCP;
- public asset and cache behavior needed by VPS nginx + CF orange-cloud.

Do not replace `web/` wholesale with an upstream directory. Bring backend and
security fixes forward selectively, then reapply MetaRtr frontend changes.

## Required release gate

1. Commit the candidate on its upgrade branch; production must never depend on
   an uncommitted working tree except during an incident hotfix, which must be
   committed immediately after recovery.
2. Run `npm run build:check`. Its startup policy and bundle budgets are release
   blockers, including the production-entry check for invalid undefined calls.
3. There is **no Pages preview**. Verify locally (`npm run build` + `npm run
   dev` against the protected contract on desktop and mobile) first. Specifically
   open `http://localhost:5173/` to visually inspect the custom MetaRtr homepage
   (Hero, Terminal Demo, Stats, Features, How-It-Works, CTA) before running
   `deploy-web.ps1`.
4. Deploy the accepted candidate with parent `scripts/deploy-web.ps1`.
5. Treat `NO_FCP`, an empty `#root`, console startup errors, or a mismatched
   entry asset as a failed release even when HTTP status is 200.
6. After deploy, confirm live `www` bundle hash; revert the `current` symlink
   if the operator rejects a visual change.

The snapshot branch is the rollback baseline for local source state. Before a
future upgrade, capture production VPS evidence using the parent project
`../docs/history/ONLINE_ALIGNMENT_CAPTURE.md` procedure.
The production branch is `production`; do not treat `main` as the live
frontend. After acceptance, merge the tested upgrade commit into `production`
and verify the live `www` bundle hash belongs to that commit.

## Branch hygiene and upstream alignment

- `production` is the authoritative MetaRtr release branch. Because GitHub uses
  `main` as the default branch, `origin/main` mirrors the accepted `production`
  commit for a clear repository landing page; deployment rules still refer to
  `production` explicitly.
- Use a short-lived `upgrade/<version>` branch while integrating upstream. After
  it is tested and merged, tag the accepted production commit and delete the
  completed upgrade branch.
- Keep named recovery and dated snapshot branches until their rollback window
  expires. They are baselines, not active development branches.
- "Aligned" has two separate meanings: Git/live alignment requires the live
  `www` bundle hash to match the `production` build; upstream alignment
  requires a deliberate merge of the reviewed upstream release. Never infer
  the latter merely because `git fetch` succeeded.

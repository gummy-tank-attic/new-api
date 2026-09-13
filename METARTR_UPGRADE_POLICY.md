# MetaRtr Upgrade Policy

## 核心架构总纲（Core Architectural Law）

> **「以官方原生为主，自制仅为补充」**
>
> 1. **官方原生为“主”（唯一真实源与计算内核）**：
>    - 官方原生定义的架构、数据模型（`billing_mode`、`billing_expr`、`billing_usage_schema`）、表达式 AST 解析器、分时判定、阶梯分档、单位折算与配额扣除逻辑，是系统唯一的权威源。
>    - 无论官方版本后续如何迭代升级，底层数据解析与计算一律直接调用官方引擎，坚决杜绝自建平行计算体系或脱节分支。
> 2. **自制代码为“辅”（仅作表现层补充与视觉包装）**：
>    - MetaRtr 自制代码的职责严格收敛为**表现层呈现**：供应商分类导航 Tab、聚合卡片视图、划线原价对比与折扣气泡、多规格参数面板等。
>    - 自制组件必须消费官方引擎输出的数据，**严禁对非空表达式私自硬编码业务单价、严禁绕过官方表达式自行推算**。仅允许对没有表达式的历史模型保留明确标注的展示兜底；一旦存在表达式但无法解析，必须显示不可用状态。

## 定价展示审计记录（2026-09-12）

本次审计与重构只涉及 MetaRtr 前端定价表现层，未修改 Go 后端扣费链路，也未修改官方表达式运行时。主页价格的职责是读取 `/api/pricing` 返回的数据并进行展示换算；实际预扣、结算和配额变更仍由 `relay/`、`service/`、`model/` 负责。

### 实际修改范围

- `web/src/features/pricing/lib/model-helpers.ts`：移除基于 13 个关键词子家族的模型排序分类器；已配置模型按供应商配置顺序，未配置模型按自然名称排序。
- `web/src/features/pricing/constants.ts`：折扣字典增加 `deepseek-v4` 基准项；查找改为精确匹配和确定性的分隔符前缀匹配。
- `web/src/features/pricing/lib/video-pricing.ts`：视频动态价格直接消费官方 AST；非空表达式不再补齐缺失分辨率，不再对无效表达式静默套用默认视频阶梯；空表达式仍保留历史展示兜底。
- Grok Imagine 视频表达式使用 `param("duration")` 时，前端必须从官方 AST 提取每秒配额系数并按 `1,000,000` 换算为美元；主页“起价”取 AST 返回阶梯中的最低 5 秒价格，不得回退到固定 `$0.400`。
- `web/src/features/pricing/lib/time-pricing.ts`：承载时间计价展示辅助逻辑，避免把普通展示辅助函数混在表格组件导出中。
- `web/src/features/pricing/components/`：表格、详情抽屉和 Bento 卡片在结构化价格不可解析时显示明确状态。
- `web/src/features/pricing/__tests__/`：迁移已删除组件的测试引用，并增加单分辨率不得虚构缺失阶梯的回归测试。
- `AGENTS.md`、本策略文件：补充官方计费引擎与 MetaRtr 展示层的边界说明。

### 展示与实际扣费边界

前端允许进行以下展示转换：用户组倍率、充值倍率、汇率、单位换算、原价划线和折扣标签。这些转换只产生 React 文本或卡片，不会写回模型配置，也不会调用扣费接口。系统设置中的“重置价格”属于另一条管理链路，调用 `POST /api/option/rest_model_ratio` 并整体恢复模型倍率，不能误认为主页展示逻辑。

### 已完成验证

- `npm exec -- vitest run src/features/pricing/__tests__ src/features/pricing/lib/__tests__`：10 个测试文件、240 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，生产构建和性能检查通过。
- 修改后的定价文件定向 `oxlint`：通过。
- `git diff --check`：通过。

仓库全量 lint 仍有其他历史文件报错；该基线问题与本次定价展示修改无关，不能表述为全仓库 lint 已清零。

### 后续维护边界

时间折扣和 Upscale 仍保留旧模型兼容识别逻辑。后续只有在官方 AST 提供等价结构化输出后，才允许移除这些兼容分支；不得为了“统一”而重新引入宽松正则或推测性价格。任何新增供应商价格优先修改后端官方表达式或配置数据，前端只增加对应展示适配和回归测试。

## 定价展示与顶栏品牌审计记录（2026-09-13）

本次审计针对 GPT Image 系列生图定价模型及公共页面品牌呈现进行深度优化与规范固化：
1. **GPT Image 规格单胶囊化与表格极简呈现**：
   - 官方 OpenAI GPT Image 2 / 2.5 具备纯按 Token 计费且原生支持任意自定义尺寸至 4K 的特性；
   - 前端在 `getModelSupportedResolutions` 中收敛为单一 `custom_4k`（“自定义至 4K”）天蓝高亮徽标，彻底消除了原先 4 档固定规格折行导致的卡片高度参差问题；
   - 矩阵定价表收敛为单行输出文生图与图生图 Token 价格，杜绝多行相同价格的重复冗余；
   - 图像卡片表格注脚固定为极简标准格式（`计费单位：/ 1M Tokens` 或 `计费单位：/ 张`），去除多余冗长说明文本。
2. **顶栏品牌保护契约（Protected Brand Contract）**：
   - `PublicHeader` 与 `AppHeader` 永久禁止挂载 `SystemUpdateAction` 或任何版本号胶囊徽标，顶栏仅保留 `[MR] MetaRtr` 纯净商业品牌标识，杜绝在顶栏暴露内部构建或版本信息；
   - 内部版本与更新检查统一收敛于管理设置（`UpdateCheckerSection`，路径 `/system-settings/operations/maintenance`）。
3. **Z.ai 与 Kimi / Moonshot 国际版官方基准定价与自动折扣计算契约（Official Pricing & Dynamic Savings Contract）**：
   - **国际定价锚定基准**：MetaRtr 面向出海与国际用户，智谱全系列模型与 Kimi/Moonshot 全系列模型的划线原价必须以各自国际版官方标准定价（USD，如 GLM-5.3 输入 $1.40 / 输出 $4.40，Kimi-K3 输入 $3.00 / 输出 $15.00，Kimi-K2.7/K2.6 输入 $0.95 / 输出 $4.00）为唯一基准，严禁采用国内 bigmodel.cn / moonshot.cn 人民币转美元等低标准原价；
   - **全自动动态推导体系**：通过 `web/src/features/pricing/lib/official-pricing.ts` 集中管理官方基准价，表格组件与分组卡片根据当前生效售价（`actualInputPrice`）自动计算折扣百分比（`Math.round((1 - actual / official) * 100)`）并在表格呈现原价划线与红底白字 `XX% OFF` 徽章，同时驱动分组卡片顶部展示当前分组最高折扣 `UP TO X% OFF`；
   - **免除手动换算负担**：管理员调整模型倍率售价时无需手动反算折扣或修改代码常数，前台自动计算并保持国际原价对齐；
   - **合并冲突与保护**：`web/src/features/pricing/lib/official-pricing.ts` 以及其在 `constants.ts`、`supplier-price-table.tsx`、`group-price-cards.tsx` 中的调用属于 MetaRtr 核心资产，上游升级或代码冲突时必须保留 ours，严禁被上游覆盖。

This private deployment keeps a deliberately customized frontend. Upstream
updates must preserve the established MetaRtr frontend layout and visual
behavior unless the operator explicitly approves a layout change.

## Protected frontend contract

Before merging or deploying an upstream update, preserve and regression-check:

- page structure, navigation, header, footer, and responsive layout;
- public header branding: strictly display only `[MR] MetaRtr` without `SystemUpdateAction` or version tags (`v1.0.0-*`); never leak internal build versions on the public header;
- public `/` is the pricing page (`web/src/routes/index.tsx` renders `Pricing`, shared `search-schema.ts`). Do not restore upstream Home as the root route. If upstream re-adds `web/src/features/home/`, leave it unwired;
- image pricing presentation: GPT Image series must maintain the single `custom_4k` resolution badge and 1-line token-based pricing matrix table; do not restore multi-line wrapping presets (`1024×1024`, `1536×1024`, `1024×1536`);
- international official benchmark pricing & dynamic savings: Z.ai & Kimi/Moonshot models must anchor their strikethrough baseline to official international USD prices (`web/src/features/pricing/lib/official-pricing.ts`). The frontend must dynamically calculate `% OFF` badges and strikethrough original prices from actual selling prices, never regressing to domestic RMB baselines or static hardcoded tables;
- on merge conflict, keep MetaRtr (`ours`) for:
  - `web/src/routes/index.tsx`
  - `web/src/routes/pricing/index.tsx`
  - `web/src/features/pricing/**` (including `lib/official-pricing.ts`, `constants.ts` `MANUAL_MODEL_SAVINGS_OFF` / `VENDOR_MODEL_DISPLAY_ORDER`, `billing-expr.ts` trailing peak/off-peak parse, `pricing-visual.css`, `supplier-price-table.tsx`, `video-model-grid.tsx`)
- operator-entered unit prices live in the DB (`billing_expr` / ratios) — a git merge never changes them. Display `% OFF` is dynamically computed against `official-pricing.ts` or fallback `MANUAL_MODEL_SAVINGS_OFF` in `constants.ts` — keep ours;
- `parseTiersFromExpr` must still return inner `tier()` unit prices when the expression has a trailing `* (… ? 1 : 0.5)` peak/off-peak scale; do not drop the expr and fall back to `model_ratio`;
- `web/src/features/pricing/pricing-visual.css` must keep the preview font stack (`Inter, Segoe UI, Microsoft YaHei` — **not** `Inter Variable`), Slate tokens (`#0F172A` / `#334155`), and `text-rendering: auto`; do not restore global Inter Variable or `optimizeLegibility` on the public pricing page;
- pricing page grouping, ordering (configured `VENDOR_MODEL_DISPLAY_ORDER` first, then natural model-name ordering for unlisted models), presentation, group descriptions, and i18n;
- for non-empty `billing_expr`, display only tiers returned by the official parser; do not fabricate missing resolution prices or silently replace an invalid expression with an unrelated model default;
- pricing page title and subtitle contract: the subtitle under the main `h1` must strictly display the official upstream price & transparent ratio commitment (`t('Each model is quoted at the upstream official list price. Actual billing uses only your group ratio—with no hidden multipliers or extra fees.')`) instead of the upstream model count text (`This site currently has...`); the bottom duplicate text is removed to maintain a compact, clean layout;
- group pill single-line defensive sanitation: `formatGroupDisplayName` in `group-price-cards.tsx` must be preserved to prevent multi-line or bilingual newline inputs from expanding pill heights unevenly;
- Inter Variable typography system and antialiasing contract:
  - `@fontsource-variable/inter` package in `web/package.json` and `@import '@fontsource-variable/inter';` in `web/src/styles/index.css` must NEVER be removed;
  - `--font-sans` and `--font-inter` in `web/src/styles/theme.css` must remain Inter-first with complete CJK fallbacks (`'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Source Han Sans SC', sans-serif;`) to prevent Windows faux-bold rendering bugs;
  - `html` and `body` in `web/src/styles/index.css` must retain `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility;` to eliminate DirectWrite subpixel color fringing;
  - small-size typography in `supplier-price-table.tsx` (model names, prices, badges) must NOT have `tracking-tight` re-applied, and callout banner in `supplier-pricing-layout.tsx` must maintain `font-medium` (500) rather than heavy `font-bold` (700);
- DeepSeek time-tiered pricing unified card and pure light-mode layout contract:
  - `supplier-price-table.tsx` must retain the single unified card container with integrated hairline row dividers (`divide-y divide-border/40`) for time-tiered models (`deepseek-v4-pro-0813`, `deepseek-v4-flash-0731`, `deepseek-v4-flash-vision-exp`); nested rectangular border boxes (`rounded-lg border bg-...`) inside model cards are strictly prohibited;
  - both Off-Peak (闲时) and Peak (忙时) rows must be displayed simultaneously side-by-side; adding global switchers or radio toggles that hide either tier is forbidden;
  - discount column contract: Off-Peak row must strictly render the savings badge (`50% OFF` baseline or group combination savings), and Peak row must render either group discount or a clean `—` dash, ensuring no blank layout holes;
  - table header units must strictly adhere to uppercase `/ 1M` (e.g. `t('pricing.inputPricePerMillion', '输入价格 / 1M')`);
  - model row copy action button on desktop must remain hidden by default (`sm:opacity-0 group-hover:opacity-100 transition-opacity duration-150`) to preserve clean typographic rhythm;
  - cards must use subtle micro-lighting (`hover:border-foreground/15 hover:bg-muted/30 hover:shadow-xs`) rather than mechanical jumping (`hover:-translate-y-0.5`);
  - vendor tabs must display directly without redundant view toggle switches above them; ByteDance vendor view defaults to its custom Bento video grid card layout;
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
   Also run the focused pricing suites and `npm run typecheck` when pricing
   files or billing-expression consumers change.
3. There is **no Pages preview**. Verify locally (`npm run build` + `npm run
   dev` against the protected contract on desktop and mobile) first. Specifically
   open `/` and confirm it is the MetaRtr **pricing** page (vendor pills, model
   prices), not the upstream Home/Hero landing, before running `deploy-web.ps1`.
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

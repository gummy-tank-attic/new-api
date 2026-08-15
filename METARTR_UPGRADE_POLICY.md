# MetaRtr Upgrade Policy

This private deployment keeps a deliberately customized frontend. Upstream
updates must preserve the established MetaRtr frontend layout and visual
behavior unless the operator explicitly approves a layout change.

## Protected frontend contract

Before merging or deploying an upstream update, preserve and regression-check:

- page structure, navigation, header, footer, and responsive layout;
- pricing page grouping, ordering, presentation, group descriptions, and i18n;
- production API origin (`https://api.metartr.com`) and the existing
  authentication/session flow;
- `skipAuthRefresh` 401 on public pages must **not** call `clearAuthentication`
  (that logs users out ~15 minutes after Access Token expiry);
- anonymous startup reads must remain CORS-simple: do not add global
  `Cache-Control` request headers or attach stale authorization to public APIs;
- the root route must not block first paint on `/api/setup`, notices, custom
  home content, or unused locale packs;
- above-the-fold content must not auto-cycle after paint and reset LCP;
- public asset and cache behavior needed by Cloudflare Pages.

Do not replace `web/` wholesale with an upstream directory. Bring backend and
security fixes forward selectively, then reapply MetaRtr frontend changes.

## Required release gate

1. Commit the candidate on its upgrade branch; production must never depend on
   an uncommitted working tree except during an incident hotfix, which must be
   committed immediately after recovery.
2. Run `npm run build:check`. Its startup policy and bundle budgets are release
   blockers, including the production-entry check for invalid undefined calls.
3. Deploy the candidate frontend to a Cloudflare Pages preview.
4. Compare the preview with production on desktop and mobile for the protected
   contract above.
5. Treat `NO_FCP`, an empty `#root`, console startup errors, or a mismatched
   entry asset as a failed release even when HTTP status and Pages alias checks
   pass.
6. Deploy production only after the operator accepts any intentional visual
   change.

The snapshot branch is the rollback baseline for local source state. Before a
future upgrade, capture production VPS evidence and Cloudflare Pages deployment
identifiers using the project-level
`docs/history/ONLINE_ALIGNMENT_CAPTURE.md` procedure.
The production branch is `production`; do not treat `main` or an arbitrary Pages
preview as the live frontend. After acceptance, merge the tested upgrade commit
into `production` and verify that the deployed entry asset belongs to that commit.

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
- "Aligned" has two separate meanings: Git/Pages alignment requires the live
  entry asset to match the `production` build; upstream alignment requires a
  deliberate merge of the reviewed upstream release. Never infer the latter
  merely because `git fetch` succeeded.

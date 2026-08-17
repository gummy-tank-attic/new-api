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
   dev` against the protected contract on desktop and mobile) first.
4. Deploy the accepted candidate with parent `scripts/deploy-web.ps1`.
5. Treat `NO_FCP`, an empty `#root`, console startup errors, or a mismatched
   entry asset as a failed release even when HTTP status is 200.
6. After deploy, confirm live `www` bundle hash; revert the `current` symlink
   if the operator rejects a visual change.

The snapshot branch is the rollback baseline for local source state. Before a
future upgrade, capture production VPS evidence using the project-level
`docs/history/ONLINE_ALIGNMENT_CAPTURE.md` procedure.
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

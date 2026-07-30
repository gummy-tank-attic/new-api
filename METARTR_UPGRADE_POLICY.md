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
- public asset and cache behavior needed by Cloudflare Pages.

Do not replace `web/` wholesale with an upstream directory. Bring backend and
security fixes forward selectively, then reapply MetaRtr frontend changes.

## Required release gate

1. Build the candidate frontend and deploy it to a Cloudflare Pages preview.
2. Compare the preview with production on desktop and mobile for the protected
   contract above.
3. Run frontend typecheck, targeted tests, and production build.
4. Deploy production only after the operator accepts any intentional visual
   change.

The snapshot branch is the rollback baseline for local source state. Production
VPS and Cloudflare deployment identifiers must be captured separately before a
future upgrade.

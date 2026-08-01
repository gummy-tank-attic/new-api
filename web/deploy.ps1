<#
.SYNOPSIS
Deprecated local deploy entrypoint for the MetaRtr frontend.

.DESCRIPTION
Frontend production deployment is handled by GitHub Actions.
This script intentionally fails fast to prevent accidental local Cloudflare Pages
deployments with stale or uncommitted code.

Correct flow:
  cd newapi源码
  git add .
  git commit -m "fix: your change"
  git push

The push triggers .github/workflows/deploy-pages.yml for main, production,
and metartr/* branches when files under web/** changed.
#>

$ErrorActionPreference = 'Stop'

throw @'
Local frontend deployment is disabled.

Use the GitHub Actions deployment flow documented in the project README:

  cd newapi源码
  git add .
  git commit -m "fix: your change"
  git push

Do not run deploy.ps1 or wrangler locally for production Pages deploys.
'@
<#
.SYNOPSIS
Deprecated entrypoint. Does not deploy.

.DESCRIPTION
Production frontend release is documented in the project-root README §7.2:

  Primary:  git push → GitHub Actions → Cloudflare Pages metartr-web
  Dual insurance (GHA blocked / wrong secrets only):
            python scratch/test_deploy_cf.py   # from project root newapi/

This script always fails so operators do not use a stale local shortcut.
#>

$ErrorActionPreference = 'Stop'

throw @'
web/deploy.ps1 is disabled.

Use the project-root docs (README §7.2 / docs/PRODUCTION_DEPLOY_STATE.md §7.4):

  Primary:
    cd newapi源码
    git push origin production

  Dual insurance only (Account 1 .env, when GHA cannot land on www):
    cd <project-root newapi>
    python scratch/test_deploy_cf.py

After any path: verify Cloudflare aliases include https://www.metartr.com
(do not trust Actions green alone).
'@

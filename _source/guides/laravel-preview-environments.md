---
title: Preview environments for every Laravel branch
description: Give every branch its own live URL with a database, workers and HTTPS, created on the first push and deleted with the branch, using GitHub Actions and a wildcard certificate.
category: laravel
order: 8
published: 2026-07-30
updated: 2026-11-23
howto: yes
keywords: laravel preview environments, review apps laravel, branch deployments laravel, pull request environments self-hosted
related:
  - cipi-yml-staging-production
  - laravel-ci-cd-git-workflow
  - anonymized-database-dumps
---
Reviewers click a link instead of pulling a branch. Each preview is a complete, isolated Cipi app at `feature-x-shop-3a1f9c2e.preview.example.com`, removed when the branch is deleted.

```flow
Push feature/x | any branch but main
CI computes a name | stable per branch
Create or deploy | cipi app create / deploy
Live URL | on the wildcard domain
Branch deleted | app deleted
```

## 1. One-time setup

| Step | How |
| --- | --- |
| Wildcard DNS | `A *.preview.example.com → server IP` |
| Wildcard certificate | DNS-01 with Cloudflare: see [wildcard domains](/docs/wildcard-domains) |
| Repository access | A read-only token so previews need no deploy key per app |
| CI secrets | `SERVER_HOST`, `SERVER_SSH_KEY`, `DEPLOY_WILDCARD_DOMAIN` |

## 2. The script and the workflow

The complete, copy-paste versions of `.cipi/preview.sh` and `.github/workflows/preview.yml` are in the [preview environments docs](/docs/preview-environments). The idea:

```bash
# up: create once, deploy every push
cipi app show "$APP" &>/dev/null || cipi app create --user="$APP" --domain="$DOMAIN" \
    --repository="$REPO" --branch="$BRANCH"
cipi deploy "$APP"
# down: when the branch is deleted
cipi app delete "$APP" --force
```

The app name is a short hash of branch and repository, so it's stable for the branch and never collides.

## 3. Make previews useful

| Add | How |
| --- | --- |
| Realistic data without personal data | Import an [anonymized dump](/guides/anonymized-database-dumps) after create |
| A login in front | `basic_auth` in `cipi-preview.yml`, with `--env=preview` on create |
| Fewer resources | One worker, no backups, in the same file |
| A link in the pull request | Post `https://$DOMAIN` as a PR comment from the workflow |

## 4. Clean up

The workflow's `delete` trigger removes the app. Check for leftovers now and then with `sudo cipi app list`.

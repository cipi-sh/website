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
docs:
  - preview-environments
  - wildcard-domains
  - create-app
  - api
faq:
  - Does each preview get its own database? | Yes. Each preview is a full Cipi app with its own user, database, worker and `.env`.
  - What data do previews start with? | Empty, migrated and seeded by your seeders. For realistic data, restore an [anonymized dump](/guides/anonymized-database-dumps), never production.
  - How many previews fit on a server? | Each idle app is light (a PHP pool, a worker, a small database). A 4 GB server comfortably runs a dozen small previews.
  - How do I keep previews private? | Turn on basic auth for them (`cipi basicauth enable`) or put them behind Cloudflare Zero Trust.
---
Reviewers click a link instead of pulling a branch. Each preview is a complete, isolated Cipi app at `feature-x-shop-3a1f9c2e.preview.example.com`, removed when the branch is deleted.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Preview environment** | A temporary copy of the app for one branch or pull request |
| **Wildcard certificate** | One HTTPS certificate for every `*.preview.example.com` |
| **Slug** | The branch name made safe for a domain and a Linux user: `feature/cart` → `pr-cart` |

```flow
Push feature/x | any branch but main
> A developer pushes any branch except `main`.
CI computes a name | stable per branch
> The workflow turns the branch name into a safe, stable app name.
Create or deploy | cipi app create / deploy
> First push creates the app; next pushes deploy it.
Live URL | on the wildcard domain
> The preview gets its own subdomain with HTTPS from the wildcard certificate.
Branch deleted | app deleted
> Deleting the branch deletes the app and its database.
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

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| App name refused | Names must be lowercase alphanumeric: sanitize the branch slug and keep it short |
| Preview has no HTTPS | Wildcard certificate missing: see [wildcard domains](/docs/wildcard-domains) |
| Leftover previews | `sudo cipi app list` and delete; check the workflow's delete trigger |
| Previews send real e-mails | Set `MAIL_MAILER=log` (or a sandbox) for previews |

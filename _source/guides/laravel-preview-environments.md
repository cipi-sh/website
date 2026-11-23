---
title: Preview environments for every Laravel pull request
description: Give every pull request its own live URL with a database, workers and HTTPS, created when it opens, updated on every push and deleted when it closes, with one script and GitHub Actions or GitLab review apps.
category: laravel
order: 8
published: 2026-07-30
updated: 2026-11-23
howto: yes
keywords: laravel preview environments, review apps laravel, branch deployments laravel, pull request environments self-hosted, gitlab review apps laravel, github pull request preview laravel
related:
  - preview-environments-for-teams
  - cipi-yml-staging-production
  - anonymized-database-dumps
docs:
  - preview-environments
  - cli-client
  - api
  - yml
  - zero-trust
faq:
  - Does each preview get its own database? | Yes. Each preview is a full Cipi app with its own Linux user, database, worker and `.env`, deleted with the preview.
  - What data do previews start with? | Empty, migrated and filled by your seeders. For realistic data, restore an [anonymized dump](/guides/anonymized-database-dumps), never production.
  - How many previews fit on a server? | Each idle preview is light: a PHP pool, a worker, a small database. A 4 GB server comfortably runs about a dozen small previews.
  - How do I keep previews private? | Cloudflare Zero Trust works with every setup. Basic auth works too, but it also blocks the Git webhook, so use `PREVIEW_MODE=deploy` with it.
  - Do I need a wildcard certificate? | No. Only the DNS record is a wildcard (`*.preview.example.com`); each preview gets its own Let's Encrypt certificate.
  - Why does the app name look like `pv3a1f9c2e4b`? | Cipi app names are Linux users: lowercase letters and digits only. The script builds a stable name from the repository and branch, and keeps the readable branch name in the address.
  - What if a step fails? | Read the troubleshooting table above first. Then check the [preview environments docs](/docs/preview-environments), open a GitHub issue, or ask in the community.
  - Can I run it from my laptop? | Yes: `.cipi/preview.sh up` on any branch creates its preview, `down` deletes it. It's the same script CI runs.
---
Reviewers click a link instead of pulling a branch. Each pull request gets a complete, isolated Cipi app at an address like `feature-cart-3a1f9c2e4b.preview.example.com`, updated on every push and removed when the pull request closes. This guide sets it up end to end; the reference with every recipe is in the [preview environments docs](/docs/preview-environments).

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Preview environment** | A temporary copy of the app for one branch or pull request |
| **Wildcard DNS** | One DNS record, `*.preview.example.com`, that sends every subdomain to the preview server |
| **App name** | The Linux user of the preview: `pv` + 10 characters computed from repository and branch |
| **Webhook mode** | Each preview has its own Git webhook, so pushes update it without CI |

```flow
Server | DNS, Git token, API
> Prepare a server for previews: a wildcard DNS record, a Git token and the Cipi API with a token for previews.
Script | .cipi/preview.sh
> Commit the script that creates, updates and deletes the preview of a branch.
Laptop | first preview by hand
> Run it once from your laptop to see it work.
CI | open and close
> Call it from GitHub Actions or GitLab when a pull request opens and closes.
Polish | data, privacy, cleanup
> Seed useful data, keep previews private, and sweep the ones nobody closed.
```

## Before you start {#before}

- A Laravel app on GitHub, GitLab or Bitbucket, already deployed with Cipi somewhere.
- [`cipi/agent`](/docs/agent-install) in the app, so each preview updates through its own webhook.
- A domain where you can add a DNS record.
- A Cipi server for previews: a small separate one is best (4 GB of RAM is a good start).

## 1. Prepare the preview server

On the preview server:

```bash
$ sudo cipi git github-token ghp_xxx                 # or gitlab-token, bitbucket-token…
$ sudo cipi php install 8.4                          # the PHP version of your app
$ sudo cipi api api.preview.example.com              # the API, with its own certificate
$ sudo cipi api token create --name=previews \
    --abilities=apps-view,apps-create,apps-delete,apps-env,apps-artisan,deploy-manage,ssl-manage,yml-manage \
    --expires=2027-12-31
```

At your DNS provider, add `A *.preview.example.com → preview server IP` (and an `A` record for `api.preview.example.com` before running `cipi api`).

| Why each piece | |
| --- | --- |
| Git token | Cipi adds a read-only deploy key and a webhook for each preview, and removes them when the preview is deleted |
| API + token | The script and CI talk to the server over HTTPS with a token that can only manage apps, deploys and certificates |
| Separate server | Reviews never slow production, and the token can't touch production apps |

## 2. Add the script to the repository

Copy [`.cipi/preview.sh`](/docs/preview-environments#script) from the docs into your repository and make it executable:

```bash
$ mkdir -p .cipi && $EDITOR .cipi/preview.sh      # paste the script
$ chmod +x .cipi/preview.sh
$ git add .cipi/preview.sh && git commit -m "Preview environments" && git push
```

What it does, in one table:

| Command | First time | Next times |
| --- | --- | --- |
| `up` | Creates the app on the branch (label `preview`), sets `MAIL_MAILER=log`, issues the certificate, turns on `cipi-preview.yml`, deploys, seeds | Nothing in webhook mode (the webhook deploys); deploys with `PREVIEW_MODE=deploy` |
| `down` | Deletes the app, its database, certificate, deploy key and webhook | Says there's nothing to delete |
| `url` | Prints the address | Same |

## 3. Create the first preview from your laptop

```bash
$ cipi-cli profiles add preview --endpoint https://api.preview.example.com --token "1|…"
$ git switch -c feature/cart && git push -u origin feature/cart
$ PREVIEW_DOMAIN=preview.example.com .cipi/preview.sh up
…
https://feature-cart-3a1f9c2e4b.preview.example.com
```

Open the address: the app is there, with HTTPS and seeded data. Push a commit to `feature/cart`, wait a minute, reload: the change is live. Then delete it:

```bash
$ PREVIEW_DOMAIN=preview.example.com .cipi/preview.sh down
```

## 4. Automate it in CI

**GitHub:** add the two secrets `CIPI_PREVIEW_API_URL` and `CIPI_PREVIEW_API_TOKEN`, then copy the [GitHub Actions recipe](/docs/preview-environments#github) to `.github/workflows/preview.yml`. Each pull request shows a **View deployment** button; closing or merging it deletes the preview.

**GitLab:** add the same two CI/CD variables (masked), then copy the [GitLab recipe](/docs/preview-environments#gitlab). Merge requests show the review app link and a **Stop** button; deleting the branch stops it too.

**Bitbucket, Gitea, Forgejo, Jenkins:** see the [other recipes](/docs/preview-environments#recipes).

Pull requests from forks don't get previews in these recipes: they don't receive your secrets, and code from outside your team shouldn't run on your server.

## 5. Make previews worth opening

| Add | How |
| --- | --- |
| Lighter previews | A `cipi-preview.yml` with one worker and no scheduler ([example](/docs/preview-environments#yml)) |
| Realistic data without personal data | An [anonymized dump](/guides/anonymized-database-dumps), restored with `sudo cipi db restore pv… dump.sql.gz` |
| A login in front | [Cloudflare Zero Trust](/docs/zero-trust) (keeps the webhook working), or basic auth with `PREVIEW_MODE=deploy` |
| No side effects | Sandbox keys for payments and webhooks, set once with `cipi-cli preview apps env set` |
| End-to-end tests | Point Playwright or Cypress at the preview URL in a CI job after `up` ([how](/guides/preview-environments-for-teams#e2e)) |

## 6. Clean up what nobody closed

Branches get deleted without a pull request, and some CIs have no "closed" event. Schedule [`.cipi/preview-cleanup.sh`](/docs/preview-environments#cleanup) nightly: it deletes every preview of this repository whose branch no longer exists, and nothing else.

```yaml
# .github/workflows/preview-cleanup.yml (GitHub example)
on:
  schedule: [{ cron: "30 3 * * *" }]
jobs:
  cleanup:
    runs-on: ubuntu-latest
    env:
      PREVIEW_REPOSITORY: git@github.com:${{ github.repository }}.git
    steps:
      - uses: actions/checkout@v4
      - run: |
          base=https://github.com/cipi-sh/cli/releases/latest/download
          curl -fsSLO "$base/cipi-cli-linux-amd64" && curl -fsSLO "$base/checksums.txt"
          sha256sum --check --ignore-missing checksums.txt
          sudo install -m 0755 cipi-cli-linux-amd64 /usr/local/bin/cipi-cli
          cipi-cli profiles add preview --endpoint "${{ secrets.CIPI_PREVIEW_API_URL }}" --token "${{ secrets.CIPI_PREVIEW_API_TOKEN }}"
          .cipi/preview-cleanup.sh
```

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `Invalid username` | Don't build names by hand: the script makes `pv` + 10 lowercase hex characters |
| Preview doesn't update on push | The app has no `cipi/agent`, or basic auth is on: add the agent, or set `PREVIEW_MODE=deploy` |
| No HTTPS | Wildcard DNS missing (`dig +short test.preview.example.com`), or the Let's Encrypt weekly limit: use a separate domain for previews |
| "Could not add the webhook" | GitHub allows 20 push webhooks per repository: close stale pull requests, or use `PREVIEW_MODE=deploy` |
| `403` from the API | The token lacks an ability: recreate it with the list in step 1 |
| Previews send real e-mails | The script sets `MAIL_MAILER=log`; check that your app doesn't override it in config |
| Leftover previews | Run `.cipi/preview-cleanup.sh`, or list them with `cipi-cli preview apps list` |

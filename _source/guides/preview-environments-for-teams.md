---
title: What preview environments can do for your team
description: Why a live URL for every pull request changes how Laravel teams review, test, demo and ship, with ten concrete uses, an end-to-end testing recipe and the rules that keep previews cheap and safe on your own servers.
category: laravel
order: 20
published: 2026-11-23
updated: 2026-11-23
howto: no
keywords: preview environments benefits, review apps workflow, pull request previews laravel, ephemeral environments self-hosted, staging bottleneck, laravel e2e tests preview url
related:
  - laravel-preview-environments
  - agent-vs-pipeline-deploys
  - anonymized-database-dumps
docs:
  - preview-environments
  - yml
  - zero-trust
  - anonymizer
  - api
faq:
  - Do previews replace staging? | For reviewing single changes, yes. Many teams keep one staging app too, for testing several merged changes together before a release.
  - How much do previews cost? | They run on a server you already pay for. Each idle preview is a PHP pool, a worker and a small database; a 4 GB server holds about a dozen. There is no charge per environment.
  - Can non-developers use them? | That's the point: product managers, designers, clients and support open a link. They never need Git, Docker or a local setup.
  - Are previews safe to share with clients? | Put them behind Cloudflare Zero Trust or basic auth, use seeded or anonymized data, and sandbox keys for anything with side effects. Never copy production data into a preview.
  - Can a preview use a different PHP version? | Yes. `PREVIEW_PHP=8.5 .cipi/preview.sh up` creates that branch's preview on PHP 8.5, as long as the preview server has it installed.
  - What happens to previews nobody closes? | The nightly cleanup script deletes previews whose branch no longer exists. Open pull requests keep theirs.
  - Can I run end-to-end tests against previews? | Yes: the recipe in this guide waits for the preview to finish deploying, then runs Playwright or Cypress against its URL.
  - Where do I start? | Follow [Preview environments for every Laravel pull request](/guides/laravel-preview-environments): one script, one CI file, about 30 minutes.
---
Without previews, a change lives on one developer's laptop until it's merged. Everyone else reviews a diff, imagines the result, and finds out what it really does on staging, where three other changes are already waiting. A preview environment fixes that: **every pull request gets a real, running copy of the app at its own address**, created when the pull request opens and gone when it closes.

With Cipi a preview is just another isolated app on a server you own, so you get the idea without a platform bill per environment. Setup is in the [how-to guide](/guides/laravel-preview-environments); this one is about what to do with them.

## In 30 seconds {#tldr}

| Before | With previews |
| --- | --- |
| Review the diff, imagine the result | Click the link, use the feature |
| One shared staging, changes queue up and overwrite each other | One environment per pull request, nobody waits |
| "Works on my machine" | Works on a server built exactly like production |
| Client feedback after release | Client approval before merge |
| Migrations tried for the first time in production | Migrations run on every push, on their own database |

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Preview** | A temporary, complete copy of the app for one branch |
| **Ephemeral** | It lives as long as the pull request, then it's deleted with its data |
| **Staging** | One shared, long-lived environment where merged changes meet |
| **E2E test** | A test that drives a real browser against a real URL |

## Who gains what {#who}

| Person | What changes for them |
| --- | --- |
| Developer | Shares a link instead of screenshots; sees the branch on production-like PHP, Nginx and database |
| Reviewer | Tests the behaviour, not only the code |
| Product manager, designer | Approves the real thing before it's merged |
| QA | Tests each change alone, with its own data, without stepping on others |
| Client (agencies) | Signs off on a URL, not on a call |
| Support, sales | Gets a working demo of an upcoming feature |
| Ops | Sees every branch deploy with the same pipeline as production, long before release day |

## Ten things teams do with previews {#uses}

### 1. Review the change, not the diff {#review}

The pull request shows a **View deployment** button (GitHub) or a review app link (GitLab). The reviewer clicks it, tries the new checkout flow, and comments on what it does. Bugs that are invisible in a diff (a broken redirect, a slow page, a missing translation) show up in seconds.

### 2. Sign-off from product and design {#signoff}

Paste the preview link in the ticket. The product manager checks the flow, the designer checks spacing and states, both approve in the pull request. Nothing reaches `main` that the owner of the feature hasn't seen.

### 3. Client approval, for agencies {#clients}

Send the client a link that's protected with a login ([Cloudflare Zero Trust](/docs/zero-trust), or basic auth). They see their feature on a real server, with their content seeded, and approve before you merge. No more "it's on staging, but ignore the other things you see".

### 4. QA without collisions {#qa}

On a shared staging, one tester's data resets another's test. Each preview has **its own database**, seeded the same way every time, so a tester can break things freely. When the pull request closes, the data goes with it.

### 5. Try migrations before production does {#migrations}

Every push runs the branch's migrations on the preview's database. A migration that fails, locks a table or loses a column fails there first. With an [anonymized dump](/guides/anonymized-database-dumps) restored into the preview, you test against data shaped like production's, without anyone's personal data.

### 6. End-to-end tests against a real URL {#e2e}

Run Playwright or Cypress against the preview instead of a test server you maintain. The preview deploys through its own webhook, so the job first waits for the deploy of the latest push to finish:

```bash
#!/usr/bin/env bash
# .cipi/preview-wait.sh <app>: wait until the latest push is deployed on the preview
set -euo pipefail
APP=${1:?app name, from .cipi/preview.sh name}
H="Authorization: Bearer ${CIPI_PREVIEW_API_TOKEN:?}"
sleep 75                                    # the webhook queues the deploy; it starts within a minute
for i in $(seq 1 60); do
  s=$(curl -fsS "${CIPI_PREVIEW_API_URL:?}/api/apps/$APP/deploy/status" -H "$H" -H "Accept: application/json")
  if [ "$(jq -r .data.state <<<"$s")" = idle ] && [ "$(jq -r .data.queued <<<"$s")" = false ]; then
    result=$(jq -r '.data.last.result // "" | ascii_downcase' <<<"$s")
    [ "$result" = ok ] && exit 0
    echo "Last deploy: ${result:-none}"; exit 1
  fi
  sleep 10
done
echo "Timed out waiting for the preview deploy"; exit 1
```

```yaml
# in .github/workflows/preview.yml, after the "up" job
  e2e:
    needs: up
    runs-on: ubuntu-latest
    env:
      PREVIEW_DOMAIN: preview.example.com
      PREVIEW_REPOSITORY: git@github.com:${{ github.repository }}.git
      CIPI_PREVIEW_API_URL: ${{ secrets.CIPI_PREVIEW_API_URL }}
      CIPI_PREVIEW_API_TOKEN: ${{ secrets.CIPI_PREVIEW_API_TOKEN }}
      BRANCH: ${{ github.head_ref }}
    steps:
      - uses: actions/checkout@v4
      - run: .cipi/preview-wait.sh "$(.cipi/preview.sh name "$BRANCH")"
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npx playwright install --with-deps
      - run: BASE_URL="$(.cipi/preview.sh url "$BRANCH")" npx playwright test
```

Your Playwright config reads `process.env.BASE_URL` as `use.baseURL`. The tests hit the same Nginx, PHP and database setup as production, which catches what unit tests can't: assets, caching headers, queues, redirects.

### 7. Upgrades on their own branch {#upgrades}

Testing Laravel's next major version or a new PHP release? Open a branch and give its preview a different PHP version:

```bash
$ PREVIEW_PHP=8.5 PREVIEW_DOMAIN=preview.example.com .cipi/preview.sh up upgrade/php-8.5
```

The preview server needs that PHP installed (`sudo cipi php install 8.5`). Production stays on its version until you merge and change it there.

### 8. Demos that don't break {#demos}

Sales wants to show a feature that isn't released yet. A `demo/new-dashboard` branch with its own preview and its own seeded data is a stable demo that nobody's merge will break. Delete the branch when the demo is over; the nightly cleanup removes the preview.

### 9. Hotfixes checked in minutes {#hotfix}

A production bug, a one-line fix, a pull request: the preview is up before the reviewer opens the diff. Reproduce the bug there, confirm the fix, merge with confidence.

### 10. Onboarding {#onboarding}

A new developer's first pull request comes with a live link, and they can see their change running before their local setup is perfect. Reviewing others' previews is also the fastest way to learn the app.

## Previews or a shared staging? {#staging}

| | Shared staging | Previews |
| --- | --- | --- |
| Environments | One | One per pull request |
| Waiting | Changes queue up | Nobody waits |
| Data | Shared, drifts over time | Fresh per preview, seeded the same way |
| What it tests | Several changes together | One change alone |
| Lifetime | Permanent | As long as the pull request |
| Best for | Release candidates, integrations | Reviews, sign-off, QA, E2E |

Most teams keep both: previews for every pull request, and one [staging app](/guides/cipi-yml-staging-production) that follows `develop` for the release as a whole.

## Rules that keep previews healthy {#rules}

| Rule | Why | How |
| --- | --- | --- |
| A separate server | Reviews never slow production; the preview token can't touch production apps | One small VPS is enough to start |
| No production data | A preview is easier to reach than production | Seeders, or [anonymized dumps](/guides/anonymized-database-dumps) |
| No side effects | A preview must never e-mail customers or charge cards | `MAIL_MAILER=log` (the script sets it), sandbox keys |
| Private by default | Unguessable addresses are still findable | [Cloudflare Zero Trust](/docs/zero-trust), or basic auth |
| Light by default | Dozens of previews add up | A `cipi-preview.yml` with one worker and no scheduler |
| Clean up | Forgotten previews fill the server | Delete on close, plus the [nightly cleanup](/docs/preview-environments#cleanup) |
| No forks | Code from outside the team shouldn't run on your server | The recipes skip pull requests from forks |
| A separate domain | Let's Encrypt allows 50 new certificates per registered domain per week | `acme-preview.dev` for previews, `acme.com` for production |

## Rolling previews out in a team {#rollout}

```flow
Week 1 | one developer, by hand
> Set up the preview server and run `.cipi/preview.sh up` from a laptop for a couple of branches. Check memory, seeders and e-mail settings.
Week 2 | CI on one repository
> Add the GitHub or GitLab recipe to one repository. Every pull request gets a link; closing it deletes the preview.
Week 3 | reviews use the link
> Agree that reviews start from the preview link, and that product sign-off happens there.
Week 4 | E2E and cleanup
> Add the end-to-end job and the nightly cleanup. Watch the server's memory as the number of open pull requests grows.
```

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| E2E tests run against old code | Use `.cipi/preview-wait.sh` before the tests; it waits for the latest deploy to finish |
| Reviewers see stale data | The seeders run once, when the preview is created: `.cipi/preview.sh down` and `up` to start fresh |
| Server runs out of memory | Lighter `cipi-preview.yml`, close stale pull requests, or a bigger preview server |
| Client sees a login error | Zero Trust: add their e-mail to the access policy; basic auth: send them the user and password |
| A preview has no link in the pull request | Pull requests from forks are skipped on purpose |

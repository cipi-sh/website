@section preview-environments

A preview environment is a **live copy of your app for one branch**: its own URL with HTTPS, its own database, its own workers. You open a pull request, a link appears; you push again, the preview updates; you merge or close it, the preview disappears with its data.

For Cipi, a preview is simply **one more app on a server**, created and deleted by a short script. No special mode, no container platform: the same isolation, deploys and rollback as production.

```flow
Prepare a server | DNS, Git token, API | #setup
> One time: a server for previews, a wildcard DNS record, a Git token and an API token.
Add the script | .cipi/preview.sh | #script
> Commit one script to the repository. It creates, updates and deletes the preview of a branch.
Try it locally | from your laptop | #local
> Run it once from your laptop to see a preview come up.
Automate | GitHub, GitLab, Bitbucket… | #recipes
> Call the same script from your CI when a pull request opens and closes.
Clean up | merged and deleted branches | #cleanup
> Previews of closed pull requests are deleted; a nightly sweep removes the ones nobody closed.
```

## How a preview works {#how}

```flow
Pull request opened | or the script run by hand
> A developer opens a pull request for `feature/cart`. CI runs `.cipi/preview.sh up feature/cart`.
Name it | stable per branch
> The script turns the branch into a stable app name (`pv3a1f9c2e4b`) and a readable address (`feature-cart-3a1f9c2e4b.preview.example.com`). Same branch, same names, every time.
Create | app, database, HTTPS, first deploy
> If the preview doesn't exist yet: `cipi app create` on that branch, a Let's Encrypt certificate, the first deploy, the database seeders.
Update | every push to the branch
> Every later push deploys the preview again, with the usual zero-downtime deploy, usually through the preview's own webhook.
Delete | when the pull request closes
> `.cipi/preview.sh down feature/cart` deletes the app: Linux user, files, database, certificate, and the deploy key and webhook in the repository.
```

Each preview is a complete, isolated Cipi app:

| Every preview gets | Like production? |
| --- | --- |
| Its own Linux user, PHP-FPM pool and files | Yes: one preview can't read another |
| Its own database (MariaDB or PostgreSQL) and Valkey | Yes: empty, then migrated and seeded |
| HTTPS with its own Let's Encrypt certificate | Yes |
| Queue workers and the scheduler | Yes, adjustable with `cipi-preview.yml` |
| Zero-downtime deploys, rollback, logs, audit | Yes |
| Backups | No, unless you add them |

## How a preview gets updated {#modes}

After the first deploy, new pushes to the branch must reach the preview. There are two ways, the same two as for [any deploy](/docs/how-deploys-work):

| | Webhook (default) | Deploy from the script |
| --- | --- | --- |
| How | Cipi gives each preview its own webhook; a push to the branch deploys it within a minute | CI runs the script on every push, and the script deploys |
| Use it when | The app has [`cipi/agent`](/docs/agent-install) (Laravel), or it's a Node app | The app has no agent, or the preview is behind basic auth |
| CI work per push | None | One deploy step |
| Set with | `PREVIEW_MODE=webhook` | `PREVIEW_MODE=deploy` |

> [!warning] **Basic auth blocks the webhook.** A preview protected with a password answers `401` to the Git provider too, so the webhook can't deploy it. For password-protected previews use `PREVIEW_MODE=deploy`. To keep previews private without that limit, put them behind [Cloudflare Zero Trust](/docs/zero-trust), which lets `/cipi/webhook` through.

## 1. One-time setup {#setup}

| What | How | Why |
| --- | --- | --- |
| A server for previews | A separate Cipi server is best ([install](/docs/installation)) | Previews use RAM and CPU, and the token that creates and deletes them shouldn't be able to touch production |
| Wildcard DNS | `A *.preview.example.com → preview server IP` | Every preview gets a subdomain without touching DNS again |
| A Git token on the server | `cipi git github-token …` (or GitLab, Bitbucket, Azure) | Cipi adds a read-only deploy key and the webhook for each preview, and removes them on delete. See [Git providers](/docs/git) |
| The API | `cipi api api.preview.example.com` | The script talks to the server through the API, not SSH |
| A token for previews | See below | Only what previews need |
| PHP | `cipi php install 8.4` (the version your app uses) | Previews are created with it |

```bash
# on the preview server
$ cipi api token create --name=previews \
    --abilities=apps-view,apps-create,apps-delete,apps-env,apps-artisan,deploy-manage,ssl-manage,yml-manage \
    --expires=2027-12-31
```

Save the token as `CIPI_PREVIEW_API_TOKEN` and the API address as `CIPI_PREVIEW_API_URL` in your CI. The token can create and delete apps on that server: one more reason to keep previews away from production.

> [!note] Using the production server for previews works too. Then remember that `apps-delete` covers production apps as well: the script below only ever deletes the `pv…` names it computes, but the token itself could delete anything.

## 2. The script {#script}

Commit this as `.cipi/preview.sh` and make it executable (`chmod +x .cipi/preview.sh`). It runs on your laptop or in CI, needs [`cipi-cli`](/docs/cli-client) and `git`, and talks to the preview server through the API.

```bash
#!/usr/bin/env bash
# .cipi/preview.sh: create, update or delete the preview of one branch.
#   .cipi/preview.sh up   [branch]    create it, or update it (PREVIEW_MODE=deploy)
#   .cipi/preview.sh down [branch]    delete it with its database
#   .cipi/preview.sh url  [branch]    print its address
#   .cipi/preview.sh name [branch]    print its app name (pv…)
# Settings (environment variables):
#   PREVIEW_DOMAIN      required, e.g. preview.example.com
#   PREVIEW_REPOSITORY  SSH clone URL; default: the "origin" remote
#   PREVIEW_PHP         default 8.4
#   PREVIEW_MODE        webhook (default) or deploy
#   CIPI_PROFILE        cipi-cli profile of the preview server; default "preview"
set -euo pipefail

ACTION=${1:-up}
BRANCH=${2:-$(git rev-parse --abbrev-ref HEAD)}
BASE=${PREVIEW_DOMAIN:?Set PREVIEW_DOMAIN, e.g. preview.example.com}
PHP=${PREVIEW_PHP:-8.4}
MODE=${PREVIEW_MODE:-webhook}
PROFILE=${CIPI_PROFILE:-preview}

# Cipi needs an SSH clone URL: turn https://host/owner/repo into git@host:owner/repo.git
to_ssh() {
  case "$1" in
    https://*) local u=${1#https://}; u=${u#*@}; u=${u%.git}; printf 'git@%s:%s.git' "${u%%/*}" "${u#*/}" ;;
    *) printf '%s' "$1" ;;
  esac
}
REPO=$(to_ssh "${PREVIEW_REPOSITORY:-$(git remote get-url origin)}")

# Stable names: the same repository and branch always give the same app and address.
sha1() { if command -v sha1sum >/dev/null; then sha1sum; else shasum -a 1; fi; }
ID=$(printf '%s#%s' "$REPO" "$BRANCH" | sha1 | cut -c1-10)
SLUG=$(printf '%s' "$BRANCH" | tr 'A-Z' 'a-z' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-40 | sed -E 's/-+$//')
APP="pv${ID}"                                  # Linux user: lowercase letters and digits only
DOMAIN="${SLUG:+$SLUG-}${ID}.${BASE}"

cli() { cipi-cli "$PROFILE" "$@"; }
exists() { cli apps show "$APP" >/dev/null 2>&1; }

case "$ACTION" in
  url)
    echo "https://${DOMAIN}"
    ;;
  name)
    echo "$APP"
    ;;
  up)
    if exists; then
      if [ "$MODE" = deploy ]; then
        cli deploy "$APP"
      else
        echo "Preview ${APP} exists: its webhook deploys every push to ${BRANCH}."
      fi
    else
      cli apps create --user "$APP" --domain "$DOMAIN" --php "$PHP" \
        --repository "$REPO" --branch "$BRANCH" --env preview >/dev/null   # keeps the DB password out of CI logs; errors still show
      cli apps env set "$APP" --set MAIL_MAILER=log    # previews never e-mail real people
      cli ssl install "$APP"
      cli yml auto "$APP" on -y                        # applies cipi-preview.yml, if the repo has one
      cli deploy "$APP"
      cli apps artisan "$APP" -- db:seed --force || echo "Seeding skipped"
    fi
    echo "https://${DOMAIN}"
    ;;
  down)
    if exists; then
      cli apps delete "$APP" -y
    else
      echo "No preview for ${BRANCH}."
    fi
    ;;
  *)
    echo "Usage: $0 up|down|url|name [branch]" >&2
    exit 2
    ;;
esac
```

What it computes, for the branch `feature/Cart-v2` of `git@github.com:acme/shop.git`:

| Value | Example | Rule |
| --- | --- | --- |
| `ID` | `3a1f9c2e4b` | First 10 characters of the SHA-1 of repository + branch: stable, and unique across repositories |
| `APP` | `pv3a1f9c2e4b` | Cipi app names are lowercase letters and digits, 3 to 32 characters, starting with a letter |
| `DOMAIN` | `feature-cart-v2-3a1f9c2e4b.preview.example.com` | Readable slug (max 40 characters) + the ID, so two branches never collide |

The last line the script prints is always the preview URL, so CI can read it with `tail -1`.

### Without the API: over SSH {#ssh}

If the preview server has no API, the same steps run over SSH as the `cipi` user, who may run `sudo cipi …` without a password. Set `PREVIEW_HOST`, give CI an SSH key for the `cipi` user ([how](/docs/ci-pipelines#ssh-key)), and swap each API call of the script for its SSH twin:

```bash
srv() { ssh cipi@"$PREVIEW_HOST" sudo cipi "$@"; }
exists() { srv app show "$APP" >/dev/null 2>&1; }
```

| In the script | Over SSH |
| --- | --- |
| `cli apps create --user "$APP" …` | `srv app create --user="$APP" --domain="$DOMAIN" --php="$PHP" --repository="$REPO" --branch="$BRANCH" --env=preview` |
| `cli apps env set "$APP" --set MAIL_MAILER=log` | `srv app env "$APP" --set=MAIL_MAILER=log` |
| `cli ssl install "$APP"` | `srv ssl install "$APP"` |
| `cli yml auto "$APP" on -y` | `srv yml auto "$APP" on` |
| `cli deploy "$APP"` | `srv deploy "$APP"` |
| `cli apps artisan "$APP" -- db:seed --force` | `srv app artisan "$APP" db:seed --force` |
| `cli apps delete "$APP" -y` | `srv app delete "$APP" --force` |

The API version gives CI less power (a token limited to what previews need, instead of a key that can run any `cipi` command): prefer it.

## 3. Try it from your laptop {#local}

```bash
# once: install cipi-cli and add the preview server as a profile
$ cipi-cli profiles add preview --endpoint https://api.preview.example.com --token "1|…"

# on any branch of your project
$ export PREVIEW_DOMAIN=preview.example.com
$ .cipi/preview.sh up
Creating app 'pv3a1f9c2e4b'...
…
https://feature-cart-3a1f9c2e4b.preview.example.com

$ .cipi/preview.sh url feature/cart      # the address of any branch
$ .cipi/preview.sh down                  # delete the preview of the current branch
```

Handy for a demo branch you want to show a client today, without any CI.

## 4. Recipes {#recipes}

| Tool | Creates on | Deletes on |
| --- | --- | --- |
| [GitHub Actions](#github) | Pull request opened or reopened | Pull request closed or merged |
| [GitLab CI/CD](#gitlab) | Push to any branch except the default one | Branch deleted, merge, or the **Stop** button |
| [Bitbucket Pipelines](#bitbucket) | Pull request created or updated | The nightly [cleanup](#cleanup) or a manual pipeline |
| [Gitea and Forgejo Actions](#gitea) | Pull request opened | Pull request closed |
| [Jenkins](#jenkins) | Build of a pull request (change request) | The nightly [cleanup](#cleanup) |
| Any other CI | A job running `.cipi/preview.sh up` | The nightly [cleanup](#cleanup) |

All recipes install cipi-cli the same way:

```bash
base=https://github.com/cipi-sh/cli/releases/latest/download
curl -fsSLO "$base/cipi-cli-linux-amd64" && curl -fsSLO "$base/checksums.txt"
sha256sum --check --ignore-missing checksums.txt
sudo install -m 0755 cipi-cli-linux-amd64 /usr/local/bin/cipi-cli    # without sudo in root containers
cipi-cli profiles add preview --endpoint "$CIPI_PREVIEW_API_URL" --token "$CIPI_PREVIEW_API_TOKEN"
```

### GitHub Actions {#github}

The preview link appears in the pull request as a **View deployment** button.

```yaml
# .github/workflows/preview.yml
name: Preview
on:
  pull_request:
    types: [opened, reopened, synchronize, closed]

concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: false

env:
  PREVIEW_DOMAIN: preview.example.com
  PREVIEW_REPOSITORY: git@github.com:${{ github.repository }}.git
  PREVIEW_PHP: "8.4"
  PREVIEW_MODE: webhook                 # "deploy" if the app has no cipi/agent or uses basic auth
  BRANCH: ${{ github.head_ref }}

jobs:
  up:
    if: github.event.action != 'closed' && github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    environment:
      name: preview
      url: ${{ steps.preview.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - name: Install cipi-cli
        env:
          CIPI_PREVIEW_API_URL: ${{ secrets.CIPI_PREVIEW_API_URL }}
          CIPI_PREVIEW_API_TOKEN: ${{ secrets.CIPI_PREVIEW_API_TOKEN }}
        run: |
          base=https://github.com/cipi-sh/cli/releases/latest/download
          curl -fsSLO "$base/cipi-cli-linux-amd64" && curl -fsSLO "$base/checksums.txt"
          sha256sum --check --ignore-missing checksums.txt
          sudo install -m 0755 cipi-cli-linux-amd64 /usr/local/bin/cipi-cli
          cipi-cli profiles add preview --endpoint "$CIPI_PREVIEW_API_URL" --token "$CIPI_PREVIEW_API_TOKEN"
      - id: preview
        run: echo "url=$(.cipi/preview.sh up "$BRANCH" | tail -1)" >> "$GITHUB_OUTPUT"

  down:
    if: github.event.action == 'closed' && github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install cipi-cli
        env:
          CIPI_PREVIEW_API_URL: ${{ secrets.CIPI_PREVIEW_API_URL }}
          CIPI_PREVIEW_API_TOKEN: ${{ secrets.CIPI_PREVIEW_API_TOKEN }}
        run: |
          base=https://github.com/cipi-sh/cli/releases/latest/download
          curl -fsSLO "$base/cipi-cli-linux-amd64" && curl -fsSLO "$base/checksums.txt"
          sha256sum --check --ignore-missing checksums.txt
          sudo install -m 0755 cipi-cli-linux-amd64 /usr/local/bin/cipi-cli
          cipi-cli profiles add preview --endpoint "$CIPI_PREVIEW_API_URL" --token "$CIPI_PREVIEW_API_TOKEN"
      - run: .cipi/preview.sh down "$BRANCH"
```

| Detail | Why |
| --- | --- |
| `BRANCH` passed through `env` | The branch name is never pasted into the shell script, so a branch called `` `rm -rf` `` stays a string |
| `head.repo.full_name == github.repository` | No previews for pull requests from forks: they don't get your secrets, and they shouldn't run on your server |
| `concurrency` per pull request | Two quick pushes don't create the same preview twice |
| `synchronize` | Needed only with `PREVIEW_MODE=deploy`; in webhook mode the job just confirms the preview exists |

### GitLab CI/CD {#gitlab}

GitLab calls them **review apps** and has everything built in: the environment link in the merge request, a **Stop** button, automatic stop when the branch is deleted or after a timeout.

```yaml
# .gitlab-ci.yml
stages: [review]

variables:
  PREVIEW_DOMAIN: preview.example.com
  PREVIEW_REPOSITORY: git@gitlab.com:$CI_PROJECT_PATH.git     # your GitLab host if self-hosted
  PREVIEW_PHP: "8.4"
  PREVIEW_MODE: webhook

.cipi-cli: &cipi-cli
  image: debian:stable-slim
  before_script:
    - apt-get update -qq && apt-get install -y -qq curl git ca-certificates >/dev/null
    - base=https://github.com/cipi-sh/cli/releases/latest/download
    - curl -fsSLO "$base/cipi-cli-linux-amd64" && curl -fsSLO "$base/checksums.txt"
    - sha256sum --check --ignore-missing checksums.txt
    - install -m 0755 cipi-cli-linux-amd64 /usr/local/bin/cipi-cli
    - cipi-cli profiles add preview --endpoint "$CIPI_PREVIEW_API_URL" --token "$CIPI_PREVIEW_API_TOKEN"

review:
  <<: *cipi-cli
  stage: review
  rules:
    - if: $CI_COMMIT_BRANCH && $CI_COMMIT_BRANCH != $CI_DEFAULT_BRANCH
  script:
    - echo "PREVIEW_URL=$(.cipi/preview.sh up "$CI_COMMIT_REF_NAME" | tail -1)" > preview.env
  artifacts:
    reports:
      dotenv: preview.env
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: $PREVIEW_URL
    on_stop: stop_review
    auto_stop_in: 2 weeks

stop_review:
  <<: *cipi-cli
  stage: review
  rules:
    - if: $CI_COMMIT_BRANCH && $CI_COMMIT_BRANCH != $CI_DEFAULT_BRANCH
      when: manual
  variables:
    GIT_STRATEGY: none                # the branch may already be gone
  script:
    - ID=$(printf '%s#%s' "$PREVIEW_REPOSITORY" "$CI_COMMIT_REF_NAME" | sha1sum | cut -c1-10)
    - cipi-cli preview apps show "pv$ID" >/dev/null 2>&1 && cipi-cli preview apps delete "pv$ID" -y || echo "Nothing to delete"
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
```

The stop job doesn't check out the repository (the branch may be deleted), so it computes the app name inline, with the same rule as the script. Mark `CIPI_PREVIEW_API_TOKEN` as *Masked*; don't mark it *Protected*, or feature branches won't see it.

### Bitbucket Pipelines {#bitbucket}

Bitbucket runs pipelines when a pull request is created or updated, but has no "pull request closed" trigger: deletion is done by the nightly [cleanup](#cleanup), or by hand with a custom pipeline.

```yaml
# bitbucket-pipelines.yml
definitions:
  steps:
    - step: &preview-up
        name: Preview
        script:
          - base=https://github.com/cipi-sh/cli/releases/latest/download
          - curl -fsSLO "$base/cipi-cli-linux-amd64" && curl -fsSLO "$base/checksums.txt"
          - sha256sum --check --ignore-missing checksums.txt
          - install -m 0755 cipi-cli-linux-amd64 /usr/local/bin/cipi-cli
          - cipi-cli profiles add preview --endpoint "$CIPI_PREVIEW_API_URL" --token "$CIPI_PREVIEW_API_TOKEN"
          - export PREVIEW_REPOSITORY="git@bitbucket.org:$BITBUCKET_REPO_FULL_NAME.git"
          - .cipi/preview.sh up "$BITBUCKET_BRANCH"

pipelines:
  pull-requests:
    '**':
      - step: *preview-up
  custom:
    delete-preview:                    # Run pipeline → custom: delete-preview, on the branch
      - step:
          name: Delete preview
          script:
            - base=https://github.com/cipi-sh/cli/releases/latest/download
            - curl -fsSLO "$base/cipi-cli-linux-amd64" && curl -fsSLO "$base/checksums.txt"
            - sha256sum --check --ignore-missing checksums.txt
            - install -m 0755 cipi-cli-linux-amd64 /usr/local/bin/cipi-cli
            - cipi-cli profiles add preview --endpoint "$CIPI_PREVIEW_API_URL" --token "$CIPI_PREVIEW_API_TOKEN"
            - export PREVIEW_REPOSITORY="git@bitbucket.org:$BITBUCKET_REPO_FULL_NAME.git"
            - .cipi/preview.sh down "$BITBUCKET_BRANCH"
```

Set `PREVIEW_DOMAIN` (and the two API variables, secured) under **Repository settings → Repository variables**. Bitbucket shows the URL in the step log, last line.

### Gitea and Forgejo Actions {#gitea}

Both run the [GitHub Actions recipe](#github) as it is, with three changes: save it as `.gitea/workflows/preview.yml` or `.forgejo/workflows/preview.yml`, set `runs-on:` to a label of your runner, and point `PREVIEW_REPOSITORY` at your forge's SSH address (for example `git@git.example.com:${{ github.repository }}.git`).

> [!note] Cipi adds deploy keys and webhooks by itself on GitHub, GitLab, Bitbucket and Azure DevOps. On Gitea and Forgejo it can't, so each preview of a **private** repository needs its deploy key added by hand (`sudo cipi deploy pv… --key` on the server prints it), and pushes reach it only with `PREVIEW_MODE=deploy`. Fully automatic previews there work for public repositories.

### Jenkins {#jenkins}

In a Multibranch Pipeline with pull request discovery, add a stage that runs only for change requests:

```groovy
stage('Preview') {
    when { changeRequest() }
    environment {
        PREVIEW_DOMAIN         = 'preview.example.com'
        PREVIEW_REPOSITORY     = 'git@github.com:acme/shop.git'
        CIPI_PREVIEW_API_URL   = 'https://api.preview.example.com'
        CIPI_PREVIEW_API_TOKEN = credentials('cipi-preview-token')
    }
    steps {
        sh '''
          export HOME="$(mktemp -d)"
          cipi-cli profiles add preview --endpoint "$CIPI_PREVIEW_API_URL" --token "$CIPI_PREVIEW_API_TOKEN"
          .cipi/preview.sh up "$CHANGE_BRANCH"
        '''
    }
}
```

Jenkins has no step that runs when a pull request closes: schedule the [cleanup](#cleanup) as a nightly job. More on Jenkins: [Jenkins](/docs/jenkins).

## 5. Clean up {#cleanup}

Previews whose branch is gone should go too. This script lists the previews on the server and deletes those whose branch no longer exists in the repository. Run it nightly from any CI scheduler (GitHub `schedule`, GitLab pipeline schedules, Bitbucket schedules, Jenkins `cron`) or from your laptop.

```bash
#!/usr/bin/env bash
# .cipi/preview-cleanup.sh: delete previews whose branch no longer exists
set -euo pipefail
PROFILE=${CIPI_PROFILE:-preview}
REPO=${PREVIEW_REPOSITORY:?set PREVIEW_REPOSITORY to the SSH clone URL}

heads=$(git ls-remote --heads origin)            # fails, and stops the script, if Git can't be reached
cipi-cli "$PROFILE" apps list --json \
  | jq -r --arg repo "$REPO" '.data[] | select(.env == "preview" and (.app | startswith("pv")) and .repository == $repo) | "\(.app) \(.branch)"' \
  | while read -r app branch; do
      if grep -q "refs/heads/${branch}$" <<< "$heads"; then
        echo "keep   $app ($branch)"
      else
        echo "delete $app ($branch)"
        cipi-cli "$PROFILE" apps delete "$app" -y
      fi
    done
```

It only touches apps that are labelled `preview`, named `pv…` and built from this repository, so production apps and other projects' previews are never in its list.

## 6. Make previews useful {#useful}

### A configuration just for previews {#yml}

Previews are created with `--env preview`, so they read **`cipi-preview.yml`** first and fall back to `cipi.yml`. The script turns on automatic apply, so the file is applied after every deploy.

```yaml
# cipi-preview.yml
version: 1
workers:
  queues:
    - { queue: default, processes: 1 }   # one worker is plenty for a review
schedule: false                          # no scheduled jobs on previews
deploy:
  keep_releases: 2                       # less disk per preview
```

See [cipi.yml](/docs/yml) for every key.

### Data to look at {#data}

| Option | How |
| --- | --- |
| Seeders (default) | The script runs `db:seed --force` once, after the first deploy |
| A realistic dump without personal data | Create one with the [anonymizer](/docs/anonymizer), then `sudo cipi db restore pv3a1f9c2e4b dump.sql.gz` on the preview server |
| Never | A copy of production. A preview is easier to reach than production and shouldn't hold real customers' data |

### Keep previews private {#private}

| Option | Works with | Note |
| --- | --- | --- |
| [Cloudflare Zero Trust](/docs/zero-trust) | Both update modes | Login with your company accounts; `/cipi/webhook` stays reachable |
| Basic auth (`app.basic_auth` in `cipi-preview.yml`, or `cipi basicauth enable`) | `PREVIEW_MODE=deploy` only | Blocks the Git webhook too |
| Unguessable names only | Both | The ID in the address is not a secret: search engines and link scanners can still find a preview |

### E-mails, payments, third parties {#side-effects}

The script sets `MAIL_MAILER=log`, so previews never e-mail anyone. Do the same for anything with side effects: test keys for payment providers, sandbox webhooks, a separate S3 bucket. Set them once with `cipi-cli preview apps env set pv… --set KEY=value`, or add them to the script's create branch.

## Limits to know {#limits}

| Limit | Value | What to do |
| --- | --- | --- |
| Server resources | Each preview is a PHP pool, a worker and a database | A 4 GB server runs about a dozen small previews; delete stale ones |
| Let's Encrypt | 50 new certificates per registered domain every 7 days | Use a separate domain for previews (`acme-preview.dev`) so production renewals never compete |
| GitHub webhooks | 20 per repository for the push event, production included | Above about 18 open previews, new previews get no webhook: close stale pull requests, or use `PREVIEW_MODE=deploy` |
| Names | App name up to 32 characters; DNS label up to 63 | The script keeps both well under |

## Common problems {#problems}

| Problem | Cause | Fix |
| --- | --- | --- |
| `Invalid username` | A hand-made name with `-` or capitals | Let the script compute it: `pv` + 10 hex characters |
| Preview created but not updating | No agent in the app, or basic auth on | Add `cipi/agent`, or set `PREVIEW_MODE=deploy` |
| "Could not add the webhook" on create | GitHub's 20-webhook limit, or the Git token lacks webhook rights | Close stale previews; check the token ([Git providers](/docs/git)) |
| Certificate fails | Wildcard DNS missing, or the Let's Encrypt weekly limit | `dig +short x.preview.example.com`; use a separate preview domain |
| Deploy key can't read the repository | No Git token on the preview server | `cipi git github-token …` on the preview server, then `.cipi/preview.sh down` and `up` again |
| `403` from the API | The token lacks an ability | Recreate it with the list in [setup](#setup) |
| A preview half-created (the script stopped) | A step failed after `apps create` | `.cipi/preview.sh down`, fix the cause, `.cipi/preview.sh up` |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Is a preview a real Cipi app? | Yes: same isolation, deploys, logs and rollback as production. It's only labelled `preview` and named `pv…`. |
| Do previews need a wildcard certificate? | No. Each preview gets its own certificate over HTTP; only the DNS record is a wildcard. |
| Can previews run on the production server? | Yes, but a separate server keeps reviews from slowing production and keeps the preview token away from production apps. |
| Do tests run before a preview updates? | In webhook mode the preview updates on every push, tests or not: that's usually what reviewers want. With `PREVIEW_MODE=deploy`, put the preview job after your tests. |
| What happens to the database when the preview is deleted? | It's deleted with the app, together with the files, the certificate and the deploy key and webhook in the repository. |
| How do I see all previews? | `cipi-cli preview apps list`, or `sudo cipi app list` on the server: they're the `pv…` apps. |

The why and the team workflows: [What preview environments can do for your team](/guides/preview-environments-for-teams).

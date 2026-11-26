@section ci-pipeline-ssh

Pipeline mode lets your CI decide **when** an app goes live: usually right after the tests pass, sometimes after a backup or a manual approval. The server still does the deploy itself, exactly as with `cipi deploy`. Your pipeline only gives the order and reads the result.

This page has everything you need: how to connect CI to the server safely, a deploy command that never makes things worse, and ready-to-copy recipes for every popular CI.

```flow
Choose how CI calls | SSH, API or webhook | #connect
> Pick one of three ways for the pipeline to reach the server. The API is the safest; SSH is the quickest to set up.
Store the secrets | key or token in CI | #secrets
> Save the key or token in your CI's secret store. Never commit it to the repository.
Turn the webhook off | one trigger per app | #webhook-off
> If the app also deploys on push, the pipeline and the webhook would both deploy. Turn the webhook off.
Copy a recipe | GitHub, GitLab, Jenkins… | #recipes
> Copy the recipe for your CI, change the app name and the URL, and push.
Check it | one test push | #verify
> Push a small change and watch the pipeline: tests, deploy, health check, done.
```

## How a pipeline deploy works {#how}

```flow
Push | to the branch
> You push to `main` (or merge a pull request). The pipeline starts.
Test | php artisan test
> The pipeline installs the dependencies and runs your tests on its own machines. If a test fails, it stops here and nothing reaches the server.
Deploy | SSH or API → cipi deploy
> The pipeline asks the server to deploy. The server pulls the latest commit of the branch from Git, builds the release and switches to it. The pipeline waits for the answer.
Check | health URL answers 200
> The pipeline calls a health URL of the app (for example Laravel's `/up`). If it answers, the job is green.
Roll back | only if the check fails
> If the new release is live but the app doesn't answer, the pipeline rolls back to the previous release and turns red, so you notice.
```

> [!warning] **Don't roll back when the deploy command fails.** When `cipi deploy` fails while building the release (Composer, assets, migrations), nothing is published and the previous release is still serving. Rolling back at that point would go one release further back, to older code. Roll back only when the deploy succeeded and the health check then fails, as every recipe on this page does.

## 1. Choose how CI calls the server {#connect}

| | SSH | API ([cipi-cli](/docs/cli-client) or `curl`) | Agent webhook |
| --- | --- | --- | --- |
| What CI runs | `ssh cipi@server "sudo cipi deploy shop"` | `cipi-cli prod deploy shop` | `curl -X POST https://shop.example.com/cipi/webhook …` |
| What the secret can do | Run **any** `cipi` command as root (including deleting apps) | Only what the token allows: with `deploy-manage`, deploy, roll back, unlock and read status | Only queue a deploy of that one app |
| Waits for the result | Yes | Yes | No: it answers "queued" and the deploy starts within a minute |
| Server needs | Port 22 open to CI | [`cipi api`](/docs/api) installed | [`cipi/agent`](/docs/agent-install) in the app (Laravel) |
| Choose it when | You want the quickest setup on one server | You want the least privilege, or several servers | Your tool can only send an HTTP request |

> [!tip] Our recommendation: the **API** for production. A leaked API token with only `deploy-manage` can redeploy your app; a leaked SSH key for the `cipi` user can do anything Cipi can do.

## 2. Store the secrets {#secrets}

Every recipe uses the same names, so you can copy them as they are.

| Secret | What it is | How to get it |
| --- | --- | --- |
| `SERVER_HOST` | The server's IP or hostname | Your provider's dashboard |
| `SERVER_SSH_KEY` | A private key used only by CI | `ssh-keygen` below |
| `SERVER_KNOWN_HOSTS` | The server's public host key, so CI knows it's talking to your server | `ssh-keyscan` below |
| `CIPI_API_URL` | Your API address, e.g. `https://api.example.com` | `cipi api status` |
| `CIPI_API_TOKEN` | A token with only `deploy-manage` | `cipi api token create` below |
| `CIPI_WEBHOOK_TOKEN` | The app's webhook secret | `cipi deploy shop --webhook` |
| `HEALTH_URL` | A URL that answers 200 when the app works, e.g. `https://shop.example.com/up` | Your app ([health checks](/docs/health-checks)) |

### An SSH key for CI {#ssh-key}

Create a new key on your laptop. Never reuse your personal key or the app's deploy key.

```bash
$ ssh-keygen -t ed25519 -C "ci-deploy" -f ./ci_deploy -N ""
$ cat ./ci_deploy.pub        # 1. copy this line
$ ssh cipi@your-server "sudo cipi ssh add '<paste the line>'"   # 2. authorize it on the server
$ cat ./ci_deploy            # 3. paste the whole file into the CI secret SERVER_SSH_KEY
$ rm ./ci_deploy ./ci_deploy.pub   # 4. delete the local copies
```

Then save the server's host key. Run this from a machine that has already connected to the server, and check that the fingerprint matches the one the server shows:

```bash
$ ssh-keyscan -t ed25519 your-server             # → the CI secret SERVER_KNOWN_HOSTS
$ ssh-keyscan -t ed25519 your-server | ssh-keygen -lf -
# on the server, the same fingerprint must appear:
$ ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

> [!note] Running `ssh-keyscan` inside the pipeline on every build works, but it trusts whatever answers on that address. A saved `SERVER_KNOWN_HOSTS` is what stops a pipeline from sending your deploy to an impostor.

### An API token for CI {#api-token}

```bash
# on the server, once
$ cipi api token create --name=ci-shop --abilities=deploy-manage --expires=2027-12-31
```

The token is shown once: save it as `CIPI_API_TOKEN`. If you restrict the API by IP (`cipi api ip-whitelist`), remember that hosted runners (GitHub, GitLab.com, Bitbucket) change IP on every build: allow their published ranges or use a self-hosted runner with a fixed IP.

## 3. Turn the webhook off {#webhook-off}

If the app also deploys on push, every push would deploy twice: once from the webhook, once from the pipeline, and the second one hits the deploy lock and fails.

| Provider | Where |
| --- | --- |
| GitHub | Repository → **Settings → Webhooks** → the `/cipi/webhook` hook → untick **Active** |
| GitLab | Project → **Settings → Webhooks** → delete the `/cipi/webhook` hook |
| Bitbucket | Repository → **Repository settings → Webhooks** → delete or disable it |
| Gitea / Forgejo | Repository → **Settings → Webhooks** → untick **Active** |
| Azure DevOps | Project settings → **Service hooks** → disable the Cipi hook |

> [!note] `cipi git refresh` and `cipi app webhook recreate` create the webhook again. If you run them later, turn it off again.

## 4. The deploy step, explained once {#deploy-step}

Every recipe below runs one of these, depending on how CI calls the server.

**Over SSH**, everything runs on the server in one command:

```bash
ssh cipi@$SERVER_HOST "sudo cipi deploy shop && \
  { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors https://shop.example.com/up >/dev/null \
    || { sudo cipi deploy shop --rollback; exit 1; }; }"
```

| Part | What it does |
| --- | --- |
| `sudo cipi deploy shop` | Builds and publishes the new release. If it fails, the command stops here: nothing was published, and the job fails |
| `&& { curl … /up` | Only if the deploy succeeded: calls the app up to 6 times, 5 seconds apart |
| `\|\| { sudo cipi deploy shop --rollback; exit 1; }` | Only if the app doesn't answer: goes back to the previous release and fails the job |

**Over the API**, with cipi-cli:

```bash
cipi-cli profiles add prod --endpoint "$CIPI_API_URL" --token "$CIPI_API_TOKEN"
cipi-cli prod deploy shop
curl -fsS --retry 5 --retry-delay 5 --retry-all-errors "$HEALTH_URL" >/dev/null \
  || { cipi-cli prod deploy rollback shop -y; exit 1; }
```

`cipi-cli deploy` waits for the deploy and exits with an error if it fails. It waits about nine minutes at most: for longer builds, follow the deploy with `cipi-cli prod deploy status shop`.

> [!tip] Already using Cipi's own [automatic rollback](/docs/health-checks#auto-rollback) (`rollback_on_unhealthy: true`)? Then keep the `curl` check, so the job turns red, but drop the CI rollback: Cipi has already rolled back, and a second rollback would go one release too far.

## 5. Recipes {#recipes}

| CI | Jump to |
| --- | --- |
| GitHub Actions | [SSH](#github) · [API](#github-api) |
| GitLab CI/CD (cloud or self-hosted) | [Recipe](#gitlab) |
| Bitbucket Pipelines | [Recipe](#bitbucket) |
| Azure Pipelines | [Recipe](#azure) |
| Gitea Actions, Forgejo Actions | [Recipe](#gitea) |
| CircleCI | [Recipe](#circleci) |
| Laravel Envoy | [Recipe](#envoy) |
| Any CI with `curl` | [API with curl](#curl) · [Agent webhook](#webhook-ci) |
| Jenkins | [Jenkins page](/docs/jenkins) |
| AWS CodeDeploy | [AWS CodeDeploy page](/docs/aws-codedeploy) |

Replace `shop` with your app name and `https://shop.example.com/up` with your health URL. The test job is an example: keep the one you already have.

### GitHub Actions {#github}

```yaml
# .github/workflows/deploy.yml
name: Test and deploy
on:
  push:
    branches: [main]

concurrency:
  group: deploy-production      # one deploy at a time, queued in order
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: "8.4"     # the version your app uses
      - run: composer install --no-interaction --prefer-dist
      - run: cp .env.example .env && php artisan key:generate
      - run: php artisan test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production      # optional: required reviewers, protected secrets
    steps:
      - name: Set up SSH
        run: |
          mkdir -p ~/.ssh && chmod 700 ~/.ssh
          printf '%s\n' "${{ secrets.SERVER_SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          printf '%s\n' "${{ secrets.SERVER_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
      - name: Deploy, check, roll back if unhealthy
        run: |
          ssh cipi@${{ secrets.SERVER_HOST }} "sudo cipi deploy shop && { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors https://shop.example.com/up >/dev/null || { sudo cipi deploy shop --rollback; exit 1; }; }"
```

### GitHub Actions with the API {#github-api}

No SSH at all, and a token that can only deploy.

```yaml
  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    env:
      CIPI_API_URL: ${{ secrets.CIPI_API_URL }}
      CIPI_API_TOKEN: ${{ secrets.CIPI_API_TOKEN }}
      HEALTH_URL: https://shop.example.com/up
    steps:
      - name: Install cipi-cli
        run: |
          base=https://github.com/cipi-sh/cli/releases/latest/download
          curl -fsSLO "$base/cipi-cli-linux-amd64" && curl -fsSLO "$base/checksums.txt"
          sha256sum --check --ignore-missing checksums.txt
          sudo install -m 0755 cipi-cli-linux-amd64 /usr/local/bin/cipi-cli
      - name: Deploy, check, roll back if unhealthy
        run: |
          cipi-cli profiles add prod --endpoint "$CIPI_API_URL" --token "$CIPI_API_TOKEN"
          cipi-cli prod deploy shop
          curl -fsS --retry 5 --retry-delay 5 --retry-all-errors "$HEALTH_URL" >/dev/null \
            || { cipi-cli prod deploy rollback shop -y; exit 1; }
```

### GitLab CI/CD {#gitlab}

Works the same on GitLab.com and self-hosted GitLab. Add the secrets under **Settings → CI/CD → Variables**, marked *Masked* and *Protected*.

```yaml
# .gitlab-ci.yml
stages: [test, deploy]

test:
  stage: test
  image: composer:2
  script:
    - composer install --no-interaction --prefer-dist
    - cp .env.example .env && php artisan key:generate
    - php artisan test

deploy:
  stage: deploy
  image: alpine:latest
  resource_group: production         # one deploy at a time
  environment: production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SERVER_SSH_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh && chmod 700 ~/.ssh
    - echo "$SERVER_KNOWN_HOSTS" > ~/.ssh/known_hosts
  script:
    - ssh cipi@$SERVER_HOST "sudo cipi deploy shop && { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors https://shop.example.com/up >/dev/null || { sudo cipi deploy shop --rollback; exit 1; }; }"
```

### Bitbucket Pipelines {#bitbucket}

Bitbucket can hold the SSH key for you: **Repository settings → Pipelines → SSH keys**. Generate or paste the CI key there, copy its public key to the server with `sudo cipi ssh add`, and add your server under **Known hosts** (Bitbucket fetches its fingerprint; compare it with the server's). The key is then available to every step without any secret in the file.

```yaml
# bitbucket-pipelines.yml
pipelines:
  branches:
    main:
      - step:
          name: Test
          image: composer:2
          script:
            - composer install --no-interaction --prefer-dist
            - cp .env.example .env && php artisan key:generate
            - php artisan test
      - step:
          name: Deploy
          deployment: production
          script:
            - ssh cipi@$SERVER_HOST "sudo cipi deploy shop && { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors https://shop.example.com/up >/dev/null || { sudo cipi deploy shop --rollback; exit 1; }; }"
```

### Azure Pipelines {#azure}

Create an SSH service connection first: **Project settings → Service connections → New → SSH**, host = your server, user = `cipi`, private key = the CI key. Call it `cipi-production`.

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include: [main]

pool:
  vmImage: ubuntu-latest

stages:
  - stage: Test
    jobs:
      - job: test
        steps:
          - script: |
              composer install --no-interaction --prefer-dist
              cp .env.example .env && php artisan key:generate
              php artisan test
            displayName: Run tests

  - stage: Deploy
    dependsOn: Test
    jobs:
      - deployment: deploy
        environment: production        # add an "Exclusive lock" check for one deploy at a time
        strategy:
          runOnce:
            deploy:
              steps:
                - task: SSH@0
                  displayName: Deploy, check, roll back if unhealthy
                  inputs:
                    sshEndpoint: cipi-production
                    runOptions: commands
                    commands: sudo cipi deploy shop && { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors https://shop.example.com/up >/dev/null || { sudo cipi deploy shop --rollback; exit 1; }; }
                    failOnStdErr: false   # Cipi prints progress on stderr; the exit code decides
```

> [!note] Keep `failOnStdErr: false`. Cipi writes progress messages to stderr, and with the default the task would fail even on a perfect deploy.

### Gitea Actions and Forgejo Actions {#gitea}

Both run GitHub Actions syntax. Copy the [GitHub Actions recipe](#github) into:

| Forge | File |
| --- | --- |
| Gitea | `.gitea/workflows/deploy.yml` (Gitea also reads `.github/workflows/`) |
| Forgejo | `.forgejo/workflows/deploy.yml` |

Two changes: set `runs-on:` to a label your runner offers (the label you gave it when you registered it), and add the secrets under **Settings → Actions → Secrets** of the repository. For push to deploy without CI, Gitea and Forgejo also work with the agent webhook ([Auto-deploy on push](/docs/auto-deploy)).

### CircleCI {#circleci}

Add the CI private key under **Project settings → SSH keys → Additional SSH keys** (hostname = your server) and copy the fingerprint CircleCI shows. Put `SERVER_HOST` and `SERVER_KNOWN_HOSTS` in **Project settings → Environment variables**.

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  test:
    docker:
      - image: cimg/php:8.4
    steps:
      - checkout
      - run: composer install --no-interaction --prefer-dist
      - run: cp .env.example .env && php artisan key:generate
      - run: php artisan test

  deploy:
    docker:
      - image: cimg/base:current
    steps:
      - add_ssh_keys:
          fingerprints:
            - "SHA256:paste-the-fingerprint-here"
      - run: mkdir -p ~/.ssh && echo "$SERVER_KNOWN_HOSTS" >> ~/.ssh/known_hosts
      - run: ssh cipi@$SERVER_HOST "sudo cipi deploy shop && { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors https://shop.example.com/up >/dev/null || { sudo cipi deploy shop --rollback; exit 1; }; }"

workflows:
  test-and-deploy:
    jobs:
      - test
      - deploy:
          requires: [test]
          filters:
            branches:
              only: main
```

### Laravel Envoy {#envoy}

[Envoy](https://laravel.com/docs/envoy) runs SSH tasks from your laptop or from CI. With Cipi, one task is enough: the server does the rest.

```blade
{{-- Envoy.blade.php --}}
@servers(['production' => 'cipi@203.0.113.10'])

@task('deploy', ['on' => 'production'])
    sudo cipi deploy shop && { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors https://shop.example.com/up >/dev/null || { sudo cipi deploy shop --rollback; exit 1; }; }
@endtask
```

```bash
$ composer require laravel/envoy --dev
$ php vendor/bin/envoy run deploy
```

### Any CI: the API with curl {#curl}

For CIs without a ready recipe, or when you'd rather not install cipi-cli. Needs `curl` and `jq`.

```bash
#!/usr/bin/env bash
set -euo pipefail
H="Authorization: Bearer $CIPI_API_TOKEN"

job=$(curl -fsS -X POST "$CIPI_API_URL/api/apps/shop/deploy" -H "$H" -H "Accept: application/json" | jq -r .job_id)
echo "Deploy job $job"

status=pending
for i in $(seq 1 180); do                       # up to 15 minutes
  status=$(curl -fsS "$CIPI_API_URL/api/jobs/$job" -H "$H" -H "Accept: application/json" | jq -r .data.status) || status=unknown
  case "$status" in completed|failed) break ;; esac
  sleep 5
done

if [ "$status" != completed ]; then
  echo "Deploy $status"; exit 1                 # failed or still running: nothing to roll back
fi

curl -fsS --retry 5 --retry-delay 5 --retry-all-errors "$HEALTH_URL" >/dev/null || {
  curl -fsS -X POST "$CIPI_API_URL/api/apps/shop/deploy/rollback" -H "$H" -H "Accept: application/json"
  echo "Unhealthy: rollback requested"; exit 1
}
echo "Deployed and healthy"
```

The deploy answers `202` with a `job_id`; `GET /api/jobs/{id}` returns `pending`, `running`, `completed` or `failed` (with the output once finished). See the [REST API](/docs/api).

### Any CI: the agent webhook {#webhook-ci}

When a tool can only send an HTTP request (a chat bot, a scheduler, a low-code platform), call the app's own webhook. It accepts the webhook secret as a Bearer token, queues the deploy and answers immediately.

```bash
curl -fsS -X POST "https://shop.example.com/cipi/webhook" \
  -H "Authorization: Bearer $CIPI_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/main","after":"'"$COMMIT_SHA"'","pusher":{"name":"ci"}}'
# {"status":"queued","app":"shop","provider":"webhook","branch":"main",...}
```

| Field | Optional? | Use |
| --- | --- | --- |
| `ref` | Yes | If set, it must be the app's deploy branch, otherwise the answer is `skipped` |
| `after` | Yes | The commit (7 to 40 hex characters), recorded in the [deploy audit](/docs/deploy-audit) |
| `pusher.name` | Yes | Who asked, recorded in the audit |

This path needs the [`cipi/agent`](/docs/agent-install) package in a Laravel app. It does **not** wait for the deploy: the server starts it within a minute, and the result arrives through [deploy notifications](/docs/deploy-notifications). Don't put the token in the URL (`?token=`): URLs end up in logs.

## 6. Check it works {#verify}

```bash
# push a small change, then on the server:
$ cipi deploy shop --status        # running, queued or idle
$ cipi deploy shop --audit         # the last entry says origin "cipi-cli" (SSH) or "panel" (API)
$ cipi app logs shop --type=deploy
```

## Patterns {#patterns}

### Several apps from one pipeline {#multi-app}

```bash
ssh cipi@$SERVER_HOST "sudo cipi deploy api && sudo cipi deploy frontend"
```

Deploy them one after the other, in the order they depend on each other. Each app has its own lock, so they could also run in parallel, but a failure is easier to read in sequence.

### Several servers {#multi-server}

With cipi-cli, add one profile per server and deploy each:

```bash
cipi-cli profiles add eu --endpoint "$CIPI_API_URL_EU" --token "$CIPI_API_TOKEN_EU"
cipi-cli profiles add us --endpoint "$CIPI_API_URL_US" --token "$CIPI_API_TOKEN_US"
cipi-cli eu deploy shop && cipi-cli us deploy shop
```

### Add more steps {#more}

| Add | How | Read |
| --- | --- | --- |
| A backup before the release | `sudo cipi backup run shop` in a step before the deploy | [Backups](/docs/backups) |
| A database snapshot before migrations | `sudo cipi app edit shop --predeploy-snapshot` (once; then every deploy) | [Safe deploy](/docs/safe-deploy) |
| Check `cipi.yml` in the test job | `php artisan cipi:yml validate --json` | [cipi.yml tooling](/docs/agent-yml) |
| Slack or Telegram on every deploy | Server-side notifications, no CI code | [Deploy notifications](/docs/deploy-notifications) |
| A live URL for every branch | Create and remove apps from CI | [Preview environments](/docs/preview-environments) |

> [!tip] A setup many teams use: push to deploy on **staging** (instant feedback), pipeline on **production** (tests, backup, deploy, check). Compare the two in [Agent vs pipeline](/guides/agent-vs-pipeline-deploys).

## Common problems {#problems}

| Problem | Cause | Fix |
| --- | --- | --- |
| `Permission denied (publickey)` | The CI public key isn't on the server | `sudo cipi ssh add "<public key>"` |
| `Host key verification failed` | `SERVER_KNOWN_HOSTS` is empty or from another server | Save it again with `ssh-keyscan` and compare the fingerprint |
| `sudo: a terminal is required` | The SSH user isn't `cipi` | Connect as `cipi@…`, the user allowed to run `sudo cipi` without a password |
| Every push deploys twice | The webhook is still active | [Turn it off](#webhook-off) |
| *A deploy of 'shop' is running* | Two pipelines at once, or a webhook deploy in flight | Add a concurrency limit and keep one trigger per app; a lock left by an interrupted deploy is removed by the next deploy |
| `401` or `403` from the API | Token expired, wrong ability, or IP not allowed | `cipi api token list`; ability `deploy-manage`; `cipi api ip-whitelist show` |
| cipi-cli "timed out after polling" | The build takes more than about nine minutes | The deploy continues on the server: `cipi-cli prod deploy status shop` |
| Azure task fails on a good deploy | `failOnStdErr` is on | Set `failOnStdErr: false` |
| CI green, old code live | The pipeline used the agent webhook, which only queues | Use SSH or the API when CI must wait for the result |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Does CI build the app and upload it? | No. CI runs the tests; the server pulls the code from Git and builds the release itself. Nothing is uploaded. |
| Which commit goes live? | The latest commit of the app's branch when the server builds the release. With one deploy at a time per branch (the `concurrency`, `resource_group` and lock settings above), that's the commit your tests checked. |
| Can the CI key do anything else? | Over SSH, the `cipi` user can run any `cipi` command as root, which includes deleting apps. That's why the API with a `deploy-manage` token is the safer choice for production. |
| Do I need the agent for pipelines? | No. SSH and the API work for every app. The agent is only needed for the webhook path. |
| How are migrations run? | By the deploy, on the server, inside the new release and before it goes live. CI doesn't run them. |
| Can I require an approval before production? | Yes, with your CI's environments: GitHub *required reviewers*, GitLab *protected environments*, Azure *approvals*, Jenkins `input`. |

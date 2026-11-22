@section ci-pipeline-ssh

Use a pipeline when a deploy must be **conditional**: only after tests pass, after a backup, with a notification, or to create a review app per branch. The pipeline SSHs into the server and runs `cipi deploy`. Turn the app's webhook off so only the pipeline deploys.

```flow
Push | to main
Test | php artisan test
Backup | optional
Deploy | ssh → cipi deploy
Notify / roll back | on failure
```

## A key for CI {#ssh-key}

Create a dedicated key; never reuse a personal key or a deploy key.

```bash
$ ssh-keygen -t ed25519 -C "ci-deploy" -f ~/.ssh/ci_deploy -N ""
$ cat ~/.ssh/ci_deploy.pub   # on the server: sudo cipi ssh add "<this line>"
$ cat ~/.ssh/ci_deploy       # → CI secret SERVER_SSH_KEY
```

Store `SERVER_SSH_KEY` and `SERVER_HOST` as secrets. The `cipi` user runs only `sudo cipi …` without a password, so the CI key cannot do anything else as root. See [SSH keys](/docs/ssh-keys).

## GitHub Actions {#github}

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: composer install && php artisan test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: cipi
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: sudo cipi deploy myapp || (sudo cipi deploy myapp --rollback && exit 1)
```

## GitLab CI {#gitlab}

```yaml
# .gitlab-ci.yml
stages: [test, deploy]
test:
  stage: test
  script: [composer install, php artisan test]
deploy:
  stage: deploy
  only: [main]
  before_script:
    - eval $(ssh-agent -s) && echo "$SERVER_SSH_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh && ssh-keyscan -H $SERVER_HOST >> ~/.ssh/known_hosts
  script:
    - ssh cipi@$SERVER_HOST "sudo cipi deploy myapp || (sudo cipi deploy myapp --rollback && exit 1)"
```

## Several apps from one pipeline {#multi-app}

```bash
$ sudo cipi deploy frontend & sudo cipi deploy api & wait
```

## Build on it {#patterns}

| Add | Read |
| --- | --- |
| Backup before release | [Safe deploy](/docs/safe-deploy) |
| Slack/Telegram on success or failure | [Deploy notifications](/docs/deploy-notifications) |
| A live app per branch | [Preview environments](/docs/preview-environments) |

> [!tip] A common setup: webhook for staging (instant feedback), pipeline for production (tests → backup → deploy → notify).

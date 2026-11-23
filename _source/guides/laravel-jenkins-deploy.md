---
title: Deploy Laravel from Jenkins to your own server
description: A Jenkinsfile that runs your Laravel tests, deploys with Cipi over SSH or the API, checks the release and rolls back only when it should, plus approvals and a one-click rollback job.
category: laravel
order: 18
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel jenkins deploy, jenkinsfile laravel, jenkins deploy php vps, jenkins zero downtime laravel, jenkins pipeline laravel ssh
related:
  - agent-vs-pipeline-deploys
  - laravel-ci-cd-git-workflow
  - laravel-aws-codedeploy
docs:
  - jenkins
  - ci-pipelines
  - how-deploys-work
  - api
  - cli-client
  - health-checks
faq:
  - Does Jenkins copy the code to the server? | No. Jenkins runs the tests and then asks the server to deploy. The server pulls the code from Git with its own read-only deploy key and builds the release itself.
  - SSH or API from Jenkins? | The API with a token limited to `deploy-manage` is the safer choice: the token can only deploy, roll back, unlock and read the status. Over SSH, the `cipi` user can run any Cipi command.
  - Can I keep my existing Jenkins stages? | Yes. Keep your test, lint and build stages and add the Deploy stage at the end, guarded by `when { branch 'main' }`.
  - Why does the deploy line look so long? | It does three things in order: deploy; if the deploy worked, check the app answers; only if it doesn't, roll back. A deploy that fails while building publishes nothing, so it must not be rolled back.
  - Can Jenkins deploy to several Cipi servers? | Yes. Add one credential (or one cipi-cli profile) per server and deploy them one after the other in the same stage.
  - Do I need the Cipi agent package? | No. The agent is only needed for push-to-deploy webhooks. Jenkins works over SSH or the API.
  - What if a step fails? | Read the troubleshooting table above first. Then check the [Jenkins docs page](/docs/jenkins), open a GitHub issue, or ask in the community.
  - Can my team roll back without SSH access? | Yes: the rollback job in step 8 gives them a button in Jenkins that asks for confirmation.
---
Your company already runs Jenkins, and you want Laravel releases to follow the same path as everything else: tests in Jenkins, then a zero-downtime deploy on your own server. With Cipi on the server, the Jenkins side is one short stage: Cipi does the deploy, Jenkins gives the order and reads the result.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Jenkinsfile** | A file in your repository that describes the pipeline: stages, steps, conditions |
| **Multibranch Pipeline** | A Jenkins job that finds every branch with a Jenkinsfile and builds it |
| **Credential** | A secret stored in Jenkins (a key, a token, a file), used by ID in the Jenkinsfile |
| **Health URL** | A page that answers 200 when the app works, like Laravel's `/up` |

## Before you start {#before}

- A Laravel app already deployed with Cipi (follow the [15-minute guide](/guides/deploy-laravel-ubuntu-vps) first).
- Jenkins 2.x with the suggested plugins, plus **SSH Agent** (for the SSH way).
- A Jenkins agent with `ssh` and `curl`, and Docker or PHP + Composer for the tests.
- A health URL: Laravel 11+ serves `/up` when `health: '/up'` is set in `bootstrap/app.php`.

```flow
Choose | SSH or API
> Decide how Jenkins reaches the server. SSH is quicker to set up; the API gives Jenkins less power.
Secrets | on the server and in Jenkins
> Create a key or a token on the server side and store it as a Jenkins credential.
Job | Multibranch Pipeline
> Create the job that finds your Jenkinsfile.
Jenkinsfile | test → deploy → check
> Add the file to the repository.
Triggers | Git → Jenkins
> Make every push start the job; turn Cipi's own webhook off.
First deploy | push and verify
> Push a small change and check the result on both sides.
```

## 1. Choose SSH or the API

| | SSH | API |
| --- | --- | --- |
| Jenkins runs | `ssh cipi@server "sudo cipi deploy shop"` | `cipi-cli prod deploy shop` |
| The secret can | Run any `cipi` command as root | Only deploy, roll back, unlock, read status |
| Server needs | Port 22 reachable from Jenkins | [`cipi api`](/docs/api) installed on a hostname |
| Jenkins agent needs | `ssh` | [`cipi-cli`](/docs/cli-client) |

For production, prefer the API. For a first try, SSH works in five minutes. Both are shown below.

## 2. Create the secret

**SSH way.** On your laptop, make a key used only by Jenkins and authorize it on the server:

```bash
$ ssh-keygen -t ed25519 -C "jenkins-deploy" -f ./jenkins_deploy -N ""
$ ssh cipi@your-server "sudo cipi ssh add '$(cat ./jenkins_deploy.pub)'"
$ ssh-keyscan -t ed25519 your-server > ./known_hosts     # the server's host key
```

Compare the fingerprint with the server's before trusting it: `ssh-keygen -lf ./known_hosts` on your laptop, `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the server. They must match.

**API way.** On the server:

```bash
$ sudo cipi api token create --name=jenkins-shop --abilities=deploy-manage --expires=2027-12-31
```

Copy the token now: it's shown only once.

## 3. Store it in Jenkins

**Manage Jenkins → Credentials → System → Global credentials → Add credentials**:

| ID | Kind | What to paste |
| --- | --- | --- |
| `cipi-ci-key` | SSH Username with private key | Username `cipi`; private key: the content of `./jenkins_deploy` |
| `cipi-known-hosts` | Secret file | Upload `./known_hosts` |
| `cipi-api-token` | Secret text | The API token (API way) |

Then delete the local copies: `rm ./jenkins_deploy ./jenkins_deploy.pub ./known_hosts`.

For the API way, install `cipi-cli` on the Jenkins agent once:

```bash
$ base=https://github.com/cipi-sh/cli/releases/latest/download
$ curl -fsSLO "$base/cipi-cli-linux-amd64" && curl -fsSLO "$base/checksums.txt"
$ sha256sum --check --ignore-missing checksums.txt
$ sudo install -m 0755 cipi-cli-linux-amd64 /usr/local/bin/cipi-cli
```

## 4. Create the job

**New Item → Multibranch Pipeline**, name it `shop`. Under **Branch Sources**, add your Git server and the repository (with a read credential if it's private). **Build Configuration**: by Jenkinsfile. Save.

A Multibranch job builds every branch and pull request, so tests run everywhere, while the deploy stage below runs only on `main`.

## 5. Add the Jenkinsfile

At the root of the repository:

```groovy
pipeline {
    agent any

    options {
        disableConcurrentBuilds()            // never two builds of the same branch at once
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        APP        = 'shop'
        SERVER     = 'cipi@203.0.113.10'
        HEALTH_URL = 'https://shop.example.com/up'
    }

    stages {
        stage('Test') {
            agent {
                docker {
                    image 'composer:2'      // or any image with PHP and Composer
                    reuseNode true
                }
            }
            steps {
                sh 'composer install --no-interaction --prefer-dist'
                sh 'cp .env.example .env && php artisan key:generate'
                sh 'php artisan test'
            }
        }

        stage('Deploy') {
            when { branch 'main' }
            steps {
                withCredentials([file(credentialsId: 'cipi-known-hosts', variable: 'KNOWN_HOSTS')]) {
                    sshagent(credentials: ['cipi-ci-key']) {
                        sh '''
                          ssh -o UserKnownHostsFile="$KNOWN_HOSTS" "$SERVER" \
                            "sudo cipi deploy $APP && { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors $HEALTH_URL >/dev/null || { sudo cipi deploy $APP --rollback; exit 1; }; }"
                        '''
                    }
                }
            }
        }
    }
}
```

The deploy line, piece by piece:

| Piece | Runs when | Does |
| --- | --- | --- |
| `sudo cipi deploy $APP` | Always | Builds and publishes the new release. If it fails, nothing was published: the build turns red here |
| `curl … $HEALTH_URL` | The deploy succeeded | Calls the app up to six times, five seconds apart |
| `sudo cipi deploy $APP --rollback; exit 1` | The app doesn't answer | Goes back to the previous release and turns the build red |

**API way:** replace the Deploy stage with this one.

```groovy
        stage('Deploy') {
            when { branch 'main' }
            environment {
                CIPI_API_URL   = 'https://api.example.com'
                CIPI_API_TOKEN = credentials('cipi-api-token')
            }
            steps {
                sh '''
                  export HOME="$(mktemp -d)"      # the cipi-cli profile lives only for this build
                  cipi-cli profiles add prod --endpoint "$CIPI_API_URL" --token "$CIPI_API_TOKEN"
                  cipi-cli prod deploy "$APP"
                  curl -fsS --retry 5 --retry-delay 5 --retry-all-errors "$HEALTH_URL" >/dev/null \
                    || { cipi-cli prod deploy rollback "$APP" -y; exit 1; }
                '''
            }
        }
```

> [!note] Keep the `'''` single quotes. The shell reads `$APP` and the secrets, not Groovy, so credentials never pass through Groovy string interpolation and Jenkins can mask them in the log.

## 6. Start it on every push and turn Cipi's webhook off

Make your Git server notify **Jenkins**:

| Git server | What to do |
| --- | --- |
| GitHub | GitHub plugin in Jenkins; repository webhook to `https://jenkins.example.com/github-webhook/`, event *push* |
| GitLab | GitLab plugin; project webhook to the URL shown in the job's triggers |
| Others | Their Jenkins plugin, or **Scan Multibranch Pipeline Triggers → Periodically** every 1–2 minutes |

Then turn **Cipi's** webhook off for this app, otherwise each push would also deploy directly. In GitHub: **Settings → Webhooks** → the hook ending in `/cipi/webhook` → untick **Active**. The Jenkins hook and the Cipi hook are two different entries: keep the first, turn off the second.

## 7. Run the first deploy

Push a small change to `main` and watch the build. On the server:

```bash
$ sudo cipi deploy shop --status      # what's running now
$ sudo cipi deploy shop --audit       # the newest entry: origin cipi-cli (SSH) or panel (API)
$ sudo cipi app logs shop --type=deploy
```

To test the safety net, deploy a commit where `/up` returns 500 on purpose (on staging): the build should turn red and `--audit` should show the rollback.

## 8. Add approvals and a rollback button

**An approval before production.** Add this stage before Deploy:

```groovy
        stage('Approve') {
            when { branch 'main' }
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    input message: 'Deploy shop to production?', ok: 'Deploy'
                }
            }
        }
```

**A rollback button.** Create a separate Pipeline job, "shop – rollback", with this script:

```groovy
pipeline {
    agent any
    stages {
        stage('Rollback') {
            steps {
                input message: 'Roll shop back to the previous release?', ok: 'Roll back'
                withCredentials([file(credentialsId: 'cipi-known-hosts', variable: 'KNOWN_HOSTS')]) {
                    sshagent(credentials: ['cipi-ci-key']) {
                        sh 'ssh -o UserKnownHostsFile="$KNOWN_HOSTS" cipi@203.0.113.10 "sudo cipi deploy shop --rollback"'
                    }
                }
            }
        }
    }
}
```

A rollback switches the code back in a second. Database migrations stay as they are, so write migrations that the previous release can live with, or turn on [pre-deploy snapshots](/docs/safe-deploy).

## Troubleshooting {#troubleshooting}

| Problem | Cause | Fix |
| --- | --- | --- |
| `No such DSL method 'sshagent'` | SSH Agent plugin missing | **Manage Jenkins → Plugins** → install SSH Agent |
| `Host key verification failed` | Known-hosts credential empty or from another server | Recreate it with `ssh-keyscan` and compare the fingerprint |
| `Permission denied (publickey)` | Key not authorized | `sudo cipi ssh add "<public key>"` on the server |
| `sudo: a terminal is required` | Connected as a user other than `cipi` | Use `cipi@server` |
| Deploy stage always skipped | Classic Pipeline job, not Multibranch | Use a Multibranch Pipeline, or remove `when { branch 'main' }` |
| Two deploys per push | Cipi's webhook still active | Untick **Active** on the `/cipi/webhook` hook |
| "Deploy locked" | Two builds at once or an interrupted deploy | Keep `disableConcurrentBuilds()`; `sudo cipi deploy shop --unlock` if nothing runs |
| `cipi-cli: command not found` | Not installed on that Jenkins agent | Install it (step 3) or pin the stage to an agent label that has it |
| 401 or 403 from the API | Token wrong, expired, or IP not allowed | `sudo cipi api token list`; `sudo cipi api ip-whitelist show` |

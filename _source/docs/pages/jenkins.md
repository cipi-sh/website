@section jenkins

Jenkins can drive Cipi deploys like any other CI: a `Jenkinsfile` runs your tests and, if they pass, asks the server to deploy. The server pulls the code from Git and builds the release itself, so Jenkins never needs to copy files or know where the app lives on disk.

```flow
Credentials | key or token in Jenkins | #credentials
> Store an SSH key (or an API token) and the server's host key as Jenkins credentials.
Jenkinsfile | test, deploy, check | #jenkinsfile
> Add a Jenkinsfile to the repository: a Test stage, then a Deploy stage that runs only on `main`.
Trigger | Git notifies Jenkins | #trigger
> Make your Git server tell Jenkins about every push, so the pipeline starts by itself.
Webhook off | one trigger per app | #webhook-off
> Turn the Cipi webhook off for the app, so the push doesn't also deploy directly.
First run | push and watch | #verify
> Push a small change and follow it in Jenkins and with `cipi deploy shop --status`.
```

## What you need {#requirements}

| Where | What |
| --- | --- |
| Jenkins | A Pipeline or **Multibranch Pipeline** job, the **SSH Agent** plugin (for the SSH way) and the **Credentials Binding** plugin (installed with the suggested plugins) |
| Jenkins agent | `ssh` and `curl`; for the API way, [`cipi-cli`](/docs/cli-client); for the test stage, PHP and Composer or Docker |
| Cipi server | Port 22 open to Jenkins (SSH way) or [`cipi api`](/docs/api) installed (API way) |

## 1. Credentials {#credentials}

**Manage Jenkins → Credentials → (global) → Add credentials**:

| ID | Kind | Content |
| --- | --- | --- |
| `cipi-ci-key` | SSH Username with private key | Username `cipi`, the private key of a new CI key ([how to create it](/docs/ci-pipelines#ssh-key)) |
| `cipi-known-hosts` | Secret file | A file with the server's host key, from `ssh-keyscan -t ed25519 your-server` |
| `cipi-api-token` | Secret text | An API token with only `deploy-manage` (API way) |

Authorize the CI key on the server once: `sudo cipi ssh add "<public key>"`.

## 2. The Jenkinsfile {#jenkinsfile}

### Over SSH {#ssh}

```groovy
// Jenkinsfile
pipeline {
    agent any

    options {
        disableConcurrentBuilds()            // one build of this branch at a time
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

What the deploy line does, in order: deploy; only if the deploy succeeded, call the health URL up to six times; only if the app doesn't answer, roll back and fail the build. If the deploy itself fails, nothing was published and nothing is rolled back. [Why](/docs/ci-pipelines#deploy-step).

> [!note] The `sh '''…'''` blocks use single quotes on purpose: the shell, not Groovy, reads `$APP` and the credentials. That keeps secrets out of Jenkins' Groovy interpolation warnings and out of the build log.

### Over the API, without SSH {#api}

Install `cipi-cli` on the Jenkins agent once ([download](https://github.com/cipi-sh/cli/releases)), then replace the Deploy stage:

```groovy
        stage('Deploy') {
            when { branch 'main' }
            environment {
                CIPI_API_URL   = 'https://api.example.com'
                CIPI_API_TOKEN = credentials('cipi-api-token')
            }
            steps {
                sh '''
                  export HOME="$(mktemp -d)"     # the cipi-cli profile lives only for this build
                  cipi-cli profiles add prod --endpoint "$CIPI_API_URL" --token "$CIPI_API_TOKEN"
                  cipi-cli prod deploy "$APP"
                  curl -fsS --retry 5 --retry-delay 5 --retry-all-errors "$HEALTH_URL" >/dev/null \
                    || { cipi-cli prod deploy rollback "$APP" -y; exit 1; }
                '''
            }
        }
```

The token can only deploy, roll back, unlock and read the deploy status. Jenkins masks it in the console output.

### Ask for approval before production {#approval}

Add a stage before Deploy. Someone with access to the job clicks **Deploy** in Jenkins; if nobody does within an hour, the build stops.

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

## 3. Start the pipeline on every push {#trigger}

| Git server | How Jenkins hears about pushes |
| --- | --- |
| GitHub | Install the GitHub plugin, then add a repository webhook to `https://jenkins.example.com/github-webhook/` (event: push) |
| GitLab | Install the GitLab plugin and add a project webhook to the URL the job shows under **Build Triggers** |
| Bitbucket, Gitea, others | Their Jenkins plugin, or the Multibranch option **Periodically if not otherwise run** (for example every 2 minutes) |

This webhook goes to **Jenkins**, not to your app. It's a different hook from Cipi's `/cipi/webhook`.

## 4. Turn the Cipi webhook off {#webhook-off}

Otherwise every push deploys twice: once directly through the app's webhook, once from Jenkins. In GitHub: **Settings → Webhooks** → the `/cipi/webhook` hook → untick **Active**. Other providers: [CI/CD pipelines](/docs/ci-pipelines#webhook-off).

## 5. First run {#verify}

```bash
# push a small change to main, then on the server:
$ cipi deploy shop --status      # running, queued or idle
$ cipi deploy shop --audit       # origin "cipi-cli" (SSH) or "panel" (API)
```

## A rollback button {#rollback-job}

A small separate Pipeline job (for example "shop – rollback") gives your team a button that doesn't require SSH access:

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

A rollback switches code only: database migrations stay as they are. See [Deploy & roll back](/docs/deploying).

## Common problems {#problems}

| Problem | Cause | Fix |
| --- | --- | --- |
| `No such DSL method 'sshagent'` | SSH Agent plugin missing | Install it from **Manage Jenkins → Plugins** |
| `Host key verification failed` | The known-hosts file is empty or from another server | Save it again with `ssh-keyscan` and compare the fingerprint |
| `Permission denied (publickey)` | The CI key isn't authorized on the server | `sudo cipi ssh add "<public key>"` |
| Deploy stage skipped | Not a Multibranch job, so `branch 'main'` never matches | Use a Multibranch Pipeline, or remove the `when` line |
| Two deploys per push | The Cipi webhook is still active | [Turn it off](#webhook-off) |
| "Deploy locked" | Two builds at once or an interrupted deploy | Keep `disableConcurrentBuilds()`; if nothing runs, `sudo cipi deploy shop --unlock` |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Does Jenkins copy the code to the server? | No. The server pulls it from Git with its own read-only deploy key. Jenkins only says when. |
| Can I keep my existing Jenkins test stages? | Yes. Keep them and add the Deploy stage at the end. |
| Can one Jenkins deploy many servers? | Yes. One credential per server, or one cipi-cli profile per server. See [several servers](/docs/ci-pipelines#multi-server). |
| Is the CI key dangerous? | Over SSH, the `cipi` user can run any `cipi` command. For production, the API way with a `deploy-manage` token is safer. |

The whole setup, step by step from an empty Jenkins: [Deploy Laravel from Jenkins](/guides/laravel-jenkins-deploy).

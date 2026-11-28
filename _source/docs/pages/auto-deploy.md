@section ci-webhook

Push to your branch and the app is live a minute later. The Git provider calls a signed webhook on your app; the deploy itself runs on the server as the app user. CI needs no SSH key and the server opens no extra port.

<cipi-term name="auto-deploy"></cipi-term>

## How it works {#flow}

```flow
git push | to the deploy branch
> You push commits to the app's deploy branch (`main` by default). Pushes to other branches are acknowledged and ignored.
Provider → /cipi/webhook | signed request over HTTPS
> GitHub, GitLab, Bitbucket, Gitea or Azure DevOps call the app's webhook URL over HTTPS, signed with the app's secret.
Verify & queue | signature, branch; answers 200 at once
> Cipi checks the signature and the branch. If both are right it leaves a small trigger and answers 200 immediately, so the provider never times out.
Cron, within a minute | starts the deploy as the app user
> A cron job checks for triggers every minute and starts the deploy as the app's own Linux user, never as root.
Deploy | the normal zero-downtime pipeline
> From here it's a normal deploy: new release, Composer, migrations, atomic swap, workers restarted. You get the usual notification. A push that arrives during a deploy waits for it; a commit whose deploy failed is not retried by itself.
```

The webhook only drops a trigger file; it never runs the deploy itself. That keeps the HTTP answer instant (providers time out after ~10 s) and the deploy in the same safe context as `sudo cipi deploy`.

| Receiver | Used by | Verifies |
| --- | --- | --- |
| [Cipi Agent](/docs/agent-install) (`cipi/agent`) | Laravel apps | GitHub/Bitbucket HMAC, GitLab/Azure token, Gitea/Forgejo signature |
| Built-in receiver | Node apps | GitHub/Bitbucket HMAC, GitLab/Azure token |

## Set it up {#setup}

```bash
# in your Laravel project
$ composer require cipi/agent && git commit -am "Add Cipi Agent" && git push
# on the server: one manual deploy, so the route exists
$ sudo cipi deploy myapp
$ sudo cipi git status            # webhook already created?
$ sudo cipi deploy myapp --webhook  # if not: URL and secret to add by hand
```

| Provider | Payload URL | Secret | Events |
| --- | --- | --- | --- |
| GitHub | `https://myapp.com/cipi/webhook` | the token from `--webhook` | push |
| GitLab | same | Secret token: same value | Push events |

Only pushes to `CIPI_DEPLOY_BRANCH` deploy; others get `skipped`. Cipi keeps it in step with `sudo cipi app edit --branch`. Use HTTPS ([cipi ssl install](/docs/ssl)) so the secret never travels in clear text.

Verify with a small commit:

```bash
$ sudo cipi deploy myapp --status
$ sudo cipi app logs myapp --type=deploy
```

Every webhook deploy lands in the [audit ledger](/docs/deploy-audit) with pusher, commit, delivery ID and source IP.

## From any tool, not only Git {#generic}

The agent's webhook also accepts the secret as a Bearer token, so anything that can send an HTTP request can queue a deploy: a CI job, a scheduler, a chat bot.

```bash
$ curl -fsS -X POST https://myapp.com/cipi/webhook \
    -H "Authorization: Bearer $CIPI_WEBHOOK_TOKEN" -H "Content-Type: application/json" \
    -d '{"ref":"refs/heads/main","pusher":{"name":"release-bot"}}'
{"status":"queued","app":"myapp","provider":"webhook","branch":"main", …}
```

It queues the deploy and answers at once; it doesn't wait for the result. When a pipeline must know whether the deploy worked, use SSH or the API instead: [CI/CD pipelines](/docs/ci-pipelines#connect).

## Troubleshooting {#troubleshooting}

| Symptom | Cause | Fix |
| --- | --- | --- |
| 404 | Agent not deployed yet | `sudo cipi deploy myapp` after adding `cipi/agent` |
| 403, invalid signature | Secret mismatch | Copy the token from `sudo cipi deploy myapp --webhook` again |
| 200 but no deploy | Another branch was pushed | Check `CIPI_DEPLOY_BRANCH` |
| Push queued, deploys later | A deploy was running | Nothing: it deploys when that one ends (`sudo cipi deploy myapp --status` says *queued*) |
| 200 but the same commit doesn't deploy again | It failed before and is [paused](/docs/deploying#paused) | Push a fix, or `sudo cipi deploy myapp` |
| Two deploys per push | Webhook and pipeline both active | Keep [one trigger](/docs/how-deploys-work) |

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| Push doesn't deploy | Pushed to another branch, or the webhook was removed: `sudo cipi deploy myapp --webhook` |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Webhook or CI? | Webhook for most apps; CI when tests must pass first. [Guide](/guides/laravel-ci-cd-git-workflow). |

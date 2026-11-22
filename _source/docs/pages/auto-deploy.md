@section ci-webhook

Push to your branch and the app is live a minute later. The Git provider calls a signed webhook on your app; the deploy itself runs on the server as the app user. CI needs no SSH key and the server opens no extra port.

<cipi-term name="auto-deploy"></cipi-term>

## How it works {#flow}

```flow
git push | to the deploy branch
Provider → /cipi/webhook | signed request over HTTPS
Verify & queue | signature, branch; answers 200 at once
Cron, within a minute | starts the deploy as the app user
Deploy | the normal zero-downtime pipeline
```

The webhook only drops a trigger file; it never runs the deploy itself. That keeps the HTTP answer instant (providers time out after ~10 s) and the deploy in the same safe context as `cipi deploy`.

| Receiver | Used by | Verifies |
| --- | --- | --- |
| [Cipi Agent](/docs/agent-install) (`cipi/agent`) | Laravel apps | GitHub/Bitbucket HMAC, GitLab/Azure token, Gitea/Forgejo signature |
| Built-in receiver | Node apps | GitHub/Bitbucket HMAC, GitLab/Azure token |

## Set it up {#setup}

```bash
# in your Laravel project
$ composer require cipi/agent && git commit -am "Add Cipi Agent" && git push
# on the server: one manual deploy, so the route exists
$ cipi deploy myapp
$ cipi git status                 # webhook already created?
$ cipi deploy myapp --webhook     # if not: URL and secret to add by hand
```

| Provider | Payload URL | Secret | Events |
| --- | --- | --- | --- |
| GitHub | `https://myapp.com/cipi/webhook` | the token from `--webhook` | push |
| GitLab | same | Secret token: same value | Push events |

Only pushes to `CIPI_DEPLOY_BRANCH` deploy; others get `skipped`. Cipi keeps it in step with `cipi app edit --branch`. Use HTTPS ([cipi ssl install](/docs/ssl)) so the secret never travels in clear text.

Verify with a small commit:

```bash
$ cipi deploy myapp --status
$ cipi app logs myapp --type=deploy
```

Every webhook deploy lands in the [audit ledger](/docs/deploy-audit) with pusher, commit, delivery ID and source IP.

## Troubleshooting {#troubleshooting}

| Symptom | Cause | Fix |
| --- | --- | --- |
| 404 | Agent not deployed yet | `cipi deploy myapp` after adding `cipi/agent` |
| 403, invalid signature | Secret mismatch | Copy the token from `cipi deploy myapp --webhook` again |
| 200 but no deploy | Another branch was pushed | Check `CIPI_DEPLOY_BRANCH` |
| Lock error | An interrupted deploy | `cipi deploy myapp --unlock` |
| Two deploys per push | Webhook and pipeline both active | Keep [one trigger](/docs/how-deploys-work) |

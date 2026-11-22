@section ci-overview

Every deploy runs the same pipeline on the server. What changes is **who starts it**: a push to Git, your CI, you, the panel or an AI agent.

```flow
Trigger | push, CI, CLI, panel, MCP
Build release | clone, composer, assets
Migrate | optional DB snapshot first
Swap symlink | atomic, zero downtime
Verify | health check, auto rollback
```

## Choose a trigger {#choose}

| | Push to deploy (webhook) | CI/CD pipeline over SSH |
| --- | --- | --- |
| Starts when | You push to the app's branch | Your pipeline's deploy job runs |
| CI needs server access | No: only HTTPS to the app | Yes: a dedicated SSH key as a CI secret |
| Tests before deploy | Separate (the push deploys anyway) | Built in: deploy only if tests pass |
| Setup | One webhook, created for you | SSH key, secrets, workflow file |
| Best for | Most apps | Gated releases, backups, review apps |

| You want… | Use | Read |
| --- | --- | --- |
| Push `main`, it's live | Webhook | [Auto-deploy on push](/docs/auto-deploy) |
| Deploy only if tests pass | Pipeline (turn the webhook off) | [CI/CD pipelines](/docs/ci-pipelines) |
| Backup before every release | Pipeline, or the built-in snapshot | [Safe deploy](/docs/safe-deploy) |
| A live URL per branch | Pipeline | [Preview environments](/docs/preview-environments) |
| Slack/Telegram on every deploy | Either | [Deploy notifications](/docs/deploy-notifications) |

> [!warning] **One trigger per app.** A webhook and a pipeline deploying the same push will collide on the deploy lock.

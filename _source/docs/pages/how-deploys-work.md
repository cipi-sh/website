@section ci-overview

A Cipi deploy always runs **on your server**, as the app's own Linux user. The server pulls the code from Git, builds a new release next to the live one and switches to it in one step. Nothing is uploaded from your laptop or your CI, and no build artifacts travel over the network.

What changes from one setup to another is only **who says "deploy now"**. There are two main ways to say it, plus a few manual ones:

| | Push to deploy (agent mode) | Pipeline mode |
| --- | --- | --- |
| In one sentence | Every push to the deploy branch goes live by itself | Your CI decides when to deploy, usually after the tests pass |
| Who starts the deploy | Your Git provider, through a signed webhook | A job in GitHub Actions, GitLab CI, Jenkins, AWS CodeDeploy… |
| What your app needs | The [`cipi/agent`](/docs/agent-install) package (Laravel), or nothing for Node apps | Nothing |
| What CI needs | Nothing | An SSH key, or an API token with only `deploy-manage` |
| Tests before going live | No: the push deploys anyway | Yes: the deploy job runs only if tests pass |
| Setup time | About 2 minutes | 10 to 30 minutes, once |
| Read | [Auto-deploy on push](/docs/auto-deploy) | [CI/CD pipelines](/docs/ci-pipelines), [Jenkins](/docs/jenkins), [AWS CodeDeploy](/docs/aws-codedeploy) |

Both modes end in the same place: the same pipeline, the same lock, the same [audit ledger](/docs/deploy-audit) and the same notifications. You can switch from one to the other at any time without touching the server.

## What every deploy does {#pipeline}

```flow
Trigger | push, CI, CLI, panel, API, MCP
> Something asks for a deploy: a `git push` through the webhook, a CI job, `sudo cipi deploy` on the server, the web panel, the REST API or an AI assistant through MCP. From here on, all of them take exactly the same path.
Lock | one deploy at a time
> Cipi takes the app's deploy lock. If another deploy is already running, a push waits in the queue and deploys right after it, while a deploy asked by hand stops at once with a clear message: two deploys never write the same release.
Build release | clone, Composer, assets
> A new folder under `releases/` gets the code of the deploy branch, its Composer packages and, if you set a build command, its front-end assets. The live site is not touched yet: if anything fails here, **nothing is published** and the previous release keeps serving.
Migrate | optional DB snapshot first
> Migrations run against the live database. If you turned on [pre-deploy snapshots](/docs/safe-deploy), Cipi takes one just before, as a restore point.
Swap | atomic symlink, zero downtime
> The `current` link moves to the new release in a single operation. Visitors go from the old code to the new one without a single failed request.
Verify | workers, health check, notify
> Workers and Horizon restart on the new code, the [health check](/docs/health-checks) calls your app (if you set one) and the notification goes out. With automatic rollback on, an unhealthy release is replaced by the previous one within seconds.
```

> [!note] Cipi always deploys the **latest commit of the app's branch** at the moment the release is built. A pipeline doesn't send a specific commit: it tells the server to pull the branch. Keep one deploy per branch at a time in your CI (every recipe in these docs shows how), so the commit your tests checked is the one that goes live.

## Push to deploy: the agent mode {#agent}

The simplest setup, and the right one for most apps. You push, the app is live about a minute later.

```flow
git push | to the deploy branch
> You push to the app's branch (`main` by default). Pushes to other branches are answered and ignored.
Webhook | signed HTTPS call to the app
> GitHub, GitLab, Bitbucket, Gitea, Forgejo or Azure DevOps call `https://your-app/cipi/webhook`. The request is signed with a secret only your server and the provider know.
Agent checks it | signature and branch
> In a Laravel app, the [`cipi/agent`](/docs/agent-install) package checks the signature and the branch, writes a small trigger file and answers `200` immediately. It never runs the deploy inside a web request.
Server deploys | within a minute
> A cron job on the server finds the trigger and starts the normal deploy as the app user.
```

Why it is built this way:

- **No server access for anyone.** The provider talks to your app over HTTPS, like any visitor. No SSH key leaves the server and no extra port opens.
- **Instant answer, safe deploy.** The webhook returns in milliseconds, so providers never time out, and the deploy runs with the same rights as `sudo cipi deploy`.
- **Set up for you.** With a provider token saved (`sudo cipi git github-token …`), Cipi creates the webhook and the secret when you create the app. See [Git providers](/docs/git).

Node apps don't need the agent: Cipi installs a built-in receiver for them. Full details: [Auto-deploy on push](/docs/auto-deploy).

## Pipeline mode {#pipeline-mode}

Your CI runs the tests first and asks for a deploy only if they pass. The server still does the deploy itself: the pipeline only gives the order, in one of three ways.

| Way to call | How | Gives CI | Best for |
| --- | --- | --- | --- |
| **SSH** | `ssh cipi@server "sudo cipi deploy shop"` | An SSH key that can run any `cipi` command as root | Simple setups, one server |
| **API** ([cipi-cli](/docs/cli-client) or `curl`) | `cipi-cli deploy shop` | A token limited to `deploy-manage`: deploy, rollback, unlock, status | Least privilege, no SSH, many servers |
| **Agent webhook** | `curl -X POST https://shop.example.com/cipi/webhook -H "Authorization: Bearer …"` | The app's webhook secret: it can only queue a deploy | Tools that can only send an HTTP request |

The API and SSH wait for the deploy and return its result, so the pipeline turns red when the deploy fails. The webhook only queues the deploy and answers at once.

Recipes for every popular CI are in [CI/CD pipelines](/docs/ci-pipelines): GitHub Actions, GitLab CI/CD, Bitbucket Pipelines, Azure Pipelines, Gitea and Forgejo Actions, CircleCI and Laravel Envoy. [Jenkins](/docs/jenkins) and [AWS CodeDeploy](/docs/aws-codedeploy) have their own pages.

## Other ways to deploy {#manual}

| From | Command or place | Read |
| --- | --- | --- |
| The server | `sudo cipi deploy shop` | [Deploy & roll back](/docs/deploying) |
| Your laptop, without SSH | `cipi-cli prod deploy shop` | [CLI client](/docs/cli-client) |
| A browser | The app's **Deploy** tab | [Web panel](/docs/gui) |
| Your own code | `POST /api/apps/shop/deploy` or the [PHP SDK](/docs/php-sdk) | [REST API](/docs/api) |
| An AI assistant | "Deploy shop and tell me if the health check passes" | [MCP server](/docs/mcp) |
| A preview per branch | One app per branch, created and removed by CI | [Preview environments](/docs/preview-environments) |

## Which one should I use? {#choose}

| You want… | Use | Read |
| --- | --- | --- |
| Push `main`, it's live | Agent mode | [Auto-deploy on push](/docs/auto-deploy) |
| Deploy only if tests pass | Pipeline mode, webhook off | [CI/CD pipelines](/docs/ci-pipelines) |
| Your company already runs Jenkins | Pipeline mode from a Jenkinsfile | [Jenkins](/docs/jenkins) |
| Releases managed in AWS | AWS CodeDeploy calling Cipi | [AWS CodeDeploy](/docs/aws-codedeploy) |
| A backup before every release | Pipeline mode, or the built-in snapshot | [Safe deploy](/docs/safe-deploy) |
| A live URL per branch | Pipeline mode | [Preview environments](/docs/preview-environments) |
| Fast staging, careful production | Agent mode on staging, pipeline on production | [Guide: agent vs pipeline](/guides/agent-vs-pipeline-deploys) |

> [!warning] **One trigger per app.** If the webhook and a pipeline both react to the same push, you get two deploys of it — or a red pipeline, when it asks while the webhook's deploy is running. When you move an app to pipeline mode, turn its webhook off in the Git provider (GitHub: **Settings → Webhooks**, untick **Active**).

## Common problems {#problems}

| Problem | Cause | Fix |
| --- | --- | --- |
| Two deploys for one push | Webhook and pipeline both active | Turn the webhook off for that app |
| *A deploy of 'shop' is running* | Another deploy is in flight | `sudo cipi deploy shop --status`; retry when it ends (pushes wait in the queue by themselves) |
| A push did not deploy | The same commit failed before and is [paused](/docs/deploying#paused) | Push a fix, or `sudo cipi deploy shop` |
| CI green, old code live | The pipeline queued a deploy through the webhook and didn't wait | Use SSH or the API when CI must know the result |
| Webhook was removed and came back | `sudo cipi git refresh` re-creates webhooks | Turn it off again after a refresh |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Does CI upload my code to the server? | No. The server always pulls from Git with its own read-only deploy key. CI only says when. |
| Can I deploy a specific commit or tag? | Cipi deploys the tip of the app's branch. To ship a tag, point a release branch at it and deploy that branch. |
| What if two deploys start at once? | The lock lets one run. A push that arrives meanwhile is queued and deploys after it; a deploy asked by hand stops with a message. `sudo cipi deploy shop --status` shows what is running. |
| Does a failed deploy block the next push? | No. The failed commit is [paused](/docs/deploying#paused) so a retry doesn't build it again, but any new commit deploys. |
| Can I see who deployed? | `sudo cipi deploy shop --audit` lists every deploy with its origin (webhook, CLI, panel, API), the operator and the IP. See [Deploy audit](/docs/deploy-audit). |
| How do I go back? | `sudo cipi deploy shop --rollback` switches to the previous release in a second. Migrations are not undone. |
| Do I need the agent for pipeline mode? | No. The agent is needed only for push to deploy in Laravel apps (and for its health, MCP and anonymizer endpoints). |

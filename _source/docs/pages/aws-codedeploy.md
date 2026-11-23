@section aws-codedeploy

[AWS CodeDeploy](https://aws.amazon.com/codedeploy/) can orchestrate releases on Cipi servers: it decides when, on which servers and in which order, and Cipi does the deploy on each server. It fits teams that already manage releases in AWS (CodePipeline, CodeBuild, IAM approvals) or that want to roll a release across several Cipi servers one at a time.

> [!info] Cipi doesn't need CodeDeploy. If you only want "tests pass, then deploy", a [CI pipeline](/docs/ci-pipelines) is simpler. Use CodeDeploy when AWS is already where your releases are managed.

## How it fits together {#how}

CodeDeploy normally copies a bundle of files onto the server. With Cipi, the server already knows how to fetch and build the app from Git, so the CodeDeploy bundle stays tiny: an `appspec.yml` and two scripts. CodeDeploy runs the scripts; the scripts call Cipi.

```flow
Release starts | CodePipeline, CI or console
> A deployment is created: by CodePipeline, by your CI with `aws deploy create-deployment`, or by hand in the console.
Agent picks it up | outbound HTTPS only
> The CodeDeploy agent on the Cipi server polls AWS over HTTPS (port 443, outgoing). No inbound port opens.
ApplicationStart | scripts/deploy.sh → cipi deploy
> CodeDeploy runs `scripts/deploy.sh`, which runs `cipi deploy shop`. Cipi pulls the branch from Git, builds the release and switches to it with zero downtime.
ValidateService | scripts/validate.sh
> CodeDeploy runs `scripts/validate.sh`: it calls the health URL and, if the app doesn't answer, rolls back with Cipi and fails the deployment.
Next server | one at a time or all at once
> With several servers in the deployment group, CodeDeploy moves to the next one according to the deployment configuration, and stops if one fails.
```

| | |
| --- | --- |
| Servers | EC2 instances, or any Cipi server registered as an **on-premises instance** (Hetzner, OVHcloud, bare metal…) |
| Operating system | The CodeDeploy agent 2.x supports Ubuntu Server 24.04 and 26.04 LTS, on x86_64 and arm64 |
| Network | The agent only makes outgoing HTTPS calls to AWS: Cipi's firewall needs no change |
| Cost | No CodeDeploy charge on EC2; AWS charges per on-premises instance update (check the [current price](https://aws.amazon.com/codedeploy/pricing/)) |

## 1. Install the CodeDeploy agent on the Cipi server {#agent}

Follow AWS's guide for Ubuntu: [Install the CodeDeploy agent for Ubuntu Server](https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent-operations-install-ubuntu.html). For agent 2.x it comes down to:

```bash
$ sudo apt update && sudo apt install -y wget
$ cd /tmp
$ wget https://aws-codedeploy-eu-central-1.s3.eu-central-1.amazonaws.com/latestv2/install   # use your Region
$ chmod +x ./install && sudo ./install auto
$ systemctl status codedeploy-agent      # "The AWS CodeDeploy agent is running."
```

**On EC2**, attach an instance profile that can read the deployment bundles (for example the AWS managed policy for CodeDeploy EC2 instances, plus read access to your S3 bucket).

**Outside AWS**, register the server as an on-premises instance (with an IAM user or, better, an IAM role session) and give it a tag such as `app=shop`. AWS explains both ways in [Working with on-premises instances](https://docs.aws.amazon.com/codedeploy/latest/userguide/instances-on-premises.html).

## 2. Create the application and the deployment group {#group}

In the CodeDeploy console (or with the AWS CLI):

| Setting | Value |
| --- | --- |
| Application | `shop`, compute platform **EC2/On-premises** |
| Deployment group | `production` |
| Targets | The tag you gave the server(s), e.g. `app=shop` |
| Deployment configuration | `CodeDeployDefault.OneAtATime` for several servers, `AllAtOnce` for one |
| Load balancer | Off (Cipi switches releases without downtime on each server) |
| **Rollbacks** | **Off**: see below |

> [!warning] **Turn CodeDeploy's automatic rollback off.** CodeDeploy rolls back by deploying the previous bundle again. With Cipi, that would run `cipi deploy` again, and Cipi always deploys the latest commit of the branch: you would get the new code a second time, not the old one. The `validate.sh` script below rolls back with Cipi instead, which really returns to the previous release.

## 3. The bundle: appspec.yml and two scripts {#bundle}

Put these in a `codedeploy/` folder in the repository.

```yaml
# codedeploy/appspec.yml
version: 0.0
os: linux
files:
  - source: /
    destination: /opt/codedeploy-cipi/shop
hooks:
  ApplicationStart:
    - location: scripts/deploy.sh
      timeout: 1800
  ValidateService:
    - location: scripts/validate.sh
      timeout: 300
```

```bash
#!/usr/bin/env bash
# codedeploy/scripts/deploy.sh: CodeDeploy runs it as root
set -euo pipefail
/usr/local/bin/cipi deploy shop
```

```bash
#!/usr/bin/env bash
# codedeploy/scripts/validate.sh: health check, Cipi rollback if the app is down
set -uo pipefail
APP=shop
HEALTH_URL=https://shop.example.com/up

if ! curl -fsS --retry 5 --retry-delay 5 --retry-all-errors "$HEALTH_URL" >/dev/null; then
  echo "Unhealthy: rolling back with Cipi"
  /usr/local/bin/cipi deploy "$APP" --rollback
  exit 1
fi

# Revisions from GitHub carry the commit CodeDeploy was asked to release.
if [ -n "${BUNDLE_COMMIT:-}" ]; then
  live=$(sudo -u "$APP" git -C "/home/$APP/current" rev-parse HEAD 2>/dev/null || true)
  [ "$live" = "$BUNDLE_COMMIT" ] || echo "Note: live commit $live, requested $BUNDLE_COMMIT (a newer push reached the branch)"
fi
echo "Healthy"
```

Make both scripts executable before committing: `chmod +x codedeploy/scripts/*.sh`.

| Hook | Why this one |
| --- | --- |
| `ApplicationStart` | Runs after CodeDeploy has placed the bundle; it's where the app "starts", so it's where Cipi deploys |
| `ValidateService` | CodeDeploy's place for "is it working?". A non-zero exit fails the deployment and stops it before the next server |

If the deploy fails while building the release, `deploy.sh` fails, nothing was published, and `validate.sh` never runs: there's nothing to roll back.

## 4. Start a deployment {#start}

From the console (**Create deployment**), from CodePipeline, or from any CI with the AWS CLI.

**From an S3 bundle** (works with any Git host):

```bash
$ aws deploy push --application-name shop \
    --s3-location s3://my-deploy-bundles/shop/$COMMIT_SHA.zip --source codedeploy
$ aws deploy create-deployment --application-name shop --deployment-group-name production \
    --s3-location bucket=my-deploy-bundles,key=shop/$COMMIT_SHA.zip,bundleType=zip
```

**From GitHub** (after connecting CodeDeploy to GitHub in the console). Note that CodeDeploy then uses the whole repository as the bundle: keep `appspec.yml` at the repository root in this case, with the paths of the scripts changed to match.

```bash
$ aws deploy create-deployment --application-name shop --deployment-group-name production \
    --github-location repository=you/shop,commitId=$COMMIT_SHA
```

To wait for the result in CI: `aws deploy wait deployment-successful --deployment-id <id>`.

## 5. Turn the Cipi webhook off {#webhook-off}

If the app also deploys on push, every push would deploy before CodeDeploy does. Turn the `/cipi/webhook` hook off in your Git provider. Where: [CI/CD pipelines](/docs/ci-pipelines#webhook-off).

## With CodePipeline {#codepipeline}

A typical pipeline: **Source** (GitHub, GitLab, Bitbucket or CodeCommit) → **Build** (CodeBuild runs `php artisan test` and outputs the `codedeploy/` folder as the artifact) → **Deploy** (CodeDeploy, deployment group `production`). Add a **Manual approval** action before Deploy for production.

## Common problems {#problems}

| Problem | Cause | Fix |
| --- | --- | --- |
| Deployment stuck in "Pending" | The agent isn't running or can't reach AWS | `systemctl status codedeploy-agent`; check outgoing HTTPS |
| `ScriptFailed` in ApplicationStart | `cipi deploy` failed | Read the deploy log: `cipi app logs shop --type=deploy`. Nothing was published |
| `ScriptFailed` in ValidateService | The app didn't answer and Cipi rolled back | Check the release that failed: `cipi deploy shop --log` |
| "appspec.yml not found" | The bundle root is wrong | With S3, `--source codedeploy`; with GitHub, `appspec.yml` at the repository root |
| New code deployed again after a failure | CodeDeploy's automatic rollback is on | Turn it off in the deployment group |
| Permission denied on the scripts | Scripts not executable in Git | `chmod +x codedeploy/scripts/*.sh` and commit |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Does CodeDeploy copy my app to the server? | No. It copies only the small `codedeploy/` bundle. Cipi pulls the app from Git with its own deploy key. |
| Can I use it on servers outside AWS? | Yes, as on-premises instances: they need the agent and outgoing HTTPS to AWS. |
| Can I deploy a specific commit? | Cipi deploys the latest commit of the branch. `validate.sh` tells you when it differs from the commit you asked for. |
| Can CodeDeploy update several Cipi servers? | Yes. Put them in the same deployment group; `OneAtATime` updates one server, checks it, then the next. |
| Does this replace Cipi's own health check? | No, they work together. You can also keep Cipi's [post-deploy check](/docs/health-checks) for notifications. |

Step by step from an empty AWS account: [Deploy Laravel with AWS CodeDeploy](/guides/laravel-aws-codedeploy).

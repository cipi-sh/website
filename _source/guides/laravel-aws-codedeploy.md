---
title: Deploy Laravel with AWS CodeDeploy and Cipi
description: Let AWS CodeDeploy orchestrate releases while Cipi does the zero-downtime deploy on each server, on EC2 or outside AWS, with a health check, a correct rollback and GitHub Actions on top.
category: laravel
order: 19
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel aws codedeploy, codedeploy laravel ubuntu, codedeploy appspec laravel, codedeploy on-premises laravel, aws codepipeline laravel deploy
related:
  - agent-vs-pipeline-deploys
  - laravel-jenkins-deploy
  - laravel-ci-cd-git-workflow
docs:
  - aws-codedeploy
  - ci-pipelines
  - how-deploys-work
  - health-checks
  - deploying
faq:
  - Do I need CodeDeploy to use Cipi on AWS? | No. Cipi deploys on its own, from a push or from any CI. CodeDeploy is worth it when your releases are already managed in AWS, or to roll a release across several servers one at a time.
  - Does CodeDeploy upload my Laravel app? | No. It sends a small bundle with `appspec.yml` and two scripts. The scripts call Cipi, which pulls the app from Git with its own deploy key.
  - Why turn off CodeDeploy's automatic rollback? | CodeDeploy rolls back by deploying the previous bundle again, which would run `sudo cipi deploy` again and publish the newest commit a second time. The validate script rolls back with Cipi, which really returns to the previous release.
  - Can I use it on Hetzner or another provider? | Yes, as an on-premises instance. The server needs the CodeDeploy agent and outgoing HTTPS to AWS. AWS charges per on-premises instance update; on EC2 there's no CodeDeploy charge.
  - Which Ubuntu versions work? | The CodeDeploy agent 2.x supports Ubuntu Server 24.04 and 26.04 LTS, on x86_64 and arm64, the same versions Cipi supports.
  - Can I release a specific commit? | Cipi deploys the latest commit of the branch. With revisions from GitHub, the validate script compares it with the commit CodeDeploy asked for and tells you if they differ.
  - What if a step fails? | Read the troubleshooting table above first. Then check the [CodeDeploy docs page](/docs/aws-codedeploy), open a GitHub issue, or ask in the community.
  - Does this open any port on my server? | No. The CodeDeploy agent only makes outgoing HTTPS calls, and Cipi's firewall allows them already.
---
AWS CodeDeploy is good at deciding **when** and **where** a release goes: after an approval, to one server at a time, stopping if one fails. Cipi is good at **how**: pulling the app from Git, building a release, migrating and switching with zero downtime. This guide plugs them together, so CodeDeploy orchestrates and Cipi deploys.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **CodeDeploy agent** | A small program on the server that asks AWS "anything to deploy?" and runs your scripts |
| **Application / deployment group** | CodeDeploy's names for "what" (`shop`) and "where" (the servers tagged `app=shop`) |
| **Revision / bundle** | The files CodeDeploy sends: here only `appspec.yml` and two scripts |
| **Hook** | A moment of the deployment where CodeDeploy runs one of your scripts (`ApplicationStart`, `ValidateService`…) |
| **On-premises instance** | Any server outside EC2 (Hetzner, OVHcloud, your own hardware) registered with CodeDeploy |

## Before you start {#before}

- A Laravel app already running on a Cipi server ([15-minute guide](/guides/deploy-laravel-ubuntu-vps)).
- An AWS account, the AWS CLI on your laptop, and an S3 bucket for the bundles (or a GitHub connection in CodeDeploy).
- A health URL, such as Laravel's `/up`.

```flow
Agent | on the Cipi server
> Install the CodeDeploy agent on the server. It only makes outgoing HTTPS calls.
Permissions | instance profile or registration
> Let the server talk to CodeDeploy: an IAM instance profile on EC2, or an on-premises registration elsewhere.
Application | deployment group, rollback off
> Create the CodeDeploy application and the group of servers. Turn CodeDeploy's own rollback off.
Bundle | appspec.yml + two scripts
> Add a `codedeploy/` folder to the repository: one script deploys with Cipi, one checks the app.
First release | from your laptop
> Push a bundle and create a deployment from the AWS CLI.
CI | GitHub Actions after the tests
> Let CI create the deployment when the tests pass, without long-lived AWS keys.
```

## 1. Install the CodeDeploy agent on the Cipi server

Log in to the server and install the agent 2.x for your Region (here `eu-central-1`):

```bash
$ sudo apt update && sudo apt install -y wget
$ cd /tmp
$ wget https://aws-codedeploy-eu-central-1.s3.eu-central-1.amazonaws.com/latestv2/install
$ chmod +x ./install && sudo ./install auto
$ systemctl status codedeploy-agent
```

You should read *The AWS CodeDeploy agent is running*. The bucket name changes with the Region: AWS lists them in its [install guide](https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent-operations-install-ubuntu.html). Nothing to change in Cipi's firewall: the agent only talks out, over HTTPS.

## 2. Let the server talk to CodeDeploy

| Server | What to do |
| --- | --- |
| **EC2** | Attach an IAM instance profile that can read the bundles from your S3 bucket (AWS provides a managed policy for CodeDeploy EC2 instances). Tag the instance `app=shop` |
| **Outside AWS** | Register it as an on-premises instance with an IAM role session (recommended) or an IAM user, following [Working with on-premises instances](https://docs.aws.amazon.com/codedeploy/latest/userguide/instances-on-premises.html), and tag it `app=shop` |

On-premises updates are billed per instance update; deployments to EC2 have no CodeDeploy charge. Check the [current pricing](https://aws.amazon.com/codedeploy/pricing/).

## 3. Create the application and the deployment group

In the CodeDeploy console:

1. **Applications → Create application**: name `shop`, compute platform **EC2/On-premises**.
2. **Create deployment group**: name `production`, service role with the CodeDeploy permissions, environment = the instances tagged `app=shop`.
3. **Deployment settings**: `CodeDeployDefault.AllAtOnce` for one server, `CodeDeployDefault.OneAtATime` for several.
4. **Load balancer**: off. Cipi already switches without downtime on each server.
5. **Rollbacks**: **untick** "Roll back when a deployment fails".

> [!warning] Step 5 matters. CodeDeploy rolls back by deploying the previous bundle again. With Cipi that would run `sudo cipi deploy` again, which always takes the newest commit of the branch: you'd get the broken code a second time. The validate script in the next step rolls back with Cipi instead.

## 4. Add the bundle to the repository

```tree
shop/
└── codedeploy/
    ├── appspec.yml
    └── scripts/
        ├── deploy.sh
        └── validate.sh
```

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
# codedeploy/scripts/deploy.sh: run by CodeDeploy as root
set -euo pipefail
/usr/local/bin/cipi deploy shop
```

```bash
#!/usr/bin/env bash
# codedeploy/scripts/validate.sh: is the new release answering?
set -uo pipefail
APP=shop
HEALTH_URL=https://shop.example.com/up

if ! curl -fsS --retry 5 --retry-delay 5 --retry-all-errors "$HEALTH_URL" >/dev/null; then
  echo "Unhealthy: rolling back with Cipi"
  /usr/local/bin/cipi deploy "$APP" --rollback
  exit 1
fi

if [ -n "${BUNDLE_COMMIT:-}" ]; then     # set by CodeDeploy for GitHub revisions
  live=$(sudo -u "$APP" git -C "/home/$APP/current" rev-parse HEAD 2>/dev/null || true)
  [ "$live" = "$BUNDLE_COMMIT" ] || echo "Note: live commit $live, requested $BUNDLE_COMMIT"
fi
echo "Healthy"
```

```bash
$ chmod +x codedeploy/scripts/*.sh
$ git add codedeploy && git commit -m "CodeDeploy bundle for Cipi" && git push
```

What happens at each hook:

| Hook | Script | If it fails |
| --- | --- | --- |
| `ApplicationStart` | `sudo cipi deploy shop`: pull, build, migrate, switch | Nothing was published; the deployment stops here, and the old release keeps serving |
| `ValidateService` | Health check; Cipi rollback if the app doesn't answer | The release is rolled back and the deployment is marked failed, so CodeDeploy doesn't touch the next server |

If the app also deploys on push, turn its webhook off now (GitHub: **Settings → Webhooks** → the `/cipi/webhook` hook → untick **Active**), otherwise every push would deploy before CodeDeploy does.

## 5. Run the first deployment from your laptop

```bash
$ aws deploy push --application-name shop \
    --s3-location s3://my-deploy-bundles/shop/first.zip --source codedeploy
$ aws deploy create-deployment --application-name shop --deployment-group-name production \
    --s3-location bucket=my-deploy-bundles,key=shop/first.zip,bundleType=zip
{ "deploymentId": "d-ABC123XYZ" }
$ aws deploy wait deployment-successful --deployment-id d-ABC123XYZ
```

Follow it in the CodeDeploy console (each hook shows its log) and on the server:

```bash
$ sudo cipi deploy shop --status
$ sudo cipi deploy shop --audit
```

## 6. Deploy from GitHub Actions after the tests

Use GitHub's OpenID Connect so no long-lived AWS key sits in GitHub. Create an IAM role that GitHub can assume, allowed to upload to the bucket and to create and read CodeDeploy deployments for `shop`. Then:

```yaml
# .github/workflows/deploy.yml
name: Test and release with CodeDeploy
on:
  push:
    branches: [main]
concurrency:
  group: codedeploy-production
  cancel-in-progress: false
permissions:
  id-token: write
  contents: read

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

  release:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-codedeploy-shop
          aws-region: eu-central-1
      - name: Push the bundle and deploy
        run: |
          key="shop/${GITHUB_SHA}.zip"
          aws deploy push --application-name shop --s3-location "s3://my-deploy-bundles/$key" --source codedeploy
          id=$(aws deploy create-deployment --application-name shop --deployment-group-name production \
                 --s3-location bucket=my-deploy-bundles,key=$key,bundleType=zip \
                 --query deploymentId --output text)
          echo "Deployment $id"
          aws deploy wait deployment-successful --deployment-id "$id"
```

The job turns red if the deploy or the health check fails, and the CodeDeploy console shows which hook stopped it.

## 7. Roll out to several servers

Tag every Cipi server that runs `shop` with `app=shop` and set the deployment group to `CodeDeployDefault.OneAtATime`. CodeDeploy then deploys the first server, waits for `ValidateService` to pass, and only then moves to the next. If one server fails its health check, Cipi rolls that server back and CodeDeploy stops before touching the others.

Each server must already have the app created with Cipi (same name, same branch). [`sudo cipi sync`](/docs/sync) can copy an app from one server to another.

## Troubleshooting {#troubleshooting}

| Problem | Cause | Fix |
| --- | --- | --- |
| Deployment stays "Pending" | Agent not running, or no outgoing HTTPS | `systemctl status codedeploy-agent`; `sudo systemctl start codedeploy-agent` |
| "No instances found" | Tag mismatch | Same tag on the instance and in the deployment group |
| `ScriptFailed` at ApplicationStart | `sudo cipi deploy` failed while building | `sudo cipi app logs shop --type=deploy`; nothing was published |
| `ScriptFailed` at ValidateService | The app didn't answer; Cipi rolled back | `sudo cipi deploy shop --log` for the failed release |
| "appspec.yml not found" | Bundle root is wrong | `--source codedeploy` with S3; `appspec.yml` at the repository root for GitHub revisions |
| Broken code deployed twice | CodeDeploy rollback is on | Turn it off in the deployment group |
| Permission denied on a script | Not executable in Git | `chmod +x codedeploy/scripts/*.sh`, commit, push |
| Deploy ran twice | The Cipi webhook is still on | Untick **Active** on the `/cipi/webhook` hook |

@section git-providers

Cipi reads the repository with a per-app **read-only SSH deploy key** and deploys on push through a **signed webhook**. With a provider token, both are created, rotated and removed for you.

## Supported providers {#providers}

The provider is recognised from the SSH clone URL.

| Provider | Deploy key | Push webhook |
| --- | --- | --- |
| GitHub | Automatic | Automatic, HMAC-signed |
| GitLab (cloud or self-hosted) | Automatic | Automatic, secret token |
| Bitbucket Cloud | Automatic | Automatic, HMAC-signed |
| Azure DevOps | Automatic | Automatic (service hook) |
| Cursor Origin | Automatic | None: deploy with `cipi deploy` or CI |
| AWS CodeCommit | Automatic (IAM RSA key) | None: deploy with `cipi deploy` or CI |
| Anything else (Gitea, Forgejo…) | Manual | Manual |

No lock-in: any server that accepts SSH deploy keys works.

@section git-auto-setup

## Save a token {#tokens}

The installer offers this step; you can also do it any time:

```bash
$ cipi git github-token ghp_xxx
$ cipi git gitlab-url https://gitlab.example.com   # self-hosted only
$ cipi git gitlab-token glpat-xxx
$ cipi git bitbucket-token <token>                 # or email:token
$ cipi git azure-token <pat>
$ cipi git origin-token <token>
$ cipi git codecommit-token <access-key> <secret-key> <iam-user>
$ cipi git remove-github                           # remove-gitlab, -bitbucket, …
```

| Provider | Minimum permissions |
| --- | --- |
| GitHub | Fine-grained: Administration + Webhooks, read & write. Classic: `repo` |
| GitLab | `api` |
| Bitbucket | Manage repository access keys and webhooks |
| Azure DevOps | Code (read & write) |
| CodeCommit | IAM `UploadSSHPublicKey` (max 5 SSH keys per IAM user) |

Tokens are stored encrypted on the server ([Vault](/docs/vault)).

## What happens automatically {#lifecycle}

| Event | Cipi |
| --- | --- |
| `cipi app create` | Adds the deploy key and webhook, then **tests** that the key can read the branch |
| `cipi app edit --repository=` | Removes them from the old repository, adds them to the new one, tests again |
| `cipi app delete` | Removes them from the repository |

| Command | Use |
| --- | --- |
| `cipi git status` | Connected providers and per-app key/webhook IDs |
| `cipi git check [app]` | Can each key read its repository and branch? Exits 1 if not |
| `cipi git refresh [app]` | Re-create keys and webhooks (after deletions or a new token) |
| `cipi git refresh --rotate-keys` | New deploy keys for every app |
| `cipi git refresh --rotate-secret` | New webhook secrets |

## Manual setup {#manual}

Without a token, or for an unsupported server:

```bash
$ cipi deploy myapp --key                          # add as a read-only deploy key
$ cipi deploy myapp --webhook                      # payload URL and secret
$ cipi deploy myapp --trust-host=git.example.com:2222   # self-hosted, custom port
```

> [!note] With [CrowdSec](/docs/crowdsec) enabled, GitHub and Bitbucket webhook ranges are allowlisted automatically. For other providers, allow a blocked range with `cipi crowdsec allow <cidr>`.

@section cli-auth

## Private packages: auth.json {#auth-json}

`shared/auth.json` is linked into every release like `.env`, so Composer finds credentials for private packages (Packagist.com, Satis, GitHub) on every deploy.

```bash
$ cipi auth create myapp      # creates it (mode 640) and opens the editor
$ cipi auth edit myapp        # JSON is validated on save
$ cipi auth show myapp
$ cipi auth delete myapp
```

Non-interactive flags (`--file=`, `--json`, `--force`) serve scripts and the panel; REST `GET|POST|PUT|DELETE /api/apps/{name}/auth`.

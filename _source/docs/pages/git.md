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
| Cursor Origin | Automatic | None: deploy with `sudo cipi deploy` or CI |
| AWS CodeCommit | Automatic (IAM RSA key) | None: deploy with `sudo cipi deploy` or CI |
| Anything else (Gitea, Forgejo…) | Manual | Manual |

No lock-in: any server that accepts SSH deploy keys works.

@section git-auto-setup

## Save a token {#tokens}

The installer offers this step; you can also do it any time:

```bash
$ sudo cipi git github-token ghp_xxx
$ sudo cipi git gitlab-url https://gitlab.example.com  # self-hosted only
$ sudo cipi git gitlab-token glpat-xxx
$ sudo cipi git bitbucket-token <token>            # or email:token
$ sudo cipi git azure-token <pat>
$ sudo cipi git origin-token <token>
$ sudo cipi git codecommit-token <access-key> <secret-key> <iam-user>
$ sudo cipi git remove-github                      # remove-gitlab, -bitbucket, …
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
| `sudo cipi app create` | Adds the deploy key and webhook, then **tests** that the key can read the branch |
| `sudo cipi app edit --repository=` | Removes them from the old repository, adds them to the new one, tests again |
| `sudo cipi app delete` | Removes them from the repository |

| Command | Use |
| --- | --- |
| `sudo cipi git status` | Connected providers and per-app key/webhook IDs |
| `sudo cipi git check [app]` | Can each key read its repository and branch? Exits 1 if not |
| `sudo cipi git refresh [app]` | Re-create keys and webhooks (after deletions or a new token) |
| `sudo cipi git refresh --rotate-keys` | New deploy keys for every app |
| `sudo cipi git refresh --rotate-secret` | New webhook secrets |

## Manual setup {#manual}

Without a token, or for an unsupported server:

```bash
$ sudo cipi deploy myapp --key                     # add as a read-only deploy key
$ sudo cipi deploy myapp --webhook                 # payload URL and secret
$ sudo cipi deploy myapp --trust-host=git.example.com:2222  # self-hosted, custom port
```

> [!note] With [CrowdSec](/docs/crowdsec) enabled, GitHub and Bitbucket webhook ranges are allowlisted automatically. For other providers, allow a blocked range with `sudo cipi crowdsec allow <cidr>`.

@section cli-auth

## Private packages: auth.json {#auth-json}

`shared/auth.json` is linked into every release like `.env`, so Composer finds credentials for private packages (Packagist.com, Satis, GitHub) on every deploy.

```bash
$ sudo cipi auth create myapp  # creates it (mode 640) and opens the editor
$ sudo cipi auth edit myapp   # JSON is validated on save
$ sudo cipi auth show myapp
$ sudo cipi auth delete myapp
```

Non-interactive flags (`--file=`, `--json`, `--force`) serve scripts and the panel; REST `GET|POST|PUT|DELETE /api/apps/{name}/auth`.

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| `git check` fails | Deploy key not added, or added to the wrong repository |
| Self-hosted Git on another port | `sudo cipi deploy myapp --trust-host=git.example.com:2222` |
| Private Composer packages | Add credentials with `sudo cipi auth` (`auth.json`) |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Do I need a provider token? | No, but with one Cipi adds and rotates deploy keys and webhooks for you. |
| Can I use HTTPS URLs? | Use SSH URLs (`git@…`): deploy keys are read-only and per app. |

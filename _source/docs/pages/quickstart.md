@section quickstart

From a fresh Ubuntu server to a Laravel app on HTTPS, in about fifteen minutes. Every step shows the real command and what it prints; click a terminal to jump to the end.

```flow
Install | one command on the server
Log in | as cipi, with your SSH key
Create an app | isolated user, DB, PHP
Deploy | zero downtime from Git
HTTPS | Let's Encrypt, auto-renewed
```

**You need:** an Ubuntu 24.04 or 26.04 VPS with a public IP, a domain whose DNS you control, and a Git repository. Cipi is free; the only cost is the server.

## 1. Install Cipi {#qs-install}

SSH into the fresh server as root (or a sudo user) and run the installer. It asks for your SSH public key, shows its plan, then installs and hardens the whole stack.

<cipi-term name="qs-install"></cipi-term>

Save the credentials it prints. Requirements, SSH keys and unattended installs: [Install Cipi](/docs/installation).

## 2. Log in as cipi {#qs-login}

Root login over SSH is now off. Connect as `cipi` with your key and prefix commands with `sudo` (no password needed for `cipi`).

<cipi-term name="qs-login"></cipi-term>

## 3. Create your first app {#qs-create}

The wizard asks for the app type, runtime, database, name, domain and repository, then builds an isolated app: its own Linux user, database, PHP pool, Nginx vhost, worker and deploy key.

<cipi-term name="qs-create"></cipi-term>

Skip the questions with flags:

```bash
$ sudo cipi app create --user=myapp --domain=myapp.com \
    --repository=git@github.com:you/myapp.git --branch=main
```

> [!warning] The summary at the end (database password, deploy key, webhook token, a `mariadb+ssh://` URL for TablePlus or DBeaver) is shown **once**. Save it.

## 4. Connect the repository {#qs-deploy-key}

If you gave the installer a Git token, there is nothing to do: Cipi added the deploy key and the push webhook to the repository. Otherwise add the `ssh-ed25519 …` key from the summary as a **read-only deploy key**:

| Provider | Where |
| --- | --- |
| GitHub | Repository → Settings → Deploy keys |
| GitLab | Settings → Repository → Deploy keys |
| Bitbucket | Repository settings → Access keys |
| Azure DevOps | User settings → SSH public keys |

Then check that the server can read it: `sudo cipi git check myapp`. Tokens and automatic setup: [Git providers](/docs/git).

## 5. Prepare the Laravel project {#qs-prepare}

Cipi keeps cache, sessions and queues in each app's **own database**, so no app can read another's data. Laravel 11+ ships those tables; on an older project create them once and commit:

```bash
$ php artisan cache:table && php artisan session:table && php artisan queue:table
```

Migrations run on every deploy. Prefer Valkey for speed or Horizon? Switch per app in [Valkey](/docs/valkey).

## 6. Deploy {#qs-deploy}

<cipi-term name="qs-deploy"></cipi-term>

The new release is built in its own folder, migrated, then made live with one atomic symlink swap. Visitors never see a half-deployed app, and `cipi deploy myapp --rollback` goes back in a second. How it works: [Deploy & roll back](/docs/deploying).

## 7. Turn on HTTPS {#qs-ssl}

Point the domain's DNS at the server, then:

<cipi-term name="qs-ssl"></cipi-term>

The certificate covers the domain and its aliases and renews itself. Behind the Cloudflare proxy use `--dns=cloudflare` and set SSL/TLS to **Full (strict)**. More in [SSL certificates](/docs/ssl).

## 8. Optional: the web panel {#qs-panel}

Prefer a browser, or need one for clients? Install the API and the panel, each on its own domain. The panel can manage this server and any other Cipi server you connect.

<cipi-term name="qs-panel"></cipi-term>

<cipi-panel></cipi-panel>

## Next steps {#qs-next}

| To… | Read |
| --- | --- |
| Deploy on every `git push` | [Auto-deploy on push](/docs/auto-deploy) |
| Run queues or Horizon | [Queues & Horizon](/docs/workers) |
| Back up to S3 every night | [Backups to S3](/docs/backups) |
| Keep server settings in the repo | [cipi.yml](/docs/yml) |
| Get alerts on Slack or Telegram | [Notifications](/docs/notifications) |

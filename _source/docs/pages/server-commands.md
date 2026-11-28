@section cli-cipi

The everyday commands for the server itself.

<cipi-term name="status"></cipi-term>

| Command | Shows or does |
| --- | --- |
| `sudo cipi status` | CPU, RAM, disk, services, PHP versions, apps, pending items |
| `sudo cipi disk` | Disk usage of the server and each app ([Disk usage](/docs/disk)) |
| `sudo cipi pending` | What needs a human ([Stack upgrades](/docs/stack-upgrades#pending)) |
| `sudo cipi version` | Installed Cipi version |
| `sudo cipi help [topic]` | Every command, grouped |

## Credentials {#credentials}

```bash
$ sudo cipi credentials                  # root, MariaDB, PostgreSQL, Valkey, Meilisearch, backup key
$ sudo cipi credentials export > cipi.csv  # CSV for any password manager
$ sudo cipi reset root-password
$ sudo cipi reset db-password [--engine=pgsql]
$ sudo cipi reset valkey-password        # restarts the shared Valkey
```

Run the export from your laptop (`ssh cipi@server sudo cipi credentials export > cipi.csv`) so no copy stays on the server. Every show or export is logged and notified (`credentials_show`). Secrets are stored encrypted ([Vault](/docs/vault)).

@section self-update

## Updating Cipi {#self-update}

```bash
$ sudo cipi self-update --check
$ sudo cipi self-update
$ sudo cipi self-update policy   # signed releases only, a delay — optional
```

```flow
Download | from GitHub
> `sudo cipi self-update` downloads the new version of Cipi from GitHub.
Back up | /opt/cipi.bak.<timestamp>
> The current installation is copied to `/opt/cipi.bak.<timestamp>`, so you can go back.
Replace CLI | scripts and libraries
> The CLI's scripts and libraries are replaced.
Migrations | in order, each idempotent
> Migrations bring older servers up to date, in order. Each is safe to run twice.
Done | apps untouched
> Your apps keep running throughout: no deploy, no restart of your code.
```

Updates never deploy your apps or touch their code and data. Migrations bring existing servers in line with new defaults (a security setting, a new hook); each one is written to be safe to re-run and to degrade to a warning instead of breaking the update. A nightly job (03:50) applies updates automatically; run it yourself first if you'd rather watch. To install only releases signed by a trusted key, or to wait some hours before a new release lands, see [Safer self-updates](/docs/self-update) — both optional, both off by default. What changed in each release: [What's new](/whats-new) and the [changelog on GitHub](https://github.com/cipi-sh/cipi/blob/master/CHANGELOG.md).

@section cli-completion

## Tab completion {#completion}

Installed for you for bash and zsh, for root and the `cipi` user, in login and non-login shells (`su`, tmux), including after `sudo`:

```bash
$ sudo cipi dep<Tab>          # → deploy
$ sudo cipi deploy sh<Tab>    # → shop  shop-stg   (your apps)
$ sudo cipi completion zsh --print # the script, for another user or rc file
```

It completes commands, sub-commands, flags, help topics and app names.

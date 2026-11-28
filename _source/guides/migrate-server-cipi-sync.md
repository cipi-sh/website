---
title: Move Laravel apps to a new server with cipi sync
description: Migrate one app or a whole server between providers (AWS to Hetzner, an old VPS to a bigger one) with encrypted archives, the same deploy keys, database and storage, and a DNS switch when you're ready.
category: ops
order: 2
published: 2026-11-23
updated: 2026-11-28
howto: yes
keywords: migrate laravel server, move laravel app new vps, laravel server migration, aws to hetzner migration
related:
  - backup-vps-s3
  - cipi-hetzner
  - server-monitoring-alerts
docs:
  - sync
  - vault
  - installation
faq:
  - Is the old server changed by a push? | No. It only reads and exports. Nothing is deleted there until you do it.
  - Do certificates move? | Re-issue them on the new server after DNS points there (`cipi ssl install`), which takes seconds.
  - Can I move only some apps? | Yes. Name them in `cipi sync push`, or move them one by one.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
  - Do I need the web panel for this? | No. Every step works from the CLI. The optional [web panel](/web-panel) does the same from its Transfer tab, as a wizard, with no passphrase to type.
  - Can I run these commands from my laptop? | Many of them, through [cipi-cli](/docs/cli-client) and the [API](/api), with a scoped token. Otherwise `ssh cipi@your-server` and use `sudo cipi …`.
  - Will this affect other apps on the server? | No, unless the step says it's server-wide (installing a PHP version, firewall, Cloudflare tunnel). Each app has its own user, PHP pool, database and Valkey.
---
`cipi sync` copies whole apps between Cipi servers: configuration, deploy keys, workers, crontab, PHP version and, if you want, database and storage. Archives are encrypted with AES-256. The old server keeps serving until you switch DNS.

<cipi-term name="sync"></cipi-term>

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Sync** | Copying apps (settings, keys, workers, optionally data) between Cipi servers |
| **Trust** | The new server accepts pushes from the old one's key only |
| **Cut-over** | Switching DNS to the new server |

## 1. Prepare the new server

Install Cipi on it ([providers](/guides/#providers)) and install the same PHP versions your apps use (`sudo cipi php install 8.5`).

## 2. Trust between the two servers

```bash
# old server
$ sudo cipi sync pubkey
# new server: paste it
$ sudo cipi sync trust
# old server again: is the way open?
$ sudo cipi sync check --host=203.0.113.20
✓ cipi@203.0.113.20:22 accepts this server's sync key
```

`check` sends nothing: it says, in words, what is in the way — a key not trusted yet, a firewall, a target without Cipi ([the answers](/docs/sync#trust)). Two servers on the same [Tailscale or NetBird](/docs/mesh-network) network can use their private addresses.

## 3. Push the apps

```bash
$ sudo cipi sync push --host=203.0.113.20 --with-db --with-storage --import --auto-passphrase
```

Or one app at a time: `sudo cipi sync push shop --host=…`. With `--auto-passphrase` the old server encrypts the archive with a passphrase made for this transfer and hands it to the new one over SSH: nothing to type, nothing left to keep. Without it, the passphrase is asked twice ([the passphrase](/docs/sync#passphrase)).

### From the web panel instead

On the old server's page, **Transfer**: choose the apps, tick *databases* and *uploaded files*, pick the new server among the panel's servers (or type its address), **Check the connection**, then **Start the transfer**. For a server of the panel, the old server's key is put on the new one for the transfer and taken out when it ends. The transfer runs as a job with its output on screen. From the new server's page, *Bring apps here* opens the same wizard the other way round. See [the panel](/docs/sync#panel).

The same from a laptop: `cipi-cli prod sync push --to new --with-db --with-storage` ([cipi-cli](/docs/cli-client#sync)).

| Travels | Detail |
| --- | --- |
| `.env`, `auth.json`, `deploy.php` | Always |
| Deploy key and SSH config | The same key keeps working on GitHub |
| Workers, crontab, PHP version, limits | Always |
| Database | With `--with-db`; new database password on a new app |
| `shared/storage` | With `--with-storage` |
| Certificates | Never: issued on the new server after DNS moves |

## 4. Test before switching

Point your laptop's `/etc/hosts` at the new IP and browse the app. Then deploy once on the new server to check the Git path end to end:

```bash
$ sudo cipi deploy shop
```

## 5. Switch DNS, then certificates

Lower the TTL a day before. Change the `A` records, wait for propagation, then:

```bash
$ sudo cipi ssl install shop
```

Run a last `sync push --with-db --update` just before the switch if the database changed in the meantime.

## Keep a warm standby

The same command on a schedule replicates apps to a second server. Combined with [backups](/guides/backup-vps-s3), it covers both "restore yesterday" and "this server is gone".

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Push refused: not trusted | Run `cipi sync trust` on the new server with the old one's key; `cipi sync check` says when it's done |
| A Node app was not moved | Sync doesn't recreate Node apps yet: create it on the new server, it deploys from Git |
| App fails on the new server | Its PHP version isn't installed there: `cipi php install` |
| Site still served by the old server | DNS TTL: wait, check `dig +short` |
| Duplicate jobs during the move | Stop workers on the old server after the final sync |

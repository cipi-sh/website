---
title: Move Laravel apps to a new server with cipi sync
description: Migrate one app or a whole server between providers (AWS to Hetzner, an old VPS to a bigger one) with encrypted archives, the same deploy keys, database and storage, and a DNS switch when you're ready.
category: ops
order: 2
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: migrate laravel server, move laravel app new vps, laravel server migration, aws to hetzner migration
related:
  - backup-vps-s3
  - cipi-hetzner
  - server-monitoring-alerts
---
`cipi sync` copies whole apps between Cipi servers: configuration, deploy keys, workers, crontab, PHP version and, if you want, database and storage. Archives are encrypted with AES-256. The old server keeps serving until you switch DNS.

<cipi-term name="sync"></cipi-term>

## 1. Prepare the new server

Install Cipi on it ([providers](/guides/#providers)) and install the same PHP versions your apps use (`sudo cipi php install 8.5`).

## 2. Trust between the two servers

```bash
# old server
$ sudo cipi sync pubkey
# new server: paste it
$ sudo cipi sync trust
```

## 3. Push the apps

```bash
$ sudo cipi sync push --host=203.0.113.20 --with-db --with-storage --import
```

Or one app at a time: `sudo cipi sync push shop --host=…`.

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

---
title: Back up Laravel and WordPress to a Hetzner Storage Box over SFTP
description: Encrypted, scheduled backups of every app and database to a Hetzner Storage Box, a cheap VPS or a NAS over SFTP — an SSH key made on the server, no password stored, a sub-account per server, retention and a tested restore.
category: ops
order: 3
published: 2026-11-28
updated: 2026-11-28
howto: yes
keywords: hetzner storage box backup, sftp backup laravel, backup vps to storage box, wordpress backup sftp, cheap offsite backup vps
related:
  - backup-vps-s3
  - exclude-files-from-backups
  - migrate-server-cipi-sync
faq:
  - Why SFTP instead of S3? | Price and simplicity. A Storage Box, or a small VPS with a big disk, often costs less per terabyte than object storage, and many people already have one. Cipi treats it like a bucket: same profiles, retention, encryption and restore.
  - Is a password stored anywhere? | No. Cipi makes an SSH key for the destination on the server and signs in with it. The box's password is typed once, by you, to install the key, and never given to Cipi.
  - Can the Storage Box read my backups? | With `--encrypt`, archives are encrypted on the server before they leave: the box only holds encrypted files. Keep the key from `cipi backup key show` in your password manager.
  - Can several servers share one box? | Yes. Give each server its own sub-account, or at least its own folder (`--path=cipi/web1`), so one server can't touch another's backups.
  - Does it work with a NAS or my own VPS? | Yes: anything that speaks SFTP with key authentication — OpenSSH on a VPS, Synology or QNAP, TrueNAS, rsync.net.
  - Can I add it from the web panel? | Yes. Server → Backups → *Add an SFTP server* (with a Storage Box preset) makes the key on the server and shows the command that installs it on the box. S3 buckets stay on the CLI, because they take a secret key.
  - What if a step fails? | Read the troubleshooting table below first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
docs:
  - backups
  - vault
  - databases
---
Backups belong somewhere other than the server they protect. Object storage (S3, R2, B2) is one place; a **server you reach over SFTP** is another, and often the cheapest: a [Hetzner Storage Box](https://www.hetzner.com/storage/storage-box/), a small VPS with a large disk, the NAS in the office. Cipi sends its backups there like to a bucket — same profiles, encryption, retention, restore — over SSH, with a key it makes for the purpose.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **SFTP** | Copying files over SSH. Nothing to install on the remote beyond an SSH server |
| **Destination** | Where a backup goes: `local`, an S3 bucket, or an SFTP server |
| **The key** | An SSH key Cipi makes for one destination; the remote lets it in. No password is involved |
| **Storage Box** | Hetzner's storage-only product: SFTP, rsync, Samba on a box of 1 TB and more. Port 23 for SSH |
| **Sub-account** | A separate user on the same Storage Box, limited to one folder |

## 1. Prepare the Storage Box

In Hetzner's console, open the box:

1. Turn on **SSH support** (Settings). Without it, port 23 doesn't answer.
2. Optionally, create a **sub-account** for this server, with its own folder (for example `web1`) — a compromised server then reaches only its own backups. Its user looks like `u123456-sub1`.
3. Note the user (`u123456` or the sub-account's) and the host, `u123456.your-storagebox.de`.

Using your own VPS instead? Create a user for backups, ideally limited to SFTP in its folder (`Match User backup` with `ForceCommand internal-sftp` and `ChrootDirectory` in `sshd_config`), and use port 22.

## 2. Add the destination

```bash
$ sudo cipi backup destination add box --type=sftp \
    --host=u123456.your-storagebox.de --user=u123456 --port=23 --path=cipi
✓ Backup destination 'box' added: sftp://u123456@u123456.your-storagebox.de:23/cipi

  The remote has to accept this key — Cipi signs in with it, never with a password:
  ssh-ed25519 AAAAC3Nza… cipi-backup-box@web1
```

The key lives on the server in `/etc/cipi/backup-keys/`, readable by root only. `--path` is the folder for the backups, created if missing, relative to the user's home.

From the **web panel**: Server → **Backups** → *Add an SFTP server*, then *Hetzner Storage Box* to fill in port 23. The panel shows the key and the command for the next step.

## 3. Let the key in

On the server, still as root — the box asks its password once:

```bash
$ ssh-copy-id -p 23 -s -i /etc/cipi/backup-keys/box.pub u123456@u123456.your-storagebox.de
```

`-s` installs the key over SFTP, which is what a Storage Box accepts. You can also paste the public key in the box's **SSH keys** in Hetzner's console. On a VPS of your own, append it to `~backup/.ssh/authorized_keys`.

Then check it:

```bash
$ sudo cipi backup destination test box
```

`test` writes a small file there and removes it. The box's host key is learned at this first connection and checked on every later one.

## 4. Send backups there

A new profile, or an existing one with one more destination:

```bash
# every night: files and databases, encrypted, on the server and on the box, 14 days
$ sudo cipi backup profile add nightly --scope=all --cron='0 2 * * *' \
    --keep-days=14 --dest=local,box --encrypt
# or add the box to a profile you have
$ sudo cipi backup profile edit nightly --dest=local,s3,box
```

Encrypt: the box then holds only files it can't read. Store the key now:

```bash
$ sudo cipi backup key show
```

Run one to see it work:

```bash
$ sudo cipi backup run --profile=nightly
$ sudo cipi backup list --profile=nightly
```

Retention prunes old runs on the box too. Too much data? Leave big media folders out with [`--exclude-paths`](/guides/exclude-files-from-backups).

## 5. Restore, once, now

```bash
$ sudo cipi backup fetch nightly 2026-11-28_020000 --dest=/root/restore
$ sudo cipi db restore shop /root/restore/databases/mariadb/shop.sql.gz
```

A backup you haven't restored is a hope. `cipi backup verify` checks every night that the newest run opens; a restore into a scratch folder now and then checks the rest.

## Several servers, one box {#several}

| Setup | Isolation |
| --- | --- |
| A sub-account per server, each with its folder | Best: a server reaches only its own backups |
| One account, a folder per server (`--path=cipi/web1`, `cipi/web2`) | Fine for servers you trust equally |
| One account, one folder | Avoid: profiles with the same name would mix |

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `Permission denied (publickey)` | The key isn't installed yet: step 3. `sudo cipi backup destination key box` prints it again |
| `Connection refused` or no answer on port 23 | SSH support isn't on for the box, or for the sub-account: turn it on in Hetzner's console |
| `Connection timed out` | Wrong host or port; or the server's provider blocks outgoing port 23 |
| `Host key verification failed` | The remote's host key changed. If you know why (a rebuilt VPS), remove its line from `/etc/cipi/backup-keys/known_hosts` |
| A new key is needed | `sudo cipi backup destination edit box --new-key`, then install it again |
| Removing the destination | `sudo cipi backup destination remove box` once no profile uses it. The archives on the box stay; remove the key from its `authorized_keys` too |

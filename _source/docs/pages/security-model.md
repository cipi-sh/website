@section security-model

Security on Cipi is the default, not an add-on: apps are isolated from each other, the server is hardened at install, secrets are encrypted, and every privileged action leaves a trace. This page is the map; each layer links to its details.

```stack
Network | UFW 22/80/443, Fail2ban, CrowdSec, Zero Trust
Access | key-only admin, no root login, alerts
Isolation | user, PHP pool, database, Valkey per app
Secrets | AES-256 Vault, encrypted backups & sync
Patching | nightly PHP & stack patches, CVE reports
Audit | deploy ledger, event log, compliance
```

## Layers {#layers}

| Layer | What Cipi does | Details |
| --- | --- | --- |
| **Network** | UFW allows only 22, 80, 443; the panel can open ports and block addresses, never close those three. Fail2ban bans after 3 attempts, doubling up to 7 days; repeat offenders get a 7-day block. Unknown hostnames get an empty reply | [Firewall & bans](/docs/firewall), [Nginx](/docs/nginx#default-server) |
| **SSH** | Root login off; the `cipi` admin user is key-only; app users have their own password logins, which you can switch off | [SSH keys](/docs/ssh-keys) |
| **Privilege** | App users can't `su`; the web user's sudo is limited to an explicit list of `cipi` sub-commands; the API checks every command against a whitelist | [Panel architecture](/docs/gui-architecture) |
| **App isolation** | One Linux user per app (home `750`), its own PHP-FPM pool, `open_basedir` to its home, its own database user and Valkey instance | [How Cipi works](/docs/how-cipi-works#what-every-app-gets) |
| **Git** | A separate read-only deploy key per app; signed webhooks; deploys run as the app user | [Git](/docs/git), [Auto-deploy](/docs/auto-deploy) |
| **Secrets** | Configs, tokens and passwords encrypted at rest (AES-256); backups and sync archives encrypted before they leave | [Vault](/docs/vault), [Backups](/docs/backups#encryption) |
| **Patching** | Ubuntu security updates daily; PHP nightly with a patch-level report; Nginx, databases, Valkey, Node and FrankenPHP nightly, one at a time | [Stack upgrades](/docs/stack-upgrades), [PHP](/docs/php#security) |
| **Hardening** | PHP pools lock down settings used by recent CVEs; Nginx never enables HTTP/2; TLS 1.2/1.3 with modern ciphers | [PHP](/docs/php#hardening), [Nginx](/docs/nginx) |
| **Detection** | Alerts on SSH logins, sudo/su, key changes; nightly malware scan; 5xx and service monitor | [Notifications](/docs/notifications#security), [Malware scan](/docs/malware-scan) |
| **Audit** | Hash-chained deploy ledger, one-year event log, ISO 27001 / SOC 2 evidence report | [Deploy audit](/docs/deploy-audit), [Compliance](/docs/compliance) |
| **Privacy** | No telemetry; logs with IP addresses kept 90 days | [Log retention](/docs/log-retention) |

## No web surface by default {#no-panel}

A fresh Cipi server has **no admin panel**: management happens over SSH. The [web panel](/docs/gui-overview) is opt-in, runs as an isolated app on its own domain with two-factor login (an admin can require it for every account), and talks to servers only through the API's whitelisted commands.

## What isolation protects {#isolation}

If one app is compromised (a vulnerable plugin, a leaked `.env`), the attacker gets **that app's** user:

| They can't | Because |
| --- | --- |
| Read other apps' files | Homes are `750`, `open_basedir` confines PHP |
| Read other apps' data | Each database and Valkey instance has its own credentials |
| Become root or `cipi` | `su` is restricted to the sudo group; no sudo for app users |
| Read Cipi's secrets | Encrypted, readable by root only |
| Change the web server | Vhosts and pools are root-owned |
| Reuse the deploy key elsewhere | One key per repository, read-only |

> [!tip] Reboots after kernel updates are never automatic unless you enable [cipi reboot auto](/docs/stack-upgrades#reboot); `cipi pending` tells you when one is due.

---
title: "For hosting providers: Laravel-ready hosting with Cipi and WHMCS"
description: "Most hosting plans are built for WordPress and shared PHP, not for Laravel's queues, scheduler, Git deploys and PHP versions. How a hosting company can add isolated, Laravel-native products on its own servers with Cipi, automate them from WHMCS, and price them."
lead: "Laravel developers pay twice today: for a server, and for a panel or platform to run it. A hosting provider that offers Laravel-native hosting keeps both halves of that bill."
category: strategy
order: 4
published: 2026-11-24
updated: 2026-11-24
howto: yes
keywords: laravel hosting provider, whmcs laravel module, sell laravel hosting, laravel friendly hosting, whmcs cipi, laravel vps hosting offer
related:
  - vps-vs-kubernetes-vs-managed-paas
  - open-source-licences
  - deploy-wordpress-custom-app
faq:
  - Can I sell hosting built on Cipi? | Yes. Cipi and the WHMCS module are MIT: commercial use and resale are allowed, with no per-server or per-account licence. Keep the copyright notice in copies of the code.
  - Does the module give customers a client area? | No client-area tab. Customers use SSH and SFTP as their app user, Git for deploys, and optionally the Cipi panel, where you can invite them with access to their own app only.
  - How are one-time credentials delivered? | The module doesn't push them to WHMCS. Deliver them through your onboarding (a ticket, a secure note), or let customers rotate them: `sudo cipi db password` and SSH keys.
  - Are disk limits enforced? | They're soft: at 90% and over the limit the monitor alerts you, the site keeps working. Use them to upsell or bill overage, not to break a customer's app at the worst moment.
  - Can a customer get root? | Not in the managed products: each customer is an isolated app user. Sell a Laravel-ready VPS when they want root.
  - Does it support email hosting, DNS or reseller accounts? | No. Cipi focuses on applications. Keep your existing mail and DNS products, or partner for them.
  - Which servers can I use? | Any full virtual machine or bare-metal server with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. Containers (LXC, OpenVZ) aren't supported.
docs:
  - whmcs
  - api
  - limits
  - gui-overview
  - php-sdk
---
Ask a Laravel developer where they host, and the answer is rarely "my hosting provider". It's a VPS plus Forge or Ploi, or a managed platform. The reason isn't price: standard hosting plans don't run what a Laravel app needs. Cipi turns any Ubuntu server into Laravel-native hosting, and its WHMCS module automates the products. This guide is for the hosting company that wants that business.

```flow
The gap | what's missing | #gap
Products | three to sell | #products
WHMCS | module, servers | #whmcs
Limits | per plan | #limits
Customers | SSH, Git, panel | #access
Operate | the fleet | #operate
Price | margins | #pricing
```

## The gap: what Laravel needs and standard hosting misses {#gap}

| A Laravel app needs | Typical shared or cPanel hosting | On a Cipi server |
| --- | --- | --- |
| Long-running queue workers, Horizon | Often not allowed, or killed | Supervisor programs per app, restarted on deploy |
| The scheduler every minute | Cron with limits on frequency | One cron per app, on by default |
| Git deploys without downtime | FTP uploads, or `git pull` in place | Releases with an atomic symlink swap, rollback in one command, webhooks from six Git forges |
| Composer and Node builds | Limited SSH, old tool versions | Composer 2 and Node on the server, build steps in the deploy |
| A choice of PHP version per app | One or a few versions | PHP 8.3 to 8.6 side by side, per app |
| Redis-compatible cache and queues | Rare on shared plans | A Valkey instance per app |
| WebSockets (Reverb), Octane | Not available | `sudo cipi app reverb enable`, `sudo cipi app create --octane` |
| Document root on `public/` | Workarounds with `.htaccess` | Nginx configured for Laravel |
| Isolation from other customers | Shared users or containers of varying quality | A Linux user, PHP-FPM pool, database user and Valkey instance per app |

Few providers offer this out of the box. That's the opportunity: a Laravel-friendly product is a reason to choose you, not just a cheaper VPS.

## Three products you can build {#products}

| Product | Customer gets | You run | WHMCS automation |
| --- | --- | --- | --- |
| **Laravel-ready VPS** | A whole VPS with Cipi installed, and root | The VPS only | Your existing VPS module, plus Cipi installed at first boot |
| **Managed Laravel app** | One isolated app on your servers: SSH/SFTP as its own user, Git deploys, database, SSL | The servers, patching, backups, monitoring | The Cipi module: order → app, unpaid → suspended, cancelled → removed |
| **App instance per customer** | A ready instance of a Laravel product (yours, or a client's SaaS) on its own domain | Same as above | The Cipi module with the product's Git repository in the product settings: every order deploys the same codebase |

### Laravel-ready VPS: install Cipi at first boot {#vps-image}

Pass the customer's key and run the installer from cloud-init (or your virtualisation panel's post-install script). Without a terminal, the installer asks nothing:

```yaml
#cloud-config
runcmd:
  - [bash, -c, 'wget -O - https://cipi.sh/setup.sh | SSH_PUBKEY="ssh-ed25519 AAAA… customer@laptop" bash > /var/log/cipi-install.log 2>&1']
```

The VM must be full virtualisation (KVM, VMware, Hyper-V, Xen HVM) with Ubuntu 24.04 or 26.04; the installer stops on LXC or OpenVZ.

## Architecture {#architecture}

```stack
WHMCS | orders, invoices, suspensions
Cipi module | modules/servers/cipi
Cipi API | one per server, HTTPS + token
cipi CLI | the same code as over SSH
Isolated apps | user, PHP pool, database, Valkey
```

Each Cipi server runs its own [API](/docs/api), on its own hostname, with a token for WHMCS. WHMCS sees each server as a *server* in a *server group*; the module calls the API to create, suspend, unsuspend, change and terminate apps. Your staff can see the whole fleet in the optional [web panel](/docs/gui).

## 1. Prepare each server {#server}

```bash
$ wget -O - https://cipi.sh/setup.sh | bash             # fresh Ubuntu 26.04
$ sudo cipi api api.node1.host.example                   # DNS check, install, certificate
$ sudo cipi api token create --name=whmcs \
    --abilities=apps-view,apps-create,apps-edit,apps-suspend,apps-delete,deploy-manage,ssl-manage,aliases-view,aliases-create,aliases-delete \
    --expires=2027-12-31
```

| Ability | Used by |
| --- | --- |
| `apps-view` | Test Connection, App Info |
| `apps-create` | Create Account |
| `apps-edit` | Change Package, and the [limits hook](#limits) |
| `apps-suspend` | Suspend, Unsuspend |
| `apps-delete` | Terminate |
| `deploy-manage` | Deploy, Rollback, Unlock buttons |
| `ssl-manage` | Install SSL, Auto SSL |
| `aliases-view`, `aliases-create`, `aliases-delete` | List, Add and Remove Alias buttons |

Then let only your own machines reach the API: `sudo cipi api ip-whitelist add <WHMCS IP>` (and the address of your panel, if you run one). Set up off-site [backups](/guides/backup-vps-s3) and [notifications](/guides/server-monitoring-alerts) before the first customer arrives.

## 2. Install the module and add the servers {#whmcs}

```tree
your-whmcs/
└── modules/servers/cipi/
    ├── cipi.php
    └── lib/CipiApiClient.php
```

```flow
Copy the module | into WHMCS
> Download it from [github.com/cipi-sh/whmcs](https://github.com/cipi-sh/whmcs) and copy `modules/servers/cipi/` into your WHMCS root. No Composer, no dependencies.
Add the server | System Settings → Servers
> Module *Cipi (Laravel hosting)*; hostname = the API's base URL without a trailing slash; password = the token; tick *Secure* so certificates are verified. Set *Maximum No. of Accounts* to cap apps per server. Use *Test Connection*.
Group the servers | fill method
> Create a server group per region or tier and choose *Add to the least full server*, so new orders spread across nodes.
Create the product | Module Settings
> A hosting product on that group, module *Cipi (Laravel hosting)*: PHP version, app type (`laravel` or `custom`), Git repository and branch (for `laravel`), Auto SSL. Ask for a domain on order.
Automate the lifecycle | Automation Settings
> Turn on suspension and termination for overdue invoices. A suspended app serves a static 503 page and keeps all its data; unsuspending brings it back as it was.
```

| Module setting | `laravel` app | `custom` app |
| --- | --- | --- |
| What's created | A Laravel app with releases, workers, scheduler and its database | A PHP site in `htdocs/`: WordPress, static, any PHP |
| Git repository | Required (the product's repository) | Optional: empty means SFTP-only hosting |
| Good for | *App instance per customer*, or customers who connect their own repository after creation | Classic PHP and WordPress hosting with real isolation |

| WHMCS action | What happens on the server |
| --- | --- |
| Create Account | App created (user from the WHMCS username, primary domain from the order), job awaited, optional Let's Encrypt certificate |
| Suspend / Unsuspend | 503 maintenance page / normal vhost back; nothing deleted, certificates keep renewing |
| Change Package | PHP version, repository and branch from the new product |
| Terminate | App removed |
| Admin buttons | Install SSL, Deploy, Rollback Deploy, Unlock Deploy, List/Add/Remove Alias, App Info |

Every call is written to WHMCS's module log (Utilities → Logs → Module Log). If Auto SSL fails because DNS doesn't point at the server yet, the app is still created and the failure is logged: run *Install SSL* later.

> [!note] The module's PHP dropdown is a list in `cipi_ConfigOptions()`. Keep it aligned with the versions installed on your servers (`sudo cipi php list`), and install a version on every server of the group before selling it.

## 3. Plans and limits {#limits}

Limits stop one customer from starving the others. Set them per app with `sudo cipi app limits`, or through the API (`PUT /api/apps/{name}/limits`) from a WHMCS hook, so each product applies its plan automatically:

| Plan (example) | PHP-FPM children | `memory_limit` | Queue workers | Soft disk limit |
| --- | --- | --- | --- | --- |
| Starter | 5 | 256M | 1 | 5 GB |
| Pro | 10 | 512M | 2 | 20 GB |
| Business | 20 | 1G | 4 | 50 GB |

```php
<?php
// includes/hooks/cipi_limits.php — apply the plan's limits after WHMCS creates a Cipi app
if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

add_hook('AfterModuleCreate', 1, function (array $vars) {
    $p = $vars['params'] ?? [];
    if (($p['moduletype'] ?? '') !== 'cipi') {
        return;
    }

    // WHMCS product ID => limits (the fields of PUT /api/apps/{name}/limits)
    $plans = [
        11 => ['fpm_max_children' => 5,  'memory_limit' => '256M', 'worker_procs' => 1, 'disk_limit_gb' => 5],
        12 => ['fpm_max_children' => 10, 'memory_limit' => '512M', 'worker_procs' => 2, 'disk_limit_gb' => 20],
        13 => ['fpm_max_children' => 20, 'memory_limit' => '1G',   'worker_procs' => 4, 'disk_limit_gb' => 50],
    ];
    $limits = $plans[(int) ($p['pid'] ?? 0)] ?? null;
    if ($limits === null) {
        return;
    }

    // The app name the module derives from the WHMCS username
    $app = substr(preg_replace('/[^a-z0-9]/', '', strtolower((string) $p['username'])), 0, 32);
    $base = rtrim((string) $p['serverhostname'], '/');
    if (!preg_match('#^https?://#i', $base)) {
        $base = 'https://' . $base;
    }

    $ch = curl_init($base . '/api/apps/' . rawurlencode($app) . '/limits');
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/json',
            'Authorization: Bearer ' . $p['serverpassword'],
        ],
        CURLOPT_POSTFIELDS => json_encode($limits),
    ]);
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // 202 = queued as a job on the server
    logModuleCall('cipi', 'ApplyLimits', ['app' => $app] + $limits, $raw, "HTTP {$code}", [$p['serverpassword']]);
});
```

| Limit | Controls | Note |
| --- | --- | --- |
| `fpm_max_children` | Concurrent PHP requests | The app's [metrics](/guides/cipi-metrics-server-app-uptime) count how often it hits the cap: a ready-made upsell signal |
| `memory_limit` | PHP's per-request memory | |
| `worker_procs` | Queue worker processes | |
| `octane_workers` | Octane workers, for Octane apps | |
| `disk_limit_gb` | Soft limit for files + database | Alerts at 90% and over the limit; never blocks the site. A repository's `cipi.yml` can't raise it |

For one-off changes, staff can use the CLI (`sudo cipi app limits shop --disk=20`), the panel, or the [PHP SDK](/docs/php-sdk): `$cipi->limits()->update('shop', ['fpm_max_children' => 10])`.

## 4. How customers work {#access}

| Customer needs | How |
| --- | --- |
| Shell, Composer, Artisan, SFTP | [`ssh shop@node1.host.example`](/docs/app-ssh): the app's own user, kept out of other apps' files by permissions, with SFTP for their IDE |
| Deploys from Git | The app's deploy key added to their repository, then `git push` with the webhook ([auto-deploy](/docs/auto-deploy)) |
| Database access | TablePlus or DBeaver over SSH with the `mariadb+ssh://` URL; no database port is ever open |
| Server settings | A [`cipi.yml`](/cipi-yml) in their repository: workers, schedule, PHP settings, backups. You decide whether it's applied automatically |
| A dashboard | Invite them to the [web panel](/docs/gui-overview) with access to **their app only** (view, deploy, logs, environment…): a client area without building one |
| Help | Your support, with the same commands you use |

Deliver one-time secrets (passwords, deploy key, webhook URL) through your onboarding: the module deliberately doesn't store them in WHMCS.

## 5. Operate the fleet {#operate}

| Task | With Cipi |
| --- | --- |
| Patching | Ubuntu security updates daily, PHP nightly, Nginx, databases and Valkey through [autoupdate](/docs/stack-upgrades), one service at a time. Reboots when you schedule them |
| Monitoring | The [monitor](/docs/monitor) alerts your ops channel on disk, services, workers, certificates, 5xx and load; [metrics](/docs/metrics) show which app is the noisy neighbour |
| Backups | A server-wide nightly profile to off-site storage, plus frequent database profiles; `sudo cipi backup status` lists any app nothing covers |
| Security | Per-app isolation, CrowdSec, optional malware scans, Cloudflare Zero Trust for the admin side |
| Rebalancing | Move an app or a whole node with [`sudo cipi sync`](/guides/migrate-server-cipi-sync) |
| B2B customers' audits | [`sudo cipi compliance report`](/docs/compliance): evidence mapped to ISO 27001 and SOC 2 |

## 6. Price it {#pricing}

Cipi adds no licence cost per server, per account or per site, so the margin is the difference between your price and your infrastructure and support.

```text
monthly margin per server = apps on the server × price per app − server cost − support time
```

An example with round numbers, to adapt to your own costs and capacity tests: a node that costs you €60 a month, hosting 20 small Laravel apps sold at €12, brings €240 of revenue and €180 before support. The customer gets a Laravel-native product without a server to manage or a panel to subscribe to; you get a margin no per-account licence eats into.

| Lever | Effect |
| --- | --- |
| Measure real capacity | Load-test your node type with a typical Laravel app before fixing apps-per-server |
| Sell what Laravel developers value | Queues, Horizon, Reverb, scheduler, zero-downtime deploys, PHP 8.6: put them on the product page |
| Upsell on signals | Pool saturation, disk at 90%, sustained CPU: offer the next plan before the customer notices |
| Keep plans simple | Three tiers, the same limits on every node |

## What Cipi is not, for a host {#not}

| Not included | Do instead |
| --- | --- |
| E-mail hosting, DNS servers, reseller accounts | Keep your existing products, or partner for them |
| A client-area tab in WHMCS | Panel invites per app, or your own hook with the [API](/docs/api) |
| Hard quotas | Soft limits with alerts, by design |
| Containers (LXC, OpenVZ) or operating systems other than Ubuntu LTS | Full VMs with Ubuntu 24.04 or 26.04 |

@section vs-alternatives

Server tools fall into five families. Cipi sits in the first, but runs **on your own server, for free**, with a CLI, an optional panel, an API and MCP. This page tells you honestly where it fits and where something else is a better choice. Head-to-head pages: [all comparisons](/alternatives).

| Family | Examples | You pay | Who runs the control plane |
| --- | --- | --- | --- |
| **Server panels** for your VPS | **Cipi**, Laravel Forge, Ploi, RunCloud, Cleavr, Vito Deploy, CloudPanel | Cipi: nothing; SaaS panels: per server per month | Cipi and Vito: you; the rest: the vendor |
| **Managed PaaS** | Laravel Cloud, Ploi Cloud, Render, Sevalla, fortrabbit | Usage or resources | The vendor, on its cloud |
| **Self-hosted Docker PaaS** | Coolify, Dokku, Easypanel | Nothing | You, with containers |
| **Deploy tools** | Kamal | Nothing | You; provisioning is up to you |
| **Hosting panels** | cPanel, Plesk, DirectAdmin, HestiaCP, aaPanel | Licence (cPanel, Plesk, DirectAdmin) or nothing | You, built for shared hosting |

## What Cipi is {#what-cipi-is}

> [!tip] **Free, MIT, on your VPS.** One installer turns Ubuntu into a hardened server; every app is an isolated cell with its own user, PHP pool, database and certificate. Zero-downtime Git deploys, versioned server settings in [`cipi.yml`](/docs/yml), backups, monitoring and security updates. Driven by a CLI, an optional [web panel](/docs/gui), a [REST API](/docs/api) and [MCP servers](/docs/mcp). Laravel-first, with [custom](/docs/custom-apps) and [Node](/docs/node-apps) apps for everything else.

## At a glance {#matrix}

| | Cipi | Forge | Ploi | Vito Deploy | Coolify | Laravel Cloud |
| --- | --- | --- | --- | --- | --- | --- |
| Cost of the tool | **Free** | from $12/server/mo | €8–30/server/mo | Free | Free | Usage-based |
| Runs on | Your VPS | Vendor SaaS | Vendor SaaS | Its own VPS | Your server | Vendor cloud |
| Root on the server | Yes | Yes | Yes | Yes | Yes | No |
| Native Laravel stack (FPM, Octane) | Yes | Yes | Yes | Yes | Containers | Managed |
| Settings versioned in the repo | `cipi.yml` | No | No | No | Partly (compose) | Partly |
| Full CLI, scriptable | Yes | API + CLI | API | API | API | API + CLI |
| Web dashboard | Optional, self-hosted | Yes | Yes | Yes | Yes | Yes |
| MCP for AI assistants | Per app and per server | No | No | No | No | No |
| Config encrypted at rest | Vault (AES-256) | Not advertised | Not advertised | Not advertised | Not advertised | Managed |
| Your infrastructure data leaves the server | Never | Yes (US SaaS) | Yes (EU SaaS) | No | No | Yes |

Prices from each product's public pages; check them before deciding, they change.

## Server panels {#panels}

### Laravel Forge {#vs-forge}

The benchmark: built by the Laravel team, polished and battle-tested at huge scale, with multi-cloud provisioning, teams and monitoring. **Choose Forge** if you want the most mature hosted dashboard and provider integrations. **Choose Cipi** to stop paying per server, keep management on the server itself (no SaaS to be reachable), version server settings in `cipi.yml`, script everything from the CLI and drive it from AI assistants. [Cipi vs Forge](/alternative-to-laravel-forge).

### Ploi {#vs-ploi}

A Forge-like SaaS panel from the Netherlands, natively GDPR-friendly, with a clean UI and built-in backups and monitoring. **Choose Ploi** for a cheaper hosted GUI with EU data handling. **Choose Cipi** when you want no third party at all, no plan limits, and the CLI, API and MCP surface. Not to be confused with [Ploi Cloud](#vs-ploi-cloud). [Cipi vs Ploi](/alternative-to-ploi).

### Vito Deploy {#vs-vito}

The closest in spirit: free, open source, self-hosted, a GUI built with Laravel, teams and plugins. Vito runs as its own Laravel app with a database, usually on a dedicated VPS; Cipi lives on the server it manages and adds the panel only if you want it. Cipi adds `cipi.yml`, MCP, an encrypted vault, server sync, a deploy audit trail and automatic security patching. [Cipi vs Vito Deploy](/alternative-to-vito-deploy).

### RunCloud, Cleavr, ServerPilot, moss.sh {#vs-saas-panels}

Hosted panels from roughly $8 to $49 per server per month. RunCloud and ServerPilot lean towards WordPress and generic PHP; Cleavr and moss.sh support Laravel through a hosted GUI (moss.sh caps deploys on its free tier). Cipi gives you Laravel-aware automation (Deployer releases, workers, scheduler, Horizon, Reverb, Octane) for nothing. [RunCloud](/alternative-to-runcloud) · [Cleavr](/alternative-to-cleavr) · [ServerPilot](/alternative-to-serverpilot) · [moss.sh](/alternative-to-moss).

### CloudPanel {#vs-cloudpanel}

Free and polished, for PHP, Node, Python and static sites. A generic multi-stack panel with no Laravel release or worker management. Pick it if Python sites matter to you; pick Cipi for Laravel depth. [Cipi vs CloudPanel](/alternative-to-cloudpanel).

## Managed PaaS {#paas}

You don't touch a server; you pay for resources and accept the platform's limits.

| Platform | Strength | Choose Cipi when |
| --- | --- | --- |
| [Laravel Cloud](/alternative-to-laravel-cloud) | Autoscaling, scale-to-zero, managed databases and edge, from the Laravel team | You want a fixed bill, root and a portable stack |
| [Ploi Cloud](/alternative-to-ploi-cloud) | EU PaaS for Laravel, PHP and Node, memory-based pricing | You'd rather own the VPS and pay the provider only |
| [Render](/alternative-to-render) | Multi-language, previews, private networking, compliance options | Your apps are Laravel/PHP and you want no usage invoice |
| [Sevalla](/alternative-to-sevalla) | Apps, databases and storage under one managed bill | You want native Laravel on your own Ubuntu |
| [fortrabbit](/alternative-to-fortrabbit) | PHP-specialised managed hosting with a long track record | You want root, Octane, Horizon and Reverb under your control |

<span id="vs-laravel-cloud"></span><span id="vs-ploi-cloud"></span><span id="vs-render"></span><span id="vs-sevalla"></span><span id="vs-fortrabbit"></span>

## Self-hosted Docker PaaS {#docker}

[Coolify](/alternative-to-coolify), [Dokku](/alternative-to-dokku) and [Easypanel](/alternative-to-easypanel) deploy containers on your server, free. Great when you host many stacks and already think in Docker. Cipi runs a **native** Nginx + PHP-FPM/Octane + MariaDB/PostgreSQL stack with no container layer: less overhead, simpler debugging, and Laravel's lifecycle (releases, workers, scheduler, Horizon, Reverb) built in.

## Deploy tools {#deploy-tools}

[Kamal](/alternative-to-kamal) ships containers over SSH to servers you've already prepared. It doesn't install the web server, PHP, databases, firewall, certificates, backups or workers. Cipi does all of that, and deploys. Choose Kamal if you have Docker infrastructure and need only the deploy step.

## Hosting panels {#hosting-panels}

[cPanel](/alternative-to-cpanel), [Plesk](/alternative-to-plesk) and [DirectAdmin](/alternative-to-directadmin) are built for selling shared hosting: e-mail, FTP, DNS and many customer sites, under a licence. Right for hosting resellers, heavy for a team deploying its own apps.

<p id="vs-hestiacp"><strong>HestiaCP</strong> (the maintained fork of the abandoned VestaCP) is a free, lighter alternative for e-mail, DNS and many websites, with no Laravel tooling. <span id="vs-aapanel"></span><strong>aaPanel</strong> is a free, plugin-based multi-stack panel popular in Asia-Pacific, GUI-centric, also without Laravel automation.</p>

<p id="vs-gridpane"><strong>GridPane, xCloud and ServerAvatar</strong> focus on WordPress and WooCommerce: staging clones, multisite, WordPress caching. For WordPress fleets, evaluate them on their merits. Cipi runs WordPress as a <a href="/docs/custom-apps">custom app</a> when it sits next to your Laravel apps.</p>

<p id="vs-20i"><strong>20i</strong> is a hosting company (reseller, WordPress, VPS, domains, e-mail, 24×7 support). It covers a full hosting catalogue; Cipi replaces it only for "deploy my apps on a VPS I own". <a href="/alternative-to-20i">Cipi vs 20i</a>.</p>

## How to choose {#choose}

```flow
Own a VPS? | no → managed PaaS
Laravel or PHP apps? | many stacks → Docker PaaS
Want to pay per server? | yes → Forge or Ploi
Otherwise | Cipi
```

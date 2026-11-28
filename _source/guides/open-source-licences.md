---
title: "Open source licences, explained: what they allow, and why Cipi's stack is built on them"
description: "MIT, BSD, Apache, GPL, AGPL and source-available licences in plain words: what you may do, what you must do, the licence changes that caught teams out, and how Cipi's choices keep your servers transparent, auditable and yours."
lead: "A licence decides what you may do with software today, and what its owner may change tomorrow. On the servers that run your business, both matter."
category: strategy
order: 2
published: 2026-11-24
updated: 2026-11-24
keywords: open source licenses explained, mit vs gpl vs agpl, source available license, open source server stack, valkey redis license, self-hosted open source security
related:
  - vps-vs-kubernetes-vs-managed-paas
  - cipi-enterprise
  - laravel-security-checklist
faq:
  - Can I use Cipi commercially, for clients or to sell hosting? | Yes. The MIT licence allows any use, including commercial use, modification and resale. Keep the copyright and licence notice in copies of Cipi's code.
  - Does running GPL software on my server make my app GPL? | No. Running MariaDB, MySQL or Fail2ban doesn't touch your code's licence. GPL obligations start when you distribute the GPL program itself, modified or not.
  - What about the AGPL? | It adds one obligation: if you modify an AGPL program and let users interact with it over a network, you must offer them your modified source. None of the components Cipi installs is AGPL.
  - Can Cipi change its licence? | Future versions of any project can be released under another licence by whoever holds the rights. Versions already released under MIT stay MIT: anyone can keep using, forking and maintaining them.
  - Is "source available" the same as open source? | No. You can read the code, but the licence restricts use (often competing services or hosting). It's not open source under the Open Source Definition.
  - Does open source mean secure? | Not automatically. It means the code can be checked, by you, your auditor or anyone. Security comes from review, patching and defaults; open source makes all three verifiable.
  - How do I check my own app's dependencies? | `composer licenses` lists every PHP package with its licence; for a full inventory, generate an SBOM with CycloneDX. Scanners such as [Hackly](/guides/hackly-security-scanning) add vulnerability checks.
docs:
  - design-decisions
  - security-model
  - history
  - community
---
Your hosting stack is the last place you want a surprise. A licence is the contract that says what you may do with each piece of it, what you must do in return, and how much its owner can change your situation later. This guide explains the families in plain words, looks at the licence changes that caught teams out, and shows how Cipi's choices are made to keep you out of that story.

> [!info] This is an engineer's overview, not legal advice. For a specific contract or product, ask a lawyer who knows software licensing.

```flow
Families | MIT to SSPL | #families
Definition | the guarantees | #definition
Changes | what happened | #changes
Cipi | all MIT | #cipi
Stack | by component | #stack
Trust | read, patch, fork | #transparency
Your app | its deps | #your-app
```

## The licence families, in plain words {#families}

| Family | Examples | You may | You must | Watch out for |
| --- | --- | --- | --- | --- |
| **Permissive** | MIT, BSD-2/3-Clause, Apache-2.0, PostgreSQL, PHP License | Use, modify, sell, embed in closed products | Keep the copyright and licence notice (Apache-2.0: also state changes, keep NOTICE) | Almost nothing. Apache-2.0 adds an explicit patent licence |
| **Weak copyleft** | LGPL, MPL-2.0 | Use in closed products | Share changes to *those* files or that library | Mixing code at file level (MPL) or static linking (LGPL) |
| **Strong copyleft** | GPL-2.0, GPL-3.0 | Use, modify, run anywhere | If you **distribute** the program or a derivative, do it under the GPL with source | Shipping GPL code inside a product you sell as a binary |
| **Network copyleft** | AGPL-3.0 | Use, modify | If you modify it and users reach it **over a network**, offer them your source | Patched AGPL servers offered as a service |
| **Source-available** | BSL/BUSL, SSPL, Elastic License, RSAL | Read the code, use it within the licence's limits | Respect the restrictions (often: no competing hosted service) | Not open source; terms set by one company and changeable for future versions |

Two things are worth knowing about copyleft. It is triggered by **distribution** (or, for AGPL, network use of a modified version), not by running software: a server running GPL databases doesn't make your Laravel app GPL. And it protects *users' freedoms* rather than restricting them: it stops anyone from taking the code closed.

## What "open source" actually guarantees {#definition}

"Open source" has a definition, maintained by the Open Source Initiative. Among its criteria: free redistribution, source code available, derived works allowed, and **no discrimination against persons, groups or fields of use**. That last one is why source-available licences don't qualify: forbidding "offering the software as a service" discriminates a field of use.

For infrastructure, the definition turns into four practical guarantees:

| Guarantee | Why it matters on a server |
| --- | --- |
| You can read it | You (or an auditor) can check what runs as root |
| You can change it | A fix doesn't have to wait for the vendor |
| You can share it | A community can maintain it if the original owner stops |
| Nobody can forbid your use case | Hosting clients, competing with someone, selling services: all allowed |

## When licences change {#changes}

Single-company projects can release **future versions** under a different licence. It has happened to some of the best-known infrastructure software:

| Year | Project | Change | What the community did |
| --- | --- | --- | --- |
| 2018 | MongoDB | AGPL-3.0 → SSPL | Distributions dropped it from their archives |
| 2021 | Elasticsearch, Kibana | Apache-2.0 → SSPL / Elastic License | AWS and others forked **OpenSearch** (Elastic later added the AGPL as an option, in 2024) |
| 2023 | Terraform, Vault (HashiCorp) | MPL-2.0 → BSL 1.1 | **OpenTofu** and **OpenBao** forks, under the Linux Foundation |
| 2024 | Redis | BSD-3-Clause → RSALv2 / SSPLv1 | **Valkey** fork, BSD-3-Clause, under the Linux Foundation (Redis later added the AGPL as an option) |

The lessons are the same each time. Versions already released keep their licence, so a fork can always start from the last open one. The cost falls on users who must re-evaluate, migrate or freeze versions, usually in a hurry. And the risk is highest where **one company owns all the rights** and earns from a hosted version of the same software.

## Cipi's own licences {#cipi}

Every part of Cipi is released under the **MIT licence**, the most permissive common open source licence:

| Repository | What it is | Licence |
| --- | --- | --- |
| [cipi-sh/cipi](https://github.com/cipi-sh/cipi) | The server CLI and installer | MIT |
| [cipi-sh/agent](https://github.com/cipi-sh/agent) | Laravel package: webhook deploys, health, MCP, anonymized dumps | MIT |
| [cipi-sh/api](https://github.com/cipi-sh/api) | REST API and MCP server for the server | MIT |
| [cipi-sh/gui](https://github.com/cipi-sh/gui) | Optional web panel | MIT |
| [cipi-sh/cli](https://github.com/cipi-sh/cli) | `cipi-cli` for your laptop | MIT |
| [cipi-sh/sdk](https://github.com/cipi-sh/sdk) | PHP SDK | MIT |
| [cipi-sh/whmcs](https://github.com/cipi-sh/whmcs) | WHMCS provisioning module | MIT |

What MIT means for you, concretely: no fee, no account, no per-server or per-site limit, commercial use allowed (agencies, hosting companies, SaaS), modifications allowed, private forks allowed. The only obligation is to keep the copyright and licence notice in copies of the code. What it doesn't give you is a warranty: the licence disclaims it, as every open source licence does. Support comes from the docs, GitHub and the community, and [the enterprise guide](/guides/cipi-enterprise) covers what to put around it in a larger organisation.

## The stack, component by component {#stack}

Cipi installs well-known open source components from their official packages, and chooses them with licences in mind:

| Component | Role | Licence | Installed |
| --- | --- | --- | --- |
| Ubuntu LTS | Operating system | Mostly GPL and other OSI licences | Base |
| Nginx (nginx.org packages) | Web server | BSD-2-Clause | Always |
| PHP (packages.sury.org) | Runtime | PHP License (BSD-style, permissive) | Always |
| MariaDB Server | Database on port 3306 | GPL-2.0 | Default |
| MySQL Community | Alternative on port 3306 | GPL-2.0 | Only with `sudo cipi db switch mysql` |
| PostgreSQL | Database on port 5432 | PostgreSQL License (permissive) | Optional |
| Valkey | Cache, sessions, queues | BSD-3-Clause | Always |
| Supervisor | Queue workers, Horizon, Reverb, Octane | BSD-style | Always |
| Deployer | Zero-downtime releases | MIT | Always |
| Composer, Node.js | Builds | MIT | Always |
| Certbot | Let's Encrypt certificates | Apache-2.0 | Always |
| UFW, Fail2ban | Firewall, bans | GPL-3.0, GPL-2.0 | Always |
| CrowdSec | Shared threat intelligence | MIT | Optional |
| ClamAV | Malware scan | GPL-2.0 | Optional |
| Meilisearch | Search for Laravel Scout | MIT (Community Edition) | Optional |
| FrankenPHP | Octane runtime | MIT | Optional |

Three choices worth noting:

| Choice | Reason |
| --- | --- |
| **Valkey instead of Redis** | Same protocol, same `phpredis`, same `REDIS_*` keys, but BSD-licensed and stewarded by the Linux Foundation. Servers moved automatically on `sudo cipi self-update` ([why](/docs/design-decisions#valkey)) |
| **MariaDB by default** | A GPL community server with no enterprise edition gating features and no dual licensing to navigate; MySQL stays available as an explicit choice ([guide](/guides/laravel-mysql-instead-of-mariadb)) |
| **No source-available component** | Nothing in this stack carries a "no competing service" clause, so you can host clients, sell hosting or build a platform on it |

None of these components is AGPL. Cipi installs them from their official packages and configures them, it doesn't ship modified copies, so running them creates no licence obligation for you as the operator of the server.

The [optional packages](/docs/packages) are a different matter: third-party tools installed only when you ask, each under its own licence. Most are open source. Among the [security scanners](/docs/packages#sec), WPScan (`sec-wpscan`) is not: it is free to test your own systems and for penetration testers, but needs a commercial licence to be sold as a service. Nmap (`sec-recon`) has a licence of its own, the NPSL: the GPL with extra terms. Read a tool's licence before you build a paid service on it.

## Transparency: you can read what runs as root {#transparency}

| What you can check | Where |
| --- | --- |
| Every command Cipi runs | Bash and PHP in `/opt/cipi/lib` on your server, the same code as on GitHub |
| Every change between versions | The [changelog](https://github.com/cipi-sh/cipi/blob/master/CHANGELOG.md), written to explain *why*, with the tests each release adds |
| What leaves the server | Nothing by default: no telemetry, no account, no control plane. Alerts and backups go only where you configure them |
| What the panel and API may do | A sudo allowlist of `cipi` commands (`/etc/sudoers.d/cipi-api`), readable on the server |
| Who deployed what | A hash-chained [deploy ledger](/docs/deploy-audit), copied to syslog |
| How the server measures up | [`sudo cipi compliance`](/docs/compliance), which says plainly what it can't prove |

A closed SaaS panel asks you to trust a dashboard. An open source tool on your own server lets you verify instead.

## Security: why openness helps {#security}

Open source doesn't make software secure by itself. It makes security **checkable**, and it changes who you depend on:

| Property | What it gives you |
| --- | --- |
| Auditable | You, your security team or an external auditor can review the code that has root on your servers |
| Patched upstream | Components come from their official repositories (Ubuntu, nginx.org, packages.sury.org, MariaDB.org), so fixes arrive with the vendor's own release; Cipi applies PHP and stack patches nightly |
| No vendor in the path | No external control plane to breach, and no outage at a vendor that takes your deploys down |
| Responsible disclosure | Private vulnerability reports on GitHub, with a [security.txt](https://cipi.sh/.well-known/security.txt) on this site |
| Reproducible | The same standard packages on every server: what's secure on one is secure on all |
| No surprise relicensing at the core | MIT for Cipi, permissive or copyleft OSI licences for the stack, no single-vendor source-available component |

## Continuity: if the project stops tomorrow {#continuity}

| If… | Then |
| --- | --- |
| cipi.sh went offline | Your servers keep running: nothing on them calls home. Deploys, backups, renewals and alerts work as before |
| Development stopped | The last version keeps working; MIT lets anyone fork and maintain it |
| You want to leave Cipi | The server is standard Ubuntu with standard packages, configs in their usual places. Any sysadmin can take it over |

That's the practical value of a licence nobody can take away, on software that doesn't depend on a service.

## Check your own app {#your-app}

The same reasoning applies to your Laravel app's dependencies:

```bash
$ composer licenses                        # every PHP package and its licence
$ composer licenses --format=json > licences.json
$ composer require --dev cyclonedx/cyclonedx-php-composer
$ composer CycloneDX:make-sbom             # a software bill of materials
```

| Look for | Why |
| --- | --- |
| AGPL packages in a SaaS you modify | The network clause may apply to your changes |
| Source-available packages | Check their restrictions against your business model |
| "proprietary" or unknown licences | Ask the vendor, or replace them |
| Abandoned packages | A licence doesn't patch vulnerabilities: combine with [security scanning](/guides/laravel-security-checklist) |

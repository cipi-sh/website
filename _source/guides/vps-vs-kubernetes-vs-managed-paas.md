---
title: "Cipi on a VPS, Kubernetes or a managed platform: how to choose"
description: "Self-hosted on a VPS with Cipi, Kubernetes, or a managed PaaS like Laravel Cloud, Ploi Cloud or Sevalla: what each really costs, what a variable bill must buy you to be worth it, and when a fixed bill wins."
lead: "A fixed bill or a variable one, your server or someone else's. The honest way to choose is to put numbers on what the managed option buys you, then check whether you need it."
category: strategy
order: 1
published: 2026-11-24
updated: 2026-11-24
keywords: laravel cloud vs vps, kubernetes for laravel, self-hosted vs managed hosting, predictable hosting costs, laravel hosting cost, ploi cloud vs vps, sevalla vs vps
related:
  - open-source-licences
  - cipi-enterprise
  - migrate-server-cipi-sync
faq:
  - Is a VPS always cheaper? | For steady traffic, almost always: one price covers app, database, cache and bandwidth. For apps that are idle most of the time, or whose peaks are many times their average, usage billing with scale-to-zero can win. The [elasticity test](#elasticity) tells you which case you're in.
  - Isn't my time more expensive than the price difference? | Sometimes. That's why the first test in this guide converts the premium into hours. If the managed platform doesn't save you that many hours a month, the premium isn't buying time.
  - What if the VPS provider raises its prices? | It happens: Hetzner raised cloud prices twice in 2026. The difference is that a VPS price is one number, announced in advance, and Cipi is the same on every provider, so moving is a `cipi sync` away.
  - Do spending limits fix unpredictable bills? | They cap the bill, not the cause. When the cap is hit, the app degrades or stops, which is what a VPS does at full capacity, but you've paid more per unit of capacity up to that point.
  - Should a Laravel monolith run on Kubernetes? | Rarely on its own. Kubernetes pays off when many services and teams share a platform that someone already operates. For one app with queues and a scheduler, it's mostly overhead.
  - Can I mix them? | Yes. Common mixes: Cipi for production with a managed database for the data, Cipi for Laravel apps next to a Kubernetes platform for other services, or a managed platform for previews and Cipi for production.
  - Does Cipi do autoscaling or high availability? | No autoscaling: you size the server. For availability: monitoring, health checks with auto-rollback, verified backups and a warm standby with `cipi sync`. If you need multi-zone failover without thinking about it, a managed platform is the better fit.
docs:
  - vs-alternatives
  - design-decisions
  - sync
  - backups
  - metrics
---
There are four common ways to run a Laravel app in production. They differ less in what the app can do than in **who runs the servers** and **how the bill is built**. This guide compares them, then gives you three tests to decide, with your own numbers, whether a variable bill is worth its premium.

## In 30 seconds {#summary}

| If… | Choose |
| --- | --- |
| Traffic is fairly steady, you want a fixed bill, root access and no lock-in | **Cipi on a VPS** |
| Nobody on the team will own a Linux server, or peaks are many times the average, or you need managed failover | **A managed platform** (Laravel Cloud, Ploi Cloud, Sevalla, Render, fortrabbit) |
| Many services and teams share one platform, and a platform team already runs it | **Kubernetes** |
| You want a SaaS panel driving your VPS and don't mind a subscription | Forge or Ploi ([comparisons](/alternatives)) |

```flow
Models | who runs what | #models
Who does what | self vs managed | #responsibilities
Bills | fixed vs variable | #bills
Fixed wins | hidden costs | #predictable
Three tests | your numbers | #tests
K8s | when it pays | #kubernetes
Choose | signals, mixes | #choose
```

## The four models {#models}

| | Cipi on a VPS | SaaS panel + VPS | Managed platform (PaaS) | Kubernetes |
| --- | --- | --- | --- | --- |
| **Who runs the servers** | You, with Cipi automating the routine | You, driven by the vendor's panel | The vendor | You (or your platform team), the cloud runs the control plane |
| **How you pay** | VPS price, fixed. Cipi is free (MIT) | VPS price + subscription | Plan + usage (compute, database, bandwidth, builds…) | Control plane + nodes + load balancers + traffic |
| **Root access** | Yes | Yes | No | On nodes, if not serverless |
| **Scaling** | Resize the server, or spread apps over servers | Same | Automatic, sometimes to zero | Automatic, if you configure it |
| **Laravel specifics** | Built in: releases, queues, Horizon, scheduler, Reverb, Octane | Built in | Built in (Laravel-focused platforms) | You build them: images, workers, CronJobs, migrations |
| **Lock-in** | None: standard Ubuntu stack, any provider | Low: servers are yours, the panel isn't | Databases, queues and storage are platform resources | Low on the app, high on the platform's YAML and add-ons |
| **Typical team** | Developers, agencies, small and mid-size companies, internal IT | Same, preferring a hosted UI | Teams that never want to see a server | Organisations with a platform team |

Many managed platforms are Kubernetes underneath (Ploi Cloud, for example, deploys to managed Kubernetes clusters): with a PaaS you pay someone to run that layer for you.

## Self-hosted vs managed: who does what {#responsibilities}

"Managed" doesn't mean "nothing to do", and "self-hosted" doesn't mean "do it all by hand". This is the honest split:

| Task | Cipi on a VPS | Managed platform | Kubernetes |
| --- | --- | --- | --- |
| OS and security patches | Automatic (unattended-upgrades), reboots when you choose | Vendor | Node images: you or the cloud |
| PHP, Nginx, database patches | Automatic, nightly, one service at a time | Vendor | You rebuild images |
| TLS certificates | Automatic (Let's Encrypt) | Vendor | cert-manager, which you install |
| Backups | Built in: encrypted, verified, off-site | Vendor (check retention and restore options) | You choose and run a tool |
| Monitoring and alerts | Built in: monitor, health checks, metrics, heartbeat | Vendor dashboards | You install a stack |
| Scaling | You resize or add servers | Automatic | Automatic, after you tune it |
| Failover across zones | You plan it (warm standby with `cipi sync`) | Vendor, on higher plans | You design it |
| Incident at 3 a.m. on the infrastructure | **You** | Vendor (and you, waiting) | **You** |
| Bugs, slow queries, bad deploys | You | You | You |
| Security of your code | You | You | You |
| Cost control | One number | You, through limits and alerts | You, through FinOps |

The rows that stay yours in every column (code, queries, deploys) are where most incidents come from. Managed platforms take away the infrastructure rows; Cipi automates most of the same rows, and leaves the decisions and the pager with you.

## How the bills are built {#bills}

A **fixed** bill has one line: the server. Bigger traffic makes the server busier, not the invoice longer.

A **variable** bill multiplies prices by usage. A typical one has a base plan plus: compute per second per replica, database compute and storage, cache, bandwidth per GB, build minutes, log retention, sometimes per-seat fees. Published prices in November 2026, as examples (check the vendors' pages before deciding):

| Platform | How it charges |
| --- | --- |
| [Laravel Cloud](https://laravel.com/cloud/pricing) | Starter $5, Growth $20, Business $200 a month, **plus usage**; $5 of usage credit included; scale-to-zero; spending limits per organisation |
| [Sevalla](https://sevalla.com/pricing/) | Usage-based, from $5 a month; application bandwidth $0.10 per GB |
| [Ploi Cloud](https://ploi.cloud/pricing) | Usage-based, on managed Kubernetes; managed MySQL/PostgreSQL from €14 a month; object storage €10 per 250 GB |
| [Amazon EKS](https://aws.amazon.com/eks/pricing/) | $0.10 per cluster per hour (about $73 a month) for the control plane, $0.60 (about $438) on an outdated Kubernetes version; nodes, load balancers and traffic on top |
| [DigitalOcean Kubernetes](https://docs.digitalocean.com/products/kubernetes/details/pricing) | Control plane free, high availability $40 a month; nodes on top |
| AWS traffic to the internet | First 100 GB a month free, then $0.09 per GB |
| **Cipi on a VPS** | The VPS price. Most VPS plans include a terabyte or more of traffic |

Fixed isn't frozen either: [Hetzner raised its cloud prices](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/) twice in 2026. But a VPS price is one number, announced in advance, easy to compare across providers, and Cipi is the same on all of them.

## Why a predictable bill is worth more than it looks {#predictable}

**You can quote it.** An agency that bills clients a fixed hosting fee turns every variable line into margin risk. A company budget wants one number per year, not a range.

**It grows with you, not with accidents.** A variable bill grows with things you don't choose: an aggressive crawler, a bot pulling your images, a queue job stuck in a retry loop, an autoscaler that reaches its maximum during an attack. On a VPS these make the server slower and fire an alert; on usage billing they also make an invoice. Two terabytes of unexpected traffic at $0.09–0.10 per GB is about $180–200, in one month.

**Spending limits cap the bill, not the cause.** When the cap is reached, the app degrades or stops: the same thing a VPS does when it's full. The difference is that, up to the cap, you paid more per unit of capacity.

**Every decision stops being a pricing decision.** Add a queue worker, keep logs longer, cache more, run a nightly report: on a fixed bill you decide on technical grounds. On a variable bill each choice is also a cost forecast.

**Leaving stays cheap.** A Cipi server is standard Ubuntu with standard packages; another provider is one [`cipi sync`](/guides/migrate-server-cipi-sync) away. Once an app depends on a platform's serverless database, managed queues and storage, leaving costs engineering time, and that cost belongs in the comparison.

## Three tests: what must a variable bill buy you? {#tests}

Call **F** the fixed monthly cost of the Cipi setup (the VPS sized for your peak, backup storage, maybe a standby server) and **V** your realistic monthly bill on the managed platform, from its own calculator. The **premium** is **P = V − F**. Here's what P has to pay for.

### Test 1 — Time: is it buying hours? {#time}

```text
break-even hours per month = P ÷ your hourly cost
```

| Premium P | Hourly cost €60 | Hourly cost €90 |
| --- | --- | --- |
| €50 / month | 0.8 h | 0.6 h |
| €200 / month | 3.3 h | 2.2 h |
| €500 / month | 8.3 h | 5.6 h |

The managed platform must save you **at least that many hours every month**. Count honestly: on a Cipi server patching, certificate renewals, backups, verification and alerting run by themselves. What's left is reading alerts, the upgrades you decide to do, and incidents. If that's below the break-even, the premium isn't buying time; it's buying comfort, which is fine, as long as you know it.

### Test 2 — Elasticity: do your peaks pay for it? {#elasticity}

You size a VPS for your **peak**; a usage bill charges your **average**. Call **m** the platform's markup: the monthly price of an always-on instance on the platform divided by the price of a VPS with the same vCPU and RAM.

```text
usage billing is cheaper only when  peak ÷ average  >  m
```

| Your traffic | Peak ÷ average | Usually cheaper |
| --- | --- | --- |
| Business app, office hours | 2–3× | VPS |
| E-commerce, normal weeks | 2–4× | VPS |
| Ticket sales, launches, TV spots | 10–50× during the event | Usage billing, or a VPS resized for the event |
| Side project, idle most of the day | very high (average near zero) | Scale-to-zero, unless it shares a VPS with other apps |
| Staging and previews | very high | On Cipi they share an existing server at no extra cost |

These are typical shapes; measure yours. `sudo cipi metrics show --app=shop --range=30d` gives the minimum, average and peak of an app's CPU and requests per minute over the last month.

Two corrections make the test fairer. A Cipi server hosts many apps for one price, so compare **per server, not per app**: ten small sites on one VPS have a marginal cost close to zero. And a VPS can be **resized for a known event** and back, which turns a predictable peak into a predictable one-off cost.

### Test 3 — Risk: is it buying availability? {#risk}

```text
justified if  12 × P  ≤  (cost of one hour down) × (hours of downtime it avoids per year)
```

With P = €200 (€2,400 a year) and an hour of downtime costing you €300, the platform must avoid **8 hours of downtime a year** that you would otherwise have. Compare like with like: single-server commitments from VPS providers commonly sit between 99.5% and 99.99% (Hetzner's is 99.9%, about 8.8 hours a year), so check what the managed platform commits to on the plan you'd actually buy. What changes the number more is your **recovery time**: on Cipi, health checks with automatic rollback undo a bad release in seconds, the [monitor](/docs/monitor) and the [heartbeat](/docs/metrics#heartbeat) tell you the server is in trouble, and a warm standby fed by `cipi sync` every few hours is a DNS change away.

If your downtime costs thousands per hour and you need multi-zone failover without designing it yourself, test 3 says "managed", and you should listen.

### The verdict {#verdict}

| A variable bill earns its premium when | Measured as |
| --- | --- |
| It saves more hours than it costs | Test 1: hours saved × hourly cost > P |
| Your peaks are much higher than your average | Test 2: peak ÷ average > m |
| It avoids downtime you can't avoid otherwise | Test 3: downtime avoided × cost per hour > 12 × P |
| Nobody can own a server, and you won't hire or contract someone who can | A team decision, not a number |

If none of these holds, the fixed bill wins, usually by a wide margin, and keeps winning as you grow, because a busier server costs the same.

## Kubernetes: when it pays off {#kubernetes}

Kubernetes is an excellent platform for running **many services, owned by many teams**, on a shared pool of machines. For a Laravel monolith with queues and a scheduler, most of its value goes unused and most of its cost remains.

| Kubernetes makes sense when | It's overhead when |
| --- | --- |
| Dozens of services in several languages | One or a few Laravel or PHP apps |
| A platform team already runs clusters for the company | The developers would also become the platform team |
| You need bin-packing and self-healing across many nodes | One or two servers carry the load |
| Images are built once in CI and promoted unchanged through environments | `git push` and a release folder are enough |
| A company standard requires it | Nobody asked for it |

What you build yourself for Laravel on Kubernetes: images per release, web and worker Deployments, the scheduler (a CronJob or one replica of `schedule:work`), migrations as a Job before the rollout, sessions and cache in Valkey or Redis, uploads on object storage, Horizon and Reverb processes, ingress and certificates. And what you pay: the control plane where it's billed, at least two or three nodes for availability, load balancers, NAT gateways and traffic on the big clouds, plus regular cluster upgrades to stay on supported versions (Kubernetes ships about three minor versions a year; on EKS a version leaves standard support after 14 months and the cluster fee rises sixfold).

Cipi deliberately doesn't use containers on the server ([why](/docs/design-decisions#docker)). If containers are your standard, a self-hosted Docker platform such as [Coolify](/alternative-to-coolify) or [Dokku](/alternative-to-dokku) is a lighter step than Kubernetes.

## Choose: signals and sensible mixes {#choose}

| Signal | Points to |
| --- | --- |
| "We need to know the hosting cost for next year" | Cipi on a VPS |
| "Our customers' data must stay in this country, with this provider" | Cipi on a VPS there |
| "We run 30 client sites and bill a fixed hosting fee" | Cipi on a few VPSs ([for agencies and hosts](/guides/hosting-providers-laravel-whmcs)) |
| "Nobody here will ever SSH into a server" | Managed platform |
| "Two days a year we get 40× the traffic" | Managed platform, or Cipi with a planned resize |
| "We have a platform team and 50 microservices" | Kubernetes, with Laravel apps on it or next to it |
| "We need a SOC 2 report from our hosting vendor" | Managed platform, or a certified provider for the VPS plus [`cipi compliance`](/docs/compliance) evidence for your own controls |

Mixes that work well:

| Mix | Why |
| --- | --- |
| Cipi for the app, a managed database for the data | Fixed bill for compute, managed failover and point-in-time restore where it matters most. Point the app's `DB_*` settings at it; its backups are then the database provider's |
| Cipi for Laravel apps, Kubernetes for the rest of the company | Each tool where it's simplest |
| Production on Cipi, a second Cipi server as warm standby | Recovery in minutes for the price of one more VPS |
| Cloudflare in front of Cipi | CDN, cache and DDoS filtering at the edge; with [Zero Trust](/guides/cloudflare-zero-trust-laravel) the origin can close its ports |

## What you get with Cipi {#why-cipi}

| Advantage | What it means |
| --- | --- |
| **Free and open source** | MIT licence, no subscription, no per-server, per-site or per-seat fees ([licences](/guides/open-source-licences)) |
| **A fixed, predictable bill** | One VPS price, whatever the traffic does |
| **Nothing between you and your server** | No external control plane: nothing stops working if a vendor changes plans or goes down |
| **Laravel built in** | Zero-downtime releases, rollback, queues, Horizon, scheduler, Reverb, Octane, Meilisearch, health checks with auto-rollback |
| **Isolation by default** | Each app has its own Linux user, PHP pool, database user and Valkey instance |
| **Configuration as code** | [`cipi.yml`](/cipi-yml) keeps workers, cron, domains and backups in the repository, planned and applied all or nothing |
| **Security on autopilot** | Nightly PHP and stack patches, firewall, Fail2ban, optional CrowdSec and malware scans, encrypted secrets |
| **Operations included** | Encrypted, verified backups; monitor, health checks and [metrics](/guides/cipi-metrics-server-app-uptime); alerts on Slack, Telegram, e-mail and more |
| **Evidence for audits** | A hash-chained deploy ledger and [`cipi compliance`](/docs/compliance) mapped to ISO 27001 and SOC 2 |
| **Portable** | Any provider, any region; move with `cipi sync` |
| **Automation and AI** | CLI, REST API, PHP SDK, cipi-cli and MCP servers with guardrails |

And what you give up, so the comparison stays fair: no autoscaling, no vendor to call at 3 a.m., Ubuntu LTS only, and the server is yours to own.

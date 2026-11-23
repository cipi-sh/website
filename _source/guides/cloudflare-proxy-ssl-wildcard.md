---
title: Cloudflare in front of Laravel, explained: DNS, proxy, SSL modes and wildcards
description: Put a Laravel app on Cipi behind Cloudflare without redirect loops or broken certificates: DNS records, orange vs grey cloud, every SSL/TLS mode explained, wildcard certificates over DNS, real visitor IPs, caching rules, WAF, WebSockets and upload limits, step by step.
category: ops
order: 8
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: cloudflare laravel setup, cloudflare full strict laravel, too many redirects cloudflare laravel, cloudflare wildcard certificate laravel, cloudflare proxy real ip laravel, cloudflare dns-01 lets encrypt
docs:
  - ssl
  - wildcard-domains
  - zero-trust
  - domains
related:
  - laravel-multi-tenant-wildcard
  - cloudflare-zero-trust-laravel
  - vps-ssh-dns-basics
faq:
  - Orange or grey cloud? | Grey (DNS only) sends visitors straight to your server: simplest, nothing in between. Orange (proxied) sends them through Cloudflare: CDN, DDoS protection, WAF, hidden server IP. Both work with Cipi; with orange, use SSL/TLS Full (strict).
  - Why do I get "too many redirects"? | SSL/TLS is set to Flexible: Cloudflare talks HTTP to your server, Cipi redirects to HTTPS, Cloudflare asks again over HTTP, forever. Set Full (strict).
  - Do I need Cloudflare for HTTPS? | No. Cipi issues free Let's Encrypt certificates for any domain. Cloudflare is needed only to automate wildcard certificates, or if you want its proxy features.
  - Can I use the free plan? | Yes. DNS, proxy, Universal SSL, basic WAF and DNS-01 certificates all work on the free plan.
  - Why does Laravel log Cloudflare's IP instead of the visitor's? | Behind the proxy, requests come from Cloudflare. Nginx must read the real IP from Cloudflare's header and Laravel must trust the proxy. See step 6.
  - Do WebSockets (Reverb) work through the proxy? | Yes, Cloudflare proxies WebSockets on the standard HTTPS port, which is what Cipi uses for Reverb.
  - Are uploads limited? | Through the proxy, request bodies are limited by your Cloudflare plan (100 MB on Free and Pro). For bigger uploads, upload directly to object storage with signed URLs, or use a grey-cloud subdomain.
  - Does a deep subdomain like a.b.example.com work? | Not with Cloudflare's free Universal SSL, which covers the apex and one level. Keep names one level deep, or buy an advanced certificate.
---
Cloudflare sits between your visitors and your server. Used well, it adds a CDN, DDoS protection and a firewall for free. Used wrong, it causes the two classic problems: **redirect loops** and **certificate errors**. This guide sets it up correctly for an app on Cipi, and explains every setting so you know why.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **DNS only (grey cloud)** | Cloudflare only answers DNS; visitors connect to your server directly |
| **Proxied (orange cloud)** | Visitors connect to Cloudflare; Cloudflare connects to your server |
| **Edge certificate** | The certificate visitors see, from Cloudflare (when proxied) |
| **Origin certificate** | The certificate on your server, for Cloudflare-to-server traffic |
| **SSL/TLS mode** | How Cloudflare talks to your server: not at all, HTTP, or HTTPS (checked or not) |
| **DNS-01** | Proving domain ownership with a DNS record: needed for wildcard certificates |

```flow
Visitor | https://shop.example.com
> The browser connects to Cloudflare (orange cloud) and gets Cloudflare's edge certificate.
Cloudflare | CDN, WAF, DDoS
> Cloudflare filters the request, serves cached static files if it can, and otherwise forwards it.
Your server | Nginx, Cipi's certificate
> With Full (strict), Cloudflare connects to your server over HTTPS and checks your certificate is valid. Cipi's Let's Encrypt certificate is.
Laravel | your app
> The app answers; Cloudflare passes the response back. With real-IP configured, Laravel sees the visitor's IP, not Cloudflare's.
```

## Before you start {#before}

- A domain whose DNS is (or will be) on Cloudflare. Moving DNS to Cloudflare is free and doesn't move your website: you copy the records, then change the nameservers at your registrar.
- An app on Cipi ([first deploy](/guides/deploy-laravel-ubuntu-vps)).

## 1. DNS records {#dns}

In Cloudflare, **DNS → Records**:

| Type | Name | Content | Proxy status |
| --- | --- | --- | --- |
| A | `@` | your server IPv4 | Orange or grey |
| A | `www` | your server IPv4 | Same as `@` |
| AAAA | `@`, `www` | your server IPv6 (if any) | Same |
| A | `*` | your server IPv4 | Only for [wildcards](#wildcard) |

**Start grey** (DNS only) until the site works over HTTPS, then switch to orange. That way you test one thing at a time.

## 2. Choose the SSL/TLS mode: Full (strict) {#ssl-mode}

**SSL/TLS → Overview**. This is the setting that breaks most sites:

| Mode | Cloudflare → your server | With Cipi |
| --- | --- | --- |
| Off | No HTTPS at all | Don't |
| Flexible | **HTTP** | **Redirect loop**: Cipi sends HTTP to HTTPS, forever |
| Full | HTTPS, certificate **not** checked | Works, but an attacker in between wouldn't be noticed |
| **Full (strict)** | HTTPS, certificate **checked** | **Use this** |

Full (strict) needs a valid certificate on your server. Cipi gives you one:

```bash
$ sudo cipi ssl install shop                      # Let's Encrypt over HTTP
# or, if the record is already orange or you need wildcards:
$ sudo cipi ssl dns set --token=YOUR_CLOUDFLARE_TOKEN
$ sudo cipi ssl install shop --dns=cloudflare     # Let's Encrypt over DNS
```

> [!tip] DNS validation (`--dns=cloudflare`) works whatever the proxy status and even with port 80 closed. If you're behind Cloudflare, prefer it: renewals never depend on Cloudflare rules.

## 3. Create the API token (for DNS validation) {#token}

**My Profile → API Tokens → Create Token → Edit zone DNS** template. Limit it to your zone. That's the only permission needed (**Zone → DNS → Edit**). Save it once on the server:

```bash
$ sudo cipi ssl dns set --token=YOUR_CLOUDFLARE_TOKEN
$ sudo cipi ssl dns list
```

Several Cloudflare accounts (one per client)? Name them: `--name=client-a`, then `--account=client-a` when issuing ([SSL docs](/docs/ssl#accounts)).

## 4. Switch on the proxy {#proxy}

When `https://shop.example.com` works with the grey cloud, click the cloud to make it orange, for `@` and `www`. Then, in **SSL/TLS → Edge Certificates**:

| Setting | Set to | Why |
| --- | --- | --- |
| Always Use HTTPS | On | Cloudflare redirects HTTP itself |
| Minimum TLS Version | 1.2 | Old clients only |
| Automatic HTTPS Rewrites | On | Fixes mixed `http://` links |
| HSTS | On, **only after** everything works over HTTPS | Browsers refuse HTTP for months: hard to undo |

## 5. Wildcards: every subdomain, one certificate {#wildcard}

For multi-tenant apps (`acme.example.com`, `globex.example.com`…):

```bash
$ sudo cipi alias add saas '*.example.com'        # quotes matter
$ sudo cipi ssl install saas --dns=cloudflare     # ~1 minute
$ curl -sI https://test.example.com | head -1
```

| Fact | Consequence |
| --- | --- |
| Let's Encrypt issues wildcards only via DNS-01 | Cipi needs the Cloudflare token (step 3) |
| Cloudflare's free edge certificate covers `example.com` and `*.example.com` | Keep tenants one level deep |
| Exact names beat the wildcard | `api.example.com` can still be another app |

Full walkthrough with Laravel tenant resolution: [Multi-tenant SaaS on wildcard subdomains](/guides/laravel-multi-tenant-wildcard).

## 6. Real visitor IPs {#real-ip}

Behind the orange cloud, every request comes from a Cloudflare IP. Two layers must know that:

1. **Nginx** must take the visitor's IP from Cloudflare's header. `sudo cipi zt enable` configures exactly that (Cloudflare's ranges, refreshed daily) and teaches Fail2ban and CrowdSec the same ranges. It closes no port: it's the first step of [Zero Trust](/guides/cloudflare-zero-trust-laravel), safe to run alone.
2. **Laravel** must trust the proxy, so `$request->ip()`, rate limiting and HTTPS detection work. In `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->trustProxies(at: '*');
})
```

Trusting all proxies is safe **only** when the server can't be reached except through Cloudflare or Nginx on localhost. With ports still open to the world, list Cloudflare's ranges instead.

## 7. Caching without surprises {#cache}

By default Cloudflare caches static files (CSS, JS, images) and **not** HTML. Keep it that way for Laravel: HTML pages carry sessions and CSRF tokens.

| Rule (Caching → Cache Rules) | Why |
| --- | --- |
| Bypass cache for `/admin*`, `/horizon*`, `/livewire*`, `/broadcasting*` | Dynamic, per-user |
| Cache `/build/*` for a long time | Vite file names change on every build |
| Never "Cache Everything" on HTML | Users would see each other's pages |

After a deploy, Vite's hashed file names make purging unnecessary.

## 8. Firewall basics (free plan) {#waf}

| Setting | Suggestion |
| --- | --- |
| Security → Bots → Bot Fight Mode | On, unless it blocks your API clients or webhooks |
| WAF → Custom rule | Challenge `/login` from countries you never serve |
| Rate limiting | Protect `/login` and `/api` (Laravel's `throttle` too) |
| Skip rule | Let your CI and uptime monitors through, if challenged |

Git webhooks hit `/cipi/webhook` on your domain: don't challenge that path.

## Troubleshooting {#troubleshooting}

| You see | Cause | Fix |
| --- | --- | --- |
| `ERR_TOO_MANY_REDIRECTS` | SSL/TLS on Flexible | Full (strict) |
| 525 SSL handshake failed | No certificate on the server for that name | `cipi ssl install` (or add the alias first) |
| 526 Invalid SSL certificate | Certificate doesn't cover the name, or expired | `sudo cipi ssl status`, reissue |
| 521 Web server is down | Nginx unreachable, or ports closed without a tunnel | `sudo cipi status`, firewall |
| 522 Connection timed out | Provider firewall blocks Cloudflare | Allow 80/443 |
| 413 on large uploads | Plan's request size limit | Direct-to-S3 uploads or a grey subdomain |
| Login loops, 419 errors | Laravel thinks it's on HTTP | `trustProxies`, `APP_URL=https://…`, `config:cache` |
| Every visitor has the same IP | Real IP not configured | Step 6 |
| Webhook deploys fail | Bot protection challenges `/cipi/webhook` | Skip rule for that path |

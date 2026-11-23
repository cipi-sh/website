---
title: Multi-tenant Laravel SaaS with wildcard subdomains
description: Build a SaaS where every customer gets their own subdomain, explained from zero: how wildcard DNS, routing and certificates fit together, setting them up with Cloudflare and Cipi, resolving the tenant in Laravel, custom domains for customers, and when to give a tenant its own app instead.
category: laravel
order: 16
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel multi tenant subdomain, laravel wildcard subdomain ssl, laravel saas subdomains, wildcard certificate lets encrypt laravel, laravel tenant custom domain, cloudflare wildcard laravel
docs:
  - wildcard-domains
  - domains
  - ssl
  - api
related:
  - cloudflare-zero-trust-laravel
  - laravel-postgresql
  - cipi-gui-and-api
faq:
  - Do I need Cloudflare? | For an automatic wildcard certificate, Cipi automates Cloudflare's DNS (free plan is fine). With another DNS provider you can list subdomains one by one or bring your own wildcard certificate.
  - How many tenants can one app serve? | As many as the app and server can handle: the wildcard covers every one-level subdomain with a single alias and a single certificate.
  - Can customers use their own domain? | Yes. Routing is one alias; the certificate needs a plan because an app has one certificate. Cloudflare for SaaS is the smoothest; the guide lists the alternatives.
  - Does `a.b.example.com` work? | Not with a single wildcard: `*.example.com` covers one level only. Keep tenants one label deep.
  - One database or one per tenant? | Start with one database and a `tenant_id` column (simplest, cheapest). Use a database per tenant, or a whole Cipi app per tenant, when customers need strict isolation, their own backups or their own server.
  - Will `api.example.com` be caught by the wildcard? | Not if `api.example.com` belongs to another app: exact names always win over the wildcard.
---
A multi-tenant app serves many customers from one codebase. A common shape gives each customer an address like `acme.yourapp.com`. Three things have to line up: **DNS** sends every subdomain to your server, **Nginx** sends them to your app, and a **certificate** covers all of them.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Tenant** | One customer (company, team, workspace) of your SaaS |
| **Wildcard DNS** | A record `*.yourapp.com` that points every subdomain at one IP |
| **Wildcard alias** | Tells Cipi's Nginx to send `*.yourapp.com` to your app |
| **Wildcard certificate** | One HTTPS certificate valid for every `*.yourapp.com` |
| **DNS-01** | How Let's Encrypt checks you own the domain for a wildcard: via a DNS record, not a web page |

```flow
acme.yourapp.com | browser
DNS | * → 203.0.113.10
Nginx | alias *.yourapp.com → app saas
Laravel | Host header → tenant acme
```

## Before you start {#before}

- A Laravel app on Cipi with its primary domain, e.g. `yourapp.com` ([first deploy](/guides/deploy-laravel-ubuntu-vps)).
- The domain's DNS on Cloudflare (free). Moving DNS doesn't move your traffic: you can keep records "DNS only" (grey cloud).

## 1. DNS records {#dns}

In Cloudflare, add:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| A | `@` | your server IP | your choice |
| A | `*` | your server IP | same as above |

## 2. A Cloudflare API token {#token}

Cloudflare → My Profile → API Tokens → Create token → template "Edit zone DNS", limited to this zone. That's the only permission needed (**Zone → DNS → Edit**).

```bash
$ sudo cipi ssl dns set --token=YOUR_CLOUDFLARE_TOKEN
```

## 3. Route every subdomain to the app {#alias}

```bash
$ sudo cipi alias add saas '*.yourapp.com'      # the quotes matter
$ sudo cipi alias list saas
```

## 4. Issue the wildcard certificate {#ssl}

```bash
$ sudo cipi ssl install saas --dns=cloudflare
$ sudo cipi ssl status
$ curl -sI https://acme.yourapp.com | head -1
HTTP/2 200
```

Takes about a minute. Renewals reuse the same token automatically. If the records are **proxied** (orange cloud), set Cloudflare SSL/TLS to **Full (strict)**.

Aliases and certificates are also visible in the [web panel](/web-panel):

<cipi-clips name="domains"></cipi-clips>

## 5. Find the tenant in Laravel {#laravel}

A middleware reads the subdomain and loads the tenant:

```php
// app/Http/Middleware/ResolveTenant.php
public function handle(Request $request, Closure $next)
{
    $host = $request->getHost();                       // acme.yourapp.com
    $sub  = Str::before($host, '.yourapp.com');

    $tenant = Tenant::where('slug', $sub)
        ->orWhere('custom_domain', $host)
        ->firstOrFail();

    app()->instance(Tenant::class, $tenant);
    URL::defaults(['tenant' => $tenant->slug]);

    return $next($request);
}
```

Or with route domains:

```php
Route::domain('{tenant}.yourapp.com')->middleware('tenant')->group(function () {
    Route::get('/', DashboardController::class);
});
```

| Concern | Tip |
| --- | --- |
| Data isolation | A global scope on `tenant_id`, or a package such as stancl/tenancy or spatie/laravel-multitenancy |
| Sessions | Leave `SESSION_DOMAIN` empty so each tenant has its own cookie; `.yourapp.com` only to share a login across tenants |
| Queued jobs | Pass the tenant id to the job; don't rely on the request |
| Cache keys | Prefix with the tenant: `"tenant:{$id}:stats"` |
| Reserved names | Block `www`, `api`, `admin`, `mail` as tenant slugs |

## 6. Customer custom domains {#custom}

A customer wants `portal.acme.com`. The routing part is easy: add it as an alias and save it as the tenant's `custom_domain`.

```bash
$ sudo cipi alias add saas portal.acme.com
```

The certificate needs a plan. An app has one certificate; with a wildcard issued over Cloudflare DNS, a name outside your Cloudflare zone can't join it over DNS, and a plain HTTP reissue would drop the wildcard.

| Approach | How | Good for |
| --- | --- | --- |
| **Cloudflare for SaaS** (recommended) | Customers CNAME to a hostname you proxy; Cloudflare issues each customer's certificate at the edge; your origin keeps its wildcard and Full (strict) | Many customers, self-service |
| **Separate app for custom domains** | A second Cipi app from the same repository, pointed at the same database, with the customer names as aliases and an HTTP-01 certificate (`cipi ssl install`) | A handful of customers, no Cloudflare |
| **No wildcard** | List every tenant subdomain and custom domain as aliases, HTTP-01, up to 100 names per certificate | Few, known tenants |

Automate whichever you pick from your app with the [Cipi API](/docs/api) when a customer saves the domain (`POST /api/apps/{name}/aliases`, then `POST /api/apps/{name}/ssl`).

## 7. When to give a tenant its own app {#isolation}

```flow
Shared app | one DB, tenant_id
Database per tenant | same app, many DBs
App per tenant | own user, PHP, DB, backups
Server per tenant | enterprise contracts
```

For the last two, create apps through the API from your signup flow (`POST /api/apps`), one per tenant, each with its own domain, database and backups.

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `ERR_TOO_MANY_REDIRECTS` | Cloudflare SSL/TLS is Flexible: set Full (strict) |
| 525 SSL handshake failed | The name has no alias or certificate yet |
| 526 Invalid SSL certificate | Certificate doesn't cover the name: `cipi ssl status`, reissue |
| `a.b.yourapp.com` fails | One-level wildcard only: keep tenants one label deep |
| Every subdomain shows the same tenant | Middleware reads the wrong part of the host; log `$request->getHost()` |
| Unknown subdomain shows another site | It can't: unknown hosts are closed by Cipi's default server |

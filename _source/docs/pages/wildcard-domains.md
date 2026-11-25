@section wildcard-domains

One app answering on every `<tenant>.myapp.com`, with one certificate for all of them. It takes two separate things:

| Part | How | Note |
| --- | --- | --- |
| **Routing** | `cipi alias add myapp '*.myapp.com'` (or a wildcard primary) | Works with any DNS |
| **Certificate** | `cipi ssl install myapp --dns=cloudflare` | Let's Encrypt issues wildcards over DNS only; Cipi automates Cloudflare |

## Which setup is yours {#setups}

| Your DNS | Certificate | Cloudflare SSL/TLS mode |
| --- | --- | --- |
| Cloudflare, proxied (orange) — best for SaaS | Let's Encrypt via DNS-01, or [Cloudflare Origin CA](#origin-ca) | **Full (strict)** |
| Cloudflare, DNS only (grey) | Let's Encrypt via DNS-01 | not used |
| Another provider | Move DNS to Cloudflare (free), list the subdomains, or bring your own certificate | — |
| Cloudflare Tunnel ([cipi zt](/docs/zero-trust)) | Not needed: Cloudflare terminates HTTPS | set by the tunnel |

@section wildcard-cloudflare

## With Cloudflare, step by step {#steps}

```flow
DNS records | A @ and A * → server
> In Cloudflare, create `A @` and `A *` records pointing at the server's IP, **both with the same proxy status**. The `*` record sends every subdomain to the server.
API token | Zone → DNS → Edit
> Create a Cloudflare API token with only **Zone → DNS → Edit** on that zone and save it with `cipi ssl dns set --token=…`.
Wildcard alias | routes subdomains
> `cipi alias add myapp '*.myapp.com'` (with quotes) tells Nginx to send every subdomain to this app.
Certificate | DNS-01, ~1 minute
> `cipi ssl install myapp --dns=cloudflare` proves ownership with a temporary DNS record and gets the wildcard certificate in about a minute. It works with the proxy on or off.
Proxy settings | Full (strict), real IPs
> If the records are proxied (orange cloud): SSL/TLS **Full (strict)**, no rule that sets Flexible, `cipi zt enable` for real visitor IPs and `trustProxies` in Laravel.
```

```bash
$ cipi ssl dns set --token=YOUR_CLOUDFLARE_TOKEN
$ cipi alias add myapp '*.myapp.com'
$ cipi ssl install myapp --dns=cloudflare
$ cipi ssl status
$ curl -sI https://tenant1.myapp.com | head -1
```

Renewals happen by themselves with the same token, through DNS, so they don't depend on the proxy, on Cloudflare rules or on port 80. `--wildcard` adds `myapp.com` + `*.myapp.com` to the certificate even without a wildcard alias (handy for many explicit subdomains); it does not route anything.

## How the proxy fits in {#proxy}

| | DNS only (grey cloud) | Proxied (orange cloud) |
| --- | --- | --- |
| Visitors connect to | Your server | Cloudflare, which connects to your server |
| Certificate visitors see | Cipi's Let's Encrypt certificate | Cloudflare's edge certificate (Universal SSL, automatic) |
| Certificate on the server | Cipi's, checked by browsers | Cipi's, checked by Cloudflare in **Full (strict)** |
| SSL/TLS mode in Cloudflare | Ignored | **Full (strict)** |
| Server IP | Public | Hidden behind Cloudflare |
| CDN, WAF, DDoS protection | No | Yes |
| IP seen by Nginx and Laravel | The visitor's | Cloudflare's, until you [configure real IPs](#real-ip) |

With the orange cloud every request makes **two HTTPS hops**: browser → Cloudflare (edge certificate) and Cloudflare → server (Cipi's certificate). Both must be valid for every tenant name, and both cover one level: `myapp.com` and `*.myapp.com`.

> [!tip] Start grey. When `https://tenant1.myapp.com` works with the grey cloud, switch `@` and `*` to orange together. One change at a time makes errors easy to place.

## DNS records {#dns}

In **DNS → Records**:

| Type | Name | Content | Proxy status |
| --- | --- | --- | --- |
| A | `@` | server IPv4 | Proxied or DNS only |
| A | `*` | server IPv4 | **Same as `@`** |
| AAAA | `@`, `*` | server IPv6 | Only if the server really answers on IPv6; same status |

- **Keep `@` and `*` on the same proxy status.** Mixed statuses make the apex and the tenants behave differently (different certificates, different IPs in logs), and errors become hard to place.
- **The wildcard only fills gaps.** A name with a record of its own (`api`, `www`, `mail`) doesn't use `*`. That's how you point `api.myapp.com` elsewhere, but it also means a stray record silently takes a tenant name away.
- **Proxied wildcards are on every plan**, Free included.
- **Mail stays grey.** `MX`, SPF, DKIM and DMARC records are unaffected by `*`, but hostnames for mail servers (`mail.`, `smtp.`) must be DNS only: the proxy carries only HTTP(S).
- **No AAAA you can't serve.** Cloudflare may prefer IPv6 to reach the origin: a wrong AAAA gives intermittent 52x errors.
- Wait until the zone shows **Active** in Cloudflare before issuing the certificate: with the old nameservers still answering, the DNS challenge fails.

## The API token {#token}

**My Profile → API Tokens → Create Token**, template **Edit zone DNS**:

| Field | Value |
| --- | --- |
| Permissions | Zone → DNS → Edit |
| Zone Resources | Include → Specific zone → `myapp.com` |
| Client IP Address Filtering | Empty, or only the server's IP |

Use an **API token**, never the Global API Key (full access to the whole account). The token is stored root-only in `/etc/cipi/cloudflare/`; a client with its own Cloudflare account gets a named token (`--name=client-a`, then `--account=client-a`, see [SSL](/docs/ssl#accounts)).

@section wildcard-cloudflare-modes

## SSL/TLS settings, when proxied {#ssl-mode}

**SSL/TLS → Overview**, encryption mode:

| Mode | Cloudflare → your server | With Cipi |
| --- | --- | --- |
| Off | No HTTPS at all | Don't |
| Flexible | **HTTP** | **Redirect loop**: Cipi redirects HTTP to HTTPS, Cloudflare asks again over HTTP, forever |
| Full | HTTPS, certificate **not** checked | Works, but an attacker in between wouldn't be noticed |
| **Full (strict)** | HTTPS, certificate **checked** against the hostname | **Use this** |

Then **SSL/TLS → Edge Certificates**:

| Setting | Set to | Why |
| --- | --- | --- |
| Universal SSL | Active | The edge certificate for `myapp.com` and `*.myapp.com` |
| Always Use HTTPS | On | Cloudflare redirects HTTP itself, before reaching the server |
| Minimum TLS Version | 1.2 | Drops only very old clients |
| Automatic HTTPS Rewrites | On | Fixes leftover `http://` links |
| HSTS | Only **after** every tenant works over HTTPS | With `includeSubDomains` it covers all tenants, and browsers remember it for months |

> [!warning] Rules override the global mode. A Configuration Rule or Page Rule that sets SSL to **Flexible** for some hostnames gives redirect loops only on those names, typically "the apex works, tenants loop". Check **Rules** before anything else.

@section wildcard-origin-ca

## Let's Encrypt or Cloudflare Origin CA {#origin-ca}

| | Let's Encrypt via DNS-01 | Cloudflare Origin CA |
| --- | --- | --- |
| Command | `cipi ssl install myapp --dns=cloudflare` | `cipi zt origin-cert myapp` |
| Trusted by | Browsers and Cloudflare | **Only Cloudflare** |
| Grey cloud | Works | Browsers reject it |
| Validity | 90 days, renewed automatically | Up to 15 years |
| Token | DNS token (`cipi ssl dns set`) | Zero Trust token with Zone · SSL and Certificates ([Zero Trust](/docs/zero-trust#cli-zt-origin-cert)) |

Let's Encrypt is the safer default: it keeps working if you ever switch a record to grey. Origin CA fits servers that are permanently behind the proxy or the tunnel.

## Real IPs and a closed origin {#real-ip}

Behind the orange cloud every request comes from a Cloudflare IP. Left as is, Nginx logs, Fail2ban, CrowdSec and Laravel (`$request->ip()`, rate limiting, login throttling) see the same few addresses for every visitor.

1. **Nginx**: [`cipi nginx real-ip cloudflare`](/docs/nginx#real-ip) sets Nginx's real IP from Cloudflare's ranges (refreshed every night) and teaches Fail2ban and CrowdSec the same ranges. No token and no tunnel (Cipi 5.14.0+; with a [Zero Trust](/docs/zero-trust) tunnel, `cipi zt enable` does the same). From here `$request->ip()` is already the visitor's.
2. **Laravel**: trust the proxy in `bootstrap/app.php`, so the scheme and host Cloudflare forwards are believed too:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->trustProxies(at: '*');
})
```

3. **Optional, close the origin**: `cipi zt lock http --yes` allows 80/443 only from Cloudflare, so nobody can skip the WAF by calling the server's IP. It refuses while an app still renews over HTTP; with `--dns=cloudflare` renewals are unaffected. Don't lock if some records are grey.

> [!warning] `trustProxies(at: '*')` is safe only when the server can't be reached except through Cloudflare (step 3, or a [tunnel](/docs/zero-trust)). With 80/443 open to the world, list [Cloudflare's IP ranges](https://www.cloudflare.com/ips/) instead of `*`, or anyone can fake their IP.

## Caching, WebSockets and limits {#proxy-limits}

| Topic | What to know |
| --- | --- |
| HTML cache | Cloudflare doesn't cache HTML by default: keep it that way. Never "Cache Everything" on tenant pages: users would see each other's pages |
| Static files | Cached per hostname, so each tenant has its own copy. To share one copy, serve assets from one host (`ASSET_URL=https://myapp.com`) |
| WebSockets | [Reverb](/docs/reverb) works through the proxy on 443, on every plan |
| Upload size | 100 MB per request on Free and Pro: larger uploads go straight to object storage with signed URLs |
| Request timeout | About 100 seconds: long exports and imports belong in queues |
| Webhooks | Don't challenge `/cipi/webhook` with Bot Fight Mode or WAF rules, or push-to-deploy stops |

## Check it {#verify}

```bash
# Through Cloudflare: expect HTTP/2 200 and "server: cloudflare"
$ curl -sI https://tenant1.myapp.com | grep -Ei '^(http|server)'
# Straight to the server, skipping Cloudflare: checks Cipi's certificate and vhost
$ curl -sI --resolve tenant1.myapp.com:443:SERVER_IP https://tenant1.myapp.com | head -1
# Names on the server's certificate: expect myapp.com and *.myapp.com
$ echo | openssl s_client -connect SERVER_IP:443 -servername tenant1.myapp.com 2>/dev/null | openssl x509 -noout -ext subjectAltName
```

If the second command works and the first doesn't, the problem is in Cloudflare (mode, rules, DNS). If both fail, it's on the server (alias, certificate).

## Cloudflare errors decoded {#errors}

| You see | Cause | Fix |
| --- | --- | --- |
| `ERR_TOO_MANY_REDIRECTS` | SSL/TLS mode Flexible (globally or in a rule) | Full (strict), then check Rules |
| 525 SSL handshake failed | No app has that hostname, or it has no certificate yet | Add the alias / issue the certificate |
| 526 Invalid SSL certificate | The certificate doesn't cover the hostname, or expired | `cipi ssl status`, then reissue |
| 521 Web server is down | Nginx stopped, or 80/443 closed to Cloudflare | `cipi status`, [firewall](/docs/firewall) |
| 522 Connection timed out | Wrong IP in the record, provider firewall, or an AAAA the server doesn't answer | Fix the records, allow 80/443 |
| Certificate issuance fails | Zone not Active yet, token without DNS Edit on that zone, or IP filter on the token | Check zone status and token |
| Apex works, tenants don't (or the reverse) | `@` and `*` with different proxy status, or a rule on some hosts | Align the records, review Rules |
| One tenant name goes elsewhere | That name has its own DNS record, which beats `*` | Remove the record |
| Every visitor has the same IP | Real IP not configured | [Real IPs](#real-ip) |
| 413 on uploads | Plan's request size limit | Direct-to-storage uploads |
| Deep names fail (`a.b.myapp.com`) | Universal SSL and the wildcard certificate cover one level | Keep tenants one label deep, or Advanced Certificate Manager plus a `*.b.myapp.com` certificate |

The whole Cloudflare setup, not only wildcards, is in [Cloudflare in front of Laravel](/guides/cloudflare-proxy-ssl-wildcard).

@section wildcard-without-cloudflare

## Without Cloudflare {#without-cloudflare}

| Option | When |
| --- | --- |
| Move DNS to Cloudflare, records "DNS only" | Recommended: free, traffic unchanged |
| List each subdomain as an alias, HTTP-01 | Few, known tenants (max 100 names per certificate) |
| Bring your own certificate with your provider's certbot plugin | Route 53, DigitalOcean, OVH, Gandi… |

```bash
# bring your own: name the certificate after the app's primary domain
$ apt install python3-certbot-dns-route53
$ certbot certonly --dns-route53 -d myapp.com -d '*.myapp.com' --cert-name myapp.com
$ cipi alias add myapp '*.myapp.com'    # Cipi finds and serves it
```

Don't run `cipi ssl install` on that app afterwards: it would reissue over HTTP without the wildcard.

## Multi-tenant tips {#tenants}

- **Exact names win**: with `*.myapp.com` on one app, `api.myapp.com` can still be another app.
- **Unknown hosts are closed** by the [default server](/docs/nginx#cli-nginx), not sent to your tenant resolver.
- **Laravel**: resolve the tenant from the `Host` header; set `SESSION_DOMAIN=.myapp.com` only to share logins across subdomains.
- **Need isolation per tenant** (own database, backups, server)? Create one Cipi app per tenant through the [API](/docs/api) instead.

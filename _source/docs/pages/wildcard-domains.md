@section wildcard-domains

One app answering on every `<tenant>.myapp.com`, with one certificate for all of them. It takes two separate things:

| Part | How | Note |
| --- | --- | --- |
| **Routing** | `cipi alias add myapp '*.myapp.com'` (or a wildcard primary) | Works with any DNS |
| **Certificate** | `cipi ssl install myapp --dns=cloudflare` | Let's Encrypt issues wildcards over DNS only; Cipi automates Cloudflare |

## Which setup is yours {#setups}

| Your DNS | Certificate | Cloudflare SSL/TLS mode |
| --- | --- | --- |
| Cloudflare, proxied (orange) — best for SaaS | Let's Encrypt via DNS-01, or Cloudflare Origin CA | **Full (strict)** |
| Cloudflare, DNS only (grey) | Let's Encrypt via DNS-01 | not used |
| Another provider | Move DNS to Cloudflare (free), list the subdomains, or bring your own certificate | — |
| Cloudflare Tunnel ([cipi zt](/docs/zero-trust)) | Not needed: Cloudflare terminates HTTPS | set by the tunnel |

@section wildcard-cloudflare

## With Cloudflare, step by step {#steps}

```flow
DNS records | A @ and A * → server
API token | Zone → DNS → Edit
Wildcard alias | routes subdomains
Certificate | DNS-01, ~1 minute
Full (strict) | if proxied
```

```bash
$ cipi ssl dns set --token=YOUR_CLOUDFLARE_TOKEN
$ cipi alias add myapp '*.myapp.com'
$ cipi ssl install myapp --dns=cloudflare
$ cipi ssl status
$ curl -sI https://tenant1.myapp.com | head -1
```

The token needs only **Zone → DNS → Edit** on that zone. Renewals happen by themselves with the same token. `--wildcard` adds `myapp.com` + `*.myapp.com` to the certificate even without a wildcard alias (handy for many explicit subdomains); it does not route anything.

## Cloudflare errors decoded {#errors}

| You see | Cause | Fix |
| --- | --- | --- |
| `ERR_TOO_MANY_REDIRECTS` | SSL/TLS mode Flexible (globally or in a rule) | Full (strict) |
| 525 SSL handshake failed | No app has that hostname, or it has no certificate yet | Add the alias / issue the certificate |
| 526 Invalid SSL certificate | The certificate doesn't cover the hostname | `cipi ssl status`, then reissue |
| Deep names fail (`a.b.myapp.com`) | Universal SSL covers one level | Keep tenants one label deep |

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

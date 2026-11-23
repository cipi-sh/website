@section cli-ssl

Free Let's Encrypt certificates for every app, renewed automatically. One command covers the primary domain and every alias.

<cipi-term name="ssl"></cipi-term>

## Commands {#commands}

| Command | Does |
| --- | --- |
| `cipi ssl install myapp` | Issue or reissue (all names in one certificate); forces HTTPS; sets `APP_URL` |
| `cipi ssl install myapp --dns=cloudflare` | Issue through Cloudflare DNS: wildcards, proxy on, no port 80 needed |
| `cipi ssl install myapp --http` | Back to HTTP validation |
| `cipi ssl force myapp` | Re-apply the HTTP → HTTPS redirect without reissuing |
| `cipi ssl status` | Certificates, expiry, and per app the names not covered |
| `cipi ssl renew` | Force renewal of everything |

## Two ways to validate {#validation}

| | HTTP-01 (default) | DNS-01 via Cloudflare |
| --- | --- | --- |
| Needs | DNS pointing at the server, port 80 open | A Cloudflare API token (Zone → DNS → Edit) |
| Wildcards | No | Yes |
| Behind Cloudflare proxy | Depends on Cloudflare rules | Always works |
| Renewal | Automatic | Automatic, with the same token |

```bash
$ cipi ssl dns set --token=CF_TOKEN
$ cipi ssl install myapp --dns=cloudflare [--wildcard]
```

A certificate is always renewed the way it was issued, and Nginx reloads after each renewal (twice-daily timer plus a weekly safety cron). Cipi writes the HTTPS block itself, so aliases, redirects, Octane, Reverb, basic auth or suspension never drop HTTPS.

## Several Cloudflare accounts {#accounts}

Hosting clients with their own Cloudflare accounts? Give each token a name:

```bash
$ cipi ssl dns set --name=client-a --token=TOKEN_A
$ cipi ssl install shop --dns=cloudflare --account=client-a
$ cipi ssl dns list           # accounts and what renews with each (tokens never shown)
$ cipi ssl dns remove client-a
```

Tokens are root-only files in `/etc/cipi/cloudflare/`. Removing an account is refused while a certificate still renews with it, so nothing expires silently.

> [!warning] Behind the Cloudflare proxy set SSL/TLS to **Full (strict)**. *Flexible* creates a redirect loop with Cipi's HTTPS redirect. With [Zero Trust](/docs/zero-trust) tunnels, Cloudflare terminates HTTPS and Cipi adapts automatically.

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| Certificate fails over HTTP | DNS not pointing at the server, or port 80 closed: check `dig` and the provider firewall |
| `ERR_TOO_MANY_REDIRECTS` behind Cloudflare | SSL/TLS mode is Flexible: set Full (strict) |
| Renewal failed alert | `cipi ssl status`; a domain that moved away blocks renewal of the whole certificate: remove its alias |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Do certificates renew by themselves? | Yes, twice daily checks, the same way they were issued. |
| Wildcards? | Yes, through Cloudflare DNS: `cipi ssl install myapp --dns=cloudflare`. |
| Is it free? | Yes, Let's Encrypt. |

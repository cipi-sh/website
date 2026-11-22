@section cli-nginx

Cipi runs Nginx from nginx.org's mainline repository, hardened and kept patched. This page covers the security report, upgrades and the default server.

## Security report {#nginx-security}

```bash
$ cipi nginx security
```

| Reports | Why it matters |
| --- | --- |
| Installed version vs. the oldest with every known fix | Are you exposed to a published CVE? |
| Whether the running binary is the one on disk | An upgrade isn't real until the old workers are gone |
| Every config file that turns HTTP/2 on | Most recent HTTP/2 CVEs need it |

Cipi's vhosts use `listen 443 ssl;` and never enable HTTP/2, which removes a whole class of vulnerabilities from a standard Cipi server. [How Cipi handled the nginx 1.31.9 CVEs](/guides/php-nginx-cve-patching) walks through a real case.

## Upgrades {#upgrade}

Nginx is excluded from unattended upgrades so it never restarts unexpectedly. Patch it on your terms:

```bash
$ cipi nginx upgrade [--yes]      # now
$ cipi autoupdate on nginx        # or nightly, automatically
```

```flow
apt upgrade nginx | your nginx.conf kept
nginx -t | must pass
Reload | graceful
Check binary | restart if old workers linger
```

If a long-lived connection (a WebSocket) keeps an old worker on the replaced binary, Cipi restarts Nginx instead of reloading (well under a second of interruption). A server found on Ubuntu's archive Nginx is moved to nginx.org mainline in one simulated-first transaction: if anything can't be done, nothing changes.

## Default server {#default-server}

```bash
$ cipi nginx default-server status|on|off
```

On by default: requests for unknown hostnames, on HTTP and HTTPS, get an empty reply (444) instead of reaching one of your apps or a tenant resolver.

@section nginx-config

## Custom Nginx config {#custom}

Cipi generates each vhost (`/etc/nginx/sites-available/myapp`) and regenerates it when you change aliases, PHP, SSL, redirects or proxies. Prefer Cipi's commands and [cipi.yml routes](/docs/yml#cli-yml-routes) over hand edits; if you must edit, test and reload:

```bash
$ sudo nano /etc/nginx/sites-available/myapp
$ sudo nginx -t && sudo systemctl reload nginx
```

> [!warning] Hand edits are overwritten by the next regeneration. Keep them small and documented, and re-check with `cipi nginx security`.

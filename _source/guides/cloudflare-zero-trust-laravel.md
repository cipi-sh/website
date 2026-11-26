---
title: Put a Laravel server behind Cloudflare Zero Trust, step by step
description: From zero to a server with no open ports: what a Cloudflare Tunnel and Access are, the token and account you need, routing apps through the tunnel, a login wall for staging and the panel, SSH through Cloudflare, certificates that still renew, closing ports safely, and how to undo every step.
category: security
order: 2
published: 2026-09-02
updated: 2026-11-26
howto: yes
keywords: cloudflare tunnel laravel, cloudflare access laravel staging, close ports server cloudflare, zero trust ssh, cloudflared laravel, protect staging cloudflare access
related:
  - cloudflare-proxy-ssl-wildcard
  - laravel-security-checklist
  - cipi-gui-and-api
docs:
  - zero-trust
  - firewall
  - ssh-keys
  - ssl
faq:
  - Do visitors notice? | No. Public apps stay public and get Cloudflare's CDN and WAF. Only the hostnames you protect with Access ask for a login (an e-mailed code, Google, GitHub or your SSO).
  - Do Git webhooks still deploy? | Yes. When you protect an app with Access, Cipi bypasses `/cipi/webhook` automatically, so pushes still deploy.
  - What if Cloudflare is down? | Traffic through the tunnel stops. Keep a break-glass path: your provider's web console can always reach the server, and `cipi zt unlock http` / `cipi zt ssh unlock` reopen the ports.
  - Do deploys still work with port 22 closed? | Yes. Deploys run on the server itself. Your CI can deploy through the tunnel (`cloudflared access ssh`) or with [cipi-cli](/docs/cli-client) over the API.
  - Can a CI job or a monitor get through Access? | Yes, since Cipi 5.16.0: `cipi zt service-token create ci --for=shop` prints a pair of headers (`CF-Access-Client-Id`, `CF-Access-Client-Secret`) that Access lets through. The web panel uses one to reach a server's API behind Access.
  - Can I still open the database from my laptop? | Yes, since Cipi 5.16.0: `cipi zt tcp add mysql --hostname=db.example.com` puts it behind Access, and `cloudflared access tcp` gives you a local port for TablePlus or DBeaver. Port 3306 stays closed.
  - Is it free? | Cloudflare Tunnel is free, and Cloudflare Zero Trust is free for small teams (check Cloudflare's current limits). Cipi is free.
  - Can I undo it? | Every step has its undo, and `cipi zt disable` reopens 22/80/443 and removes everything Cipi created in your Cloudflare account. Let's Encrypt certificates are left alone.
  - How is this different from just the orange cloud? | The orange cloud hides your IP but the server's ports stay open, so attackers who find the IP can bypass Cloudflare. With a tunnel and locked ports, there's nothing to reach.
---
Normally a server waits for visitors on open ports (80, 443 for websites, 22 for SSH), and anyone on the internet can knock. With a **Cloudflare Tunnel**, your server dials out to Cloudflare instead, and visitors reach it **through** Cloudflare. Once every app goes through the tunnel you can close the ports completely: nothing left to attack directly. Cipi does it in small, reversible steps, and nothing closes until you ask.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Tunnel** | A connection your server opens *to* Cloudflare; visitor traffic comes back through it |
| **cloudflared** | The small program on the server that keeps the tunnel open |
| **Access** | Cloudflare's login wall: only people you allow get through |
| **Policy** | Who is allowed: e-mail addresses, a domain (`@acme.com`), a group |
| **Locking** | Closing ports 80/443 and 22 once the tunnel carries everything |

```stack
Visitors and you | browser, ssh
Cloudflare | CDN, WAF, Access login
Tunnel | outbound from your server
Your server | ports 80, 443, 22 closed
```

```flow
Token & enable | tunnel; ports still open | #token
Route | apps, staging, panel | #route
SSH | through Access | #ssh
Certificates | DNS-01 or Origin CA | #certificates
Test | everything, from outside | #test
Lock | close the ports | #lock
```

## Before you start {#before}

- Your domain's DNS on Cloudflare (free plan is fine). See [Cloudflare in front of Laravel](/guides/cloudflare-proxy-ssl-wildcard) if it isn't yet.
- A Cloudflare **Zero Trust** organisation: open **Zero Trust** in the Cloudflare dashboard once and choose a team name (free plan). Under **Settings → Authentication** keep **One-time PIN** (login codes by e-mail) or add Google/GitHub.
- Your **Account ID**: Cloudflare dashboard → your domain → right column, *Account ID*.
- Access to your VPS provider's **web console**, in case you lock yourself out.
- `cloudflared` on your laptop for SSH later (`brew install cloudflared`, or the package from Cloudflare's site).

## 1. Create the token and enable the tunnel {#token}

In Cloudflare: **My Profile → API Tokens → Create Token → Custom token**, with these permissions:

| Scope | Permission | Used for |
| --- | --- | --- |
| Account · Cloudflare Tunnel | Edit | Creating the tunnel |
| Account · Access: Apps and Policies | Edit | Login walls |
| Zone · DNS | Edit | Pointing hostnames at the tunnel |
| Zone · SSL and Certificates | Edit (optional) | Origin CA certificates |

```bash
$ sudo cipi zt token set --token=CF_API_TOKEN --account=ACCOUNT_ID
$ sudo cipi zt enable
$ sudo cipi zt status
```

`enable` installs `cloudflared`, creates the tunnel, and teaches Nginx, Fail2ban and CrowdSec Cloudflare's IP ranges so apps see real visitor IPs. **No port is closed**: if anything goes wrong, your sites keep working as before.

## 2. Route the apps through the tunnel {#route}

```bash
$ sudo cipi zt hostname add shop          # public site, through CDN and WAF
$ sudo cipi zt hostname add shop-stg      # staging
$ sudo cipi zt hostname add --gui         # the web panel, if installed
```

Each command points the app's hostname at the tunnel (a DNS record in Cloudflare). Now add a login wall where only your team should enter:

```bash
$ sudo cipi zt access enable shop-stg
$ sudo cipi zt access enable --gui
```

```flow
Visitor opens staging | shop-stg.example.com
> The request reaches Cloudflare, not your server.
Access asks who they are | e-mail code, Google, SSO
> Cloudflare shows its login page. With One-time PIN, the visitor types their e-mail and receives a code.
Policy decides | allowed or not
> Only addresses (or domains) in the Access policy get in. Edit the policy in Zero Trust → Access → Applications.
Request goes through the tunnel | to your server
> Allowed visitors reach the app. Everyone else never touches your server. `/cipi/webhook` is bypassed so Git pushes still deploy.
```

## 3. SSH through the tunnel {#ssh}

```bash
$ sudo cipi zt ssh enable --hostname=ssh.example.com
```

On your laptop, add to `~/.ssh/config` (Cipi prints this block for you):

```text
Host ssh.example.com
  ProxyCommand cloudflared access ssh --hostname %h
  User cipi
  IdentityFile ~/.ssh/id_ed25519
```

Then `ssh ssh.example.com`. The first time, a browser window asks you to log in to Access; after that, SSH works as usual, with your key.

## 4. Certificates that keep renewing {#certificates}

Once port 80 is closed, Let's Encrypt can't check your server over HTTP. Switch each app to DNS validation, or use a long-lived Cloudflare Origin CA certificate:

| Option | Command | Notes |
| --- | --- | --- |
| Let's Encrypt over DNS | `sudo cipi ssl dns set --token=…` then `sudo cipi ssl install shop --dns=cloudflare` | Renews automatically; also works without the tunnel |
| Cloudflare Origin CA | `sudo cipi zt origin-cert shop` | 15 years; trusted only by Cloudflare, fine behind the proxy |

`cipi zt lock http` refuses to run while any app still renews over HTTP, so you can't forget one.

## 5. Test everything from outside {#test}

From your laptop (not from the server):

| Check | Expected |
| --- | --- |
| `https://shop.example.com` | The site, through Cloudflare |
| `https://shop-stg.example.com` | Cloudflare's login page first |
| `ssh ssh.example.com` | A shell, after the Access login |
| A `git push` to the deploy branch | A deploy (check `sudo cipi deploy shop --status`) |
| `sudo cipi zt status` | Tunnel healthy, every hostname listed |

Don't go on until all five pass.

## 6. Close the ports {#lock}

```bash
$ sudo cipi zt lock http --yes     # 80/443 closed (or Cloudflare-only if something isn't on the tunnel)
$ sudo cipi zt lock ssh --yes      # 22 closed: SSH only through Access
$ sudo cipi zt status
```

> [!warning] Lock SSH last, only after `ssh ssh.example.com` works from your machine, and keep your provider's web console open in another tab. Cipi refuses to close 22 if the tunnel doesn't carry SSH yet.

Since Cipi 5.16.0, `sudo cipi zt lockdown` does this section in one go: every app, the panel and the API onto the tunnel, then 80/443 closed and, when SSH already runs through the tunnel, port 22. It stops at the first step that fails.

## 7. Go further (Cipi 5.16.0) {#further}

| You want | Command |
| --- | --- |
| Single sign-on on `/admin` and `/horizon` only, the rest of the site public | `sudo cipi zt access enable shop --path=/admin,/horizon` |
| Only your company, or a few people | `sudo cipi zt access enable shop --allow=@example.com,mario@agency.dev` |
| CI, monitors or the panel through Access | `sudo cipi zt service-token create ci --for=shop` (or `--for=api`, `--for=gui`) |
| MySQL, PostgreSQL or Valkey from your laptop, port closed | `sudo cipi zt tcp add mysql --hostname=db.example.com` |
| SSH without handing out keys | `sudo cipi zt ssh cert enable --principals=andrea,mario` |
| A branch to show a client, behind Access | `sudo cipi zt preview create shop --branch=feature/login` |
| A second server on the same tunnel, or a move without touching DNS | `sudo cipi zt replica export`, then `replica join` on the other |
| Cloudflare's cache purged after every deploy | `sudo cipi zt purge shop --on-deploy=on` |

The monitor checks the tunnel every five minutes (`monitor_tunnel`), and the [web panel](/web-panel)'s Zero Trust tab shows all of it, read-only. Every command is in the [Zero Trust docs](/docs/zero-trust).

## Undo any step {#undo}

| Step | Undo |
| --- | --- |
| `lock ssh` | `sudo cipi zt ssh unlock` |
| `lock http` | `sudo cipi zt unlock http` |
| `access enable` | `sudo cipi zt access disable <app>` |
| `hostname add` | `sudo cipi zt hostname remove <app>` |
| `ssh enable` | `sudo cipi zt ssh disable` |
| `lockdown` | `sudo cipi zt unlock http`, `sudo cipi zt ssh unlock` |
| `service-token create` | `sudo cipi zt service-token revoke <name>` |
| `tcp add` | `sudo cipi zt tcp remove <hostname>` |
| `preview create` | `sudo cipi zt preview remove <preview app>` |
| Everything | `sudo cipi zt disable` (reopens 22/80/443, removes what Cipi created in Cloudflare) |

Locked out? Log in through your provider's web console as `cipi` and run the unlock commands.

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| 502 / 1033 from Cloudflare | Tunnel down: `sudo cipi zt status`; check `cloudflared` is running |
| Access login loops | Clear cookies for the team domain; check the policy includes your e-mail |
| SSH: `websocket: bad handshake` | `cloudflared` missing or old on your laptop; update it |
| `lock http` refused | An app still renews over HTTP: move it to `--dns=cloudflare` or `origin-cert` |
| Webhook deploys stopped | Bot Fight Mode or a WAF rule challenges `/cipi/webhook`: add a skip rule |
| Visitors' IPs all the same | Run `sudo cipi zt enable` again to refresh the real-IP setup; Laravel must trust proxies ([guide](/guides/cloudflare-proxy-ssl-wildcard#real-ip)) |
| Locked out completely | Provider web console → `sudo cipi zt ssh unlock` |

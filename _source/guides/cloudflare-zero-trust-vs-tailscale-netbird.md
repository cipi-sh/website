---
title: "Cloudflare Zero Trust vs Tailscale vs NetBird for your servers"
description: What each one is for — Cloudflare Tunnel publishes sites to visitors, a Tailscale or NetBird mesh is the private way in for the people who run the server — how they differ on SSH, the panel, databases, deploys, self-hosting and cost, and how to combine them on one Cipi server.
category: strategy
order: 5
published: 2026-11-28
updated: 2026-11-28
keywords: cloudflare tunnel vs tailscale, tailscale vs netbird, zero trust ssh comparison, cloudflare access vs tailscale, close server ports, private server access
related:
  - tailscale-netbird-private-server-access
  - cloudflare-zero-trust-laravel
  - laravel-security-checklist
faq:
  - Can I use both? | Yes, and it's often the best setup: sites through the Cloudflare Tunnel with 80/443 closed, SSH and the panel over the mesh with 22 closed. Cipi keeps a port closed while either side holds it.
  - Which is simplest? | For SSH only, a mesh: join, sign in, lock. For public sites behind a CDN and WAF with no open port, the tunnel.
  - Which keeps working if the vendor is down? | A mesh keeps existing connections when its coordination server is down; a self-hosted one (Headscale, NetBird) depends on nobody. A tunnel needs Cloudflare up, as do visitors anyway behind Cloudflare.
  - Which sees my traffic? | Cloudflare terminates TLS for the sites it proxies. A mesh is end-to-end WireGuard between devices; the vendor only coordinates (or relays encrypted packets).
  - Does Cipi manage all three? | Yes: `cipi zt` for Cloudflare, `cipi zt tailscale` and `cipi zt netbird` for the mesh — the mesh from the web panel and the API too.
  - What if a step fails? | Read the matching guide's troubleshooting table first. Then check the [docs](/docs/), open a GitHub issue, or ask in the community.
docs:
  - zero-trust
  - mesh-network
  - firewall
---
"Zero Trust" covers two different jobs, and the three tools Cipi manages split along that line:

- **Cloudflare Tunnel** (with Access) is about **visitors**: it publishes your sites through Cloudflare, so the server needs no open port, and puts a login in front of what should be private.
- **Tailscale** and **NetBird** are about **you**: a private network on which your laptop, your team and your CI reach the server — SSH, the panel, a database — while the public ports close.

## Side by side {#compare}

| | Cloudflare Tunnel + Access | Tailscale | NetBird |
| --- | --- | --- | --- |
| **Built for** | Publishing sites; a login wall in front of some | Private access between your devices and servers | The same, fully open source |
| **How it connects** | The server dials out to Cloudflare; visitors come through Cloudflare | WireGuard between devices; a coordination server hands out keys | WireGuard between devices; a management server, yours or NetBird's |
| **What visitors need** | A browser | — (not for visitors) | — (not for visitors) |
| **What your team needs** | A browser for Access; `cloudflared` for SSH and databases | The Tailscale app | The NetBird app |
| **SSH** | `cloudflared access ssh`, short-lived certificates | Plain `ssh` to the mesh address; optional Tailscale SSH | Plain `ssh` to the mesh address |
| **Web panel and API** | A hostname behind Access; service tokens for scripts | A record on the mesh address | A record on the mesh address |
| **A database from your laptop** | `cloudflared access tcp` to a local port | SSH tunnel over the mesh | SSH tunnel over the mesh |
| **Ports it lets you close** | 80/443 (sites through the tunnel) and 22 | 22, and 80/443 for private sites | 22, and 80/443 for private sites |
| **CDN, WAF, DDoS** | Yes | No | No |
| **Self-hosting** | No | Coordination via Headscale | Everything |
| **Who sees the traffic** | Cloudflare terminates TLS | Nobody but the two ends | Nobody but the two ends |
| **On Cipi** | `cipi zt enable`, `cipi zt hostname add`, `cipi zt access enable`, `cipi zt lock` | `cipi zt tailscale enable`, `lock ssh` | `cipi zt netbird enable`, `lock ssh` |
| **From the web panel** | Shown, read-only | Managed: join, lock, unlock, leave | Managed: join, lock, unlock, leave |

## Which one, by situation {#pick}

| Situation | Pick |
| --- | --- |
| Public Laravel or WordPress sites, you want no open port and a WAF | Cloudflare Tunnel |
| A staging site or an admin only your team should see | Access on Cloudflare (a login wall), or the site on the mesh only |
| Close SSH to the world, keep using `ssh` as always | Tailscale or NetBird |
| A team already on Tailscale | Tailscale, with a tag for servers |
| No third party in the control path, or a compliance requirement to self-host | NetBird self-hosted, or Tailscale with Headscale |
| A CI runner that deploys over SSH | A mesh (the runner joins it), or Cloudflare's SSH with a service token |
| Two Cipi servers that sync apps to each other | A mesh: `cipi sync` uses the private addresses |
| All of the above | Both: the tunnel for visitors, the mesh for people |

## The combined setup {#both}

The setup with the least exposed:

```bash
# visitors: sites through Cloudflare, 80/443 closed to everything else
$ sudo cipi zt token set --token=CF_API_TOKEN --account=ACCOUNT_ID
$ sudo cipi zt enable
$ sudo cipi zt hostname add shop
$ sudo cipi zt lock http --yes
# people: SSH over Tailscale, 22 closed to the world
$ sudo cipi zt tailscale enable --tags=cipi
$ ssh cipi@100.101.102.103            # once, over the mesh
$ sudo cipi zt tailscale lock ssh
```

The two sides know each other: a port stays closed while either holds it, `cipi firewall status` says who holds each one, and `unlock` on one side tells you if the other still keeps it closed. The panel's **Zero Trust** tab shows both — Cloudflare's tunnel read-only, the mesh managed.

Step by step: [Cloudflare Zero Trust](/guides/cloudflare-zero-trust-laravel) and [Tailscale or NetBird](/guides/tailscale-netbird-private-server-access).

## What none of them replaces {#not}

Key-only SSH, Fail2ban, per-app isolation, updates and backups stay what they are. A mesh or a tunnel reduces who can knock; it doesn't change what's behind the door. And keep a way in that depends on neither — your provider's web console.

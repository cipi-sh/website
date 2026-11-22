@section cli-zt

Put your server behind Cloudflare: visitors reach apps through a Cloudflare Tunnel (with CDN and WAF), staging sites, the panel and SSH sit behind Cloudflare Access, and finally the origin closes its ports. Every step that could lock you out is a separate, explicit command. Off until you enable it.

```flow
Token | Tunnel, Access, DNS
Enable | tunnel + real IP; ports still open
Route | hostnames, Access, SSH
Test | from your laptop
Lock | 80/443 and 22 closed
```

```bash
$ cipi zt token set --token=CF_API_TOKEN --account=ACCOUNT_ID
$ cipi zt enable
$ cipi zt hostname add myapp           # public, through CDN/WAF
$ cipi zt access enable staging        # login required (Cloudflare Access)
$ cipi zt access enable --gui
$ cipi zt ssh enable --hostname=ssh.example.com
$ cipi zt lock http --yes              # 80/443 closed or Cloudflare-only
$ cipi zt lock ssh --yes               # port 22 closed
$ cipi zt status
```

Token permissions: Account · Cloudflare Tunnel: Edit, Account · Access: Apps and Policies: Edit, Zone · DNS: Edit (plus Zone · SSL and Certificates for Origin CA). It is stored root-only, separate from the DNS token used for certificates.

## What each step does {#steps}

| Command | Effect | Reversible with |
| --- | --- | --- |
| `enable` | Installs `cloudflared`, a locally-managed tunnel, Nginx real-IP from Cloudflare's ranges (refreshed daily); Fail2ban/CrowdSec learn the ranges. **No port is closed** | `disable` |
| `hostname add <app\|--gui>` | DNS CNAME to the tunnel, ingress to Nginx | `hostname remove` |
| `access enable <app\|--gui>` | Cloudflare Access login in front; `/cipi/webhook` bypassed so pushes still deploy | `access disable` |
| `ssh enable` | SSH through the tunnel + Access; prints your `~/.ssh/config` | `ssh disable` |
| `lock http` | 80/443 closed when everything is on the tunnel, else allowed from Cloudflare only | `unlock http` |
| `lock ssh` | Port 22 closed (only if the tunnel already carries SSH) | `ssh unlock` |

```text
# ~/.ssh/config on your laptop
Host ssh.example.com
  ProxyCommand cloudflared access ssh --hostname %h
  User cipi
  IdentityFile ~/.ssh/id_ed25519
```

> [!warning] Lock SSH only after `ssh ssh.example.com` works through the tunnel from your machine, and keep your provider's web console at hand. Deploys are unaffected (they use `localhost`).

## Certificates {#cli-zt-origin-cert}

`lock http` refuses while an app still renews over HTTP (Let's Encrypt can't reach a closed origin). Move apps first to `cipi ssl install <app> --dns=cloudflare`, or use a 15-year Cloudflare Origin CA certificate:

```bash
$ cipi zt origin-cert myapp
```

Apps on the tunnel skip Cipi's HTTP→HTTPS redirect automatically (the tunnel talks HTTP to the origin and Cloudflare handles HTTPS). `cipi zt disable` reopens 22/80/443 and removes everything Cipi created in your Cloudflare account; Let's Encrypt certificates are left alone.

@section cli-crowdsec

CrowdSec reads your Nginx logs, recognises attack patterns (scanners, credential stuffing, exploit probes), shares and receives a community blocklist, and a firewall bouncer drops the offending IPs. It complements Fail2ban; it is not a WAF. Off until you enable it.

```bash
$ cipi crowdsec enable                 # engine + firewall bouncer
$ cipi crowdsec status                 # engine, bouncer, rescue listener, decisions
$ cipi crowdsec allow 203.0.113.42     # never ban this address
$ cipi crowdsec disable                # flush rules first, then remove
```

## Safe by construction {#safety}

| Risk | Guard |
| --- | --- |
| Banning yourself | Your current SSH session is allowlisted before banning starts |
| Banning your CDN | Refused behind a proxy without real-IP config ([cipi zt enable](/docs/zero-trust) writes it) |
| Banning your Git provider | GitHub and Bitbucket webhook ranges allowlisted (refreshed, fail-open); GitLab ranges included |
| Breaking renewals | Let's Encrypt validation, localhost and private ranges allowlisted |
| Too little RAM | Refused below 512 MB available |
| Orphan DROP rules after removal | `disable` flushes chains before purging packages |

It reads `/home/*/logs/nginx-*.log`, where every app's traffic is actually logged.

## Break-glass rescue {#rescue}

Banned from your own server? `enable` starts a small TLS listener on a high port. One request with a one-shot token allowlists **your connecting IP** (never a header), lifts its bans in CrowdSec and Fail2ban, mails you a new token, and the old one dies.

```bash
$ cipi crowdsec rescue token     # print the curl command (keep it off the server)
$ cipi crowdsec rescue rotate    # new token, mailed to you
```

It grants nothing but the ability to connect again. The port is kept open ahead of CrowdSec's own rules; wrong tokens are throttled. `cipi ban list` and `cipi ban unban` cover CrowdSec too.

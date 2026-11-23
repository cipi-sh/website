@section cli-firewall

UFW allows only SSH, HTTP and HTTPS; everything else is closed. Fail2ban bans addresses that keep failing SSH logins, longer each time.

<cipi-term name="firewall"></cipi-term>

## Ports {#ports}

```bash
$ cipi firewall list
$ cipi firewall allow 3306 --from=10.0.0.5        # one address
$ cipi firewall allow 3306 --from=10.0.0.0/24     # a private subnet
$ cipi firewall deny 8080
$ cipi firewall attempts [5|default]              # failed logins before a ban
```

| Protection | Default |
| --- | --- |
| Open ports | 22, 80, 443 |
| Failed SSH logins before a ban | 3 (counted over 1 hour) |
| Ban | 24 hours, doubling on each repeat, up to 7 days |
| Repeat offenders (`recidive`) | 3 bans in 24 h → 7 days |

The threshold is written to a drop-in that updates never reset, validated with `fail2ban-client -t` before reload (a rejected value changes nothing). Need a database port? Open it **to specific addresses only**, or better, connect over SSH with the `mariadb+ssh://` URL.

> [!tip] Behind Cloudflare, [cipi zt](/docs/zero-trust) can close 80/443 to everyone but Cloudflare, and close 22 entirely.

@section cli-ban

## Bans {#ban}

```bash
$ cipi ban list                   # banned IPs, by jail (Fail2ban and CrowdSec)
$ cipi ban unban 203.0.113.42     # from every jail at once
```

Locked out a colleague or a CI runner by mistake? Unban from another session or the provider's console. For CI, use a dedicated key (key logins don't fail).

## Questions {#questions}

| Question | Answer |
| --- | --- |
| I locked myself out. | Use the provider's web console to log in, then `cipi ban unban <your IP>`. Key logins never count as failures, only passwords. |
| Should I open the database port? | Avoid it. Connect over SSH (TablePlus, DBeaver support it). If you must, allow one address with `--from`. |
| Does the provider's firewall conflict? | No. Keep 22, 80 and 443 open in both. |

@section cli-firewall

UFW allows only SSH, HTTP and HTTPS; everything else is closed. Fail2ban bans addresses that keep failing SSH logins, longer each time. Since 5.14.0 the [web panel](#panel) shows all of it, CrowdSec included, and changes what is safe to change from a browser.

<cipi-term name="firewall"></cipi-term>

## Ports {#ports}

```bash
$ cipi firewall status [--json]                    # UFW, fail2ban and CrowdSec at a glance (5.14.0+)
$ cipi firewall list [--json]
$ cipi firewall allow 3306 --from=10.0.0.5         # one address
$ cipi firewall allow 3306 --from=10.0.0.0/24      # a private subnet
$ cipi firewall allow 8000:8100 --proto=udp        # a range, UDP (5.14.0+)
$ cipi firewall remove 3306 --from=10.0.0.5        # drop what allow made (5.14.0+)
$ cipi firewall deny 8080                          # ahead of every allow
$ cipi firewall attempts [5|default]               # failed logins before a ban
```

| Protection | Default |
| --- | --- |
| Open ports | 22, 80, 443 |
| Failed SSH logins before a ban | 3 (counted over 1 hour) |
| Ban | 24 hours, doubling on each repeat, up to 7 days |
| Repeat offenders (`recidive`) | 3 bans in 24 h → 7 days |

The threshold is written to a drop-in that updates never reset, validated with `fail2ban-client -t` before reload (a rejected value changes nothing). Need a database port? Open it **to specific addresses only**, or better, connect over SSH with the `mariadb+ssh://` URL.

To close a port you opened, `remove` it: the rule goes and the port is closed again by the default policy. `deny` is for refusing what an allow would let in (a port to one address, say). Since 5.14.0 it goes **ahead of every allow** (`ufw prepend`): UFW stops at the first rule that matches, so a deny added after an allow of the same port used to change nothing.

> [!tip] Behind Cloudflare, [cipi zt](/docs/zero-trust) can close 80/443 to everyone but Cloudflare, and close 22 entirely.

## Blocked addresses {#block}

```bash
$ cipi firewall block 198.51.100.23        # every port refused to it
$ cipi firewall block 198.51.100.0/24      # a range
$ cipi firewall unblock 198.51.100.23
```

A block refuses **every port** to an address or a range, ahead of every allow, until you unblock it: a scanner, an abuser, a range that keeps knocking. Unlike a [ban](#ban) it never expires. Ranges wider than `/8` (IPv4) or `/16` (IPv6) are refused.

## What stays open {#protected}

Since 5.14.0 the firewall commands refuse what would cut the server off:

| Refused | Why |
| --- | --- |
| `deny` of the SSH port, 80 or 443 to everyone; `remove` of the rule that opens them | They are how the server is reached. The SSH ports are read from `sshd -T`, so a custom port counts. One address can still be denied with `--from=` |
| `block` of a range that takes in the address of your SSH session | You would cut yourself off. The same holds for `deny --from=` on the SSH port |
| `allow` to everyone of what a Zero Trust lock keeps closed | `cipi zt lock http` keeps 80/443 to Cloudflare, `cipi zt lock ssh` keeps SSH closed: the message says which `cipi zt unlock` reopens it |

`--force` gets past these at the server's shell, when you know why. **From the panel it is ignored**, whatever the panel sends.

Every change is written to `cipi.log`, and says when the rule was already there, when it did not exist, or when UFW is inactive.

@section cli-ban

## Bans {#ban}

```bash
$ cipi ban list                   # banned IPs, by jail (Fail2ban and CrowdSec)
$ cipi ban unban 203.0.113.42     # from every jail at once
$ cipi ban unban 203.0.113.0/24   # a CrowdSec range decision
```

The address is matched whole (before 5.14.0, `unban 1.2.3.4` could also lift a ban on `11.2.3.45`), and `ban unban` takes nothing but an address or a CIDR. Locked out a colleague or a CI runner by mistake? Unban from another session, the provider's console or the [panel](#panel). For CI, use a dedicated key (key logins don't fail).

@section firewall-panel

## From the panel {#panel}

The server page of the [web panel](/docs/gui-overview) has a **Firewall** tab (panel 4.6.0, [API](/docs/api#endpoints-firewall) 1.44, Cipi 5.14.0 on the server):

| Section | What it shows and does |
| --- | --- |
| At a glance | UFW and its default policy, the ports always kept open, fail2ban and its threshold, CrowdSec, how many addresses are banned; the Zero Trust locks, when there are |
| Rules | UFW's rules in its order (port or range, protocol, action, source, IPv4/IPv6), *Kept open* on SSH, 80 and 443, the Cipi feature that owns a rule (Zero Trust, Metrics, CrowdSec rescue); **Remove** on what may be removed; **Open a port** or a range, TCP or UDP, to everyone or to one address or range |
| Blocked addresses | [Blocks](#block): **Block**, **Unblock** |
| Banned now | Fail2ban's jails and CrowdSec's decisions in one list, an address once; **Unban** lifts every ban on it |
| SSH login attempts | The threshold, back to the default, and a warning when fail2ban still runs an older value or isn't running |
| CrowdSec | [Enable](/docs/crowdsec) (a job of a few minutes; what would stop it is said before trying), bouncer and rescue listener, the addresses it never bans, disable |

Reading needs a level on the server, changing needs **Manage**. The panel takes only what the page lists, and the server refuses [what keeps it reachable](#protected) whatever is sent: the panel can't close SSH, 80 or 443, undo a Zero Trust lock or block its own address. It doesn't deny ports either (it opens ports and blocks addresses), and the [CrowdSec rescue](/docs/crowdsec#rescue) stays at the server.

The server's API token needs `firewall-view` and `firewall-manage` (a `--full-access` token has them). On an older server the tab says what to update: `cipi self-update`, then `cipi api update`.

## Questions {#questions}

| Question | Answer |
| --- | --- |
| I locked myself out. | Use the provider's web console to log in, then `cipi ban unban <your IP>` (or Unban in the panel, from another network). Key logins never count as failures, only passwords. |
| Should I open the database port? | Avoid it. Connect over SSH (TablePlus, DBeaver support it). If you must, allow one address with `--from`. |
| How do I close a port I opened? | `cipi firewall remove <port>` with the same `--from` and `--proto` you opened it with, or Remove in the panel. |
| Deny, block or ban? | `deny` refuses a port; `block` refuses every port to an address until you unblock it; a ban is Fail2ban's or CrowdSec's, and expires. |
| Does the provider's firewall conflict? | No. Keep 22, 80 and 443 open in both. |

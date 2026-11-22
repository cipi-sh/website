@section gui-requirements

<cipi-term name="gui-install"></cipi-term>

## Requirements {#requirements}

The panel talks to servers **only through the Cipi API**. Before installing it:

| You need | Details |
| --- | --- |
| A Cipi server to host it | One of the servers you manage, or a small dedicated box |
| A hostname of its own | e.g. `panel.example.com`, with an `A`/`AAAA` record pointing at that server. It can't share a hostname with an app or with the API (`api.example.com`); Cipi refuses a taken domain |
| `cipi api` on every managed server | With a full-access token, see [API setup](/docs/api) |

```bash
$ cipi api token create --name=gui --full-access   # every ability, including future ones
```

PHP, the FPM pool, the Nginx vhost and the scheduler are provisioned by the installer: no Laravel setup by hand.

@section gui-install

## Install: `cipi gui <domain>` {#install}

```bash
$ cipi gui panel.example.com
```

```flow
DNS check | domain must point here
Provision | FPM pool, vhost, cron
First admin | e-mail + password
Certificate | Let's Encrypt, HTTPS on
```

The app is bundled at `/opt/cipi/gui`; settings go to `/etc/cipi/gui.json`. The admin password needs **12+ characters** with upper and lower case, a digit and a symbol, and no more than 4 identical characters in a row.

| Flag | Use it when |
| --- | --- |
| `--skip-dns-check` | Behind a NAT or proxy the check can't see through |
| `--no-ssl` | You'll issue the certificate later with `cipi gui ssl` |

@section gui-ssl

## SSL: `cipi gui ssl` {#ssl}

Issues (or re-issues) the Let's Encrypt certificate and switches the panel to HTTPS, for a certificate skipped with `--no-ssl` or one that failed. It checks DNS first, exits 1 if certbot fails, and renews with the same automation as app domains.

```bash
$ cipi gui ssl
```

@section gui-move

## Change domain: `cipi gui move` {#move}

```bash
$ cipi gui move panel.newdomain.com           # move and issue the new certificate
$ cipi gui move panel.newdomain.com --no-ssl  # certificate later
```

| What happens | Detail |
| --- | --- |
| Kept | Accounts, 2FA enrolments, server connections (admins sign in again) |
| Vhost | Rewritten; if `nginx -t` rejects it, the old one comes back and nothing changes |
| Config | `/etc/cipi/gui.json` and `APP_URL` updated |
| SSL | Old certificate deleted, new one issued; on failure the panel stays on HTTP until `cipi gui ssl` |

Managed servers need no change: the panel calls their API URLs, and their allowlists are by IP. To move a server's API, use [`cipi api move`](/docs/api) there and update its URL under Connections.

> [!info] With [Cloudflare Zero Trust](/docs/zero-trust): run `cipi zt hostname remove --gui` before the move, then `cipi zt hostname add --gui` and `cipi zt access enable --gui`. The move refuses to run while the hostname is on the tunnel.

@section gui-2fa

## Two-factor authentication {#two-factor}

Session login with **optional TOTP** per user (Google Authenticator, 1Password, Aegis…), enrolled from the profile. With [single sign-on](/docs/gui-sso), MFA is the identity provider's job and the TOTP step is skipped for SSO sign-ins.

Lost a second factor? From the server, [`cipi gui reset-user`](/docs/gui-maintenance) rewrites the account and removes the enrolment.

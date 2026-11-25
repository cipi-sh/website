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
> The panel's domain (e.g. `panel.example.com`) must already point at this server, or the certificate can't be issued. The installer checks it first.
Provision | FPM pool, vhost, cron
> Cipi creates the panel's own PHP-FPM pool, Nginx vhost and cron, isolated from your apps.
First admin | e-mail + password
> You choose the first administrator's e-mail and password. More users and roles come later, from the panel.
Certificate | Let's Encrypt, HTTPS on
> A Let's Encrypt certificate is issued and HTTPS is enforced. Open the URL and log in.
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

Session login with **TOTP** (Google Authenticator, 1Password, Aegis…), enrolled from Settings: optional per user by default, or required for every account. With [single sign-on](/docs/gui-sso), MFA is the identity provider's job and the TOTP step is skipped for SSO sign-ins.

### Required for every account {#two-factor-required}

For policies that ask it of every account (ISO 27001, NIS2), an admin turns on **Team → Two-factor authentication** (panel 4.6.0+, setting `enforce_2fa`, off by default). Nothing changes on the servers.

| Who | What happens |
| --- | --- |
| An account without 2FA signing in with its password | Taken to the setup (`/2fa/setup`: QR code, setup key, the first code to confirm) before anything else, then to the page it asked for |
| A session already open when it's turned on | Taken there at its next page; an action from a page left open is refused the same way |
| A new user | The invite link opens on the setup |
| SSO sign-ins | Left to the identity provider's MFA, as always. The same account signing in with its password is asked |
| Accounts with 2FA | Can't turn it off while it's required; they can **move it to a new device** (the old one works until a code of the new one checks out) |

An admin can turn it on only once their own session passes it (2FA set up, or signed in through SSO). Team then shows who still has to set it up (*Setup pending*; *Via SSO* for linked accounts). [`cipi compliance`](/docs/compliance#controls), control `gui_2fa`, reads the policy: required with everyone enrolled is a pass.

### Lost a second factor {#two-factor-reset}

An admin clicks **Reset 2FA** on the account in Team (panel 4.6.0+; not for your own account). From the server, [`cipi gui reset-user`](/docs/gui-maintenance) rewrites an account and removes the enrolment. With 2FA required, the account sets it up again at its next sign-in.

@section gui-sso

The panel can sign people in through your identity provider over **OpenID Connect**: Microsoft Entra ID, Google Workspace, Okta, Keycloak, Authentik, Zitadel, Auth0, anything with a `/.well-known/openid-configuration`. SAML isn't supported. SSO is opt-in and configured **from the server**, which is also the break-glass if a provider breaks.

```flow
Register | OIDC client at your provider | #register
Turn it on | cipi gui sso set | #enable
Who gets in | matched by e-mail | #who
Troubleshooting | and the break-glass | #troubleshooting
```

## 1. Register the panel at your provider {#register}

Create an OIDC web client with redirect URI `https://<panel-domain>/auth/sso/callback`. Keep the client id, secret and issuer URL.

| Provider | Where | Issuer |
| --- | --- | --- |
| Microsoft Entra ID | App registrations → New (single-tenant, Web) → Certificates & secrets | `https://login.microsoftonline.com/<tenant-id>/v2.0`, never `common` or `organizations` |
| Google Workspace | Cloud console → Credentials → OAuth client ID (Web) | `https://accounts.google.com`; restrict with `--domains` |
| Okta, Keycloak, Authentik, Zitadel, Auth0 | Standard OIDC web client, authorization-code flow | The realm or app URL whose discovery document answers |

## 2. Turn it on {#enable}

```bash
$ cipi gui sso set --issuer=https://login.microsoftonline.com/<tenant>/v2.0 \
    --client-id=<id> --client-secret=<secret>     # secret is asked if omitted
$ cipi gui sso set --issuer=https://accounts.google.com --client-id=… --domains=example.com
$ cipi gui sso status          # issuer, label, redirect URI, who can get in
$ cipi gui sso only on         # SSO button only, passwords off
$ cipi gui sso only off        # break-glass: passwords back
$ cipi gui sso disable         # back to passwords; links are kept
```

`set` writes the panel's `.env`, clears the config cache, runs the migration and prints the **redirect URI** to check against the provider.

| Flag | Effect |
| --- | --- |
| `--issuer=<url>` | Required, `https://` only; discovery cached for an hour |
| `--client-id=<id>` | Required |
| `--client-secret=<secret>` | Asked when omitted; kept when you re-run `set` |
| `--label=<text>` | Button text (default from the issuer: Microsoft Entra ID, Google, Okta, SSO) |
| `--domains=a.com,b.com` | People from these domains get an account on first sign-in (role user, no access until granted) |
| `--only` | Same as `sso only on` |
| `--scopes=<list>` | Instead of `openid email profile` |

## 3. Who gets in {#who}

| Case | Result |
| --- | --- |
| Existing account | Matched by e-mail (case-insensitive) on first sign-in, then linked to the identity: a renamed mailbox still lands on the same account |
| E-mail linked to another identity | Refused |
| New person, domain in `--domains` | Account created as a user with no grants |
| Anyone else | "No panel account… ask an admin for an invite link". Nothing is created |

Roles and grants stay the panel's; SSO-linked accounts carry a badge in Team.

> [!security] Authorization-code flow with PKCE (S256), `state` and `nonce`; code exchanged server-to-server; identity read from the userinfo endpoint; issuer, audience and nonce checked. `email_verified: false` is refused. Every change is logged in `cipi.log` and raises the `gui_sso` notification.

## 4. Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Locked out with SSO-only | `cipi gui sso only off`, or `cipi gui sso disable`, or [`cipi gui reset-user`](/docs/gui-maintenance). Nothing in the panel can bypass SSO-only |
| `redirect_uri mismatch` | Register exactly what `sso status` prints; after [`cipi gui move`](/docs/gui-install) register the new one |
| `issuer mismatch` | Use the exact `issuer` from the discovery document (Entra: tenant id, not `common`) |
| `no email claim` | Give the account a mail address and grant `openid`, `email`, `profile` (`preferred_username` isn't accepted) |
| New issuer or client id | Links are forgotten (identities are per provider); everyone relinks by e-mail at next sign-in |

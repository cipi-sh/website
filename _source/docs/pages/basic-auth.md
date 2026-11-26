@section cli-basicauth

Put any app behind a username and password at the Nginx level: staging sites, internal tools, previews for a client.

## Turn it on and off {#commands}

```bash
$ cipi basicauth enable myapp                          # generates credentials, shown once
$ cipi basicauth enable myapp --user=client --password='…'
$ cipi basicauth status myapp [--json]       # --json: enabled, users, agent
$ cipi basicauth disable myapp
$ cipi basicauth agent myapp protected     # keep cipi/agent behind it too (default: public)
```

## How it works {#how}

| Property | Detail |
| --- | --- |
| Scope | Every path of the app, HTTP and HTTPS |
| Storage | Hashed (APR1) in `/etc/nginx/cipi-basicauth/myapp.htpasswd` |
| Certificates | ACME challenges stay public, so renewals never break |
| Durability | Survives alias, PHP and SSL changes; removed with the app |

## cipi/agent stays reachable {#agent}

The [Cipi Agent](/docs/agent-install) routes — `/cipi/webhook`, `/cipi/health`, `/cipi/mcp`, the anonymizer — check their own tokens, and the services that call them (a Git provider's push webhook, an MCP client, the panel) can't send your site's password. So, while basic auth is on and **the live release has `cipi/agent`**, its prefix is left out of basic auth:

| | |
| --- | --- |
| Prefix | `/cipi/`, or `CIPI_ROUTE_PREFIX` from the app's `.env` — exactly that prefix (`/cipi-admin` stays protected) |
| When | Checked again after every deploy: a release that adds or removes the agent, or changes the prefix, updates the vhost |
| Not for | Custom and Node apps, or a prefix a [proxy](/docs/redirects-proxies) already uses |
| Opt out | `cipi basicauth agent myapp protected` (and `public` to undo) — also in the panel's Access tab |

`cipi basicauth status myapp` says what is left out.

Not to be confused with `cipi auth`, which manages Composer credentials for private packages ([Git providers](/docs/git#cli-auth)).

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Will Let's Encrypt renewals break? | No. ACME challenge paths stay public. |
| Do webhooks still reach the app? | Yes, when the app uses [cipi/agent](#agent): its routes are left out of basic auth and check their own token. Without the agent every path is protected; deploy from CI or the CLI. |
| Does the health check pass behind basic auth? | No: the healthcheck URL gets 401 like any visitor. Point it at a public URL, or remove it while the site is protected. |
| Can I keep it in the repository? | Yes, in [cipi.yml](/docs/yml) under `app.basic_auth`, with names or bcrypt hashes, never plain passwords. |
| Where do I see the generated password? | It's shown once by `enable`. Run `enable` again with `--user` and `--password` to set new ones. |
| The panel's Access tab shows `[1mBasic auth — app[0m ━━━ Status …` | An old Cipi release exited with an error after printing the status of an app without cipi/agent, and the API passed the raw output on. Update the server (`sudo cipi self-update`); an up-to-date panel also reads it right from a server that isn't. |

@section cli-basicauth

Put any app behind a username and password at the Nginx level: staging sites, internal tools, previews for a client.

## Turn it on and off {#commands}

```bash
$ cipi basicauth enable myapp                          # generates credentials, shown once
$ cipi basicauth enable myapp --user=client --password='…'
$ cipi basicauth status myapp
$ cipi basicauth disable myapp
```

## How it works {#how}

| Property | Detail |
| --- | --- |
| Scope | Every path of the app, HTTP and HTTPS |
| Storage | Hashed (APR1) in `/etc/nginx/cipi-basicauth/myapp.htpasswd` |
| Certificates | ACME challenges stay public, so renewals never break |
| Durability | Survives alias, PHP and SSL changes; removed with the app |

Not to be confused with `cipi auth`, which manages Composer credentials for private packages ([Git providers](/docs/git#cli-auth)).

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Will Let's Encrypt renewals break? | No. ACME challenge paths stay public. |
| Do webhooks still reach the app? | Basic auth covers every path, including `/cipi/webhook`. Deploy staging from CI or the CLI, or use [Zero Trust](/docs/zero-trust) with a bypass rule if you need webhooks. |
| Can I keep it in the repository? | Yes, in [cipi.yml](/docs/yml) under `app.basic_auth`, with names or bcrypt hashes, never plain passwords. |
| Where do I see the generated password? | It's shown once by `enable`. Run `enable` again with `--user` and `--password` to set new ones. |

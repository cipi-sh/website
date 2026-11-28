@section cli-domains

An app has one **primary domain** and any number of **aliases**. One certificate covers them all.

```bash
$ sudo cipi domains       # every domain of every app, in one table
```

| Column | Shows |
| --- | --- |
| DOMAIN, APP, KIND | The name, its app, `primary` or `alias` |
| TYPE, PHP, DOCROOT, BRANCH | How the app is served and deployed |
| LAST DEPLOY | When the live release was published |
| SSL | `✓`/`✗` per name |
| suffix | `⏸ suspended` for suspended apps |

To rename the primary domain: `sudo cipi app edit myapp --domain=new.example.com` ([Manage apps](/docs/manage-apps#edit)).

@section cli-aliases

## Aliases {#alias}

```bash
$ sudo cipi alias add myapp www.myapp.com
$ sudo cipi alias add myapp myapp.it
$ sudo cipi alias add myapp '*.myapp.com'  # wildcard: quote it
$ sudo cipi alias list myapp
$ sudo cipi alias remove myapp myapp.it
```

The vhost keeps serving HTTPS while you change aliases. `alias add` tells you whether the new name is already covered by the certificate or which command adds it (usually `sudo cipi ssl install myapp`; for a wildcard `--dns=cloudflare`, see [Wildcard domains](/docs/wildcard-domains)).

@section cli-www

## www and apex {#www}

Pick one canonical host and 301 the other to it. Search engines see one site, and the certificate covers both.

```bash
$ sudo cipi www force-to-root myapp  # www.myapp.com → myapp.com
$ sudo cipi www force-from-root myapp  # myapp.com → www.myapp.com
$ sudo cipi www status myapp
$ sudo cipi www clear myapp
```

The missing counterpart is added as an alias automatically. ACME challenges stay reachable, so renewals keep working. In [cipi.yml](/docs/yml#cli-yml-routes): `app.www: to-root`.

## In the web panel {#in-the-panel}

Aliases, certificates and www/apex redirects, from the browser. The [web panel](/docs/gui) is optional; everything here also works from the CLI.

<cipi-clips name="domains"></cipi-clips>

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| Alias added but the site shows another app | DNS points elsewhere, or the browser cached a redirect: check `dig`, try a private window |
| HTTPS warning on the new alias | Re-run `sudo cipi ssl install myapp` so the certificate covers it |
| Wildcard alias doesn't get a certificate | Wildcards need DNS validation: [wildcard domains](/docs/wildcard-domains) |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| How many domains per app? | As many aliases as you like; one certificate covers up to 100 names. |
| www or not? | Pick one with `sudo cipi www`; the other redirects to it. |
| Behind Cloudflare? | Read [Cloudflare in front of Laravel](/guides/cloudflare-proxy-ssl-wildcard). |

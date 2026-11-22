@section cli-domains

An app has one **primary domain** and any number of **aliases**. One certificate covers them all.

```bash
$ cipi domains            # every domain of every app, in one table
```

| Column | Shows |
| --- | --- |
| DOMAIN, APP, KIND | The name, its app, `primary` or `alias` |
| TYPE, PHP, DOCROOT, BRANCH | How the app is served and deployed |
| LAST DEPLOY | When the live release was published |
| SSL | `✓`/`✗` per name |
| suffix | `⏸ suspended` for suspended apps |

To rename the primary domain: `cipi app edit myapp --domain=new.example.com` ([Manage apps](/docs/manage-apps#edit)).

@section cli-aliases

## Aliases {#alias}

```bash
$ cipi alias add myapp www.myapp.com
$ cipi alias add myapp myapp.it
$ cipi alias add myapp '*.myapp.com'     # wildcard: quote it
$ cipi alias list myapp
$ cipi alias remove myapp myapp.it
```

The vhost keeps serving HTTPS while you change aliases. `alias add` tells you whether the new name is already covered by the certificate or which command adds it (usually `cipi ssl install myapp`; for a wildcard `--dns=cloudflare`, see [Wildcard domains](/docs/wildcard-domains)).

@section cli-www

## www and apex {#www}

Pick one canonical host and 301 the other to it. Search engines see one site, and the certificate covers both.

```bash
$ cipi www force-to-root myapp      # www.myapp.com → myapp.com
$ cipi www force-from-root myapp    # myapp.com → www.myapp.com
$ cipi www status myapp
$ cipi www clear myapp
```

The missing counterpart is added as an alias automatically. ACME challenges stay reachable, so renewals keep working. In [cipi.yml](/docs/yml#cli-yml-routes): `app.www: to-root`.

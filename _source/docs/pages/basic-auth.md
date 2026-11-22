@section cli-basicauth

Put any app behind a username and password at the Nginx level: staging sites, internal tools, previews for a client.

```bash
$ cipi basicauth enable myapp                          # generates credentials, shown once
$ cipi basicauth enable myapp --user=client --password='…'
$ cipi basicauth status myapp
$ cipi basicauth disable myapp
```

| Property | Detail |
| --- | --- |
| Scope | Every path of the app, HTTP and HTTPS |
| Storage | Hashed (APR1) in `/etc/nginx/cipi-basicauth/myapp.htpasswd` |
| Certificates | ACME challenges stay public, so renewals never break |
| Durability | Survives alias, PHP and SSL changes; removed with the app |

Not to be confused with `cipi auth`, which manages Composer credentials for private packages ([Git providers](/docs/git#cli-auth)).

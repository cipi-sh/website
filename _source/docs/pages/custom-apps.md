@section cli-app-custom

Custom apps host anything that isn't Laravel or a Node build: WordPress and other CMSs, plain PHP, static files. Code lives in `~/htdocs`, deployed from Git or uploaded over SFTP.

| | Laravel app | Custom app |
| --- | --- | --- |
| Deploy | Zero-downtime releases | Pull into `htdocs` |
| Database, `.env` | Created | Add one with `cipi db create` if needed |
| Workers, scheduler | Yes | No |
| Git | Required | Optional (SFTP-only works) |

```bash
# From Git, serving the dist/ folder
$ cipi app create --custom --user=mysite --domain=mysite.com \
    --repository=git@github.com:you/mysite.git --docroot=dist
# SFTP only: no repository
$ cipi app create --custom --user=blog --domain=blog.example.com
$ cipi db create --name=blog              # e.g. for WordPress
```

| Setting | Value |
| --- | --- |
| Document root | `htdocs/` or a subfolder (`--docroot=public`, `dist`, `www`) |
| Nginx | `index index.html index.php`, `try_files $uri $uri/ /index.php?$args`, `404.html` |
| SFTP-only | Placeholder `index.html`; upload to `~/htdocs` as the app user (SFTP, SCP, rsync) |
| With Git | `cipi deploy mysite` pulls the branch into `htdocs` |

> [!security] Every vhost refuses `/cipi.yml` and `/cipi-*.yml`, so a config file committed to the web root is never served.

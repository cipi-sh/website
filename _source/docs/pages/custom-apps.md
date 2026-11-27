@section cli-app-custom

Custom apps host anything that isn't Laravel or a Node build: WordPress and other CMSs, plain PHP, static files. Code lives in `~/htdocs`, deployed from Git or uploaded over SFTP.

## Custom or Laravel? {#compare}

| | Laravel app | Custom app |
| --- | --- | --- |
| Deploy | Zero-downtime releases | Pull into `htdocs` |
| Database, `.env` | Created | Add one with `cipi db create` if needed |
| Workers, scheduler | Yes | No |
| Git | Required | Optional (SFTP-only works) |

## Create one {#create}

```bash
# From Git, serving the dist/ folder
$ cipi app create --custom --user=mysite --domain=mysite.com \
    --repository=git@github.com:you/mysite.git --docroot=dist
# SFTP only: no repository
$ cipi app create --custom --user=blog --domain=blog.example.com
$ cipi db create --name=blog              # e.g. for WordPress
```

## Settings {#settings}

| Setting | Value |
| --- | --- |
| Document root | `htdocs/` or a folder in it (`--docroot=public`, `dist`, `www`, `web/public`): a folder name, created for you on an app without Git |
| Nginx | `index index.html index.php coming-soon.html`, `try_files $uri $uri/ /index.php?$args`, `404.html` |
| SFTP-only | A [Coming soon page](#coming-soon) until your files are there; upload to `~/htdocs` as the app user (SFTP, SCP, rsync) |
| With Git | `cipi deploy mysite` pulls the branch into `htdocs` |

> [!security] Every vhost refuses `/cipi.yml` and `/cipi-*.yml`, so a config file committed to the web root is never served.

## The Coming soon page {#coming-soon}

An app created without a repository has no files yet: they come later, over SFTP. Until then its domain answers with a page of its own instead of an error.

<figure class="gui-shot">
<div class="gui-shot-frame">
<div class="gui-shot-bar" aria-hidden="true"><i></i><i></i><i></i><span class="gui-shot-url">blog.example.com</span></div>
<img src="/img/docs/coming-soon-light.webp" width="1200" height="640" alt="Coming soon page: a small smiling browser window, the words Coming soon, blog.example.com is getting ready, and a line saying good things take a little setup" class="shot-light" loading="lazy" decoding="async">
<img src="/img/docs/coming-soon.webp" width="1200" height="640" alt="Coming soon page: a small smiling browser window, the words Coming soon, blog.example.com is getting ready, and a line saying good things take a little setup" class="shot-dark" loading="lazy" decoding="async">
</div>
<figcaption>What <code>blog.example.com</code> shows right after <code>cipi app create --custom</code> with no repository.</figcaption>
</figure>

| | |
| --- | --- |
| Where | `coming-soon.html` in the document root: `~/htdocs`, or `~/htdocs/www` with `--docroot=www` |
| One file | Nothing is fetched from anywhere: no web font (the visitor's system font), no image (the drawing and the favicon are inline SVG), no script or stylesheet of another site |
| For the visitor | In English, light or dark by their theme, still if they asked for less motion, fine on a phone. It shows the host it was asked for, so an alias shows its own name |
| For search engines | `noindex, nofollow` |
| Whose name | The site's only. Nothing on it says Cipi |

**It leaves by itself.** The page is the last choice of the vhost's `index`: Nginx serves it only while the folder has neither an `index.html` nor an `index.php`. Upload your site — WordPress's `index.php`, a static `index.html` — and it is what answers, with nothing to delete. The file stays in the folder: remove it, or edit it and keep it as your own holding page.

An app with a repository has no such page: its first `cipi deploy` brings the site.

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Are custom deploys zero-downtime? | No: `cipi deploy` pulls into `htdocs` in place. Keep changes backward compatible, or use a Laravel app if you need atomic releases. |
| How do I run build steps after a pull? | List them in `deploy.post` of [cipi.yml](/docs/yml). |
| Can a custom app have cron jobs? | Yes, in the app user's crontab (`su - mysite`, `crontab -e`). |
| I uploaded my site and still see *Coming soon*. | The page answers only while the document root has no `index.html` or `index.php`. Check that the files went into the document root (`~/htdocs/www` with `--docroot=www`, not `~/htdocs`): `cipi app show mysite` says which it is. |
| My app still shows a page saying it is being deployed. | That is the `index.html` placeholder of an app created with an older Cipi, and it comes before `index.php`: delete it (`rm ~/htdocs/index.html`). New apps don't need that. |
| Step-by-step examples? | [WordPress](/guides/deploy-wordpress-custom-app), [Symfony](/guides/deploy-symfony), [WooCommerce](/guides/woocommerce-vps). |

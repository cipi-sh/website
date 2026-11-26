@section page-cache

The page cache is Nginx's: it keeps the page PHP made and answers the next visitors with it, **without running PHP at all**. One command turns it on for an app (Cipi 5.17.0+). It's built for WordPress and for any site whose pages are the same for everyone who isn't signed in.

<cipi-term name="page-cache"></cipi-term>

```bash
$ cipi cache blog on                 # pages kept 10 minutes, up to 256 MB on disk
$ cipi cache blog on --ttl=1h --size=1g
$ cipi cache blog ttl 30m            # how long a page is kept
$ cipi cache blog clear              # delete the cached pages now
$ cipi cache blog off                # every request runs PHP again
$ cipi cache blog                    # on or off, pages and bytes now   (--json)
$ cipi cache                         # every app
```

## OPcache is already on. This is the other cache {#opcache}

Every PHP on a Cipi server runs with **OPcache** on, and there is nothing to enable: OPcache keeps PHP's *compiled code* in memory, so PHP doesn't read and parse its files at every request.

But with OPcache **PHP still runs**. For every visitor the framework boots, WordPress loads its plugins and theme, the database answers its queries and the same page is built again. That work is what takes the time.

The page cache keeps **the page itself**. Nginx answers from its disk and PHP never starts. The two add up: OPcache makes building a page quicker, the page cache makes every visit after the first one free.

| | OPcache | Page cache |
| --- | --- | --- |
| **Keeps** | PHP's compiled code, in memory | The finished HTML page, on disk |
| **PHP runs** | At every request | Only when a page isn't kept (or has expired) |
| **The database is asked** | At every request | Only then, too |
| **On a Cipi server** | Always on | Off until `cipi cache <app> on` |
| **Who it helps** | Every PHP app | Pages that are the same for every visitor |
| **Needs emptying** | No: a deploy reloads it | Yes, when the content changes — [Cipi does it after a deploy](#clear) |

## What you get {#benefits}

| | |
| --- | --- |
| **WordPress, WooCommerce, blogs, catalogues, landing pages** | A page comes back in about a millisecond instead of a few hundred |
| **Traffic peaks** | A newsletter, an ad campaign, a post that goes around: a small server holds what would have filled its PHP workers, because most visitors never reach PHP |
| **A safety net** | While PHP or the database is slow or down, Nginx keeps answering with the page it has (stale pages are served on errors and timeouts) |
| **Nothing to install in the app** | No cache plugin, no change to the code; turning it off is one command |

It does nothing for pages that differ per visitor — a dashboard, an account page — and it isn't asked to: those are [never cached](#never).

## What is never cached {#never}

Every rule fails towards *not cached* — a page that is slower, never a private page shown to someone else.

| Never cached | Why |
| --- | --- |
| Anything but `GET` and `HEAD` | A form, a checkout, an API write must reach PHP |
| A visitor with a session or login cookie | WordPress and WooCommerce (`wordpress_logged_in_`, the cart, a password-protected post), PHP's `PHPSESSID`, Laravel's `<app>_session` and `remember_web_` |
| A request with an `Authorization` header | API tokens, basic auth |
| `/wp-admin`, `wp-login.php`, `wp-cron.php`, `xmlrpc.php`, `/wp-json` | Back offices and what must run every time |
| A URL with a query string | Searches, filters, previews. Tracking parameters alone (`utm_*`, `fbclid`, `gclid`…) don't count: the link a newsletter sends to everybody is cached |
| A response that sets a cookie, or says `Cache-Control: private`, `no-cache` or `no-store` | The app's own headers are respected: what it marks private stays private |

The time you set is for pages that say nothing themselves: a response with its own `Cache-Control: max-age` is kept that long instead. A page that isn't there (404) is kept for a minute at most.

> [!note] **Laravel chooses its pages.** Laravel marks every response `no-cache, private`, and a route of the `web` group starts a session — so nothing is cached until a route says so. Give the pages that are the same for everyone a route without session and cookies, and mark it public: `->middleware('cache.headers:public;max_age=600')`. WordPress needs nothing: its public pages carry no such header.

### Check a page {#check}

Every response says what happened in the `X-Cache-Status` header:

```bash
$ curl -sI https://blog.example.com/ | grep -i x-cache-status
X-Cache-Status: HIT
```

| Value | Meaning |
| --- | --- |
| `MISS` | Not kept yet: PHP made it, and it is kept now |
| `HIT` | Answered from the cache; PHP didn't run |
| `BYPASS` | One of the rules above: a cookie, a query string, an admin path |
| `EXPIRED` | Its time was up: PHP made it again |
| `STALE`, `UPDATING` | The old page was served while a new one is made, or because PHP didn't answer |

## When the content changes {#clear}

A cached page is the old page until it expires or the cache is emptied.

| Situation | What to do |
| --- | --- |
| **A deploy run by Cipi** — `cipi deploy`, the Git webhook, the panel's Deploy button, a rollback | **Nothing.** Cipi empties the cache after every successful deploy and rollback, and the notification says how many pages went |
| **By hand** | `cipi cache blog clear`, or **Empty the cache now** in the [panel](#panel) |
| **A deploy recipe of your own, a CI job, a cron, the app's code** | One command, as the app's own user — below |
| **Nothing at all** | With pages kept 10 minutes, an edit shows up by itself within 10 minutes |

### In a deploy recipe or a script {#recipe}

The cached files belong to Nginx, so the app's user can't delete them. It may ask root for exactly one thing — no password, and only for its own app:

```bash
$ sudo /usr/local/bin/cipi-cache-clear blog
Page cache of 'blog' emptied — 128 page(s)
```

In a Deployer recipe of your own ([customize the pipeline](/docs/deploy-script)), after the new release is live:

```php
// deploy.php
after('deploy:symlink', function () {
    run('sudo /usr/local/bin/cipi-cache-clear blog');
});
```

From a CI job or a script over SSH:

```bash
$ ssh blog@your-server 'sudo /usr/local/bin/cipi-cache-clear blog'
```

In WordPress, when a post is saved — a must-use plugin of five lines:

```php
<?php
// wp-content/mu-plugins/cipi-page-cache.php
add_action('save_post', function () {
    exec('sudo /usr/local/bin/cipi-cache-clear blog > /dev/null 2>&1 &');
});
```

> [!tip] You don't need this with Cipi's own deploys: adding it to a recipe Cipi runs only empties the cache twice. To keep the cache across deploys instead — a site whose deploys never change its pages — `cipi cache blog on --no-deploy-clear`.

## How it's set up {#setup}

| | |
| --- | --- |
| **PHP-FPM apps** (Laravel, WordPress, any PHP app) | `fastcgi_cache` in the app's vhost |
| **Octane apps** | `proxy_cache`, in front of Octane |
| **Node apps** | Not available: their pages come from their own server |
| **Where the pages are** | `/var/cache/nginx/cipi/<app>`, one zone per app — no app reads another's |
| **Size** | `--size` (16m to 100g, default 256m): past it Nginx drops the pages asked for least |
| **Time** | `--ttl` or `cipi cache <app> ttl` — `30s`, `10m`, `1h`, `7d`, thirty days at most |
| **Concurrency** | One request builds a missing page; the others wait for it instead of all hitting PHP |

`nginx -t` runs before the reload: if Nginx refuses, the vhost goes back to what it was and you get its reason. The setting lives with the app, so it follows [`cipi sync`](/docs/sync); a suspended app keeps it and gets it back when unsuspended. Turning the cache on or off notifies `app_cache`.

## From the panel, the API, the SDK and cipi-cli {#panel}

The app's **Page cache** tab in the [web panel](/docs/gui-overview) (panel 4.9.0, cipi/api 1.47) turns it on and off, sets the time and the size, shows the pages kept now and has **Empty the cache now**. It also says what this page says — what OPcache already does, what the page cache adds, what is never cached — and shows the command for a recipe of your own with the app's name in it, ready to copy. Turning it on or off takes *Edit* on the app; emptying it comes with *Deploy* too.

| | |
| --- | --- |
| **API** | `GET` and `PUT /api/apps/{name}/cache`, `POST /api/apps/{name}/cache/clear`, `GET /api/cache` — abilities `nginx-view`, `nginx-manage` ([endpoints](/docs/api#endpoints-cache)) |
| **PHP SDK** | `$cipi->cache()->enable('blog', ttl: '1h')`, `->clear('blog')`, `->disable('blog')` |
| **cipi-cli** | `cipi-cli cache on blog --ttl 1h`, `cipi-cli cache clear blog` |
| **MCP** | `PageCacheShow`, `PageCacheUpdate`, `PageCacheClear` |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Do I still need a WordPress cache plugin? | Not for page caching: Nginx does it before PHP starts, which a plugin can't. An object cache (queries, in [Valkey](/docs/valkey)) is a different thing and still helps the pages that do reach PHP. |
| A visitor signs in: does he see a cached page? | No. A session or login cookie bypasses the cache, in both directions: nothing is read from it and nothing is stored. |
| Is it safe with WooCommerce? | The cart, the checkout and the account are never cached (cookies and `POST`). Catalogue pages are, for visitors with an empty cart. |
| I changed a page and still see the old one | Wait for its time, or `cipi cache <app> clear`. Check with `X-Cache-Status`. |
| Does it work behind Cloudflare? | Yes: they are two caches in a row, and Cloudflare's is emptied on its side — `cipi zt purge <app> --on-deploy=on` does it after every deploy ([Cloudflare's cache](/docs/zero-trust#purge)). |
| Does it replace Octane? | No. Octane makes PHP answer faster for every request; the page cache skips PHP for the pages that can be kept. An Octane app can have both. |

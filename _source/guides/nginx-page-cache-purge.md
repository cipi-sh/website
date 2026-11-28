---
title: Nginx page cache for WordPress and Laravel, and purging only what changed
description: Serve public pages without running PHP with Nginx's FastCGI cache, then keep them fresh — purge a single post, a listing or a whole section when content changes, from WordPress with the Cipi Cache plugin, from Laravel with cipi/cache, from a deploy, the CLI or Cloudflare.
category: php
order: 2
published: 2026-11-28
updated: 2026-11-28
howto: yes
keywords: nginx fastcgi cache wordpress, nginx cache purge single url, wordpress nginx cache plugin, laravel full page cache nginx, purge nginx cache by url, fastcgi_cache_purge without module
related:
  - deploy-wordpress-custom-app
  - woocommerce-vps
  - cloudflare-proxy-ssl-wildcard
faq:
  - Is this the same as WP Rocket or W3 Total Cache? | Those cache inside WordPress, so PHP still starts for every visit. Nginx's cache answers before PHP: faster, and nothing for WordPress to load. The Cipi Cache plugin only tells Nginx what to drop.
  - Do I need the ngx_cache_purge module? | No. Cipi finds a page's cached files by the request name Nginx writes in each of them, and deletes them as Nginx's user. The Nginx Ubuntu ships is enough.
  - Will a signed-in user ever see someone else's page? | No. A session or login cookie bypasses the cache in both directions, as do the admin, POST requests, carts and query strings.
  - How long should pages be kept? | 10 minutes without a purge on change; hours with the WordPress plugin or cipi/cache, since an edit no longer waits for expiry.
  - Does it replace Cloudflare's cache? | It's the one on your server; Cloudflare's sits in front. `sudo cipi zt purge` empties Cloudflare's after a deploy; for single pages, purge both.
  - Can I purge from CI or from another server? | Yes: over SSH as the app's user (`sudo /usr/local/bin/cipi-cache-clear app /page/`), or through the API (`POST /api/apps/{name}/cache/purge`) with an `nginx-manage` token.
  - What if a step fails? | Read the troubleshooting table below first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
docs:
  - page-cache
  - custom-apps
  - api
---
A WordPress page takes a few hundred milliseconds to build: PHP starts, WordPress loads its plugins and theme, the database answers its queries. For a visitor who isn't signed in, it is the same page as for the visitor before. **Nginx's page cache** keeps it and answers the next visitors from disk in about a millisecond, without starting PHP. The hard part has always been the other half: making an edit show up, without throwing away every page of the site.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Page cache** | Nginx keeps the HTML PHP made and serves it again (`fastcgi_cache`) |
| **OPcache** | PHP's compiled code in memory — always on, a different thing: PHP still runs |
| **TTL** | How long a page is kept before PHP makes it again |
| **Purge** | Dropping some pages now: one post, a listing, a section |
| **Clear** | Dropping every page of the app |

## 1. Turn it on

```bash
$ sudo cipi cache blog on                # 10 minutes, 256 MB
$ curl -sI https://blog.example.com/ | grep -i x-cache-status
X-Cache-Status: MISS
$ curl -sI https://blog.example.com/ | grep -i x-cache-status
X-Cache-Status: HIT
```

Or the app's **Page cache** tab in the web panel. What is never cached — signed-in users, carts, `/wp-admin`, `POST`, URLs with a query string, responses marked private — is in [the docs](/docs/page-cache#never). Pages of your own that must stay out: `sudo cipi cache blog exclude add '/wishlist*'`.

With 10 minutes, an edit shows up by itself within 10 minutes, and every deploy run by Cipi empties the cache. For many sites that is enough. To keep pages for hours and still publish at once, purge on change.

## 2. Purge only what changed {#purge}

```bash
$ sudo cipi cache blog purge /hello-world/                       # one page
$ sudo cipi cache blog purge /hello-world/ '/category/news/*' /  # its listing and the home page
$ sudo cipi cache blog purge https://shop.example.com/x/         # one host only
```

| You write | Cipi drops |
| --- | --- |
| `/hello-world/` | That page on every domain and alias of the app, http and https, with its `?utm_…` variants |
| `/category/news/*` | Everything under it: page 2, 3…, its feed |
| A full URL | That page on that host |

Up to 500 pages a call, each checked first; a page of another site is refused and nothing is purged. The panel's **Purge some pages** does the same.

How it works without a purge module: Nginx writes the request — scheme, method, host and address — at the top of each cached file. Cipi finds the files whose line matches, under the app's cache folder only, and deletes them as Nginx's user.

## 3. WordPress: let the plugin decide {#wordpress}

Which pages does an edited post appear on? Its own, its categories and tags, its author's archive, the home page and its pagination, the blog page, the feeds, the sitemaps. The [Cipi Cache](https://github.com/cipi-sh/cache-wp) plugin knows, and purges those — the way the purge plugins of other hosts do, through the command above.

```bash
$ ssh blog@your-server
$ cd ~/htdocs
$ wp plugin install https://github.com/cipi-sh/cache-wp/releases/latest/download/cipi-cache.zip --activate
$ wp cipi-cache status
$ sudo cipi cache blog ttl 8h            # on the server: pages can now live much longer
```

| In WordPress | Purged |
| --- | --- |
| Publish, update, unpublish a post | The post, its terms and their parents, its author, its archives, home, blog page, feeds, sitemaps |
| Change its slug | The old address too |
| Trash or delete it | The same, as it was |
| Approve or remove a comment | The post and the comments feed |
| Edit a category or tag | The term, its parents, the listings |
| WooCommerce stock changes | The product, its categories, the shop |
| Menus, widgets, theme, Customizer, permalinks, updates | Every page |

All changes of one request go to Nginx in one call, at its end. *Purge this page* in the toolbar and *Purge from cache* on each post are there for the rest. A page that shows content from elsewhere — a landing page with the latest events — goes in **Tools → Cipi Cache → Also purge, every time**, or in code:

```php
add_filter('cipi_cache_post_pages', function (array $pages, WP_Post $post) {
    if ($post->post_type === 'event') {
        $pages[] = '/calendar/*';
    }
    return $pages;
}, 10, 2);
```

## 4. Laravel and other PHP: cipi/cache {#php}

Laravel answers every response with `Cache-Control: no-cache, private` and a session cookie, so Nginx keeps nothing until a route says otherwise. [cipi/cache](https://github.com/cipi-sh/cache-php) does both halves: which routes may be kept, and what to purge.

```bash
$ composer require cipi/cache
```

```php
// routes/web.php — public pages, the same for every visitor without cookies
Route::get('/blog/{post:slug}', ShowPost::class)->name('posts.show')->middleware('cipi.cache:3600');
Route::get('/blog', ListPosts::class)->name('posts.index')->middleware('cipi.cache:600');
```

```php
// app/Models/Post.php — saved or deleted, its pages go
use Cipi\Cache\Laravel\PurgesPageCache;

class Post extends Model
{
    use PurgesPageCache;

    public function cachedPages(): array
    {
        return [route('posts.show', $this, false), '/blog/*', '/'];
    }
}
```

Or by hand, anywhere: `CipiCache::purgeRoute('posts.show', $post)`, `CipiCache::purge('/blog/*')`, `php artisan cipi:cache:purge --route=posts.index`. Purges are gathered and sent once when the request or the job ends. Plain PHP: `PageCache::forThisApp()->purge('/news/*')`, and `PageCache::cacheFor(600)` on the pages Nginx may keep.

> [!warning] Mark cacheable only pages that are the same for everyone, and never a page with a form: the CSRF token in it would be someone else's.

## 5. From a deploy, CI or another machine {#elsewhere}

| From | How |
| --- | --- |
| A deploy run by Cipi | Nothing: the whole cache is emptied after each successful deploy (`--no-deploy-clear` keeps it) |
| A Deployer recipe of your own | `run('sudo /usr/local/bin/cipi-cache-clear blog /landing/');` |
| CI over SSH | `ssh blog@server 'sudo /usr/local/bin/cipi-cache-clear blog /pricing/'` |
| CI or a worker elsewhere, over HTTPS | `POST /api/apps/blog/cache/purge` with `{"paths": ["/pricing/"]}` and an `nginx-manage` token — or `cipi-cli cache purge blog /pricing/` |

The app's user may run `cipi-cache-clear` for its own app only, without a password; it takes page addresses and nothing else.

## 6. Behind Cloudflare {#cloudflare}

Two caches in a row: Cloudflare's in front, Nginx's on the server. Cloudflare caches HTML only if you tell it to. If you do, purge there too — `sudo cipi zt purge blog --on-deploy=on` empties Cloudflare's after every deploy ([Cloudflare's cache](/docs/zero-trust#purge)); for single pages, Cloudflare's own purge by URL.

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Always `MISS` | A cookie is set on every response (a plugin, a session): find it with `curl -sI`. Laravel: the route needs `cipi.cache` |
| Always `BYPASS` | A query string, a login cookie, an admin path or one of the app's excluded paths |
| An edit doesn't show | `HIT` on the old page: purge it, or install the plugin / package |
| `Not a page of 'blog'` | The URL's host isn't a domain or alias of the app: `sudo cipi alias add` |
| `sudo: a password is required` | The app predates purging by page: `sudo cipi self-update` adds the rule |
| `purged: 0` | The page wasn't cached (yet, or any more) — not an error |

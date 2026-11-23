---
title: Laravel Scout with Meilisearch, self-hosted
description: Add fast, typo-tolerant search to a Laravel app with Scout and a Meilisearch instance on your own server, isolated per app, with no Algolia bill.
category: laravel
order: 4
published: 2026-07-08
updated: 2026-11-23
howto: yes
keywords: laravel scout meilisearch, meilisearch production, algolia alternative self-hosted, laravel search
related:
  - laravel-octane-frankenphp
  - manage-apps-with-cipi-yml
  - laravel-postgresql-pgvector
faq:
  - Is Meilisearch exposed to the internet? | No. It listens on 127.0.0.1 only, and each app gets a key limited to its own indexes.
  - How much memory does it need? | Cipi refuses to install below 512 MB available and warns below 1 GB. Plan RAM for your index size.
  - Small catalogue? | Scout's `database` driver or PostgreSQL full-text search need no extra service.
  - Does each app get its own Meilisearch? | Apps share one Meilisearch service, but each gets its own key restricted to its own index prefix, so one app can't read another's indexes.
  - How much RAM does Meilisearch need? | It memory-maps the index: plan roughly the size of your indexed data plus headroom. Small catalogues fit in a few hundred MB.
  - Do I re-import after every deploy? | No. Scout keeps indexes in sync on save. Re-import only after changing `toSearchableArray()` or index settings.
docs:
  - search
  - environment
---
Here you'll add instant, typo-tolerant product search to a Laravel shop with [Scout](https://laravel.com/docs/scout) and [Meilisearch](https://www.meilisearch.com), running on the same server. Each app gets a key that can only touch its own indexes.

<cipi-term name="search"></cipi-term>

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Scout** | Laravel's search layer: `Product::search('shoes')->get()` |
| **Meilisearch** | An open-source search engine, typo-tolerant and fast |
| **Index** | Meilisearch's copy of the searchable fields of your models |
| **Filterable / sortable attributes** | Fields you can filter or sort on; they must be declared |

## 1. Install Meilisearch on the server

```bash
$ sudo cipi search install
```

A single binary under systemd, listening on localhost, with a hardened unit and a health check. The master key lives in a root-only file.

## 2. Prepare the model

```bash
$ composer require laravel/scout meilisearch/meilisearch-php http-interop/http-factory-guzzle
$ php artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"
```

```php
use Laravel\Scout\Searchable;

class Product extends Model
{
    use Searchable;

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'brand' => $this->brand,
            'price' => $this->price,
        ];
    }
}
```

Filterable and sortable attributes go in `config/scout.php` under `meilisearch.index-settings`. Commit and deploy.

## 3. Enable search for the app

```bash
$ sudo cipi search enable shop
$ sudo cipi app artisan shop scout:sync-index-settings
$ sudo cipi app artisan shop scout:import "App\Models\Product"
```

Cipi writes `SCOUT_DRIVER=meilisearch`, the host, a key scoped to `shop-*` indexes and the prefix into the app's `.env`.

```flow
App shop | SCOUT_PREFIX=shop-
Scoped key | shop-* indexes only
Meilisearch | 127.0.0.1, no public port
```

## 4. Search

```php
$results = Product::search($request->q)
    ->where('brand', 'Acme')
    ->paginate(20);
```

Add `scout:sync-index-settings` to your deploy steps so settings follow the code:

```yaml
# cipi.yml
search: true
deploy:
  post:
    - artisan scout:sync-index-settings
```

## Operations

| Task | Command |
| --- | --- |
| Status and keys | `sudo cipi search status --check`, `sudo cipi search list` |
| Rotate the app key | `sudo cipi search key rotate shop` (`.env` updated) |
| Upgrade | `sudo cipi search upgrade` (old binary returns if the store is refused) |
| Turn off for an app | `sudo cipi search disable shop --purge-indexes` |

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| No results | Not imported yet: `scout:import "App\Models\Product"` |
| `Attribute is not filterable` | Declare it in `scout.meilisearch.index-settings`, then `scout:sync-index-settings` |
| Changes don't show up | `SCOUT_QUEUE=true` and no worker running, or `searchable()` not called |
| `invalid_api_key` | Key rotated: check `MEILISEARCH_KEY` in `.env`, `cipi search status --check` |

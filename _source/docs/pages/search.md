@section cli-search

Full-text search for Laravel Scout, self-hosted: no Algolia account, no per-record billing. Meilisearch runs natively (a single binary with systemd), listens on localhost only, and every app gets a key that can touch **its own indexes and nothing else**. Off until you install it.

<cipi-term name="search"></cipi-term>

```bash
$ sudo cipi search install        # binary, config, hardened unit; checks /health
$ sudo cipi search enable myapp   # scoped key + SCOUT_* in .env
$ sudo cipi app artisan myapp scout:import "App\Models\Product"
$ sudo cipi search status [--check]
$ sudo cipi search disable myapp [--purge-indexes]
```

Step-by-step with a real model: [Laravel Scout with Meilisearch on Cipi](/guides/laravel-scout-meilisearch).

> [!tip] Small dataset? Scout's `database` driver or PostgreSQL full-text need no extra service. `sudo cipi search status` says so on servers without Meilisearch.

## Isolation by design {#isolation}

```flow
App myapp | SCOUT_PREFIX=myapp-
> Cipi gives each app an index prefix based on its name (`myapp-`), written to `.env` as `SCOUT_PREFIX`. You can't choose one that collides with another app.
Scoped key | indexes myapp-* only
> The app's Meilisearch key can only act on indexes starting with its prefix. Another app's index answers 403.
Meilisearch | 127.0.0.1, no public port
> Meilisearch itself listens on `127.0.0.1` only: nobody can query it from the internet.
```

| Guard | Effect |
| --- | --- |
| Prefix written by Cipi, not chosen by you | App names can't overlap, so prefixes can't either |
| Key limited to Scout's actions on `myapp-*` | No key management, no other app's indexes (a stray index name gets 403) |
| Master key in a root-only file, never on a command line | App users can't read it from `/proc` |
| Delete or clone an app | Its key is revoked / the clone gets a new key and prefix, never production's |
| Memory check before install | Refused below 512 MB available, warned below 1 GB |

## Commands {#commands}

| Command | Does |
| --- | --- |
| `sudo cipi search list` | Apps with search and their prefixes |
| `sudo cipi search key show\|rotate myapp` | Show or replace an app's key (`.env` updated) |
| `sudo cipi search key rotate --master` | New master key; every app's `.env` is rewritten in the same run |
| `sudo cipi search upgrade [--version=]` | Upgrade in place; the old binary returns if the store is refused |
| `sudo cipi search remove [--keep-data]` | Uninstall |

The panel can show status and enable/disable search per app; installing, upgrading, rotating and removing stay on the CLI.

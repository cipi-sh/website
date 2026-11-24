@section why-not-local

## Why not local? {#local}

Cipi is a **production server provisioner**: it turns a fresh Ubuntu VPS into an internet-facing host. It doesn't run on a laptop, in local Docker, or behind a home NAT, by design.

| A Cipi server needs | Because |
| --- | --- |
| A public IPv4 address, no NAT | Domains must resolve to it and Git providers must reach its webhooks |
| Full virtualization or bare metal (KVM, VMware, Hyper-V, Xen HVM) | Shared-kernel containers (OpenVZ, LXC) can't run the services and firewall Cipi manages; the installer detects them and stops |
| Ports 22, 80 and 443 reachable | SSH, Let's Encrypt validation and HTTPS |

> [!warning] Don't install Cipi inside Docker Desktop, OrbStack, Colima, WSL or a local VM expecting a working stack: certificates won't issue, domains won't resolve and webhooks can't arrive. A small VPS is enough for staging.

Every production provisioner has the same constraint. What Cipi doesn't ask for is the difference: no agent phoning home, no external control plane, no cloud account.

**Locally**, use [Laravel Herd](https://herd.laravel.com/), [Sail](https://laravel.com/docs/sail) or `php artisan serve`, then push to a Cipi server for staging and production.

@section why-not-docker

## Why no Docker? {#docker}

Cipi installs Nginx, PHP-FPM, MariaDB or PostgreSQL, Valkey and Supervisor **as native Ubuntu packages**, managed by systemd, and seals apps off from each other with Linux users. There are no containers, no images and no Docker daemon on a Cipi server. That's deliberate: for one server running Laravel and PHP apps, Docker adds a layer that has to be secured, patched and debugged, without giving anything the OS doesn't already provide.

| | With Docker | On a Cipi server |
| --- | --- | --- |
| **Ease of use** | A second system to learn on top of Linux: images, Compose files, networks, volumes, registries. Every task goes through Docker first | One command per task (`cipi app create`, `cipi deploy`, `cipi ssl install`). Underneath, a plain Ubuntu server: nothing to translate |
| **An extra layer** | Docker sits between you and every component: to change a `php.ini` or an Nginx rule you edit an image or a mount, then recreate | The component is the one on the host: `/etc/nginx`, `/etc/php`, managed by Cipi and visible to you |
| **SSH and SFTP** | SSH lands on the host, not in the app: then `docker exec` into a container that usually has no SSH, no editor and no SFTP | [`ssh myapp@server`](/docs/app-ssh) drops you into the app as its own user, with `artisan`, `composer`, logs and SFTP for your IDE |
| **Remote databases** | The database lives on a container network. To reach it from TablePlus or DBeaver you publish its port (bypassing the firewall, see below) or chain an SSH tunnel into the container network | Native MariaDB or PostgreSQL on localhost: connect over SSH with the `mariadb+ssh://` URL shown at creation. [No database port is ever exposed](/docs/databases) |
| **Ports and firewall** | Published ports (`-p 3306:3306`) are opened by Docker's own iptables rules, ahead of UFW: a firewall that says "deny" doesn't apply to them | One firewall. UFW, Fail2ban, CrowdSec and `cipi zt lock` see and govern every port |
| **Security patches** | A CVE in PHP or OpenSSL means rebuilding every image that contains it and redeploying every app. Images pinned months ago keep old libraries | PHP patched **every night at 03:30** from packages.sury.org, Nginx from nginx.org, the rest by unattended-upgrades. One update fixes every app |
| **Privileges** | `dockerd` runs as root, and anyone in the `docker` group is root in practice | No daemon with root access to manage. Apps run as their own unprivileged users |
| **Isolation** | Containers share the host kernel; a misconfigured mount or a privileged container breaks the boundary | Per-app Linux user (home `750`), PHP-FPM pool with `open_basedir`, database user and Valkey instance |
| **Restarts and reloads** | A config change usually means recreating the container. Restarting or upgrading `dockerd` stops every container, unless live-restore is configured | `systemctl reload`: Nginx and PHP-FPM pick up changes without dropping connections. Nightly patching restarts only the affected PHP-FPM service |
| **Workers** | Restart policies only know "the process exited" | Supervisor restarts workers, Horizon, Reverb and Octane individually, with logs per program |
| **Native components** | Bridge networks, NAT, `docker-proxy` and an overlay filesystem between the request and PHP | Unix sockets between Nginx, PHP-FPM, the database and Valkey. Nothing in between |
| **Resources** | The daemon plus a runtime and a copy of the userland per container; heavy on a 1–2 GB VPS | One shared runtime. Cipi sizes MariaDB's buffer pool from the server's RAM |
| **Data** | Databases on volumes; one `docker compose down -v` deletes them | Data in the standard directories, backed up by [`cipi backup`](/docs/backups), encrypted and verified |
| **Deploys** | Build an image, push it to a registry, pull it, swap containers behind a proxy | `git push`: [Deployer](/docs/how-deploys-work) builds a release and swaps a symlink atomically, with one-command rollback |
| **Debugging** | `docker exec` into a minimal image, with logs per container | `systemctl`, `journalctl`, `/var/log`, `strace`: the tools and tutorials every sysadmin already knows |

> [!warning] The firewall point is the one that bites. Docker writes its own iptables rules for published ports, and they're evaluated before UFW. A database container published on `3306` is reachable from the internet even with `ufw deny 3306`. Docker's own documentation calls Docker and UFW incompatible. On a Cipi server, what the firewall says is what's open.

**What you don't lose.** The things people use Docker for on a server are already there: per-app isolation, one version of PHP per app ([8.3 to 8.6](/docs/php) side by side), a database per app, reproducible settings in [`cipi.yml`](/docs/yml) committed to the repository, and zero-downtime deploys with rollback.

**When Docker is the better fit.** Many stacks on one host (Go, Python, Rails next to PHP), images built once in CI and shipped unchanged, or a team that already thinks in containers. Then a Docker PaaS such as [Coolify](/alternative-to-coolify) or [Dokku](/alternative-to-dokku) suits you better: see the [comparison](/docs/vs-alternatives#docker). **Locally**, Docker is great: [Sail](https://laravel.com/docs/sail) or [init](https://init.web.ap.it/) on your laptop, Cipi on the server. Cipi itself doesn't install inside a container: the installer detects Docker, LXC, OpenVZ or WSL and stops.

@section why-mariadb

## Why MariaDB by default? {#mariadb}

MariaDB (port `3306`) is the default because it fits most Laravel apps with zero friction. [PostgreSQL](#why-postgresql) is one command away and can run next to it.

| Reason | Detail |
| --- | --- |
| Drop-in for Laravel | `mysql` driver, same `DB_*` keys, same migrations; works with TablePlus, DBeaver, Sequel Ace |
| Built for web concurrency | Strong optimizer and a native thread pool in the community edition, good with PHP-FPM connection churn |
| Tuned to your VPS | Cipi sizes `innodb_buffer_pool_size` from RAM (256 MB on 1 GB hosts up to 4 GB on 16 GB+) |
| Simple licensing | GPL community server, no enterprise feature gates, no Oracle dual-licensing to navigate |
| Native packaging | Installed from MariaDB.org or Ubuntu; Cipi adds users, backups and vault credentials on top |

Need **MySQL** itself (an app that relies on MySQL-only behaviour, a team standard)? Since 5.13.0, `cipi db switch mysql` replaces MariaDB on a new server, before its first app — an explicit choice, never a default, and never a conversion of existing data ([MySQL instead of MariaDB](/docs/databases#mysql)).

@section why-postgresql

## Why PostgreSQL as an option? {#postgresql}

```bash
$ cipi db install pgsql                       # port 5432, side by side with MariaDB
$ cipi app create shop --engine=pgsql
```

Choose PostgreSQL per app when the product needs more than tables:

| Need | PostgreSQL gives you |
| --- | --- |
| Rich data | JSONB, arrays, ranges, UUID, full-text search, CHECK and exclusion constraints |
| Indexing | B-tree, GIN, GiST, BRIN, partial and expression indexes |
| Extensions | `pgcrypto`, `pg_trgm`, PostGIS, `pgvector` for embeddings and RAG |
| Concurrency | MVCC: readers don't block writers; long reports and busy writes coexist |
| Portability | The standard of managed databases, BI tools and data pipelines |

The same `cipi db` workflow covers both engines: create, list, backup, restore, password rotation.

@section why-valkey

## Why Valkey? {#valkey}

| Reason | Detail |
| --- | --- |
| Drop-in | Same protocol on `6379`, same `phpredis`, same `REDIS_*` keys; Laravel doesn't notice |
| Truly open source | BSD-licensed, stewarded by the Linux Foundation after Redis moved to source-available licences |
| Native on Ubuntu | `valkey-server` from the Universe repository, no third-party PPAs |
| Automatic migration | Servers moved from Redis to Valkey on `cipi self-update`, same password and data |

The licence of every component Cipi installs, and why it matters on a server: [Open source licences, explained](/guides/open-source-licences).

@section why-laravel

## Why Laravel first? {#laravel}

Knowing the framework lets Cipi automate what generic panels leave to you: the release layout, `.env` handling, queue workers, the scheduler, Horizon, Reverb, Octane, health routes. Every assumption maps to a known structure, so there's no guesswork. Anything that isn't Laravel still runs as a [custom app](/docs/custom-apps) (WordPress, Symfony, static sites) or a [Node app](/docs/node-apps).

| Laravel brings | Cipi turns it into |
| --- | --- |
| Queues and Horizon | Supervisor workers, `cipi worker horizon enable` |
| Reverb | Supervisor process, Nginx `/app` proxy, `REVERB_*` keys: `cipi app reverb enable` |
| Octane | FrankenPHP apps side by side with FPM: `cipi app create --octane` |
| Scheduler | One cron per app, nothing to configure |
| Scout | Meilisearch on the server: `cipi search` |
| Secure defaults and a long support cycle | Apps you can leave in production for years |

Taylor Otwell's mantra is **"we must ship"**. Cipi exists for the same reason: to remove the server work between a developer and a live application.

@section why-cipi

## Why "ci-pi"? {#name}

<div class="why-cipi-intro"><div class="why-cipi-mascot"><svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none"> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M16.2182,35.9c-3.1368,0-6.8982,1.496-7.2988,5.6766a.916.916,0,0,0,.9061,1.0025h11.97A.9.9,0,0,0,22.7,41.643C22.6175,39.8048,21.7865,35.9,16.2182,35.9Z"> </path> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M18.0508,20.564c-1.35,1.0368-7.3687,7.51-4.3595,15.6667"></path> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M31.7818,35.9c3.1368,0,6.8982,1.496,7.2988,5.6766a.916.916,0,0,1-.9061,1.0025h-11.97A.9.9,0,0,1,25.3,41.643C25.3825,39.8048,26.2135,35.9,31.7818,35.9Z"> </path> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M35.0148,36.4556c3.1848-2.8438,2.7468-7.5246,2.7468-8.7785,2.8935.82,5.0306,2.9709,5.5941,2.17,1.3744-1.9531-7.5193-7.5461-7.6918-10.8989C35.4951,15.6692,35.1706,5.4214,24,5.4214S12.5049,15.6692,12.3361,18.9484c-.1725,3.3528-9.0662,8.9458-7.6918,10.8989.5635.8007,2.7006-1.35,5.5941-2.17,0,1.2539-.438,5.9347,2.7468,8.7785"> </path> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M29.2763,19.8324c1.9318,1.5032,8.0416,8.242,5.0324,16.3983"></path> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M24,24.8431l3.9479-4.2791c-.3858-1.0127-1.712-1.929-3.9479-1.929s-3.5621.9163-3.9479,1.929Z"> </path> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M20.0521,20.564c-3.424.5063-3.9062-2.7247-3.9062-4.7019,0-2.7006,1.4467-4.4367,3.9062-4.4367S23.79,14.7529,23.79,16.3443A3.8486,3.8486,0,0,1,23.181,18.68"> </path> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M27.7205,20.1334c.6751.0482,3.9538-.3892,3.9538-3.331s-1.76-3.7615-4.1232-3.7615a3.7861,3.7861,0,0,0-3.8164,2.6682"> </path> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M22.7012,41.4815a6.8371,6.8371,0,0,0,2.6076,0"></path> <circle fill="currentColor" cx="22.1579" cy="16.5888" r="0.75"></circle> <circle fill="currentColor" cx="25.5497" cy="16.5888" r="0.75"></circle> </svg></div><p><strong>Cipi</strong> is the Italian reading of the letters <strong>C</strong> and <strong>P</strong>: <strong>Control Panel</strong>. A nod to the project's Italian roots, and to what it does under the hood: manage Nginx, PHP-FPM, databases, Supervisor, certificates and the firewall for you.</p></div>

The mascot is a penguin, a reference to **Tux**, the Linux mascot drawn by Larry Ewing in 1996. Same species, different attitude: minimal, hand-sketched, happier in the terminal than in the spotlight.

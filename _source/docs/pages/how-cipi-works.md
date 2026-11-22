@section tech-stack

Cipi is a command-line tool that lives on your server. It installs a proven open-source stack, then creates and runs apps on it, each one sealed off from the others. There is no external service in the loop: no account, no agent phoning home, nothing to pay.

## The server

```stack
Nginx | web server, TLS, proxy
PHP-FPM / Octane | several PHP versions side by side
MariaDB / PostgreSQL | one database per app
Valkey | cache, queues (opt-in per app)
Supervisor | workers, Horizon, Reverb
```

| Component | Role |
| --- | --- |
| **Nginx** (nginx.org mainline) | Web server, reverse proxy, TLS termination, HTTP/2 hardening |
| **PHP-FPM** | PHP runtime per app; 8.3 to 8.6 installable side by side |
| **Laravel Octane (FrankenPHP)** | Optional long-running PHP server per Laravel app |
| **MariaDB** | Default database; **PostgreSQL** optional, chosen per app |
| **Valkey** | Open-source Redis fork for cache, sessions, queues, broadcasting |
| **Supervisor** | Keeps queue workers, Octane, Horizon and Reverb running |
| **Deployer** | Atomic, zero-downtime releases (checksum-verified install) |
| **Certbot** | Let's Encrypt certificates and renewals |
| **UFW + Fail2ban** | Firewall and brute-force bans |
| **unattended-upgrades** | Automatic security patches |
| **cipi** | The CLI that ties it all together |

## Each app {#what-every-app-gets}

Every app is a separate Linux user. If one app is compromised, the others' files, database and processes are out of reach.

| Area | What the app gets |
| --- | --- |
| Isolation | Its own Linux user (home `750`), PHP pool or Octane process, SSH deploy key |
| Web | An Nginx vhost tuned for Laravel; aliases, redirects, basic auth |
| PHP | Version per app, changeable any time; `php.ini` via [cipi ini](/docs/php#cli-ini) |
| Data | Its own database and user (MariaDB or PostgreSQL); its own Valkey instance |
| Processes | Queue workers or Horizon, scheduler, optional Reverb |
| Deploys | Zero-downtime releases, last 5 kept, one-command rollback |
| TLS | Let's Encrypt, HTTP or Cloudflare DNS validation, wildcards |
| Safety nets | Health check after each deploy with automatic rollback, backups, monitoring |

**Laravel** is the default app type. `--node` builds and serves a React, Vue, Next.js, Nuxt or Astro frontend; `--custom` hosts WordPress or plain PHP without database or workers.

@section app-structure

## On disk

```tree
/home/myapp/                 # the app's Linux user (chmod 750)
├── .ssh/id_ed25519(.pub)    # deploy key
├── .deployer/deploy.php     # generated Deployer config
├── current -> releases/3/   # the live release (atomic symlink)
├── releases/1 … 5/          # last 5 releases, for rollback
├── shared/
│   ├── .env                 # written by Cipi, kept across releases
│   └── storage/             # persistent storage
└── logs/                    # nginx, php-fpm, worker, deploy logs
```

| Outside the home | Path |
| --- | --- |
| PHP-FPM pool (FPM apps) | `/etc/php/<version>/fpm/pool.d/myapp.conf` |
| Nginx vhost | `/etc/nginx/sites-available/myapp` |
| Supervisor programs | `/etc/supervisor/conf.d/myapp.conf` |
| Scheduler | the app user's crontab |
| Database | `myapp` with user `myapp@localhost` |

Cipi writes `.env` with every credential and `APP_KEY`; change it with [cipi app env](/docs/environment). If permissions get mangled (an archive unpacked as root, a `chmod 775 .ssh`), `cipi app fix-permissions myapp` restores them. Do not `chown -R`: Nginx writes logs as `www-data` and SSH refuses a deploy key with loose permissions.

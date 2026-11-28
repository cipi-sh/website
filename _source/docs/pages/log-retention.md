@section cipi-log-retention

Logs rotate and expire automatically, with retention periods chosen for GDPR's data-minimisation principle. No manual cleanup, no disk filling up with years of access logs.

## Retention periods {#retention}

| Category | Logs | Kept |
| --- | --- | --- |
| Application | Laravel, PHP-FPM, workers, deploys, system | 12 months |
| Security | Fail2ban, firewall, authentication, Cipi events | 12 months |
| HTTP | Nginx access and error logs (contain IP addresses) | 90 days |

Logs are rotated daily and compressed from the second day. Laravel apps write a single `storage/logs/laravel.log` (`LOG_CHANNEL=single`) that follows the same policy. An app that sets `LOG_CHANNEL=daily` on purpose is pruned by Laravel itself (`LOG_DAILY_DAYS`).

> [!tip] Access logs hold IP addresses, which are personal data. 90 days is enough for debugging and incident analysis while keeping exposure low; application and security logs stay a year for audit trails.

## Where logs are {#where}

| Log | Command |
| --- | --- |
| Laravel | `sudo cipi app logs myapp --type=laravel` |
| Nginx | `sudo cipi app logs myapp --type=nginx` |
| PHP-FPM | `sudo cipi app logs myapp --type=php` |
| Workers | `sudo cipi app logs myapp --type=worker` |
| Deploys | `sudo cipi app logs myapp --type=deploy` |

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| `sudo cipi pending` says *logrotate reports a problem with a Cipi rule: skipping "/var/log/auth.log" because parent directory has insecure permissions* (also `fail2ban.log`, `ufw.log`) | A false alarm of an old Cipi release: `/var/log` belongs to group `syslog` on Ubuntu, and logrotate wants a `su` line for it. The nightly rotation always had one (from `/etc/logrotate.conf`), but the check ran each rule on its own, where it was missing. **`sudo cipi self-update`** writes `su root adm` into Cipi's rules and the message goes; `sudo cipi app fix-permissions` does the same on demand. Logs were rotated all along |
| What does logrotate itself say? | `logrotate -d /etc/logrotate.d/cipi-*` prints what it would do, without doing it |


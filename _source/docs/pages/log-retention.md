@section cipi-log-retention

Logs rotate and expire automatically, with retention periods chosen for GDPR's data-minimisation principle. No manual cleanup, no disk filling up with years of access logs.

| Category | Logs | Kept |
| --- | --- | --- |
| Application | Laravel, PHP-FPM, workers, deploys, system | 12 months |
| Security | Fail2ban, firewall, authentication, Cipi events | 12 months |
| HTTP | Nginx access and error logs (contain IP addresses) | 90 days |

Logs are rotated daily and compressed from the second day. Laravel apps write a single `storage/logs/laravel.log` (`LOG_CHANNEL=single`) that follows the same policy. An app that sets `LOG_CHANNEL=daily` on purpose is pruned by Laravel itself (`LOG_DAILY_DAYS`).

> [!tip] Access logs hold IP addresses, which are personal data. 90 days is enough for debugging and incident analysis while keeping exposure low; application and security logs stay a year for audit trails.

@section cipi-smtp

Cipi tells you when something happens that you should know about: failed deploys and backups, health and monitor alerts, security events (SSH logins, sudo, key changes), patches applied. One command manages where messages go; every enabled trigger reaches every enabled channel.

<cipi-term name="notifications"></cipi-term>

```bash
$ cipi notification                     # channels and active triggers (no secrets shown)
$ cipi notification add slack ops --url=https://hooks.slack.com/services/…
$ cipi notification test all
$ cipi notification triggers            # which events notify
$ cipi notification triggers disable monitor_load
```

@section cipi-alert-channels

## Channels {#channels}

| Type | Options | Delivers |
| --- | --- | --- |
| `smtp` | `--host --port --user --password --from --to --tls` | Email via any SMTP server |
| `resend` | `--api-key --from --to` | Email via the Resend API |
| `ses` | `--region --access-key --secret-key --from --to` | Email via Amazon SES (signed by Cipi, no AWS CLI) |
| `slack`, `mattermost`, `googlechat` | `--url` (incoming webhook) | A chat message |
| `discord` | `--url` | A chat message (2 000-char cap) |
| `telegram` | `--token --chat-id` | Plain-text bot message |
| `ntfy` | `--url [--priority]` | Push notification; urgent events raised to high |
| `pushover` | `--token --user` | Push notification |
| `webhook` | `--url [--secret]` | JSON, optionally signed (`X-Cipi-Signature`) |

```bash
$ cipi notification add smtp --host=smtp.example.com --port=587 --user=… --password=… \
    --from=alerts@example.com --to=ops@example.com --tls=on
$ cipi notification add telegram oncall --token=<bot> --chat-id=<id>
$ cipi notification add webhook pager --url=https://example.com/hooks/cipi --secret=…
$ cipi notification disable ops | enable ops | remove ops
```

Secrets omitted from the command line are asked for without echo, stored encrypted, and never printed back. Delivery is **best-effort with a 5-second timeout**: a dead webhook can never stall a deploy or a cron job.

```php
// verify a signed webhook (body: server, trigger, subject, body, ts)
$expected = 'sha256='.hash_hmac('sha256', file_get_contents('php://input'), $secret);
if (! hash_equals($expected, $_SERVER['HTTP_X_CIPI_SIGNATURE'] ?? '')) { http_response_code(401); exit; }
```

## Triggers {#triggers}

All on by default; every event is also written to `/var/log/cipi/events.log` (kept a year) whatever you mute.

| Category | Triggers |
| --- | --- |
| Deploy | `deploy_success`, `deploy_fail`, `deploy_rollback`, `deploy_snapshot_fail`, `deploy_health_fail` |
| Health & monitor | `health_fail`, `monitor_disk`, `monitor_app_disk`, `monitor_ssl`, `monitor_services`, `monitor_workers`, `monitor_http_5xx`, `monitor_fs`, `monitor_load`, `monitor_ok` |
| Backups & cron | `backup_fail`, `backup_stale`, `cron_fail` |
| Security | `ssh_login`, `sudo`, `su`, `ssh_key_add`, `ssh_key_remove`, `ssh_key_rename`, `credentials_show`, `zt_*` |
| Apps & domains | `app_create`, `app_edit`, `app_delete`, `app_suspend`, `alias_*`, `www_*`, `redirect_change`, `proxy_change`, `basicauth_*` |
| Updates | `self_update`, `php_upgrade`, `nginx_upgrade`, `mariadb_upgrade`, `pgsql_upgrade`, `valkey_upgrade`, `node_upgrade`, `composer_upgrade`, `frankenphp_upgrade`, `pending_report` |
| Config | `ini_set`, `app_jit`, `yml_apply`, `yml_fail`, `yml_post_fail`, `node_default` |
| Other | SSL, PHP, database, workers, services, search, packages, sync, API and password-reset events |

`cipi notification triggers` prints the live list with on/off state; `enable-all`, `disable-all` and `reset` work as expected.

## Security alerts {#security}

| Event | Includes |
| --- | --- |
| SSH login as root or a sudoer | Source IP, key fingerprint and comment |
| `sudo` / `su` | Who, target user, TTY, key, IP |
| SSH key added, removed, renamed | Fingerprint, comment, remaining keys |

They run in the background through PAM, so they never slow a login. Wrap your own cron jobs with `cipi-cron-notify` to be alerted when they exit non-zero.

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| Telegram silent | Send `/start` to the bot first; group ids are negative |
| E-mail never arrives | Use an SMTP service on port 587; port 25 is blocked by most providers |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Which channels? | E-mail, Slack, Mattermost, Google Chat, Discord, Telegram, ntfy, Pushover, signed webhooks. |
| Step by step? | [Notifications and alerts guide](/guides/notifications-alerts). |

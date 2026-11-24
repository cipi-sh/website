@section cipi-smtp

Cipi tells you when something happens that you should know about: failed deploys and backups, health and monitor alerts, security events (SSH logins, sudo, key changes), patches applied. One command manages where messages go; every enabled trigger reaches every enabled channel.

<cipi-term name="notifications"></cipi-term>

```bash
$ cipi notification                     # channels and active triggers (no secrets shown)
$ cipi notification add slack ops --url=https://hooks.slack.com/services/…
$ cipi notification test all
$ cipi notification triggers            # which events notify
$ cipi notification triggers disable monitor_load
$ cipi notification update ops --url=https://hooks.slack.com/services/…   # 5.12.0
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
$ cipi notification update oncall --chat-id=-1009999     # what is left out, secrets too, is kept
$ cipi notification update siem --clear-secret           # stop signing a webhook
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
| Other | SSL, PHP, database (`db_switch` when [MariaDB and MySQL](/docs/databases#mysql) are swapped), workers, services, search, packages, sync, API and password-reset events |

`cipi notification triggers` prints the live list with on/off state; `enable-all`, `disable-all` and `reset` work as expected. Since 5.12.0, `triggers --json` prints it as JSON and `triggers set --on=a,b --off=c,d` changes many in one write.

`cipi notification test <id>` exits 1, with the reason, when the channel refuses the request (5.12.0); a disabled channel can be tested before it is turned on.

## In the web panel {#panel}

The **Notifications** tab of each server (panel 4.4+, Cipi 5.12.0+, cipi/api 1.42+) manages all of the above: add a channel with a type picker that shows only its fields, edit it — secrets are never sent back to the panel, and an empty secret keeps the stored one — pause, test (a refused test shows the channel's reason on its row) or remove it. Below, every trigger by category with a switch, a filter, *all* / *none* per category, and one **Save** for every change.

<cipi-clips name="notifications"></cipi-clips>

<figure class="gui-shot">
<div class="gui-shot-frame">
<div class="gui-shot-bar" aria-hidden="true"><i></i><i></i><i></i><span class="gui-shot-url">panel.example.com</span></div>
<img src="/img/gui/notifications-light.webp" width="1440" height="1257" alt="Notifications tab: channels SMTP, Slack, Telegram, ntfy and webhook with a test result each, and the triggers by category with switches" class="shot-light" loading="lazy" decoding="async">
<img src="/img/gui/notifications.webp" width="1440" height="1257" alt="Notifications tab: channels SMTP, Slack, Telegram, ntfy and webhook with a test result each, and the triggers by category with switches" class="shot-dark" loading="lazy" decoding="async">
</div>
<figcaption>Channels with where they send and the last test; triggers by category, saved together.</figcaption>
</figure>

<figure class="gui-shot">
<div class="gui-shot-frame">
<div class="gui-shot-bar" aria-hidden="true"><i></i><i></i><i></i><span class="gui-shot-url">panel.example.com</span></div>
<img src="/img/gui/notifications-add-light.webp" width="1440" height="900" alt="Add a notification channel: type picker with eleven channel types and the Telegram fields" class="shot-light" loading="lazy" decoding="async">
<img src="/img/gui/notifications-add.webp" width="1440" height="900" alt="Add a notification channel: type picker with eleven channel types and the Telegram fields" class="shot-dark" loading="lazy" decoding="async">
</div>
<figcaption>Adding a channel: the fields of the type, a suggested id, a test after saving.</figcaption>
</figure>

Over the API: `GET /api/notifications`, `POST|PUT|DELETE /api/notifications/channels[/{id}]`, `POST …/{id}/enable|disable|test`, `GET|PUT /api/notifications/triggers` ([REST API](/docs/api#endpoints-server)); from code, `$cipi->notifications()` ([PHP SDK](/docs/php-sdk)) and `cipi-cli notifications` ([cipi-cli](/docs/cli-client#notifications)); for an assistant, the MCP tools `NotificationsShow`, `NotificationChannelSave`, `NotificationChannelTest`, `NotificationChannelRemove`, `NotificationTriggersUpdate`. Servers older than 5.12.0 keep the SMTP form in the panel.

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
| Can I manage them from the panel? | Yes, every channel and trigger, with Cipi 5.12.0+ and cipi/api 1.42+ ([In the web panel](#panel)). |
| The panel says "sudo: I'm sorry www-data" on Notifications | The panel's sudo whitelist predates 5.12.0: `sudo cipi self-update` rewrites it. |
| Step by step? | [Notifications and alerts guide](/guides/notifications-alerts). |

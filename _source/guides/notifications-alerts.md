---
title: "Server notifications: Telegram, Slack, e-mail and webhooks done right"
description: Set up Cipi notifications from scratch, explained for beginners: which channels exist, which events trigger them, how to route urgent alerts to your phone and the rest to a quiet channel, how to verify signed webhooks, and how to avoid alert fatigue.
category: ops
order: 3
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: server alerts telegram, laravel deploy notifications slack, server monitoring alerts email, ntfy pushover server alerts, webhook signed alerts
docs:
  - notifications
  - monitor
  - health-checks
  - deploy-notifications
related:
  - server-monitoring-alerts
  - cipi-agent-health-monitoring
  - backup-vps-s3
faq:
  - Which channel should I start with? | E-mail for a record of everything, plus one chat or push channel you actually look at (Telegram, Slack or ntfy) for what needs action. Two channels cover most teams.
  - Can a broken webhook block a deploy? | No. Delivery is best-effort with a 5-second timeout and runs in the background. A dead endpoint never stalls a deploy, a backup or a cron job.
  - Are my tokens stored safely? | Secrets you omit from the command line are asked without echo, stored encrypted, and never printed back, not even by `cipi notification`.
  - I muted a trigger. Is the event lost? | No. Every event is written to `/var/log/cipi/events.log` (kept a year) whatever you mute.
  - Can different events go to different channels? | Triggers decide which events notify; every enabled channel receives them. To route urgent events only to your phone, point a webhook at a small router (n8n, a Laravel route, a Cloudflare Worker) and fan out from there, or use ntfy's priority: urgent events are raised to high.
  - How do I get alerts for my own cron jobs? | Wrap them with `cipi-cron-notify`: when the command exits non-zero you get a `cron_fail` notification with its output.
  - Can I see who logged in to the server? | Yes. SSH logins as root or a sudoer, `sudo` and `su` are security triggers with source IP and key fingerprint, delivered through PAM in the background.
---
A server that fails quietly is the worst kind. Cipi can tell you when something needs your attention (a failed deploy, a backup that didn't run, a full disk, an SSH login) on the channels you already use. This guide explains how notifications work and how to set them up so they help instead of becoming noise.

## How it works

```flow
Something happens | deploy, backup, monitor, login…
> An event happens on the server: a deploy finishes, a backup fails, disk fills up, someone logs in.
Trigger | is this event enabled?
> Cipi checks whether that event type (trigger) is enabled. You can turn each one off.
Event log | always written, kept a year
> Every event is written to the event log anyway, kept for a year, even if no alert goes out.
Channels | every enabled channel, in parallel
> The alert is sent to every enabled channel at once: e-mail, Telegram, Slack, webhooks…
You | e-mail, chat or phone
> You get it where you are. A broken channel never blocks the others or the deploy.
```

| Term | Meaning |
| --- | --- |
| **Event** | Something that happened on the server: `deploy_fail`, `backup_stale`, `ssh_login`… |
| **Trigger** | An on/off switch per event type. All are on by default |
| **Channel** | A destination: an e-mail address, a Telegram chat, a Slack channel, a webhook URL |
| **Event log** | `/var/log/cipi/events.log`, written for every event, muted or not |

## 1. Choose your channels {#channels}

| Channel | Good for | You need |
| --- | --- | --- |
| `smtp`, `resend`, `ses` | A searchable record of everything | SMTP credentials, a Resend key, or SES keys |
| `telegram` | Alerts on your phone, free | A bot token and a chat id |
| `slack`, `mattermost`, `googlechat`, `discord` | Team channels | An incoming webhook URL |
| `ntfy`, `pushover` | Push notifications with priorities | A topic URL, or Pushover keys |
| `webhook` | Your own automation (PagerDuty, n8n, a Laravel route) | A URL and a shared secret |

A sensible start: **e-mail for the record, Telegram or Slack for action**.

## 2. Add e-mail {#email}

```bash
$ sudo cipi notification add smtp --host=smtp.example.com --port=587 \
    --user=alerts@example.com --password=… --from=alerts@example.com --to=ops@example.com --tls=on
```

Use a transactional provider (Postmark, Mailgun, Brevo, SES): mail sent directly from a VPS usually lands in spam.

## 3. Add Telegram {#telegram}

```flow
@BotFather | /newbot → bot token
> In Telegram, open @BotFather, send `/newbot`, choose a name. It answers with the bot token.
Your chat | send /start to the bot
> Open a chat with your new bot (or add it to a group) and send `/start`. Bots can't write to you first.
getUpdates | read the chat id
> Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and copy `chat.id`. Group ids are negative.
cipi notification add | token + chat id
> On the server: `sudo cipi notification add telegram oncall --token=<token> --chat-id=<id>`, then `sudo cipi notification test oncall`.
```

1. In Telegram, open **@BotFather**, send `/newbot`, pick a name. Copy the **token**.
2. Send `/start` to your new bot (or add it to a group and write something there).
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and copy `chat.id` (groups have negative ids).
4. Add the channel:

```bash
$ sudo cipi notification add telegram oncall --token=<bot-token> --chat-id=<id>
```

## 4. Add Slack (or Mattermost, Google Chat, Discord) {#slack}

Create an **incoming webhook** for the channel (Slack: Apps → Incoming Webhooks), then:

```bash
$ sudo cipi notification add slack ops --url=https://hooks.slack.com/services/…
```

## 5. Test everything {#test}

<cipi-term name="notifications"></cipi-term>

```bash
$ sudo cipi notification              # channels and triggers, no secrets shown
$ sudo cipi notification test all
```

## 6. Decide what's worth an alert {#triggers}

Everything is on by default. Mute what you don't act on:

```bash
$ sudo cipi notification triggers
$ sudo cipi notification triggers disable monitor_load
$ sudo cipi notification triggers disable deploy_success
```

| Category | Events | Keep on? |
| --- | --- | --- |
| Deploy | `deploy_fail`, `deploy_rollback`, `deploy_health_fail`, `deploy_snapshot_fail` | **Yes** |
| | `deploy_success` | Optional: noisy with many pushes |
| Health & monitor | `health_fail`, `monitor_disk`, `monitor_ssl`, `monitor_services`, `monitor_workers`, `monitor_http_5xx` | **Yes** |
| | `monitor_load`, `monitor_ok` | Optional |
| Backups & cron | `backup_fail`, `backup_stale`, `cron_fail` | **Yes** |
| Security | `ssh_login`, `sudo`, `su`, `ssh_key_*` | **Yes** if few people log in |
| Apps & config | `app_create`, `alias_*`, `yml_apply`, `yml_fail` | Useful for teams |
| Updates | `php_upgrade`, `nginx_upgrade`, `pending_report` | Useful as a weekly record |

> [!tip] A good rule: if nobody would do anything after reading it, mute it. Alerts you ignore train you to ignore the ones that matter.

## 7. Signed webhooks for your own automation {#webhook}

A webhook channel posts JSON (`server`, `trigger`, `subject`, `body`, `ts`). With a secret, each request carries `X-Cipi-Signature: sha256=…`. Verify it before trusting the payload, for example in a Laravel route:

```php
Route::post('/hooks/cipi', function (Request $request) {
    $expected = 'sha256='.hash_hmac('sha256', $request->getContent(), config('services.cipi.secret'));
    abort_unless(hash_equals($expected, (string) $request->header('X-Cipi-Signature')), 401);

    $event = $request->json()->all();       // server, trigger, subject, body, ts
    if (in_array($event['trigger'], ['deploy_fail', 'backup_fail', 'health_fail'])) {
        // page the on-call person, open a ticket…
    }
    return response()->noContent();
});
```

```bash
$ sudo cipi notification add webhook router --url=https://ops.example.com/hooks/cipi --secret=…
```

This is also how you route: urgent triggers to a phone, the rest to a channel.

## 8. Alerts for your own cron jobs {#cron}

Wrap a job in a root cron file with `cipi-cron-notify <label> <command…>`:

```text
# /etc/cron.d/shop-reports
0 4 * * * root /usr/local/bin/cipi-cron-notify daily-report sudo -u shop php /home/shop/current/artisan report:daily
```

A non-zero exit sends `cron_fail` with the label and the output, through the same channels. Cipi wraps its own nightly jobs the same way.

## A setup that works for small teams {#recipe}

```stack
E-mail | everything, searchable record
Telegram group "ops" | deploy_fail, backup_*, health/monitor, security
Muted | deploy_success, monitor_load, monitor_ok
Weekly | read pending_report and update notes
```

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Telegram test doesn't arrive | Wrong chat id (groups are negative), or you never sent `/start` to the bot |
| E-mail in spam | Use a provider; add SPF and DKIM for the `--from` domain |
| Slack 404 | The webhook was revoked: create a new one and `cipi notification add` again |
| Too many messages | Disable noisy triggers (step 6) |
| Need history | `sudo tail -f /var/log/cipi/events.log` |

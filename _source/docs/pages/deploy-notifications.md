@section deploy-notifications

Know about every deploy, success or failure, without watching logs. The simplest way is the server itself: it notifies for **every** trigger, webhook deploys included — on every channel that takes them since 5.15.0 (before, a deploy through the webhook reached e-mail only).

## From the server (recommended) {#server}

```bash
$ cipi notification add slack ops --url=https://hooks.slack.com/services/…
$ cipi notification add telegram team --token=<bot-token> --chat-id=<chat-id>
$ cipi notification test
$ cipi notification events team deploy        # 5.15.0: only deploys to the team's chat
```

| Event | Sent when |
| --- | --- |
| `deploy_success` | After the post-deploy health check passes |
| `deploy_fail` | The deploy failed; the live release is unchanged |
| `deploy_rollback` | A rollback ran (manual or automatic) |

Messages include app, branch, release, commit and author, duration and health verdict. Channels: email (SMTP, Resend, SES), Slack, Discord, Mattermost, Google Chat, Telegram, ntfy, Pushover, signed webhook. See [Notifications](/docs/notifications).

## From CI {#ci}

When the message should come from the pipeline (with the CI run link), add a step after `cipi deploy`:

```yaml
# GitHub Actions, after the deploy step
      - name: Notify Slack
        if: always()
        run: |
          STATUS=${{ job.status == 'success' && '✅ deployed' || '❌ FAILED' }}
          curl -s -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" -H 'Content-Type: application/json' \
            -d "{\"text\":\"*myapp* $STATUS · ${{ github.ref_name }} by ${{ github.actor }}\"}"
```

```yaml
# GitLab CI
deploy:
  script:
    - ssh cipi@$SERVER_HOST "sudo cipi deploy myapp" && R="✅ deployed" || R="❌ FAILED"
    - curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" -d chat_id="$TELEGRAM_CHAT_ID" -d text="myapp $R on $CI_COMMIT_REF_NAME"
    - '[ "$R" = "✅ deployed" ] || exit 1'   # a failed deploy published nothing: no rollback needed
```

> [!tip] Telegram chat ID: add the bot to the group, open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `chat.id`.

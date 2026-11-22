@section cli-schedule

Every Laravel app runs `schedule:run` every minute, as its own user, with its own PHP version. You only turn it on or off.

```bash
$ cipi schedule status myapp
$ cipi schedule off myapp
$ cipi schedule on myapp
```

@section cli-app-cron

## Your own cron jobs {#user-crontab}

The scheduler lives in the app user's crontab, next to any job you add. Edit it as the app user, so jobs run with the app's permissions:

```bash
$ su - myapp
$ crontab -e
```

```bash
# Laravel scheduler (managed by Cipi, keep it)
* * * * * /usr/bin/php8.6 /home/myapp/current/artisan schedule:run >> /dev/null 2>&1
# your job, every 15 minutes
*/15 * * * * /home/myapp/current/scripts/sync.sh >> /home/myapp/logs/sync.log 2>&1
```

| Rule | Why |
| --- | --- |
| Keep the `schedule:run` line | If removed, `cipi schedule on myapp` puts it back |
| Write only inside `/home/myapp` | Jobs have the app's permissions, nothing more |
| Prefer Laravel's scheduler | Jobs stay in code, deployed and versioned with the app |
| Root jobs go in root's crontab | Never give an app more rights than it needs |

## Check it runs {#check}

```bash
$ cipi app artisan myapp schedule:list
$ grep CRON /var/log/syslog | grep myapp | tail -20
```

@section cli-app-ssh

Each app is its own Linux user. Log in as that user to inspect files, run scripts or connect an SFTP client, with exactly the app's permissions.

| Path | Use |
| --- | --- |
| `ssh myapp@server` | SFTP, IDE remote sessions, terminal. Password from the creation summary |
| `ssh cipi@server` → `su root` → `su - myapp` | Admin path, when app logins are disabled |

```bash
$ ssh myapp@your-server-ip
myapp@server:~$ cd ~/current
myapp@server:~$ php artisan about
myapp@server:~$ tail -f ~/logs/*.log
myapp@server:~$ ll ~/releases/
```

The app's shell has `ll`, `deploy` and `composer` shortcuts.

## Control access {#access}

```bash
$ cipi app reset-password myapp           # new password, shown once
$ cipi ssh apps disable myapp             # no password logins for this app
$ cipi ssh apps disable --all             # for every app, present and future
```

Disabling app logins does not affect deploys or the admin path. See [SSH keys](/docs/ssh-keys#cli-ssh-apps).

> [!note] `open_basedir` confines the app's PHP to `/home/myapp`. Your shell session follows normal file permissions instead.

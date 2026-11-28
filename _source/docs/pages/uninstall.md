@section uninstall

Cipi changes a server deeply (users, SSH, firewall, packages, repositories), so there is no `uninstall` command. **The clean way out is a fresh server**: move the apps elsewhere with [cipi sync](/docs/sync) or your backups, then destroy the VPS. The steps below exist for when you must keep the machine.

> [!warning] This deletes every app, database, certificate and configuration Cipi manages. Back up first ([Backups](/docs/backups)). It cannot be undone.

```flow
Back up | before anything
Remove apps | one by one | #apps
Remove Cipi | CLI and services | #cipi
Purge packages | stack and repositories | #packages
SSH & firewall | last | #ssh
```

## 1. Apps {#apps}

```bash
$ grep cipi-apps /etc/group                     # list app users
# for each APP:
$ supervisorctl stop "APP:*"
$ rm -f /etc/supervisor/conf.d/APP.conf /etc/nginx/sites-{enabled,available}/APP \
        /etc/php/*/fpm/pool.d/APP.conf /etc/sudoers.d/cipi-APP*
$ mysql -e "DROP DATABASE IF EXISTS APP; DROP USER IF EXISTS 'APP'@'localhost';"
$ userdel -r APP
```

## 2. Cipi itself {#cipi}

```bash
$ sudo cipi package list                        # optional packages: remove the installed ones first,
$ sudo cipi package remove <id> --yes           # with their links in /usr/local/bin and their apt packages
$ systemctl disable --now cipi-queue 2>/dev/null; rm -f /etc/systemd/system/cipi-queue.service
$ userdel -r cipi; groupdel cipi-ssh; groupdel cipi-apps
$ rm -rf /opt/cipi /etc/cipi /var/log/cipi /usr/local/bin/cipi*
$ rm -f /etc/sudoers.d/cipi-* /etc/logrotate.d/cipi-* /etc/apt/apt.conf.d/*cipi* \
        /etc/profile.d/cipi-* /etc/mysql/mariadb.conf.d/99-cipi.cnf /etc/php/*/*/conf.d/99-cipi.ini
$ crontab -e                                    # remove the Cipi block
```

## 3. Packages and repositories (optional) {#packages}

```bash
$ systemctl stop nginx mariadb valkey-server fail2ban supervisor 'php*-fpm'
$ apt purge -y 'nginx*' mariadb-server mariadb-client valkey-server fail2ban supervisor certbot 'php8.*' nodejs
$ apt autoremove -y
$ rm -f /etc/apt/sources.list.d/{php-sury,mariadb,nodesource}.list && apt update
$ rm -f /usr/local/bin/composer /usr/local/bin/dep
$ swapoff /var/swap.1 && rm -f /var/swap.1 && sed -i '/swap\.1/d' /etc/fstab
```

## 4. SSH and firewall (last) {#ssh}

Do this from a console session, not over SSH, so a mistake can't lock you out:

```bash
$ sed -i '/cipi-auth-notify/d' /etc/pam.d/sshd /etc/pam.d/sudo
$ nano /etc/ssh/sshd_config        # review PermitRootLogin / PasswordAuthentication
$ systemctl restart ssh
$ ufw disable && ufw reset
```

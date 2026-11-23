@section cipi-vault

Every configuration file holding a secret (database passwords, API tokens, Git tokens, SMTP credentials, backup settings) is **encrypted at rest with AES-256**. A copy of `/etc/cipi` alone is useless without the key.

| Piece | Detail |
| --- | --- |
| Master key | Generated at install, `/etc/cipi/.vault_key`, root-only (`400`) |
| Encrypted files | `server.json`, `apps.json`, `databases.json`, `backup.json`, `smtp.json`, `api.json`, alert channels, Git tokens |
| Cipher | `openssl enc -aes-256-cbc -salt -pbkdf2` |
| Public projection | `apps-public.json` holds only non-secret fields (domains, PHP, branch) for the panel API, so the key stays root-only |

```flow
Export (sync) | decrypt with this server's key
> When you export apps with `cipi sync`, their secrets are decrypted with this server's vault key.
Archive | encrypted with your passphrase
> The archive is encrypted with a passphrase you choose, so it's safe in transit and at rest.
Import | decrypt with the passphrase
> On the new server, the passphrase decrypts the archive.
Store | re-encrypted with the new server's key
> The secrets are encrypted again with the new server's own vault key. Keys never travel inside the data they protect.
```

Backups use their own key (`cipi backup key show`); sync archives use your passphrase. Keys never travel inside the data they protect.

> [!warning] Lose the vault key and the encrypted configs can't be read. Back it up with your server credentials (`cipi credentials export` lists the backup key; copy `.vault_key` to your password manager).

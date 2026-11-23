@section agent-yml

The agent ships **the same parser and validator as the server**, so you get the server's verdict, with the same error messages, on your laptop and in CI, before you push. Plus a generator that writes a first `cipi.yml` from your Laravel code.

```bash
$ php artisan cipi:yml validate [--json] [--strict]   # exit 1 on errors
$ php artisan cipi:yml show                            # normalized, with server defaults
$ php artisan cipi:yml generate --write                # inferred from this app
$ php artisan cipi:yml example --write                 # commented template
$ php artisan cipi:yml schema --write                  # JSON Schema for your editor
```

```flow
Generate | from your code | #generate
Validate | locally and in CI | #validate
Edit | with schema autocompletion | #editor
Ask your assistant | validate drafts over MCP | #assistant
```

## Generate from your app {#generate}

`cipi:yml generate` reads the code and proposes a file the server will accept:

| Detected | Becomes |
| --- | --- |
| `laravel/horizon` or `QUEUE_CONNECTION` | `workers.horizon` or `workers.queues` |
| `laravel/reverb` | `workers.reverb: true` |
| Scout with Meilisearch | `search: true` |
| Scheduled tasks | `schedule: true` |
| `/up` health route | `health.url` |
| `CIPI_PHP_VERSION` | `app.php` |
| Credential-looking keys in `.env.example` | `env.required` |

## Validate in CI {#validate}

```bash
$ php artisan cipi:yml validate
INFO cipi.yml is valid (/var/www/shop/cipi.yml)
WARN env.required: STRIPE_KEY is not set in .env — the server blocks the plan while it is missing
```

```yaml
# .github/workflows/ci.yml (step)
      - run: php artisan cipi:yml validate --json --app=shop
```

Every server rule applies: unknown keys, bounds, namespaces for databases and backup profiles, allowlisted runners in `deploy.post`. Outside the server, pass the app name with `--app=` (on the server it's read from `CIPI_APP_USER`). The validator picks `cipi-<env>.yml` first, like the server.

## Editor support {#editor}

```yaml
# yaml-language-server: $schema=./cipi.schema.json
version: 1
```

Completion and inline errors as you type in VS Code, PhpStorm or any YAML language server.

## From your AI assistant {#assistant}

The MCP `cipi_yml` tool validates a draft passed as `content`, so an assistant can propose a change and hand you a file the server accepts, without writing to your repository. `env_check` lists the `env.required` names missing on the server (never values).

> [!tip] Keep `cipi/agent` up to date: when Cipi learns a new `cipi.yml` key, the agent's validator learns it in the matching release. Until then the server's verdict wins.

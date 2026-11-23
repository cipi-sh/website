---
title: Add Laravel security checks (SAST) to CI with Checkpoint
description: Install Checkpoint, a free Laravel security scanner, run its 33 checks locally, read PASS, WARN and FAIL results, accept known findings, and block risky code in GitHub Actions or GitLab CI before Cipi deploys it, step by step.
category: security
order: 5
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel sast, laravel security scanner ci, checkpoint laravel, laravel security github actions, composer audit ci laravel, laravel static analysis security
docs:
  - ci-pipelines
  - safe-deploy
  - auto-deploy
related:
  - hackly-security-scanning
  - laravel-ci-cd-git-workflow
  - laravel-security-checklist
faq:
  - What is Checkpoint? | A free (MIT) Composer package by Andrea Pollastri that scans a Laravel project for common security mistakes and vulnerable dependencies in seconds: 33 checks from SQL injection risks to CORS, CSRF, secrets and EOL versions.
  - Is it a full SAST tool? | No, and it says so: most code checks are fast pattern matches, focused on Laravel. Expect some false positives and misses. It's a quick gate; pair it with deeper scanning such as [Hackly](/guides/hackly-security-scanning).
  - Which versions? | PHP 8.1 to 8.6, Laravel 8 to 13.
  - Will it block my deploy? | Only if you make it: in CI, a FAIL exits with code 1 and stops the pipeline before the deploy step. Warnings pass unless you add `--fail-on-warn`.
  - How do I silence a false positive? | Copy its hash (shown next to the finding) into `suppressed` in `config/checkpoint.php`. Review that list now and then.
  - Does it check production settings? | Environment checks read the config of the process running Artisan. In CI that's the CI environment, not production. Check production's `.env` separately (`cipi app env shop --get=APP_DEBUG`).
  - Can I add my own checks? | Yes: extend `AbstractCheck`, return a `CheckResult`, and register the class in `extra_checks`.
---
Most security bugs in Laravel apps are small and repeated: a `whereRaw` with a variable, `$guarded = []`, `{!! $input !!}` in a view, a forgotten `dd()`, a dependency with a known CVE. [Checkpoint](https://checkpoint.web.ap.it) finds them in seconds, on your laptop and in CI, so they never reach the server.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **SAST** | Static analysis: reading code (not running it) to find risky patterns |
| **CVE** | A publicly known vulnerability in a package or program |
| **CI** | The pipeline that runs on every push (GitHub Actions, GitLab CI) |
| **Gate** | A step that stops the pipeline when something is wrong |
| **Suppression** | Accepting one specific finding on purpose, by its hash |

```flow
Write code | on your laptop
> You run `php artisan checkpoint:scan` before committing, like a test.
Push | to GitHub or GitLab
> The pipeline starts.
Checkpoint | in CI
> The same scan runs in CI. A FAIL exits with code 1 and the pipeline stops: nothing is deployed.
Deploy | only if clean
> If the scan (and your tests) pass, the pipeline deploys with Cipi ([CI/CD guide](/guides/laravel-ci-cd-git-workflow)).
```

## Before you start {#before}

- A Laravel project (8 to 13) on PHP 8.1 or newer.
- For the CI part: a repository on GitHub or GitLab, deployed with Cipi.

## 1. Install {#install}

```bash
$ composer require --dev andreapollastri/checkpoint
```

`--dev` because it's a development tool: it's not installed on production (Cipi deploys with `--no-dev`).

## 2. Run it {#run}

<cipi-term name="checkpoint"></cipi-term>

```bash
$ php artisan checkpoint:scan
```

Each check prints **PASS**, **WARN** or **FAIL**, with the file and line and a short hash in brackets.

| Result | Meaning | Do |
| --- | --- | --- |
| PASS | Nothing found | Nothing |
| WARN | Possibly risky, needs a human look | Review; fix or suppress |
| FAIL | Likely a real problem | Fix before deploying |

Useful options:

```bash
$ php artisan checkpoint:scan --only="SQL Injection Risks,CSRF Protection"
$ php artisan checkpoint:scan --skip="NPM CVE Audit"
$ php artisan checkpoint:scan --fail-on-warn
$ php artisan checkpoint:scan --json | tee checkpoint-report.json
```

## 3. What it checks {#checks}

| Area | Checks |
| --- | --- |
| Dependencies | Composer CVE audit, npm CVE audit, PHP CVE audit, outdated and abandoned packages, package freshness (supply chain), supply-chain tooling, Composer configuration, suspicious vendor autoload |
| Configuration | Environment (`APP_DEBUG`, `APP_KEY`…), `.gitignore` for sensitive files, file permissions, CORS, session and cookie security, PHP `php.ini`, EOL versions, public directory exposure |
| Code | SQL injection, mass assignment, XSS, CSRF, open redirect, command injection, insecure deserialization, SSRF, TLS verification turned off, path traversal, weak cryptography, insecure random numbers, XXE, hardcoded secrets, debug functions, sensitive data exposure |

## 4. Fix the classic ones {#fix}

| Finding | Risky | Safer |
| --- | --- | --- |
| SQL injection | `->whereRaw("total > $min")` | `->whereRaw('total > ?', [$min])` or `->where('total', '>', $min)` |
| Mass assignment | `protected $guarded = [];` | `protected $fillable = ['name', 'email'];` |
| XSS | `{!! $comment->body !!}` | `{{ $comment->body }}`, or sanitize HTML first |
| Open redirect | `redirect($request->input('next'))` | `redirect()->intended('/dashboard')` or an allowlist |
| SSRF | `Http::get($request->url)` | Validate the host against an allowlist |
| TLS off | `Http::withoutVerifying()` | Remove it; fix the certificate instead |
| Debug left | `dd($order)` in a controller | Remove it; use logs |

## 5. Accept a finding on purpose {#suppress}

Sometimes a pattern is fine (a `whereRaw` with a constant, for example). Publish the config and add the finding's hash:

```bash
$ php artisan vendor:publish --tag=checkpoint-config
```

```php
// config/checkpoint.php
'suppressed' => [
    '7d02be', // ReportController: whereRaw with a constant, reviewed 2026-11
],
'exclude_paths' => ['legacy/'],
```

Leave a comment with each hash so the next person knows why.

## 6. Block risky code in CI {#ci}

GitHub Actions, generated for you:

```bash
$ php artisan checkpoint:github       # writes .github/workflows/checkpoint.yml
```

It runs on pushes to `main`/`master` and on pull requests, installs dependencies, runs the scan and uploads `checkpoint-report.json` as an artifact. GitLab: `php artisan checkpoint:gitlab`.

To make it a **gate** before your Cipi deploy, put the scan in the same workflow, before the deploy job:

```yaml
jobs:
  checkpoint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: '8.5', coverage: none }
      - run: composer install --prefer-dist --no-progress --no-interaction
      - run: php artisan checkpoint:scan
  deploy:
    needs: checkpoint                  # runs only if the scan passed
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: cipi
          key: ${{ secrets.CI_SSH_KEY }}
          script: "sudo cipi deploy shop && { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors https://shop.example.com/up >/dev/null || { sudo cipi deploy shop --rollback; exit 1; }; }"
```

Turn off the app's push webhook so only the pipeline deploys ([CI/CD guide](/guides/laravel-ci-cd-git-workflow)).

## 7. Also on every composer install (optional) {#hooks}

```bash
$ php artisan checkpoint:install-hooks       # adds the scan to post-install/post-update
$ php artisan checkpoint:install-hooks --remove
```

## Checkpoint, Hackly and Cipi together {#together}

| Layer | Tool | When |
| --- | --- | --- |
| Your code, before deploy | Checkpoint | Every push |
| Your running sites and repositories | [Hackly](/guides/hackly-security-scanning) | Weekly, before releases |
| The server | Cipi | Every night: PHP patches, services, firewall, integrity scans |

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Composer/npm audit says it can't run | Install the tool in CI, or skip that check with `--skip` |
| Environment check fails in CI | It reads CI's environment: set `APP_DEBUG=false` there, or skip it in CI |
| Too many WARNs on old code | Fix FAILs first; suppress reviewed WARNs by hash; tighten with `--fail-on-warn` later |
| Package freshness FAIL | A dependency was released in the last 3 days: wait, or whitelist it in `package_freshness` |
| Pipeline passes but deploys anyway on push | The webhook is still on: remove it from the repository |

---
title: Spec-driven development with AI agents in Laravel
description: Write the spec first, let an agent implement it against tests, and close the loop on production through MCP, with guardrails that keep data and deploys safe.
category: agent
order: 6
published: 2026-05-06
updated: 2026-11-23
keywords: spec driven development ai, ai agents laravel, mcp laravel workflow, claude code laravel workflow
related:
  - cipi-mcp-ai-agents
  - anonymized-database-dumps
  - laravel-ci-cd-git-workflow
---
AI coding agents are good at implementing a clear, testable specification and bad at guessing what you meant. The teams getting value write the spec first, keep the agent inside guardrails, and give it eyes on production through MCP.

```flow
Spec | what and why, acceptance criteria | #spec
Tests | written from the spec | #tests
Agent | implements until tests pass
Review | a human, on a preview URL | #review
Production | deploy, then observe through MCP | #production
```

## 1. Write the spec, not the prompt {#spec}
| A good spec has | Example |
| --- | --- |
| The user and the problem | "Accountants can't find unpaid invoices quickly" |
| Acceptance criteria | "Filter by status and due date; overdue rows highlighted" |
| Constraints | "No new tables; reuse `invoices.paid_at`" |
| Out of scope | "No export in this iteration" |

Tools like [Larapilot](https://larapilot.web.ap.it/) structure this with personas and review steps on top of Laravel Boost.

## 2. Tests before code {#tests}
Ask the agent to write Pest tests from the acceptance criteria first, review them, then let it implement until they pass. The tests are the contract.

## 3. Review on a real URL {#review}
Push the branch and get a [preview environment](/guides/laravel-preview-environments). Reviewers click instead of pulling code; seed it with an [anonymized dump](/guides/anonymized-database-dumps) so edge cases from real data show up.

## 4. Close the loop on production {#production}
After the deploy, the same assistant can check the result through the [Cipi MCP](/guides/cipi-mcp-ai-agents):

```text
You:    Did the invoices release go out cleanly? Any new errors since?
Claude: [deploy_status] Release 134 live, 58 s, from the pipeline.
        [logs level=error since=deploy] None.
```

## Guardrails that matter

| Risk | Guardrail |
| --- | --- |
| Agent runs destructive SQL | MCP SQL guard blocks DDL and multi-statements; `CIPI_MCP_DB_WRITE=false` |
| Agent sees personal data | Redaction in outputs; anonymized dumps for experiments |
| Agent deploys untested code | Deploy only through CI with tests; the MCP `deploy` tool records who asked |
| Server config drifts | `cipi.yml` changes go through pull requests like code |

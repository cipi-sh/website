#!/usr/bin/env python3
"""Render 1200x630 Open Graph images into img/og/ (needs Playwright + Chrome; not part of the stdlib build).

Usage: python3 scripts/og.py [--force]
Then rebuild: python3 scripts/build.py && python3 scripts/content.py
"""
from __future__ import annotations
import asyncio, html, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B  # noqa
import content as C  # noqa

OUT = os.path.join(B.ROOT, "img", "og")
FORCE = "--force" in sys.argv
MARK = '<svg viewBox="0 0 64 64" width="56" height="56"><rect x="2" y="2" width="28" height="28" fill="#F2F4F1"/><rect x="34" y="2" width="28" height="28" fill="#84CC16"/><rect x="2" y="34" width="28" height="28" fill="#F2F4F1"/><rect x="34" y="34" width="28" height="28" fill="#F2F4F1"/><path d="M40 9l7 7-7 7" fill="none" stroke="#14201A" stroke-width="4"/><rect x="49" y="20" width="8" height="4" fill="#14201A"/></svg>'


def tpl(kicker: str, title: str, sub: str, url: str) -> str:
    size = 76 if len(title) < 34 else 64 if len(title) < 56 else 54
    cells = "".join(f'<i style="opacity:{o}"></i>' for o in (1, .5, .25, .5, .85, .3, .6, .2, .4))
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:S;src:local('Schibsted Grotesk'),local('Inter'),local('Helvetica Neue'),local('Arial')}}
*{{margin:0;box-sizing:border-box}}
body{{width:1200px;height:630px;background:#0D1310;color:#F2F4F1;font-family:'Schibsted Grotesk',Inter,'Helvetica Neue',Arial,sans-serif;position:relative;overflow:hidden}}
.g{{position:absolute;right:-40px;top:-40px;display:grid;grid-template-columns:repeat(3,120px);gap:14px;transform:rotate(8deg)}}
.g i{{display:block;width:120px;height:120px;border-radius:14px;background:#84CC16}}
.w{{position:absolute;inset:60px 72px 88px;display:flex;flex-direction:column}}
.b{{display:flex;align-items:center;gap:16px;font-size:40px;font-weight:800;letter-spacing:-.02em}}
.k{{margin-top:auto;display:inline-block;align-self:flex-start;padding:8px 16px;border-radius:999px;background:#84CC16;color:#14201A;font-size:24px;font-weight:700}}
h1{{margin-top:22px;max-width:900px;font-size:{size}px;line-height:1.04;letter-spacing:-.03em;font-weight:800}}
p{{margin-top:20px;max-width:860px;font-size:26px;line-height:1.35;color:#B7C4BC}}
.u{{position:absolute;left:72px;bottom:40px;font:500 22px ui-monospace,Menlo,monospace;color:#84CC16}}
</style></head><body><div class="g">{cells}</div><div class="w"><div class="b">{MARK}cipi</div>
<span class="k">{html.escape(kicker)}</span><h1>{html.escape(title)}</h1><p>{html.escape(sub)}</p></div><div class="u">{html.escape(url)}</div></body></html>"""


def jobs() -> list[tuple[str, str]]:
    out = []
    short = lambda s, n=125: s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + "…"
    for g in C.load_guides():
        out.append(("guide-" + g["slug"], tpl(C.CAT_NAME.get(g.get("category", ""), "Guide"), g["title"], short(g["description"]), f"cipi.sh/guides/{g['slug']}")))
    for c in C.load_compare():
        out.append(("vs-" + c["slug"], tpl("Compare", c["title"], short(c.get("lead") or c["description"]), "cipi.sh" + c["path"])))
    nav = json.loads(B.read(B.SRC, "docs", "nav.json"))
    for g in nav["groups"]:
        for p in g["pages"]:
            out.append(("docs-" + p["slug"], tpl("Docs · " + g["title"], p["title"], short(p.get("desc", "")), f"cipi.sh/docs/{p['slug']}")))
        out.append(("docs-" + g["landing"], tpl("Docs", g["title"], short(g.get("desc", "") or "Cipi documentation"), f"cipi.sh/docs/{g['landing']}")))
    out.append(("home", tpl("Free · open source · self-hosted", "Deploy Laravel to servers you own.", "Zero-downtime deploys, queues, SSL, backups, cipi.yml and MCP on any Ubuntu VPS. No subscription.", "cipi.sh")))
    out.append(("docs", tpl("Documentation", "Cipi documentation", "Install, deploy, domains, backups, security, the web panel, the API and MCP.", "cipi.sh/docs")))
    out.append(("guides", tpl("Guides", "Laravel and PHP on your own server", "Step-by-step guides: providers, Octane, Reverb, cipi.yml, MCP, security, WordPress and more.", "cipi.sh/guides")))
    out.append(("alternatives", tpl("Compare", "Cipi vs Forge, Ploi, Vito Deploy and more", "Honest comparisons: price, where it runs, and when the other tool wins.", "cipi.sh/alternatives")))
    out.append(("web-panel", tpl("Web panel", "Your whole fleet, in the browser", "A free, self-hosted panel for every Cipi server: deploys, databases, backups, roles and SSO.", "cipi.sh/web-panel")))
    out.append(("api", tpl("REST API", "Every server, scriptable", "Apps, deploys, SSL, databases and cipi.yml from CI, the SDK, cipi-cli or an AI assistant.", "cipi.sh/api")))
    out.append(("mcp", tpl("MCP for AI", "Ask production. Get real answers.", "Claude, Cursor and VS Code on your live Laravel apps, with guardrails.", "cipi.sh/mcp")))
    out.append(("ecosystem", tpl("Ecosystem", "One core. Every way in.", "Core, cipi.yml, Agent, MCP, REST API, web panel, cipi-cli, PHP SDK and WHMCS.", "cipi.sh/ecosystem")))
    out.append(("cipi-yml", tpl("Configuration as code", "cipi.yml: server settings in your repository", "Planned, reviewed in pull requests, applied all or nothing.", "cipi.sh/cipi-yml")))
    return out


async def main() -> None:
    from playwright.async_api import async_playwright
    os.makedirs(OUT, exist_ok=True)
    todo = [(k, h) for k, h in jobs() if FORCE or not os.path.exists(os.path.join(OUT, k + ".jpg"))]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 1200, "height": 630})
        for k, h in todo:
            await pg.set_content(h)
            await pg.screenshot(path=os.path.join(OUT, k + ".jpg"), type="jpeg", quality=82)
        await b.close()
    print(f"og: {len(todo)} images")


if __name__ == "__main__":
    asyncio.run(main())

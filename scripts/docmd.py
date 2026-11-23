"""Tiny Markdown dialect for the docs (stdlib only). See README for the syntax."""
from __future__ import annotations

import html
import re

ICONS = {
    "info": '<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    "warning": '<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    "success": '<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
}
KINDS = {"note": "info", "info": "info", "warning": "warning", "tip": "success", "security": "success"}


def esc(s: str) -> str:
    return html.escape(s, quote=False)


def inline(s: str) -> str:
    codes: list[str] = []

    def keep(m: re.Match) -> str:
        codes.append("<code>" + esc(m.group(1)) + "</code>")
        return f"\x00{len(codes) - 1}\x00"

    s = re.sub(r"`([^`]+)`", keep, s)
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"<em>\1</em>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', s)
    s = re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], s)
    return s


def code_block(lang: str, lines: list[str]) -> str:
    out = []
    for ln in lines:
        if lang in ("bash", "sh", "shell", ""):
            if ln.startswith("$ "):
                cmd = ln[2:]
                m = re.match(r"^(.*?)(\s{2,}#.*)$", cmd)
                if m:
                    out.append('<span class="p"></span>' + esc(m.group(1)) + '<span class="c">' + esc(m.group(2)) + "</span>")
                else:
                    out.append('<span class="p"></span>' + esc(cmd))
            elif ln.lstrip().startswith("#"):
                out.append('<span class="c">' + esc(ln) + "</span>")
            else:
                out.append(esc(ln))
        else:
            m = re.match(r"^(\s*)(#|//|;)(.*)$", ln)
            if m and lang in ("yaml", "yml", "ini", "nginx", "env", "php", "js", "json", "text", "conf"):
                out.append(esc(m.group(1)) + '<span class="c">' + esc(m.group(2) + m.group(3)) + "</span>")
            else:
                out.append(esc(ln))
    label = {"": "bash", "sh": "bash", "yml": "yaml"}.get(lang, lang)
    return ('<div class="code-block"><div class="code-block-header"><span class="code-block-lang">' + esc(label) +
            '</span><button class="code-copy-btn" type="button">Copy</button></div><pre>' + "\n".join(out) + "</pre></div>")


def flow(lines: list[str], kind: str = "flow") -> str:
    """```flow / ```stack. A step is `Title | subtitle | #anchor`; lines starting
    with `>` explain the step above them. Anchors make a sticky map of the
    page; explanations make a clickable step-by-step explainer."""
    parsed = []  # [title, sub, anchor, [explanation lines]]
    for ln in lines:
        st = ln.strip()
        if not st:
            continue
        if st.startswith(">") and parsed:
            parsed[-1][3].append(st[1:].strip())
            continue
        parts = [x.strip() for x in st.split("|")]
        anchor = parts[2] if len(parts) > 2 and parts[2].startswith("#") else ""
        parsed.append([parts[0], parts[1] if len(parts) > 1 else "", anchor, []])
    if kind == "flow" and any(p[2] for p in parsed):
        lis = []
        for title, sub, anchor, _ in parsed:
            inner = f'<b>{inline(title)}</b>' + (f'<span>{inline(sub)}</span>' if sub else "")
            lis.append(f'<li><a href="{anchor}">{inner}</a></li>' if anchor else f'<li><div>{inner}</div></li>')
        return '<nav class="flow-nav" aria-label="Steps on this page"><ol>' + "".join(lis) + "</ol></nav>"
    if any(p[3] for p in parsed):
        n = len(parsed)
        tabs, panes = [], []
        for i, (title, sub, _, ex) in enumerate(parsed):
            sel = "true" if i == 0 else "false"
            tabs.append(f'<li><button type="button" role="tab" aria-selected="{sel}" data-i="{i}">'
                        f'<b>{inline(title)}</b>' + (f'<span>{inline(sub)}</span>' if sub else "") + '</button></li>')
            body = "".join(f"<p>{inline(x)}</p>" for x in ex) or f"<p>{inline(sub)}</p>"
            hidden = "" if i == 0 else " hidden"
            panes.append(f'<div class="fx-pane" role="tabpanel" data-i="{i}"{hidden}>'
                         f'<div class="fx-head"><span class="fx-n">Step {i + 1} of {n}</span><b>{inline(title)}</b></div>{body}</div>')
        cls = "flow fx-steps" if kind == "flow" else "flow stack fx-steps"
        return (f'<div class="fx" data-fx><ol class="{cls}" role="tablist">' + "".join(tabs) + "</ol>"
                '<div class="fx-panel">' + "".join(panes) +
                '<div class="fx-nav"><button type="button" class="fx-prev" data-fx-prev>Previous</button>'
                '<button type="button" class="fx-next" data-fx-next>Next step</button></div></div></div>')
    items = [f'<li><b>{inline(t)}</b>' + (f'<span>{inline(s_)}</span>' if s_ else "") + "</li>" for t, s_, _, _ in parsed]
    cls = "flow" if kind == "flow" else "flow stack"
    tag = "ol" if kind == "flow" else "ul"
    return f'<{tag} class="{cls}">' + "".join(items) + f"</{tag}>"


def table(rows: list[str]) -> str:
    cells = [[c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", r.strip().strip("|"))] for r in rows]
    head, body = cells[0], [r for r in cells[2:]]
    h = "".join(f"<th>{inline(c)}</th>" for c in head)
    b = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body)
    return f'<div class="table-scroll"><table class="cmd-table"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'


def heading(level: int, text: str) -> str:
    m = re.match(r"^(.*?)\s*\{#([\w-]+)\}\s*$", text)
    if m:
        return f'<h{level} id="{m.group(2)}">{inline(m.group(1))}</h{level}>'
    return f"<h{level}>{inline(text)}</h{level}>"


def render(src: str) -> str:
    lines = src.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    i, n = 0, len(lines)
    section_open = False
    para: list[str] = []

    def flush() -> None:
        if para:
            out.append("<p>" + inline(" ".join(x.strip() for x in para)) + "</p>")
            para.clear()

    while i < n:
        ln = lines[i]
        s = ln.strip()
        if not s:
            flush(); i += 1; continue
        if s.startswith("@section "):
            flush()
            if section_open:
                out.append("</section>")
            out.append(f'<section class="doc-section" id="{s.split()[1]}">')
            section_open = True
            i += 1; continue
        if s.startswith("```"):
            flush()
            lang = s[3:].strip()
            block = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                block.append(lines[i]); i += 1
            i += 1
            if lang in ("flow", "stack"):
                out.append(flow(block, lang))
            elif lang == "tree":
                out.append('<div class="tree-block"><pre>' + "\n".join(
                    re.sub(r"(#.*)$", r'<span class="tree-comment">\1</span>', esc(b)) for b in block) + "</pre></div>")
            else:
                out.append(code_block(lang, block))
            continue
        m = re.match(r"^(#{2,4})\s+(.*)$", s)
        if m:
            flush(); out.append(heading(len(m.group(1)), m.group(2))); i += 1; continue
        if s.startswith("|") and i + 1 < n and re.match(r"^\|?\s*:?-{2,}", lines[i + 1].strip()):
            flush()
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append(lines[i]); i += 1
            out.append(table(rows)); continue
        if s.startswith("> "):
            flush()
            m = re.match(r"^>\s*\[!(\w+)\]\s*(.*)$", s)
            kind = KINDS.get(m.group(1).lower(), "info") if m else "info"
            body = [m.group(2)] if m else [s[2:]]
            i += 1
            while i < n and lines[i].strip().startswith(">"):
                body.append(lines[i].strip()[1:].strip()); i += 1
            paras = " ".join(body).split(" \\\\ ")
            out.append(f'<div class="callout {kind}">{ICONS[kind]}<div>' + "".join(f"<p>{inline(p)}</p>" for p in paras) + "</div></div>")
            continue
        if re.match(r"^(-|\d+\.)\s+", s):
            flush()
            ordered = bool(re.match(r"^\d+\.", s))
            items: list[str] = []
            while i < n:
                t = lines[i]
                if re.match(r"^\s*(-|\d+\.)\s+", t):
                    items.append(re.sub(r"^\s*(-|\d+\.)\s+", "", t))
                elif t.strip() and t.startswith("  ") and items:
                    items[-1] += " " + t.strip()
                else:
                    break
                i += 1
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>")
            continue
        if s.startswith("<"):
            flush()
            block = []
            while i < n and lines[i].strip():
                block.append(lines[i]); i += 1
            out.append("\n".join(block)); continue
        para.append(ln); i += 1
    flush()
    if section_open:
        out.append("</section>")
    return "\n".join(out) + "\n"

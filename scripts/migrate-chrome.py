#!/usr/bin/env python3
"""One-off: give hand-written pages the shared header/footer markers, base.css + legacy.css,
and the shared scripts. Afterwards scripts/build.py keeps the header/footer in sync."""
import glob, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = [f for f in glob.glob(os.path.join(ROOT, "*.html")) if os.path.basename(f) != "index.html"]
files += glob.glob(os.path.join(ROOT, "guides", "*.html"))
for f in files:
    s = open(f, encoding="utf-8").read()
    if "<!-- site:nav -->" in s:
        continue
    n0 = len(s)
    s, a = re.subn(r"\n    <nav>\n.*?\n    </nav>\n", "\n<!-- site:nav --><!-- /site:nav -->\n", s, count=1, flags=re.S)
    s, b = re.subn(r'\n    <div class="mobile-menu" id="mobileMenu">.*?\n    </div>\n', "\n", s, count=1, flags=re.S)
    s, c = re.subn(r"\n    <footer>\n.*?\n    </footer>\n", "\n<!-- site:footer --><!-- /site:footer -->\n", s, count=1, flags=re.S)
    css = ('    <link rel="stylesheet" href="/assets/css/base.css">\n'
           '    <link rel="stylesheet" href="/assets/css/legacy.css">\n'
           '    <link rel="preconnect" href="https://fonts.googleapis.com">\n'
           '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap">\n')
    s = s.replace("</head>", css + "</head>", 1)
    s = s.replace('<script defer src="/js/nav.js"></script>',
                  '<script defer src="/assets/js/site.js"></script>\n    <script defer src="/assets/js/search.js"></script>')
    search = open(os.path.join(ROOT, "_source", "partials", "search.html"), encoding="utf-8").read()
    s = s.replace("</body>", search + "</body>", 1)
    open(f, "w", encoding="utf-8").write(s)
    print(f"{os.path.relpath(f, ROOT):45} nav={a} menu={b} footer={c}")

/* Cipi — docs search. Opens with "/", Ctrl/Cmd+K or any [data-search-open]; loads the index on first use. */
(function () {
    'use strict';
    var modal = document.getElementById('searchModal');
    if (!modal) return;
    var input = document.getElementById('searchInput');
    var list = document.getElementById('searchResults');
    var index = null, loading = null, hits = [], sel = 0, lastFocus = null;

    if (!document.querySelector('link[href="/assets/css/search.css"]')) {
        var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/search.css'; document.head.appendChild(l);
    }

    function load() {
        if (index) return Promise.resolve(index);
        if (!loading) loading = fetch('/docs/search-index.json').then(function (r) { return r.json(); }).then(function (d) {
            index = d.map(function (e) {
                e._t = (e.t || '').toLowerCase(); e._h = (e.h || '').toLowerCase(); e._x = (e.x || '').toLowerCase();
                e._d = (e.d || '').toLowerCase(); e._n = e._h.replace(/[^a-z0-9]/g, ''); return e;
            });
            return index;
        });
        return loading;
    }

    function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function score(e, terms, phrase) {
        var s = 0;
        for (var i = 0; i < terms.length; i++) {
            var t = terms[i], hit = false;
            if (e._h === t || e._t === t) { s += 60; hit = true; }
            if (e._h.indexOf(t) > -1) { s += e._h.indexOf(t) === 0 ? 26 : 18; hit = true; }
            if (e._t.indexOf(t) > -1) { s += 14; hit = true; }
            if (e._n.indexOf(t.replace(/[^a-z0-9]/g, '')) > -1) { s += 10; hit = true; }
            if (e._d.indexOf(t) > -1) { s += 16; hit = true; }
            var c = 0, p = e._x.indexOf(t);
            while (p > -1 && c < 6) { c++; p = e._x.indexOf(t, p + t.length); }
            if (c) { s += 2 + c * 1.5; hit = true; }
            if (!hit) return 0;
        }
        if (terms.length > 1 && (e._h.indexOf(phrase) > -1 || e._x.indexOf(phrase) > -1)) s += 20;
        if (!e.a) s += 4; // whole page entries slightly first
        return s;
    }

    function snippet(e, terms) {
        var x = e.x || '';
        var lx = e._x, pos = -1;
        for (var i = 0; i < terms.length && pos < 0; i++) pos = lx.indexOf(terms[i]);
        var start = Math.max(0, pos - 50);
        var out = (start > 0 ? '…' : '') + x.substr(start, 180);
        out = esc(out);
        terms.forEach(function (t) {
            if (t.length < 2) return;
            out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
        });
        return out;
    }

    function render(q) {
        q = q.trim().toLowerCase();
        if (!q) {
            list.innerHTML = '<div class="search-empty">Search ' + (index ? index.length : '') + ' sections of the docs.</div>';
            hits = []; return;
        }
        var terms = q.split(/\s+/).filter(Boolean);
        hits = index.map(function (e) { return { e: e, s: score(e, terms, q) }; })
            .filter(function (r) { return r.s > 0; })
            .sort(function (a, b) { return b.s - a.s; })
            .slice(0, 14);
        if (!hits.length) {
            list.innerHTML = '<div class="search-empty">No results for “' + esc(q) + '”. Try a command name such as <code>deploy</code> or <code>ssl</code>.</div>';
            return;
        }
        var html = '';
        hits.forEach(function (r, i) {
            var e = r.e;
            var title = e.a ? esc(e.h) + ' <small>in ' + esc(e.t) + '</small>' : esc(e.t);
            html += '<a class="search-hit" role="option" id="sh' + i + '" href="' + e.u + (e.a ? '#' + e.a : '') + '" aria-selected="' + (i === 0) + '"><b><em>' + esc(e.g) + '</em>' + title + '</b><span>' + snippet(e, terms) + '</span></a>';
        });
        list.innerHTML = html;
        sel = 0;
        // keep DOM order == hits order for keyboard nav
        hits = Array.prototype.map.call(list.querySelectorAll('.search-hit'), function (a) { return a; });
    }

    function move(d) {
        if (!hits.length) return;
        hits[sel].setAttribute('aria-selected', 'false');
        sel = (sel + d + hits.length) % hits.length;
        hits[sel].setAttribute('aria-selected', 'true');
        hits[sel].scrollIntoView({ block: 'nearest' });
        input.setAttribute('aria-activedescendant', hits[sel].id);
    }

    function open(q) {
        lastFocus = document.activeElement;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        if (typeof q === 'string') input.value = q;
        input.focus(); input.select();
        load().then(function () { render(input.value); });
    }
    function close() {
        modal.hidden = true;
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.addEventListener('click', function (e) {
        if (e.target.closest('[data-search-open]')) { e.preventDefault(); open(); }
        else if (e.target.closest('[data-search-close]')) close();
        else if (e.target.closest('[data-q]')) { input.value = e.target.closest('[data-q]').getAttribute('data-q'); render(input.value); input.focus(); }
        else if (e.target.closest('.search-hit')) close();
    });
    input.addEventListener('input', function () { if (index) render(input.value); });
    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); window.location.href = hits[sel].href; close(); }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !modal.hidden) { close(); return; }
        var tag = (e.target.tagName || '').toLowerCase();
        var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
        if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
            e.preventDefault(); modal.hidden ? open() : close();
        }
    });

    var m = /[?&]q=([^&]+)/.exec(location.search);
    if (m) open(decodeURIComponent(m[1].replace(/\+/g, ' ')));
})();

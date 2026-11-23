/* Cipi — docs: old-anchor redirects, table of contents highlight, mobile sidebar, screenshot zoom. */
(function () {
    'use strict';

    // 1. Old URLs such as /docs/apps#cli-app-reverb point to sections that now live on their own page.
    function routeLegacy() {
        var id = decodeURIComponent(location.hash.slice(1));
        if (!id || document.getElementById(id)) return;
        var page = document.body.getAttribute('data-legacy-page');
        var go = function (map) {
            var slug = map && map[id];
            if (slug && ('/docs/' + slug) !== location.pathname.replace(/\.html$/, '').replace(/\/$/, '')) {
                location.replace('/docs/' + slug + '#' + encodeURIComponent(id));
            }
        };
        var s = document.createElement('script');
        s.src = '/assets/js/docs-anchors.js';
        s.onload = function () {
            var A = window.CIPI_ANCHORS || {};
            go((page && A.pages[page] && A.pages[page][id]) ? A.pages[page] : A.all);
        };
        document.head.appendChild(s);
    }
    routeLegacy();
    window.addEventListener('hashchange', routeLegacy);

    var fallback = document.body.getAttribute('data-legacy-default');
    if (fallback && !location.hash) location.replace('/docs/' + fallback);

    // 2. TOC scroll spy
    var links = Array.prototype.slice.call(document.querySelectorAll('.docs-toc ol a[href^="#"]'));
    if (links.length && 'IntersectionObserver' in window) {
        var targets = links.map(function (a) { return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); });
        var visible = new Set();
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
            var first = null;
            targets.forEach(function (t) { if (!first && t && visible.has(t)) first = t; });
            if (!first) return;
            links.forEach(function (a, i) { a.classList.toggle('active', targets[i] === first); });
        }, { rootMargin: '-80px 0px -65% 0px' });
        targets.forEach(function (t) { if (t) io.observe(t); });
    }

    // 3. Mobile sidebar
    var side = document.querySelector('.docs-side');
    var btn = document.querySelector('.docs-menu-btn');
    if (side && btn) {
        btn.addEventListener('click', function () {
            var open = !side.classList.contains('open');
            side.classList.toggle('open', open);
            btn.setAttribute('aria-expanded', String(open));
        });
        side.addEventListener('click', function (e) { if (e.target.closest('a')) side.classList.remove('open'); });
    }
    var cur = side && side.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView) {
        var r = cur.getBoundingClientRect();
        if (r.bottom > window.innerHeight - 40) side.scrollTop = cur.offsetTop - 160;
    }

    // 4. Screenshot zoom
    document.addEventListener('click', function (e) {
        var frame = e.target.closest('.gui-shot-frame, .gui-shot-phones img');
        if (!frame) return;
        var img = frame.tagName === 'IMG' ? frame : Array.prototype.find.call(frame.querySelectorAll('img'), function (i) { return i.offsetParent !== null; }) || frame.querySelector('img');
        if (!img) return;
        var box = document.createElement('div');
        box.className = 'lightbox';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-label', img.alt || 'Screenshot');
        box.innerHTML = '<img src="' + img.currentSrc + '" alt="">';
        box.querySelector('img').alt = img.alt;
        var close = function () { box.remove(); document.removeEventListener('keydown', key); };
        var key = function (ev) { if (ev.key === 'Escape') close(); };
        box.addEventListener('click', close);
        document.addEventListener('keydown', key);
        document.body.appendChild(box);
    });
})();

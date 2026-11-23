/* Sticky step map: highlight the step being read, mark earlier ones done. */
(function () {
    'use strict';
    var nav = document.querySelector('.flow-nav');
    var lastLinked = -1;
    if (!nav) return;
    var items = Array.prototype.slice.call(nav.querySelectorAll('li'));
    var targets = items.map(function (li) { var a = li.querySelector('a'); return a ? document.querySelector(a.getAttribute('href')) : null; });
    var stick = function () { return (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight; };
    var top = function () { return stick() + 48; };
    function update() {
        var line = top(), active = -1;
        targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= line) active = i; });
        items.forEach(function (li, i) {
            li.classList.toggle('is-active', i === active);
            li.classList.toggle('is-done', i < active);
            var a = li.querySelector('a'); if (a) a.setAttribute('aria-current', i === active ? 'step' : 'false');
        });
        nav.classList.toggle('is-stuck', nav.getBoundingClientRect().top <= 70 && window.scrollY > 200);
        var a = items[active];
        if (a && nav.scrollWidth > nav.clientWidth) {
            var l = a.offsetLeft - 20;
            if (l < nav.scrollLeft || l + a.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = l;
        }
    }
    nav.addEventListener('click', function (e) {
        var a = e.target.closest('a'); if (!a) return;
        var t = document.querySelector(a.getAttribute('href')); if (!t) return;
        e.preventDefault();
        var y = t.getBoundingClientRect().top + window.scrollY - (stick() + 20);
        window.scrollTo({ top: y, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        history.replaceState(null, '', a.getAttribute('href'));
    });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
})();

/* Step-by-step explainers: ```flow blocks whose steps carry an explanation. */
(function () {
    'use strict';
    document.querySelectorAll('[data-fx]').forEach(function (fx) {
        var tabs = Array.prototype.slice.call(fx.querySelectorAll('[role="tab"]'));
        var panes = Array.prototype.slice.call(fx.querySelectorAll('.fx-pane'));
        var prev = fx.querySelector('[data-fx-prev]'), next = fx.querySelector('[data-fx-next]');
        var cur = 0;
        function show(i, focus) {
            cur = Math.max(0, Math.min(tabs.length - 1, i));
            tabs.forEach(function (t, k) {
                t.setAttribute('aria-selected', k === cur ? 'true' : 'false');
                t.tabIndex = k === cur ? 0 : -1;
                t.parentNode.classList.toggle('is-done', k < cur);
                t.parentNode.classList.toggle('is-active', k === cur);
            });
            panes.forEach(function (p, k) { p.hidden = k !== cur; });
            prev.disabled = cur === 0;
            next.textContent = cur === tabs.length - 1 ? 'Back to step 1' : 'Next step';
            var li = tabs[cur].parentNode, ol = li.parentNode;
            if (ol.scrollWidth > ol.clientWidth) ol.scrollLeft = Math.max(0, li.getBoundingClientRect().left - ol.getBoundingClientRect().left + ol.scrollLeft - 16);
            if (focus) tabs[cur].focus();
        }
        tabs.forEach(function (t, k) {
            t.addEventListener('click', function () { show(k); });
            t.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); show(cur + 1, true); }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); show(cur - 1, true); }
            });
        });
        prev.addEventListener('click', function () { show(cur - 1); });
        next.addEventListener('click', function () { show(cur === tabs.length - 1 ? 0 : cur + 1); });
        show(0);
    });
})();

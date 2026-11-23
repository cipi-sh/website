/* Cipi — share buttons: copy link, and the native share sheet on phones. */
(function () {
    'use strict';
    document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-share-copy]');
        if (!b) return;
        var url = b.getAttribute('data-share-copy');
        var done = function () { b.classList.add('ok'); setTimeout(function () { b.classList.remove('ok'); }, 1600); };
        if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
            navigator.share({ title: document.title, url: url }).catch(function () {});
            return;
        }
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
    });
})();

/* Sticky step map: highlight the step being read, mark earlier ones done. */
(function () {
    'use strict';
    var nav = document.querySelector('.flow-nav');
    if (!nav) return;
    var items = Array.prototype.slice.call(nav.querySelectorAll('li'));
    var targets = items.map(function (li) { return document.querySelector(li.querySelector('a').getAttribute('href')); });
    var stick = function () { return (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight; };
    var top = function () { return stick() + 48; };
    function update() {
        var line = top(), active = -1;
        targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= line) active = i; });
        items.forEach(function (li, i) {
            li.classList.toggle('is-active', i === active);
            li.classList.toggle('is-done', i < active);
            li.querySelector('a').setAttribute('aria-current', i === active ? 'step' : 'false');
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

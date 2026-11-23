/* Cipi — home: hero server diagram driven by the terminal, quickstart step player. */
(function () {
    'use strict';

    // ---- Hero: the terminal drives a browser that watches the site go online
    var stage = document.querySelector('[data-hero-stage]');
    if (stage) {
        var bz = stage.querySelector('.bz');
        var view = bz.querySelector('.bz-view');
        var chips = bz.querySelectorAll('[data-stack] span');
        var badge = bz.querySelector('[data-badge]');
        var btabs = {};
        bz.querySelectorAll('[data-tab]').forEach(function (t) { btabs[t.getAttribute('data-tab')] = t; });
        var load = bz.querySelector('.bz-load');
        var timers = [];
        function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
        function setView(v) { view.setAttribute('data-view', v); }
        function setBadge(text, kind) { badge.textContent = text; badge.className = 'bz-badge' + (kind ? ' is-' + kind : ''); }
        function loading(ms) {
            load.classList.remove('run'); void load.offsetWidth;
            load.style.setProperty('--ms', ms + 'ms'); load.classList.add('run');
        }
        stage.addEventListener('term:event', function (e) {
            var n = e.detail.name;
            if (n === 'reset') {
                timers.forEach(clearTimeout); timers = [];
                bz.className = 'bz'; setView('down'); setBadge('', '');
                chips.forEach(function (c) { c.classList.remove('on'); c.style.transitionDelay = ''; });
                Object.keys(btabs).forEach(function (k) { btabs[k].classList.remove('is-on', 'is-live'); });
                btabs.shop.classList.add('is-on'); load.classList.remove('run');
            } else if (n === 'stack') {
                chips.forEach(function (c, i) { c.style.transitionDelay = (i * 0.3) + 's'; c.classList.add('on'); });
                later(function () { setView('ready'); setBadge('server ready', ''); }, 1800);
            } else if (n === 'cell:shop:on') {
                setBadge('app created', '');
            } else if (n === 'cell:shop:deploying') {
                setView('skel'); loading(2300); setBadge('deploying', 'busy');
            } else if (n === 'cell:shop:live') {
                setView('site'); setBadge('live · release 1', 'ok'); btabs.shop.classList.add('is-live');
            } else if (n === 'cell:shop:secure') {
                bz.classList.add('is-https'); setBadge('HTTPS · Let\'s Encrypt', 'ok');
            } else if (n === 'push') {
                bz.classList.add('is-toast'); loading(2000); setBadge('deploying release 2', 'busy');
                later(function () { bz.classList.remove('is-toast'); }, 2600);
            } else if (n === 'release2') {
                bz.classList.add('is-r2'); setBadge('release 2 · 0 errors', 'ok');
            } else if (n.indexOf('tab:') === 0) {
                var t = btabs[n.slice(4)]; if (t) t.classList.add('is-on');
            } else if (/^cell:(api|docs):live$/.test(n)) {
                btabs[n.split(':')[1]].classList.add('is-live');
            }
        });
    }

    // ---- Quickstart: one terminal, six scripts
    var qs = document.querySelector('[data-qs]');
    var scriptsEl = document.getElementById('qsScripts');
    if (qs && scriptsEl && window.CipiTerm) {
        var scripts = JSON.parse(scriptsEl.textContent);
        var termEl = document.getElementById('qsTerm');
        var player = window.CipiTerm.init(termEl);
        var tabs = qs.querySelectorAll('[data-step]');
        var title = termEl.querySelector('[data-qs-title]');
        var auto = true, current = 0, started = false;
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function select(i, play) {
            current = i;
            tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
            title.textContent = 'Step ' + (i + 1) + ' — ' + tabs[i].querySelector('b').textContent;
            player.script = scripts[i];
            player.prompt = i === 0 ? 'root@vps:~#' : 'cipi@vps:~$';
            if (play && !reduce) player.play(); else player.renderAll();
        }

        tabs.forEach(function (t, i) {
            t.addEventListener('click', function () { auto = false; select(i, true); });
            t.addEventListener('keydown', function (e) {
                var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                var n = (i + d + tabs.length) % tabs.length;
                tabs[n].focus(); auto = false; select(n, true);
            });
        });

        termEl.addEventListener('term:event', function (e) {
            if (e.detail.name === 'done' && auto && current < scripts.length - 1) {
                setTimeout(function () { if (auto) select(current + 1, true); }, 2200);
            }
        });

        select(0, false);
        if (!reduce && 'IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (es) {
                es.forEach(function (en) {
                    if (en.isIntersecting && !started) { started = true; io.disconnect(); select(current, true); }
                });
            }, { threshold: 0.4 });
            io.observe(termEl);
        }
    }
})();

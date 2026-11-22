/* Cipi — home: hero server diagram driven by the terminal, quickstart step player. */
(function () {
    'use strict';

    // ---- Hero: terminal events light up the server diagram
    var stage = document.querySelector('[data-hero-stage]');
    if (stage) {
        var chips = stage.querySelectorAll('[data-stack] span');
        var cells = {};
        stage.querySelectorAll('[data-cell]').forEach(function (c) { cells[c.getAttribute('data-cell')] = c; });

        function setCell(name, state) {
            var c = cells[name];
            if (!c) return;
            var label = c.querySelector('.cell-state');
            if (state === 'on') { c.classList.add('on'); c.setAttribute('data-state', 'created'); label.textContent = 'created'; }
            if (state === 'deploying') {
                c.setAttribute('data-state', 'deploying'); label.textContent = 'deploying';
                var bar = c.querySelector('.cell-progress i');
                bar.style.transition = 'none'; bar.style.width = '0';
                bar.offsetWidth; bar.style.transition = ''; bar.style.width = '';
            }
            if (state === 'live') { c.setAttribute('data-state', 'live'); label.textContent = 'live'; }
            if (state === 'secure') { c.classList.add('secure'); }
        }

        stage.addEventListener('term:event', function (e) {
            var n = e.detail.name;
            if (n === 'reset') {
                chips.forEach(function (s) { s.classList.remove('on'); s.style.transitionDelay = ''; });
                Object.keys(cells).forEach(function (k) { cells[k].classList.remove('on', 'secure'); cells[k].removeAttribute('data-state'); });
            } else if (n === 'stack') {
                chips.forEach(function (s, i) { s.style.transitionDelay = (i * 0.32) + 's'; s.classList.add('on'); });
            } else if (n.indexOf('cell:') === 0) {
                var p = n.split(':'); setCell(p[1], p[2]);
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

/* Cipi — shared site behaviour: theme, mobile nav, copy buttons, Telegram chip. */
(function () {
    'use strict';
    var root = document.documentElement;

    // Theme (the inline head snippet already applied the stored value)
    function setTheme(t) {
        root.setAttribute('data-theme', t);
        try { localStorage.setItem('cipi-theme', t); } catch (e) {}
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', t === 'dark' ? '#0F1512' : '#F2F4F1');
    }
    document.querySelectorAll('.sn-theme').forEach(function (b) {
        b.addEventListener('click', function () {
            setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        });
    });

    // Mobile nav
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('mobileMenu');
    if (toggle && menu) {
        var close = function () {
            toggle.setAttribute('aria-expanded', 'false');
            menu.classList.remove('open');
            document.body.style.overflow = '';
        };
        toggle.addEventListener('click', function () {
            var open = !menu.classList.contains('open');
            toggle.setAttribute('aria-expanded', String(open));
            menu.classList.toggle('open', open);
            document.body.style.overflow = open ? 'hidden' : '';
        });
        menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
        window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches) close(); });
    }

    // Copy buttons: .cmd blocks and docs code blocks
    function copy(text, btn) {
        if (window.cipiCopy) return window.cipiCopy(text, btn);
        if (navigator.clipboard) navigator.clipboard.writeText(text);
    }
    document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-copy]');
        if (b) { copy(b.getAttribute('data-copy'), b); return; }
        var cb = e.target.closest('.code-copy-btn');
        if (cb) {
            var pre = cb.closest('.code-block').querySelector('pre');
            var text = pre.innerText.replace(/ /g, ' ');
            copy(text, cb);
            var old = cb.textContent; cb.textContent = 'Copied';
            setTimeout(function () { cb.textContent = old; }, 1500);
        }
    });

    // Telegram chip (dismissible)
    (function () {
        try { if (localStorage.getItem('cipi-tg-chip') === 'off') return; } catch (e) {}
        if (document.body.hasAttribute('data-no-chip')) return;
        var chip = document.createElement('aside');
        chip.className = 'tg-chip';
        chip.setAttribute('aria-label', 'Cipi on Telegram');
        chip.innerHTML = '<a href="https://t.me/cipicloud" target="_blank" rel="noopener">' +
            '<svg class="tg" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.94 0A12 12 0 1 0 24 12 12 12 0 0 0 11.94 0zm4.97 7.22c.1 0 .32.02.46.14a.5.5 0 0 1 .17.33c.02.09.04.3.02.47-.18 1.9-.96 6.5-1.36 8.63-.17.9-.5 1.2-.82 1.23-.7.06-1.22-.46-1.9-.9-1.05-.7-1.65-1.13-2.68-1.8-1.18-.78-.41-1.21.26-1.91.18-.19 3.25-2.98 3.3-3.23 0-.03.02-.15-.05-.21s-.17-.04-.25-.03c-.1.03-1.8 1.14-5.06 3.35-.48.33-.91.49-1.3.48-.43 0-1.25-.24-1.87-.44-.75-.25-1.35-.38-1.3-.79.03-.22.33-.44.9-.66 3.5-1.53 5.83-2.53 7-3.02 3.33-1.38 4.02-1.62 4.48-1.63z"/></svg>' +
            '<span><strong>Release notes on Telegram</strong><small>t.me/cipicloud</small></span></a>' +
            '<button type="button" aria-label="Dismiss">✕</button>';
        document.body.appendChild(chip);
        chip.querySelector('button').addEventListener('click', function () {
            chip.remove();
            try { localStorage.setItem('cipi-tg-chip', 'off'); } catch (e) {}
        });
    })();

    // "Edit on GitHub": deploy previews point at the branch under review,
    // where the page sources exist before they are merged into main.
    (function () {
        if (!/^deploy-preview-\d+--/.test(location.hostname)) return;
        document.querySelectorAll('a[data-edit]').forEach(function (a) {
            a.href = a.href.replace('/edit/main/', '/edit/redesign/new-site/');
        });
    })();
})();

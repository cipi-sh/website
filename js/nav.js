/* Shared mobile navigation — one behaviour for every page.
   No-ops on pages that render without the toggle or the overlay. */
(function () {
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('mobileMenu');
    if (!toggle || !menu) return;

    function close() {
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('open');
        document.body.style.overflow = '';
    }

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'mobileMenu');

    toggle.addEventListener('click', function () {
        var open = !menu.classList.contains('open');
        toggle.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
        menu.classList.toggle('open', open);
        document.body.style.overflow = open ? 'hidden' : '';
    });

    menu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
    });

    // Leaving the mobile breakpoint must not strand the page in a locked state.
    window.matchMedia('(min-width: 861px)').addEventListener('change', function (e) {
        if (e.matches) close();
    });
})();

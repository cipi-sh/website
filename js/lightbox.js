/* Click-to-zoom lightbox for control panel screenshots (.gui-shot, .gui-shot-phones).
   Only the variant visible in the current theme is collected, so prev/next
   walks the same light or dark set the reader is looking at. */
(function () {
    var SELECTOR = '.gui-shot img, .gui-shot-phones img';
    var shots = document.querySelectorAll(SELECTOR);
    if (!shots.length || typeof HTMLDialogElement === 'undefined') return;

    var dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Screenshot viewer');
    dialog.innerHTML =
        '<button type="button" class="lightbox-btn lightbox-close" aria-label="Close" autofocus>' +
            '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2L2 10"/></svg>' +
        '</button>' +
        '<button type="button" class="lightbox-btn lightbox-prev" aria-label="Previous screenshot">' +
            '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 2L3.5 6l4 4"/></svg>' +
        '</button>' +
        '<button type="button" class="lightbox-btn lightbox-next" aria-label="Next screenshot">' +
            '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2l4 4-4 4"/></svg>' +
        '</button>' +
        '<span class="lightbox-count" aria-live="polite"></span>' +
        '<figure class="lightbox-figure">' +
            '<img class="lightbox-img" alt="">' +
            '<figcaption class="lightbox-caption"></figcaption>' +
        '</figure>';
    document.body.appendChild(dialog);

    var img = dialog.querySelector('.lightbox-img');
    var caption = dialog.querySelector('.lightbox-caption');
    var count = dialog.querySelector('.lightbox-count');
    var prevBtn = dialog.querySelector('.lightbox-prev');
    var nextBtn = dialog.querySelector('.lightbox-next');
    var set = [];
    var index = 0;
    var opener = null;
    var touchX = null;

    function visibleShots() {
        return Array.prototype.filter.call(document.querySelectorAll(SELECTOR), function (el) {
            return el.getClientRects().length > 0;
        });
    }

    function show(i) {
        index = (i + set.length) % set.length;
        var shot = set[index];
        var figure = shot.closest('figure');
        var figcaption = figure && figure.querySelector('figcaption');

        img.src = shot.currentSrc || shot.src;
        img.alt = shot.alt;
        caption.textContent = figcaption ? figcaption.textContent.trim() : shot.alt;
        count.textContent = (index + 1) + ' / ' + set.length;

        // Neighbours are lazy and usually off-screen: start loading them now.
        if (set.length > 1) {
            [index - 1, index + 1].forEach(function (n) {
                var neighbour = set[(n + set.length) % set.length];
                if (!neighbour.complete) neighbour.loading = 'eager';
            });
        }
    }

    function open(shot) {
        set = visibleShots();
        opener = shot;
        dialog.classList.toggle('single', set.length < 2);
        show(Math.max(set.indexOf(shot), 0));
        document.documentElement.classList.add('lightbox-open');
        dialog.showModal();
    }

    dialog.addEventListener('close', function () {
        document.documentElement.classList.remove('lightbox-open');
        img.removeAttribute('src');
        if (opener) opener.focus({ preventScroll: true });
    });

    // Anywhere outside the controls closes, image included.
    dialog.addEventListener('click', function (e) {
        var btn = e.target.closest('.lightbox-btn');
        if (btn === prevBtn) show(index - 1);
        else if (btn === nextBtn) show(index + 1);
        else dialog.close();
    });

    dialog.addEventListener('keydown', function (e) {
        if (set.length < 2) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    });

    dialog.addEventListener('touchstart', function (e) {
        touchX = e.touches.length === 1 ? e.touches[0].clientX : null;
    }, { passive: true });

    dialog.addEventListener('touchend', function (e) {
        if (touchX === null || set.length < 2) return;
        var dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    });

    shots.forEach(function (shot) {
        shot.tabIndex = 0;
        shot.setAttribute('role', 'button');
        shot.setAttribute('aria-haspopup', 'dialog');
        shot.setAttribute('aria-label', 'Enlarge screenshot: ' + shot.alt);
        shot.addEventListener('click', function () { open(shot); });
        shot.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(shot); }
        });
    });
})();

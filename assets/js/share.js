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

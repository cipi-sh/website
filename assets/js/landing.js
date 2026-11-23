/* Product pages: chat transcripts that play when visible. */
(function () {
    'use strict';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-chat]').forEach(function (chat) {
        var msgs = Array.prototype.slice.call(chat.querySelectorAll('.lp-msg'));
        if (reduce || !('IntersectionObserver' in window)) { msgs.forEach(function (m) { m.classList.add('on'); }); return; }
        var timer = null, playing = false;
        function play() {
            if (playing) return; playing = true;
            msgs.forEach(function (m) { m.classList.remove('on'); });
            var i = 0;
            (function next() {
                if (!playing) return;
                if (i >= msgs.length) { timer = setTimeout(function () { playing = false; play(); }, 5000); return; }
                var m = msgs[i++]; m.classList.add('on');
                timer = setTimeout(next, m.classList.contains('you') ? 900 : 1700);
            })();
        }
        new IntersectionObserver(function (es) {
            es.forEach(function (e) {
                if (e.isIntersecting) play();
                else { playing = false; clearTimeout(timer); msgs.forEach(function (m) { m.classList.add('on'); }); }
            });
        }, { threshold: 0.3 }).observe(chat);
    });
})();

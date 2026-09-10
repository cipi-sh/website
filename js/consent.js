/* Cookie consent bar — records the visitor's choice and pushes it to Google
   consent mode v2. Every page ships denied defaults inline in <head>, so this
   file only ever upgrades or re-denies them. */
(function () {
    var KEY = 'cipi-consent';
    var TYPES = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'];
    var bar = null;

    function stored() {
        try {
            return localStorage.getItem(KEY);
        } catch (e) {
            return null;
        }
    }

    function hide() {
        if (!bar) return;
        bar.remove();
        bar = null;
    }

    function decide(value) {
        try {
            localStorage.setItem(KEY, value);
        } catch (e) { }

        var state = {};
        for (var i = 0; i < TYPES.length; i++) state[TYPES[i]] = value;
        if (typeof window.gtag === 'function') window.gtag('consent', 'update', state);

        hide();
    }

    function show() {
        if (bar) return;
        bar = document.createElement('div');
        bar.className = 'consent-bar';
        bar.setAttribute('role', 'dialog');
        bar.setAttribute('aria-label', 'Cookie consent');
        bar.innerHTML =
            '<p class="consent-copy">We use cookies only to measure our Google Ads campaigns. ' +
            'Site analytics stay cookieless either way, so rejecting costs you nothing.</p>' +
            '<div class="consent-actions">' +
            '<button type="button" class="consent-btn" data-consent="denied">Reject</button>' +
            '<button type="button" class="consent-btn consent-btn--solid" data-consent="granted">Accept</button>' +
            '</div>';

        bar.addEventListener('click', function (e) {
            var choice = e.target.getAttribute && e.target.getAttribute('data-consent');
            if (choice) decide(choice);
        });

        document.body.appendChild(bar);
    }

    // Withdrawing consent has to stay reachable once the bar is dismissed.
    var links = document.querySelector('.footer-links');
    if (links) {
        var item = document.createElement('li');
        var link = document.createElement('a');
        link.href = '#';
        link.textContent = 'Cookie settings';
        link.addEventListener('click', function (e) {
            e.preventDefault();
            show();
        });
        item.appendChild(link);
        links.appendChild(item);
    }

    var choice = stored();
    if (choice !== 'granted' && choice !== 'denied') show();
})();

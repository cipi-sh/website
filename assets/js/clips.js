/* Cipi — "the real panel, in motion".
 * Short clips played over real screenshots of cipi/gui: a camera pans and zooms,
 * a cursor clicks, the next real screen follows.
 *
 *   <div data-clips></div>                       every clip, with a chapter list
 *   <div data-clips="deploy,env"></div>          a subset
 *   <div data-clips="deploy" data-single></div>  one clip, no chapter list (docs)
 *
 * Coordinates are fractions of each screenshot (x of width, y of height).
 */
(function () {
    'use strict';

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var IMG = '/img/gui/';
    var AR = { // height / width of each screenshot
        'apps-light': 2700 / 2880, 'create-app': 1950 / 2880, 'job-credentials': 1800 / 2880,
        'app-deploy-light': 2628 / 2880, 'job-deploy': 1800 / 2880, 'app-env': 2040 / 2880,
        'team': 1800 / 2880, 'team-invite': 2956 / 2880, 'databases': 1934 / 2880,
        'dashboard-light': 1810 / 2880, 'server-overview-light': 2042 / 2880, 'app-domains': 1814 / 2880,
        'app-routing': 2012 / 2880, 'app-logs': 1996 / 2880, 'server-monitor': 1800 / 2880
    };

    // shot: { img, cam:[scale, fx, fy], cur:[x,y] | null, click:true, cap, ms }
    var CLIPS = {
        create: {
            title: 'Create an app', sub: 'Type, domain, repository: an isolated app in seconds',
            shots: [
                { img: 'apps-light', cam: [1, .5, 0], cur: [.6, .3], cap: 'Every app of every server, in one list.', ms: 1600 },
                { img: 'apps-light', cam: [1.6, .86, .08], cur: [.94, .098], click: true, cap: 'New app.', ms: 1500 },
                { img: 'create-app', cam: [1.25, .5, .3], cur: [.499, .325], click: true, cap: 'Pick the type: Laravel, Node or custom PHP.', ms: 2000 },
                { img: 'create-app', cam: [1.35, .5, .5], cur: [.381, .432], click: true, cap: 'Name, domain and Git repository. The form only offers what the server has installed.', ms: 2400 },
                { img: 'create-app', cam: [1.25, .6, .85], cur: [.675, .93], click: true, cap: 'Create.', ms: 1500 },
                { img: 'job-credentials', cam: [1.35, .5, .22], cur: [.5, .187], cap: 'The job checks that the deploy key can read the repository.', ms: 2400 },
                { img: 'job-credentials', cam: [1.3, .55, .42], cur: [.696, .368], click: true, cap: 'One-time credentials, with copy buttons. Never stored by the panel.', ms: 2600 }
            ]
        },
        deploy: {
            title: 'Deploy and audit', sub: 'Zero-downtime release, a log for every deploy',
            shots: [
                { img: 'app-deploy-light', cam: [1, .5, 0], cur: [.5, .5], cap: 'The Deploy tab of an app.', ms: 1500 },
                { img: 'app-deploy-light', cam: [1.7, .3, .3], cur: [.321, .304], click: true, cap: 'Deploy now.', ms: 1600 },
                { img: 'job-deploy', cam: [1.2, .5, .45], cur: null, cap: 'Deployer builds the new release next to the live one…', ms: 2200 },
                { img: 'job-deploy', cam: [1.5, .45, .72], cur: [.417, .738], cap: '…and swaps it in atomically. No downtime.', ms: 2200 },
                { img: 'app-deploy-light', cam: [1.6, .7, .32], cur: [.61, .326], cap: 'Every deploy lands in a hash-chained audit: who, from where, how long.', ms: 2800 },
                { img: 'app-deploy-light', cam: [1.3, .55, .72], cur: [.58, .708], cap: 'The pipeline is plain options: migrate, optimize, asset build, DB snapshot.', ms: 2600 }
            ]
        },
        env: {
            title: 'Edit the environment', sub: '.env with masked secrets and change tracking',
            shots: [
                { img: 'app-env', cam: [1, .5, 0], cur: [.5, .5], cap: 'The app\'s .env, key by key.', ms: 1600 },
                { img: 'app-env', cam: [1.6, .45, .45], cur: [.656, .44], cap: 'Secrets stay masked until you ask.', ms: 2000 },
                { img: 'app-env', cam: [1.6, .6, .6], cur: [.656, .588], click: true, cap: 'Change a value: the panel tracks unsaved changes.', ms: 2200 },
                { img: 'app-env', cam: [1.6, .75, .88], cur: [.931, .907], click: true, cap: 'Save. It applies on the next deploy or config:cache.', ms: 2200 }
            ]
        },
        domains: {
            title: 'Domains and HTTPS', sub: 'Aliases, Let\'s Encrypt, www or apex',
            shots: [
                { img: 'app-domains', cam: [1, .5, 0], cur: [.5, .5], cap: 'Primary domain and aliases, served by one vhost.', ms: 1800 },
                { img: 'app-domains', cam: [1.6, .72, .38], cur: [.678, .422], click: true, cap: 'Issue or renew the certificate for every hostname.', ms: 2400 },
                { img: 'app-domains', cam: [1.5, .45, .86], cur: [.464, .898], click: true, cap: 'Make www or the apex canonical, with a 301.', ms: 2400 }
            ]
        },
        databases: {
            title: 'Databases', sub: 'MariaDB and PostgreSQL across servers',
            shots: [
                { img: 'databases', cam: [1, .5, 0], cur: [.5, .5], cap: 'Every database on every server, with its engine and size.', ms: 2000 },
                { img: 'databases', cam: [1.6, .75, .72], cur: [.844, .772], click: true, cap: 'Back up, restore (also a dump from your computer), rotate the password.', ms: 2600 },
                { img: 'databases', cam: [1.6, .85, .15], cur: [.928, .135], click: true, cap: 'New database, linked to an app.', ms: 2000 }
            ]
        },
        server: {
            title: 'Server health', sub: 'Fleet dashboard, services, disk',
            shots: [
                { img: 'dashboard-light', cam: [1, .5, 0], cur: [.5, .5], cap: 'Every server at a glance: CPU, memory, disk, services.', ms: 2000 },
                { img: 'dashboard-light', cam: [1.6, .75, .38], cur: [.9, .59], click: true, cap: 'Open one.', ms: 1600 },
                { img: 'server-overview-light', cam: [1.3, .55, .35], cur: [.594, .374], cap: 'Resources, alerts from the monitor and health checks.', ms: 2400 },
                { img: 'server-overview-light', cam: [1.5, .45, .62], cur: [.681, .619], click: true, cap: 'Services with restart, PHP-FPM pools, and tabs for disk, PHP, Node, backups.', ms: 2600 }
            ]
        },
        team: {
            title: 'Invite a teammate', sub: 'Roles and per-app permissions',
            shots: [
                { img: 'team', cam: [1, .5, 0], cur: [.5, .4], cap: 'Admins see everything. Users see what they are given.', ms: 1800 },
                { img: 'team-invite', cam: [1.4, .45, .15], cur: [.344, .216], click: true, cap: 'Pick a role.', ms: 1800 },
                { img: 'team-invite', cam: [1.5, .45, .55], cur: [.323, .598], click: true, cap: 'Grant per server, or per app: deploy, edit, environment, logs…', ms: 2600 },
                { img: 'team-invite', cam: [1.4, .6, .95], cur: [.675, .968], click: true, cap: 'Copy the invite link. It works once and expires in seven days.', ms: 2400 }
            ]
        }
    };
    var ORDER = ['create', 'deploy', 'env', 'domains', 'databases', 'server', 'team'];

    var CURSOR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8-6.2 1.6L9.8 19 5 3z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';

    function Player(root) {
        var names = (root.getAttribute('data-clips') || '').split(',').map(function (s) { return s.trim(); }).filter(function (n) { return CLIPS[n]; });
        if (!names.length) names = ORDER.slice();
        this.names = names;
        this.single = root.hasAttribute('data-single') || names.length === 1;
        this.root = root;
        this.token = 0;
        root.classList.add('clips');
        if (this.single) root.classList.add('clips--single');

        var list = '';
        if (!this.single) {
            list = '<ol class="clips-list" role="tablist" aria-label="Panel clips">' + names.map(function (n, i) {
                var c = CLIPS[n];
                return '<li><button type="button" role="tab" data-clip="' + n + '"><b>' + c.title + '</b><small>' + c.sub + '</small><i class="clips-prog"></i></button></li>';
            }).join('') + '</ol>';
        }
        root.innerHTML = list +
            '<figure class="clips-player"><div class="clips-chrome"><span class="term-dots"><i></i><i></i><i></i></span><span class="clips-url">panel.example.com</span><button type="button" class="clips-pp" aria-label="Pause">❚❚</button></div>' +
            '<div class="clips-stage"><img class="clips-img a" alt="" decoding="async"><img class="clips-img b" alt="" decoding="async"><div class="clips-cursor">' + CURSOR + '</div></div>' +
            '<figcaption class="clips-cap" aria-live="polite"></figcaption></figure>';

        this.stage = root.querySelector('.clips-stage');
        this.imgs = [root.querySelector('.clips-img.a'), root.querySelector('.clips-img.b')];
        this.front = 0;
        this.cursor = root.querySelector('.clips-cursor');
        this.cap = root.querySelector('.clips-cap');
        this.pp = root.querySelector('.clips-pp');
        var self = this;
        root.querySelectorAll('[data-clip]').forEach(function (b) {
            b.addEventListener('click', function () { self.play(b.getAttribute('data-clip'), true); });
        });
        this.pp.addEventListener('click', function () {
            if (self.paused) { self.paused = false; self.pp.textContent = '❚❚'; self.pp.setAttribute('aria-label', 'Pause'); self.play(self.current, true); }
            else { self.paused = true; self.token++; self.pp.textContent = '▶'; self.pp.setAttribute('aria-label', 'Play'); }
        });
        // preload
        var seen = {};
        names.forEach(function (n) { CLIPS[n].shots.forEach(function (s) { if (!seen[s.img]) { seen[s.img] = 1; var im = new Image(); im.src = IMG + s.img + '.webp'; } }); });
        this.current = names[0];
        this.render(CLIPS[names[0]].shots[0], true);
        this.mark(names[0]);
    }

    Player.prototype.mark = function (name) {
        this.root.querySelectorAll('[data-clip]').forEach(function (b) {
            var on = b.getAttribute('data-clip') === name;
            b.setAttribute('aria-selected', String(on));
            var p = b.querySelector('.clips-prog'); p.style.transition = 'none'; p.style.width = '0';
        });
    };

    Player.prototype.geom = function (shot) {
        var W = this.stage.clientWidth, H = this.stage.clientHeight;
        var s = shot.cam[0], iw = W * s, ih = iw * AR[shot.img];
        var tx = W / 2 - shot.cam[1] * iw, ty = H / 2 - shot.cam[2] * ih;
        tx = Math.min(0, Math.max(W - iw, tx));
        ty = Math.min(0, Math.max(Math.min(0, H - ih), ty));
        return { s: s, tx: tx, ty: ty, iw: iw, ih: ih };
    };

    Player.prototype.render = function (shot, instant) {
        var g = this.geom(shot);
        var src = IMG + shot.img + '.webp';
        var img = this.imgs[this.front];
        if (img.getAttribute('src') !== src) {
            // cross-fade to the other layer
            var back = this.imgs[1 - this.front];
            back.style.transition = 'none';
            back.src = src;
            back.style.transform = 'translate(' + g.tx + 'px,' + g.ty + 'px) scale(' + g.s + ')';
            back.offsetWidth;
            back.style.transition = '';
            back.classList.add('on'); img.classList.remove('on');
            this.front = 1 - this.front;
        } else {
            if (instant) img.style.transition = 'none';
            img.style.transform = 'translate(' + g.tx + 'px,' + g.ty + 'px) scale(' + g.s + ')';
            if (instant) { img.offsetWidth; img.style.transition = ''; }
            img.classList.add('on');
        }
        if (shot.cur) {
            this.cursor.style.opacity = '1';
            if (instant) this.cursor.style.transition = 'none';
            this.cursor.style.transform = 'translate(' + (g.tx + shot.cur[0] * g.iw) + 'px,' + (g.ty + shot.cur[1] * g.ih) + 'px)';
            if (instant) { this.cursor.offsetWidth; this.cursor.style.transition = ''; }
        } else this.cursor.style.opacity = '0';
        this.cap.textContent = shot.cap;
        this.shot = shot;
    };

    Player.prototype.wait = function (ms, tk) {
        var self = this;
        return new Promise(function (res, rej) { setTimeout(function () { tk === self.token ? res() : rej('stop'); }, ms); });
    };

    Player.prototype.play = async function (name, user) {
        var tk = ++this.token, self = this;
        if (user) { this.paused = false; this.pp.textContent = '❚❚'; }
        this.current = name;
        this.mark(name);
        var btn = this.root.querySelector('[data-clip="' + name + '"]');
        var prog = btn && btn.querySelector('.clips-prog');
        var shots = CLIPS[name].shots;
        var total = shots.reduce(function (a, s) { return a + s.ms; }, 0);
        if (prog) { prog.offsetWidth; prog.style.transition = 'width ' + total + 'ms linear'; prog.style.width = '100%'; }
        try {
            this.render(shots[0], true);
            for (var i = 0; i < shots.length; i++) {
                if (i) this.render(shots[i]);
                if (shots[i].click) {
                    await this.wait(900, tk);
                    this.cursor.classList.remove('click'); this.cursor.offsetWidth; this.cursor.classList.add('click');
                    await this.wait(Math.max(300, shots[i].ms - 900), tk);
                } else await this.wait(shots[i].ms, tk);
            }
            await this.wait(600, tk);
            var next = this.names[(this.names.indexOf(name) + 1) % this.names.length];
            this.play(next);
        } catch (e) { /* stopped */ }
    };

    Player.prototype.stop = function () { this.token++; };

    function init(el) {
        if (el._clips) return;
        var p = new Player(el);
        el._clips = p;
        window.addEventListener('resize', function () { if (p.shot) p.render(p.shot, true); });
        if (reduce) { p.paused = true; p.pp.textContent = '▶'; return; }
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (es) {
                es.forEach(function (e) {
                    if (e.isIntersecting && !p.running && !p.paused) { p.running = true; p.play(p.current); }
                    else if (!e.isIntersecting && p.running) { p.running = false; p.stop(); }
                });
            }, { threshold: 0.35 }).observe(el);
        } else p.play(p.current);
    }

    document.querySelectorAll('[data-clips]').forEach(init);
    window.CipiClips = { init: init };
})();

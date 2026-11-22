/* Cipi — animated tour of the web panel (cipi/gui 4).
 * <div data-panel-demo data-start="dashboard" data-tour="auto|off" data-domain="panel.example.com"></div>
 * The screens are an HTML replica of the real panel with demo data; a cursor walks through
 * dashboard → apps → deploy → new app. Buttons under the frame jump to a screen and stop the tour.
 */
(function () {
    'use strict';

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = 1200, H = 720;

    var I = {
        grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
        box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
        db: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
        server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>',
        plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0V8zM12 18v4"/></svg>',
        user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
        gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
        rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 00-2.9-.1z"/><path d="M12 15l-3-3a22 22 0 012-4A12.9 12.9 0 0122 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 01-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/></svg>',
        refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a9 9 0 01-15.5 6.2L3 16M3 12A9 9 0 0118.5 5.8L21 8M21 3v5h-5M3 21v-5h5"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
        undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
        lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
        mark: '<svg viewBox="0 0 64 64"><rect x="2" y="2" width="28" height="28" fill="#14200A"/><rect x="34" y="2" width="28" height="28" fill="#14200A" opacity=".45"/><rect x="2" y="34" width="28" height="28" fill="#14200A"/><rect x="34" y="34" width="28" height="28" fill="#14200A"/></svg>',
        cursor: '<svg viewBox="0 0 24 24"><path d="M5 3l14 8-6.2 1.6L9.8 19 5 3z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>'
    };

    var servers = [
        { name: 'production', host: 'fra1.example.net', ip: '203.0.113.24', cpu: 18, mem: 66, memT: '5.1 / 7.8 GB', disk: 40, diskT: '61G / 154G', apps: 6, php: 'PHP 8.4 · 8.5', os: 'Ubuntu 24.04 LTS', up: 'up 6 weeks', svcs: ['nginx', 'mariadb', 'postgresql', 'valkey-server', 'supervisor', 'fail2ban'] },
        { name: 'clients', host: 'nyc1.example.net', ip: '198.51.100.42', cpu: 7, mem: 58, memT: '2.2 / 3.7 GB', disk: 31, diskT: '23G / 76G', apps: 4, php: 'PHP 8.3 · 8.5', os: 'Ubuntu 26.04 LTS', up: 'up 3 weeks', svcs: ['nginx', 'mariadb', 'valkey-server', 'supervisor', 'fail2ban'] }
    ];

    var apps = [
        ['shop', 'shop.example.com +2', 'production', ['Laravel', 'lime'], 'PHP 8.5 · Octane', 'MariaDB', 'main', 'Live'],
        ['shopapi', 'api.example.com', 'production', ['Laravel', 'lime'], 'PHP 8.5', 'PostgreSQL', 'main', 'Live'],
        ['console', 'app.example.com', 'production', ['Node SSR', 'blue'], 'Node 24', '—', 'main', 'Live'],
        ['bakery', 'bakery.example.org', 'clients', ['Laravel', 'lime'], 'PHP 8.5', 'MariaDB', 'main', 'Live'],
        ['blog', 'blog.example.com', 'production', ['Custom PHP', 'plain'], 'PHP 8.4', '—', '—', 'Live'],
        ['crm', 'crm.example.net', 'clients', ['Laravel', 'lime'], 'PHP 8.5', 'MariaDB', 'main', 'Suspended'],
        ['docs', 'docs.example.com', 'production', ['Node Static', 'blue'], 'Node 22', '—', 'main', 'Live']
    ];

    var audit = [
        ['3 hours ago', 'published', '133', '9d1f3a5', '1m43s', 'panel', 'alice'],
        ['1 day ago', 'published', '132', 'e4a8b1c', '45s', 'webhook', 'github'],
        ['2 days ago', 'rollback', '130', 'a71d0c9', '4s', 'cli', 'root'],
        ['5 days ago', 'failed', '130', 'c02b7e5', '51s', 'panel', 'alice'],
        ['6 days ago', 'published', '129', 'a71d0c9', '46s', 'webhook', 'github']
    ];

    function pill(text, kind) { return '<span class="pd-pill ' + kind + '">' + text + '</span>'; }

    function tpl(domain) {
        var srv = servers.map(function (s) {
            return '<div class="pd-card pd-server"><div class="pd-server-h"><span class="dot"></span><b>' + s.name + '</b>' + pill('Healthy', 'ok') + '</div>' +
                '<div class="pd-server-sub">' + s.host + ' · ' + s.ip + '</div><div class="pd-meters">' +
                meter('CPU', s.cpu, '') + meter('Memory', s.mem, s.memT) + meter('Disk', s.disk, s.diskT) +
                '<div class="pd-meter"><small>Apps <b>' + s.apps + '</b></small><div style="height:18px"></div><span>' + s.php + '</span></div></div>' +
                '<div class="pd-svcs">' + s.svcs.map(function (v) { return '<span class="pd-svc">' + v + '</span>'; }).join('') + '</div>' +
                '<div class="pd-muted" style="margin-top:12px;font-size:12px">' + s.os + ' · Cipi 5.10.0 · ' + s.up + '</div></div>';
        }).join('');

        var rows = apps.map(function (a) {
            var st = a[7] === 'Live' ? pill('Live', 'ok') + ' ' + pill('HTTPS', 'plain') : pill('Suspended', 'warn');
            return '<tr data-app="' + a[0] + '"><td><b>' + a[0] + '</b><small>' + a[1] + '</small></td><td>' + pill(a[2], 'plain') + '</td><td>' + pill(a[3][0], a[3][1]) +
                '</td><td>' + a[4] + '</td><td>' + a[5] + '</td><td class="pd-mono pd-muted">' + a[6] + '</td><td>' + st +
                '</td><td class="act"><span class="pd-btn" ' + (a[0] === 'shop' ? 'data-pd="manage-shop"' : '') + '>Manage</span></td></tr>';
        }).join('');

        var auditRows = audit.map(auditRow).join('');

        return '' +
            '<div class="pd-frame"><div class="pd-chrome"><span class="term-dots"><i></i><i></i><i></i></span>' +
            '<span class="pd-url">' + I.lock + domain + '</span><span style="width:52px"></span></div>' +
            '<div class="pd-viewport"><div class="pd-stage" aria-hidden="true">' +
            '<aside class="pd-side"><div class="pd-logo"><span class="pd-logo-mark">' + I.mark + '</span><b>Cipi</b><small>panel</small></div>' +
            '<nav class="pd-nav"><h6>Fleet</h6>' +
            '<div class="pd-item" data-pd="nav-dashboard">' + I.grid + 'Dashboard</div>' +
            '<div class="pd-item" data-pd="nav-apps">' + I.box + 'Apps</div>' +
            '<div class="pd-item">' + I.db + 'Databases</div>' +
            '<h6>Servers</h6>' +
            '<div class="pd-item">' + I.server + 'production<span class="dot"></span></div>' +
            '<div class="pd-item">' + I.server + 'clients<span class="dot"></span></div>' +
            '<h6>Panel</h6>' +
            '<div class="pd-item">' + I.plug + 'Connections</div>' +
            '<div class="pd-item">' + I.user + 'Team</div>' +
            '<div class="pd-item">' + I.gear + 'Settings</div></nav>' +
            '<div class="pd-side-foot"><span>cipi/gui 4</span><span>Docs ↗</span></div></aside>' +
            '<header class="pd-top"><span class="pd-avatar">AA</span><span>Alice Admin</span></header>' +
            '<main class="pd-main">' +

            // dashboard
            '<section class="pd-screen" data-screen="dashboard"><div class="pd-h"><div><h3>Dashboard</h3><p>Live status of every connected Cipi server.</p></div>' +
            '<span class="pd-btn">' + I.refresh + 'Refresh</span></div>' +
            '<div class="pd-stats">' +
            '<div class="pd-card pd-stat"><small>Servers online</small><b>2<i> / 2</i></b><span>All reachable</span></div>' +
            '<div class="pd-card pd-stat"><small>Apps</small><b data-count="10">0</b><span>across 2 servers</span></div>' +
            '<div class="pd-card pd-stat"><small>Services running</small><b>11<i> / 11</i></b><span>nginx, databases, workers</span></div>' +
            '<div class="pd-card pd-stat"><small>Cipi version</small><b>5.10.0</b><span>Same on every server</span></div></div>' +
            '<div class="pd-servers">' + srv + '</div></section>' +

            // apps
            '<section class="pd-screen" data-screen="apps"><div class="pd-h"><div><h3>Apps</h3><p>Laravel, Node and custom PHP apps on every connected server.</p></div>' +
            '<div style="display:flex;gap:8px"><span class="pd-btn">' + I.refresh + 'Refresh</span><span class="pd-btn lime" data-pd="new-app">' + I.plus + 'New app</span></div></div>' +
            '<div class="pd-filters"><div class="pd-seg"><span class="on">All servers<em>10</em></span><span>production<em>6</em></span><span>clients<em>4</em></span></div>' +
            '<div class="pd-seg"><span class="on">All</span><span>Laravel</span><span>Node</span><span>Custom</span></div>' +
            '<div class="pd-search" data-pd="search">' + I.search + '<span class="typed"></span><span class="ph">Search name, domain, alias…</span></div></div>' +
            '<div class="pd-card"><table class="pd-table"><thead><tr><th>App</th><th>Server</th><th>Type</th><th>Runtime</th><th>Database</th><th>Branch</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +

            // deploy
            '<section class="pd-screen" data-screen="deploy"><div class="pd-crumb">Apps › production</div>' +
            '<div class="pd-app-h"><div><h3>shop</h3><div class="pd-app-tags">' + pill('● Live', 'ok') + pill('Laravel', 'lime') + pill('PHP 8.5 · Octane', 'plain') + pill('HTTPS', 'plain') + '<span class="pd-muted" style="margin-left:6px">shop.example.com</span></div></div>' +
            '<div style="display:flex;gap:8px"><span class="pd-btn lime">' + I.rocket + 'Deploy</span><span class="pd-btn">Actions ▾</span></div></div>' +
            '<div class="pd-tabs"><span>Overview</span><span>Domains &amp; SSL</span><span>Routing</span><span class="on">Deploy</span><span>cipi.yml</span><span>Environment</span><span>Artisan</span><span>Access</span><span>Logs</span></div>' +
            '<div class="pd-deploy"><div class="pd-card"><h4>Deploy</h4><div class="pd-muted" style="font-size:13px">Zero-downtime release from <span class="pd-mono">main</span>. Pushes deploy automatically through the webhook.</div>' +
            '<span class="pd-btn lime pd-wide" data-pd="deploy-now">' + I.rocket + '<span class="lbl">Deploy now</span></span>' +
            '<span class="pd-btn pd-wide">' + I.undo + 'Roll back</span>' +
            '<ul class="pd-steps" data-pd="steps"><li>Clone release 134</li><li>composer install</li><li>npm ci &amp;&amp; npm run build</li><li>DB snapshot + migrate</li><li>Swap symlink, reload Octane</li><li>Health check</li></ul></div>' +
            '<div class="pd-card" style="padding:0"><div style="padding:16px 18px 10px"><h4>Deploy audit</h4><div class="pd-muted" style="font-size:12.5px">Hash-chained ledger of every deploy — who or what started it, and from where.</div></div>' +
            '<table class="pd-table pd-audit"><thead><tr><th>When</th><th>Event</th><th>Release</th><th>Took</th><th>Origin</th><th>By</th></tr></thead><tbody data-pd="audit">' + auditRows + '</tbody></table></div></div></section>' +

            // new app
            '<section class="pd-screen" data-screen="create"><div class="pd-crumb">Apps › New app</div><div class="pd-h"><div><h3>New app</h3><p>An isolated Linux user, PHP pool, database and vhost on the server you pick.</p></div></div>' +
            '<div class="pd-card pd-form">' +
            '<div class="pd-field pd-span2"><label>Type</label><div class="pd-choice"><span class="on"><b>Laravel</b>PHP-FPM or Octane</span><span><b>Node</b>SPA, static or SSR</span><span><b>Custom</b>WordPress, plain PHP</span></div></div>' +
            '<div class="pd-field"><label>Server</label><div class="pd-input">production</div></div>' +
            '<div class="pd-field"><label>Name</label><div class="pd-input" data-pd="f-name"><span class="v"></span><span class="caret"></span><span class="ph">myapp</span></div></div>' +
            '<div class="pd-field"><label>Domain</label><div class="pd-input" data-pd="f-domain"><span class="v"></span><span class="caret"></span><span class="ph">myapp.com</span></div></div>' +
            '<div class="pd-field"><label>PHP</label><div class="pd-input">8.5</div></div>' +
            '<div class="pd-field pd-span2"><label>Repository (SSH)</label><div class="pd-input pd-mono" data-pd="f-repo"><span class="v"></span><span class="caret"></span><span class="ph">git@github.com:you/myapp.git</span></div></div>' +
            '<div class="pd-form-foot"><span class="pd-btn">Cancel</span><span class="pd-btn lime" data-pd="create">' + I.plus + 'Create app</span></div></div></section>' +

            '<div class="pd-toast" data-pd="toast">' + I.check + '<span>App <b>billing</b> created on production — deploy key added to GitHub.</span></div>' +
            '</main><div class="pd-cursor" data-pd="cursor">' + I.cursor + '</div></div></div></div>' +
            '<div class="pd-controls" role="group" aria-label="Panel screens">' +
            '<button type="button" data-go="dashboard">Dashboard</button><button type="button" data-go="apps">Apps</button>' +
            '<button type="button" data-go="deploy">Deploy</button><button type="button" data-go="create">New app</button>' +
            '<button type="button" class="pd-play" data-play>' + '<svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg><span>Pause tour</span></button></div>';
    }

    function meter(label, v, sub) {
        return '<div class="pd-meter"><small>' + label + ' <b>' + v + '%</b></small><div class="pd-bar"><i data-w="' + v + '"></i></div><span>' + (sub || '&nbsp;') + '</span></div>';
    }

    function auditRow(r) {
        var kind = { published: 'ok', rollback: 'warn', failed: 'err' }[r[1]];
        return '<tr><td>' + r[0] + '</td><td>' + pill(r[1], kind) + '</td><td class="pd-mono">' + r[2] + ' <span class="pd-muted">' + r[3] + '</span></td><td>' + r[4] + '</td><td>' + pill(r[5], 'plain') + '</td><td>' + r[6] + '</td></tr>';
    }

    function Demo(root) {
        this.root = root;
        root.classList.add('pd');
        root.innerHTML = tpl(root.getAttribute('data-domain') || 'panel.example.com');
        this.stage = root.querySelector('.pd-stage');
        this.viewport = root.querySelector('.pd-viewport');
        this.cursor = root.querySelector('[data-pd="cursor"]');
        this.token = 0;
        this.touring = false;
        this.fit();
        var self = this;
        if ('ResizeObserver' in window) new ResizeObserver(function () { self.fit(); }).observe(root);
        else window.addEventListener('resize', function () { self.fit(); });

        root.querySelectorAll('[data-go]').forEach(function (b) {
            b.addEventListener('click', function () { self.stop(); self.show(b.getAttribute('data-go'), true); });
        });
        this.playBtn = root.querySelector('[data-play]');
        this.playBtn.addEventListener('click', function () { self.touring ? self.stop() : self.tour(); });
        this.show(root.getAttribute('data-start') || 'dashboard', true);
        this.cursorAt(900, 600, true);
    }

    Demo.prototype.$ = function (k) { return this.root.querySelector('[data-pd="' + k + '"]'); };

    Demo.prototype.fit = function () {
        var w = this.viewport.clientWidth || this.root.clientWidth;
        this.scale = w / W;
        this.stage.style.transform = 'scale(' + this.scale + ')';
        this.viewport.style.height = Math.round(H * this.scale) + 'px';
    };

    Demo.prototype.show = function (name, settle) {
        var self = this;
        this.root.querySelectorAll('.pd-screen').forEach(function (s) { s.classList.toggle('on', s.getAttribute('data-screen') === name); });
        this.root.querySelectorAll('[data-go]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-go') === name)); });
        var navKey = name === 'dashboard' ? 'nav-dashboard' : 'nav-apps';
        this.root.querySelectorAll('.pd-item').forEach(function (i) { i.classList.toggle('on', i.getAttribute('data-pd') === navKey); });
        if (name === 'dashboard') {
            var bars = this.root.querySelectorAll('.pd-bar i');
            bars.forEach(function (b) { b.style.transition = 'none'; b.style.width = '0'; });
            var cnt = this.root.querySelector('[data-count]');
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    bars.forEach(function (b) { b.style.transition = ''; b.style.width = b.getAttribute('data-w') + '%'; });
                });
            });
            if (cnt) {
                var target = +cnt.getAttribute('data-count'), n = 0;
                if (reduce || settle === 'instant') cnt.textContent = target;
                else { var t = setInterval(function () { cnt.textContent = ++n; if (n >= target) clearInterval(t); }, 70); }
            }
        }
        if (settle) this.resetState(name);
    };

    Demo.prototype.resetState = function (name) {
        var typed = this.root.querySelector('.pd-search .typed');
        typed.textContent = '';
        this.root.querySelector('.pd-search .ph').style.display = '';
        this.root.querySelectorAll('.pd-table tr').forEach(function (r) { r.classList.remove('hide'); });
        var steps = this.$('steps');
        steps.querySelectorAll('li').forEach(function (li) { li.className = ''; });
        var btn = this.$('deploy-now');
        btn.classList.remove('busy'); btn.querySelector('.lbl').textContent = 'Deploy now';
        var tb = this.$('audit');
        tb.querySelectorAll('tr.new').forEach(function (r) { r.remove(); });
        ['f-name', 'f-domain', 'f-repo'].forEach(function (k) {
            var f = this.$(k); f.classList.remove('focus'); f.querySelector('.v').textContent = ''; f.querySelector('.ph').style.display = '';
        }, this);
        this.$('toast').classList.remove('on');
        if (name === 'create' && !this.touring) {
            this.fill('f-name', 'billing'); this.fill('f-domain', 'billing.example.com'); this.fill('f-repo', 'git@github.com:acme/billing.git');
        }
    };

    Demo.prototype.fill = function (k, v) {
        var f = this.$(k); f.querySelector('.v').textContent = v; f.querySelector('.ph').style.display = 'none';
    };

    Demo.prototype.cursorAt = function (x, y, instant) {
        var c = this.cursor;
        if (instant) { c.style.transition = 'none'; }
        c.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        if (instant) { c.offsetWidth; c.style.transition = ''; }
    };

    Demo.prototype.moveTo = function (el) {
        var sr = this.stage.getBoundingClientRect(), r = el.getBoundingClientRect();
        var x = (r.left - sr.left + r.width * 0.5) / this.scale;
        var y = (r.top - sr.top + r.height * 0.55) / this.scale;
        this.cursorAt(x, y);
    };

    Demo.prototype.click = function (el) {
        var c = this.cursor;
        c.classList.remove('click'); c.offsetWidth; c.classList.add('click');
        if (el) { el.classList.add('pressed'); setTimeout(function () { el.classList.remove('pressed'); }, 160); }
    };

    Demo.prototype.wait = function (ms, tk) {
        var self = this;
        return new Promise(function (res, rej) { setTimeout(function () { tk === self.token ? res() : rej('stop'); }, ms); });
    };

    Demo.prototype.type = async function (el, text, tk) {
        var v = el.querySelector('.v') || el;
        var ph = el.querySelector('.ph'); if (ph) ph.style.display = 'none';
        for (var i = 0; i < text.length; i++) { v.textContent += text[i]; await this.wait(45 + Math.random() * 45, tk); }
    };

    Demo.prototype.stop = function () {
        this.token++;
        this.touring = false;
        this.cursor.style.opacity = '0';
        this.playBtn.querySelector('span').textContent = 'Play tour';
    };

    Demo.prototype.tour = async function () {
        var tk = ++this.token, self = this;
        this.touring = true;
        this.cursor.style.opacity = '1';
        this.playBtn.querySelector('span').textContent = 'Pause tour';
        try {
            while (true) {
                this.show('dashboard', true);
                await this.wait(3200, tk);
                // → Apps
                this.moveTo(this.$('nav-apps')); await this.wait(900, tk);
                this.click(); this.show('apps', true); await this.wait(1100, tk);
                // search
                this.moveTo(this.$('search')); await this.wait(900, tk); this.click();
                var typed = this.root.querySelector('.pd-search .typed');
                this.root.querySelector('.pd-search .ph').style.display = 'none';
                await this.type(typed, 'shop', tk);
                this.root.querySelectorAll('.pd-table tbody tr').forEach(function (r) {
                    r.classList.toggle('hide', (r.getAttribute('data-app') || '').indexOf('shop') !== 0);
                });
                await this.wait(900, tk);
                // → Manage shop → deploy
                this.moveTo(this.$('manage-shop')); await this.wait(900, tk);
                this.click(this.$('manage-shop')); await this.wait(250, tk);
                this.show('deploy', true); await this.wait(1000, tk);
                var btn = this.$('deploy-now');
                this.moveTo(btn); await this.wait(900, tk); this.click(btn);
                btn.classList.add('busy'); btn.querySelector('.lbl').textContent = 'Deploying…';
                var lis = this.$('steps').querySelectorAll('li');
                for (var i = 0; i < lis.length; i++) {
                    lis[i].className = 'run'; await this.wait(i === 1 || i === 2 ? 950 : 650, tk); lis[i].className = 'done';
                }
                btn.classList.remove('busy'); btn.querySelector('.lbl').textContent = 'Deploy now';
                var tb = this.$('audit');
                var tmp = document.createElement('tbody');
                tmp.innerHTML = auditRow(['just now', 'published', '134', 'f81c2d0', '58s', 'panel', 'alice']);
                var row = tmp.firstChild; row.classList.add('new'); tb.insertBefore(row, tb.firstChild);
                await this.wait(2600, tk);
                // → New app
                this.moveTo(this.$('nav-apps')); await this.wait(900, tk); this.click();
                this.show('apps', true); await this.wait(700, tk);
                this.moveTo(this.$('new-app')); await this.wait(900, tk); this.click(this.$('new-app'));
                this.show('create', true); await this.wait(800, tk);
                var fields = [['f-name', 'billing'], ['f-domain', 'billing.example.com'], ['f-repo', 'git@github.com:acme/billing.git']];
                for (var f = 0; f < fields.length; f++) {
                    var el = this.$(fields[f][0]);
                    this.moveTo(el); await this.wait(750, tk); this.click();
                    el.classList.add('focus'); await this.type(el, fields[f][1], tk); el.classList.remove('focus');
                }
                var cr = this.$('create');
                this.moveTo(cr); await this.wait(800, tk); this.click(cr);
                await this.wait(400, tk); this.$('toast').classList.add('on');
                await this.wait(3000, tk);
                this.moveTo(this.$('nav-dashboard')); await this.wait(900, tk); this.click();
            }
        } catch (e) { /* stopped */ }
    };

    function init(el) {
        if (el._demo) return;
        var d = new Demo(el);
        el._demo = d;
        if (reduce || el.getAttribute('data-tour') === 'off') { d.stop(); return; }
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (es) {
                es.forEach(function (e) {
                    if (e.isIntersecting && !d.touring && !d.userStopped) d.tour();
                    if (!e.isIntersecting && d.touring) { d.stop(); d.userStopped = false; }
                });
            }, { threshold: 0.4 });
            io.observe(el);
            el.addEventListener('click', function (ev) { if (ev.target.closest('[data-go]')) d.userStopped = true; });
        } else d.tour();
    }

    document.querySelectorAll('[data-panel-demo]').forEach(init);
    window.CipiPanel = { init: init };
})();

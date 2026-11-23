/* Cipi — animated terminal player.
 *
 * <div class="term" data-term data-autoplay="view|load|manual" data-loop="4000">
 *   <div class="term-bar">…</div>
 *   <pre class="term-body"></pre>
 *   <script type="application/json" class="term-script">[ … ]</script>
 * </div>
 *
 * Script steps:
 *   {"c": "cipi deploy shop", "p": "cipi@srv:~$"}   typed command (prompt optional; default from data-prompt)
 *   {"o": "text" | [["seg","cls"], …], "d": 60}     printed output line, d = delay before it (ms)
 *   {"wait": 800}                                     pause
 *   {"bar": "Deploying", "ms": 1600}                  animated progress bar line
 *   {"ev": "name"}                                    dispatches "term:event" {detail:{name}} on the element
 *   {"clear": true}                                   clears the screen
 * Reduced motion: the whole script is rendered at once and every event fires.
 */
(function () {
    'use strict';

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function promptHTML(p) {
        // "cipi@srv:~$" -> user@host in lime, path in cyan
        var m = /^(.*?@[^:]+)(:)([^$#]*)([$#])$/.exec(p);
        if (!m) return '<span class="term-prompt">' + esc(p) + '</span> ';
        return '<span class="term-prompt">' + esc(m[1]) + '</span>' + esc(m[2]) +
            '<span class="term-path">' + esc(m[3]) + '</span>' + esc(m[4]) + ' ';
    }

    function outHTML(o) {
        if (typeof o === 'string') return esc(o);
        return o.map(function (seg) {
            if (typeof seg === 'string') return esc(seg);
            return seg[1] ? '<span class="' + seg[1].split(' ').map(function (c) { return 't-' + c; }).join(' ') + '">' + esc(seg[0]) + '</span>' : esc(seg[0]);
        }).join('');
    }

    function Player(el) {
        this.el = el;
        this.body = el.querySelector('.term-body');
        var src = el.querySelector('.term-script');
        try { this.script = JSON.parse(src.textContent); } catch (e) { this.script = []; }
        this.prompt = el.getAttribute('data-prompt') || 'cipi@server:~$';
        this.loop = el.hasAttribute('data-loop') ? parseInt(el.getAttribute('data-loop') || '4000', 10) : -1;
        this.speed = parseFloat(el.getAttribute('data-speed') || '1');
        this.token = 0;
        this.running = false;
        this.bindControls();
    }

    Player.prototype.bindControls = function () {
        var self = this;
        var replay = this.el.querySelector('[data-term-replay]');
        if (replay) replay.addEventListener('click', function () { self.play(); });
        var copy = this.el.querySelector('[data-term-copy]');
        if (copy) copy.addEventListener('click', function () {
            var cmds = self.script.filter(function (s) { return s.c && !s.nocopy; }).map(function (s) { return s.c; });
            copyText(cmds.join('\n'), copy);
        });
        this.body.addEventListener('click', function () {
            if (self.running) self.finish();
        });
    };

    Player.prototype.emit = function (name) {
        this.el.dispatchEvent(new CustomEvent('term:event', { detail: { name: name }, bubbles: true }));
    };

    Player.prototype.line = function (html) {
        var span = document.createElement('span');
        span.className = 'term-line';
        span.innerHTML = html;
        this.body.appendChild(span);
        this.body.scrollTop = this.body.scrollHeight;
        return span;
    };

    Player.prototype.sleep = function (ms, token) {
        var self = this;
        return new Promise(function (resolve, reject) {
            setTimeout(function () { token === self.token ? resolve() : reject('stop'); }, ms / self.speed);
        });
    };

    Player.prototype.renderAll = function () {
        var self = this;
        this.body.innerHTML = '';
        this.emit('reset');
        this.script.forEach(function (s) {
            if (s.clear) { self.body.innerHTML = ''; return; }
            if (s.c) self.line(promptHTML(s.p || self.prompt) + '<span class="term-cmd">' + esc(s.c) + '</span>');
            if (s.o !== undefined) self.line(outHTML(s.o));
            if (s.bar) self.line('<span class="t-dim">' + esc(s.bar) + '</span><span class="term-progress" style="--p:1"></span> <span class="t-ok">done</span>');
            if (s.ev) self.emit(s.ev);
        });
        this.line(promptHTML(this.prompt) + '<span class="term-caret"></span>');
        this.el.setAttribute('data-state', 'done');
    };

    Player.prototype.finish = function () {
        this.token++;
        this.running = false;
        this.renderAll();
    };

    Player.prototype.play = async function () {
        var token = ++this.token;
        var self = this;
        this.running = true;
        this.el.setAttribute('data-state', 'playing');
        this.body.innerHTML = '';
        this.emit('reset');
        try {
            await this.sleep(350, token);
            for (var i = 0; i < this.script.length; i++) {
                var s = this.script[i];
                if (s.clear) { this.body.innerHTML = ''; continue; }
                if (s.wait) { await this.sleep(s.wait, token); }
                if (s.ev) { this.emit(s.ev); }
                if (s.c) {
                    var ln = this.line(promptHTML(s.p || this.prompt) + '<span class="term-cmd"></span><span class="term-caret"></span>');
                    var cmd = ln.querySelector('.term-cmd');
                    await this.sleep(380, token);
                    for (var k = 0; k < s.c.length; k++) {
                        cmd.textContent += s.c[k];
                        await this.sleep(s.c.length > 60 ? 14 : 34 + Math.random() * 40, token);
                    }
                    await this.sleep(320, token);
                    var caret = ln.querySelector('.term-caret');
                    if (caret) caret.remove();
                }
                if (s.o !== undefined) {
                    await this.sleep(s.d !== undefined ? s.d : 70, token);
                    this.line(outHTML(s.o));
                }
                if (s.bar) {
                    var bl = this.line('<span class="t-dim">' + esc(s.bar) + '</span><span class="term-progress"></span> <span class="t-dim pct">0%</span>');
                    var bar = bl.querySelector('.term-progress');
                    var pct = bl.querySelector('.pct');
                    var total = s.ms || 1400, steps = 24;
                    for (var j = 1; j <= steps; j++) {
                        await this.sleep(total / steps, token);
                        bar.style.setProperty('--p', (j / steps).toFixed(3));
                        pct.textContent = Math.round(j / steps * 100) + '%';
                    }
                    pct.className = 't-ok';
                    pct.textContent = 'done';
                }
            }
            this.line(promptHTML(this.prompt) + '<span class="term-caret"></span>');
            this.running = false;
            this.el.setAttribute('data-state', 'done');
            this.emit('done');
            if (this.loop >= 0) {
                await this.sleep(this.loop, token);
                if (!document.hidden) this.play();
            }
        } catch (e) { /* superseded */ }
    };

    function copyText(text, btn) {
        var done = function () {
            btn.setAttribute('data-copied', '');
            var label = btn.querySelector('.label');
            var old = label ? label.textContent : '';
            if (label) label.textContent = 'Copied';
            setTimeout(function () { btn.removeAttribute('data-copied'); if (label) label.textContent = old; }, 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done, done);
        } else {
            var ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            ta.remove(); done();
        }
    }
    window.cipiCopy = copyText;

    function init(el) {
        if (el._player) return el._player;
        var p = new Player(el);
        el._player = p;
        var mode = el.getAttribute('data-autoplay') || 'view';
        if (reduce) { p.renderAll(); return p; }
        if (mode === 'load') { p.play(); }
        else if (mode === 'view' && 'IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (en.isIntersecting) { io.disconnect(); p.play(); }
                });
            }, { threshold: 0.35 });
            io.observe(el);
        } else if (mode !== 'manual') { p.play(); }
        else { p.renderAll(); }
        return p;
    }

    window.CipiTerm = { init: init };
    document.querySelectorAll('[data-term]').forEach(init);
})();

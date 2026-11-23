/* Postcards: refresh the wall from /data/postcards.json, provider filter,
   region suggestions and client-side checks that mirror the server ones. */
(function () {
  'use strict';
  var grid = document.querySelector('[data-pc-grid]');
  var filter = document.querySelector('[data-pc-filter]');
  var stats = document.querySelector('[data-pc-stats]');
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|dev|app|xyz|ru|cn|top|info|biz|link|site|online|shop)\b|@[a-z0-9-]+\.[a-z])/i;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function niceDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? MONTHS[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1] : '';
  }
  function card(c) {
    var a = el('article', 'pc');
    a.setAttribute('data-provider', c.provider);
    var msg = el('div', 'pc-msg');
    msg.appendChild(el('p', null, c.message));
    msg.appendChild(el('p', 'pc-sig', (c.name || 'Anonymous') + (c.city ? ', ' + c.city : '')));
    var side = el('div', 'pc-side');
    var st = el('div', 'pc-stamp');
    st.appendChild(el('span', 'pc-stamp-p', c.provider));
    var n = parseInt(c.apps, 10) || 0;
    st.appendChild(el('span', 'pc-stamp-n', n ? n + (n === 1 ? ' app' : ' apps') : '♥'));
    var mk = el('div', 'pc-mark');
    mk.appendChild(el('span', null, c.region || 'On the map'));
    mk.appendChild(el('span', null, niceDate(c.date)));
    var to = el('div', 'pc-to');
    to.appendChild(el('span', null, 'To: Cipi'));
    to.appendChild(el('span', null, 'Somewhere in the cloud'));
    side.appendChild(st); side.appendChild(mk); side.appendChild(to);
    a.appendChild(msg); a.appendChild(side);
    return a;
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function setStats(list) {
    if (!stats || !list.length) return;
    var p = {}, r = {};
    list.forEach(function (c) { p[c.provider] = 1; if (c.region) r[c.provider + '|' + c.region] = 1; });
    stats.textContent = '';
    [[list.length, 'postcard'], [Object.keys(p).length, 'provider'], [Object.keys(r).length, 'region']].forEach(function (x, i) {
      if (i) stats.appendChild(document.createTextNode(' · '));
      var s = el('strong', null, String(x[0]));
      stats.appendChild(s);
      stats.appendChild(document.createTextNode(' ' + x[1] + (x[0] === 1 ? '' : 's')));
    });
    stats.hidden = false;
  }
  function setFilter() {
    if (!filter || !grid) return;
    var cards = grid.querySelectorAll('.pc[data-provider]');
    var counts = {};
    cards.forEach(function (c) { var p = c.getAttribute('data-provider'); counts[p] = (counts[p] || 0) + 1; });
    var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
    filter.textContent = '';
    if (names.length < 2) { filter.hidden = true; return; }
    ['All'].concat(names).forEach(function (name) {
      var b = el('button', null, name === 'All' ? 'All (' + cards.length + ')' : name + ' (' + counts[name] + ')');
      b.type = 'button';
      b.setAttribute('aria-pressed', name === 'All' ? 'true' : 'false');
      b.addEventListener('click', function () {
        filter.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        cards.forEach(function (c) { c.hidden = name !== 'All' && c.getAttribute('data-provider') !== name; });
      });
      filter.appendChild(b);
    });
    filter.hidden = false;
  }

  if (grid) {
    setFilter();
    fetch('/data/postcards.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (list) {
      if (!Array.isArray(list) || !list.length) return;
      if (list.length === +grid.getAttribute('data-count')) return;
      grid.textContent = '';
      list.forEach(function (c) { if (c && c.provider && c.message) grid.appendChild(card(c)); });
      grid.setAttribute('data-count', String(list.length));
      setStats(list);
      setFilter();
    }).catch(function () {});
  }

  // form helpers
  var form = document.querySelector('[data-pc-form]');
  if (!form) return;
  var prov = form.querySelector('[data-pc-provider]');
  var region = form.querySelector('[data-pc-region]');
  var list = document.getElementById('pc-regions');
  var msg = form.querySelector('[data-pc-message]');
  var count = form.querySelector('[data-pc-count]');
  var err = form.querySelector('[data-pc-err]');
  var regions = {};
  try { regions = JSON.parse(form.getAttribute('data-regions') || '{}'); } catch (x) {}
  function fillRegions() {
    list.textContent = '';
    (regions[prov.value] || []).forEach(function (r) { var o = document.createElement('option'); o.value = r; list.appendChild(o); });
    var free = prov.value === 'Own hardware' || prov.value === 'Other';
    region.required = !free;
    region.placeholder = free ? 'optional' : ((regions[prov.value] || [])[0] ? 'e.g. ' + regions[prov.value][0] : 'e.g. Frankfurt');
  }
  prov.addEventListener('change', fillRegions); fillRegions();
  function updateCount() { count.textContent = msg.value.length + ' / 280'; }
  msg.addEventListener('input', updateCount); updateCount();
  form.addEventListener('submit', function (e) {
    var bad = '';
    ['name', 'city', 'region', 'message'].forEach(function (k) { if (!bad && LINK_RE.test(form.elements[k].value)) bad = 'Please remove links and addresses: postcards are text only.'; });
    if (!bad && /[<>]/.test(msg.value)) bad = 'Please remove the < and > characters.';
    if (bad) { e.preventDefault(); err.textContent = bad; err.hidden = false; err.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    else err.hidden = true;
  });
})();

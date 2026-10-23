/* ساعت عنکبوتی: پاهای عنکبوت عقربه‌اند (ساعت، دقیقه، ثانیه) — به وقت تهران */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', C = 200;
  var svg = document.getElementById('spiderClock');
  if (!svg) return;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function fa(n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function pt(r, deg) { var a = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; }
  function f(n) { return n.toFixed(1); }

  // رنگ‌ها
  var defs = el('defs', {}, svg);
  var gold = el('linearGradient', { id: 'sc-gold', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': '#f6e6c1' }, gold);
  el('stop', { offset: '.55', 'stop-color': '#d9ae62' }, gold);
  el('stop', { offset: '1', 'stop-color': '#b8873f' }, gold);
  var body = el('radialGradient', { id: 'sc-body', cx: '.4', cy: '.35', r: '.8' }, defs);
  el('stop', { offset: '0', 'stop-color': '#fff1cc' }, body);
  el('stop', { offset: '.6', 'stop-color': '#d9ae62' }, body);
  el('stop', { offset: '1', 'stop-color': '#8a5f24' }, body);
  var glow = el('radialGradient', { id: 'sc-glow', cx: '.5', cy: '.5', r: '.5' }, defs);
  el('stop', { offset: '0', 'stop-color': '#b8873f', 'stop-opacity': '.28' }, glow);
  el('stop', { offset: '1', 'stop-color': '#b8873f', 'stop-opacity': '0' }, glow);

  el('circle', { cx: C, cy: C, r: 150, fill: 'url(#sc-glow)' }, svg);

  // تار عنکبوت
  var web = el('g', { fill: 'none', stroke: 'url(#sc-gold)', 'stroke-width': '.9', opacity: '.5', 'stroke-linecap': 'round' }, svg);
  var N = 12, rings = [30, 54, 80, 108], d = '', i, j;
  for (i = 0; i < N; i++) { var a = pt(12, i * 30), b = pt(112, i * 30); d += 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]); }
  rings.forEach(function (r) {
    for (j = 0; j < N; j++) {
      var p1 = pt(r, j * 30), p2 = pt(r, (j + 1) * 30), m = pt(r * 0.86, j * 30 + 15);
      d += 'M' + f(p1[0]) + ' ' + f(p1[1]) + 'Q' + f(m[0]) + ' ' + f(m[1]) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
  });
  el('path', { d: d }, web);

  // حلقهٔ نشانه‌ها: ۶۰ خط کوتاه و ۱۲ خط بلند
  var circ = 2 * Math.PI * 138;
  el('circle', { cx: C, cy: C, r: 148, fill: 'none', stroke: '#b8873f', 'stroke-width': '.8', opacity: '.55' }, svg);
  el('circle', { cx: C, cy: C, r: 138, fill: 'none', stroke: '#d9ae62', 'stroke-width': '7', opacity: '.7',
    'stroke-dasharray': '1.6 ' + f(circ / 60 - 1.6), 'stroke-dashoffset': '0.8', transform: 'rotate(-90 ' + C + ' ' + C + ')' }, svg);
  el('circle', { cx: C, cy: C, r: 138, fill: 'none', stroke: 'url(#sc-gold)', 'stroke-width': '13',
    'stroke-dasharray': '3 ' + f(circ / 12 - 3), 'stroke-dashoffset': '1.5', transform: 'rotate(-90 ' + C + ' ' + C + ')' }, svg);

  // اعداد (فارسی)
  for (i = 1; i <= 12; i++) {
    var p = pt(174, i * 30);
    var t = el('text', { x: f(p[0]), y: f(p[1]), 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'url(#sc-gold)',
      'font-size': '26', 'font-weight': '900', 'font-family': "Vazirmatn,Tahoma,sans-serif" }, svg);
    t.textContent = fa(i);
  }

  // پاهای ثابت (۵ تا) — ۳ پای دیگر عقربه‌اند
  var legs = el('g', { fill: 'none', stroke: 'url(#sc-gold)', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '.92' }, svg);
  [62, 112, 205, 248, 300].forEach(function (th) {
    var s = th > 180 ? -1 : 1;
    var p0 = pt(9, th), p1 = pt(34, th), k2 = th + s * 38;
    var v = [C + 30 * Math.cos((k2 - 90) * Math.PI / 180), C + 30 * Math.sin((k2 - 90) * Math.PI / 180)];
    var p2 = [p1[0] + (v[0] - C), p1[1] + (v[1] - C)];
    var k3 = th + s * 95;
    var p3 = [p2[0] + 22 * Math.cos((k3 - 90) * Math.PI / 180), p2[1] + 22 * Math.sin((k3 - 90) * Math.PI / 180)];
    el('path', { d: 'M' + f(p0[0]) + ' ' + f(p0[1]) + 'L' + f(p1[0]) + ' ' + f(p1[1]) + 'L' + f(p2[0]) + ' ' + f(p2[1]) + 'L' + f(p3[0]) + ' ' + f(p3[1]) }, legs);
  });

  // عقربه‌ها (هر کدام یک پای عنکبوت)
  function hand(path, w, cls) {
    var g = el('g', { class: 'sc-hand ' + cls }, svg);
    el('path', { d: path, fill: 'none', stroke: 'url(#sc-gold)', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    return g;
  }
  var hH = hand('M0 0L-7 -30L0 -80', 5.2, 'sc-h');
  var hM = hand('M0 0L6 -48L0 -124', 3.6, 'sc-m');
  var hS = hand('M0 22L0 0L0 -138', 1.7, 'sc-s');
  [hH, hM, hS].forEach(function (g) { g.setAttribute('transform', 'translate(' + C + ' ' + C + ')'); });

  // بدن عنکبوت
  el('ellipse', { cx: C, cy: C + 17, rx: 11, ry: 15, fill: 'url(#sc-body)', stroke: '#8a5f24', 'stroke-width': '.8' }, svg);
  el('circle', { cx: C, cy: C - 4, r: 8, fill: 'url(#sc-body)', stroke: '#8a5f24', 'stroke-width': '.8' }, svg);
  el('circle', { cx: C - 3, cy: C - 7, r: 1.3, fill: '#2a1a05' }, svg);
  el('circle', { cx: C + 3, cy: C - 7, r: 1.3, fill: '#2a1a05' }, svg);
  el('circle', { cx: C, cy: C, r: 3, fill: '#2a1a05', opacity: '.55' }, svg);

  // به‌روزرسانی: زاویه‌های تجمعی تا چرخش برگشتی رخ ندهد
  var last = { s: -1, m: -1, h: -1 };
  function rot(g, deg, instant) {
    g.style.transition = instant ? 'none' : '';
    g.setAttribute('transform', 'translate(' + C + ' ' + C + ') rotate(' + deg.toFixed(2) + ')');
  }
  function update(n) {
    var secTotal = n.h * 3600 + n.mi * 60 + n.s;
    var sd = secTotal * 6, md = (n.h * 60 + n.mi) * 6 + n.s * 0.1, hd = ((n.h % 12) * 60 + n.mi) * 0.5 + n.s / 120;
    var back = secTotal < last.s;
    rot(hS, sd, back); rot(hM, md, back); rot(hH, hd, back);
    last.s = secTotal;
  }
  window.SpiderClock = { update: update };
})();

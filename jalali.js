/* تبدیل تاریخ شمسی و میلادی + ساعت تهران (بدون وابستگی) */
(function (root) {
  'use strict';

  var BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  function jalCal(jy, withoutLeap) {
    var bl = BREAKS.length, gy = jy + 621, leapJ = -14, jp = BREAKS[0], jm, jump = 0, leap, leapG, march, n, i;
    if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error('Invalid Jalali year ' + jy);
    for (i = 1; i < bl; i += 1) {
      jm = BREAKS[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;
    if (withoutLeap) return { gy: gy, march: march };
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap: leap, gy: gy, march: march };
  }

  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308;
    var gd = div(mod(i, 153), 5) + 1;
    var gm = mod(div(i, 153), 12) + 1;
    var gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }

  function j2d(jy, jm, jd) {
    var r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy, false), jdn1f = g2d(gy, 3, r.march), jd, jm, k;
    k = jdn - jdn1f;
    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
        return { jy: jy, jm: jm, jd: jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }

  function isLeap(jy) { return jalCal(jy, false).leap === 0; }

  function monthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isLeap(jy) ? 30 : 29;
  }

  function toJalali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
  function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }

  /* روز هفته: شنبه = ۰ ... جمعه = ۶ */
  function weekday(jdn) { return mod(jdn + 2, 7); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(jy, jm, jd) { return jy + '-' + pad(jm) + '-' + pad(jd); }

  function parse(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
    if (!m) return null;
    var jy = +m[1], jm = +m[2], jd = +m[3];
    if (jm < 1 || jm > 12 || jd < 1 || jy < 1300 || jy > 1600) return null;
    if (jd > monthLength(jy, jm)) return null;
    return { jy: jy, jm: jm, jd: jd };
  }

  function jdnOfStr(str) {
    var p = parse(str);
    return p ? j2d(p.jy, p.jm, p.jd) : null;
  }

  function strOfJdn(jdn) {
    var j = d2j(jdn);
    return fmt(j.jy, j.jm, j.jd);
  }

  /* زمان فعلی به وقت تهران (مستقل از ساعت و منطقهٔ زمانی گوشی) */
  var tehranFmt = null;
  function tehranNow(date) {
    date = date || new Date();
    if (!tehranFmt) {
      tehranFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tehran', hourCycle: 'h23',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric'
      });
    }
    var o = {};
    tehranFmt.formatToParts(date).forEach(function (p) { o[p.type] = parseInt(p.value, 10); });
    var j = toJalali(o.year, o.month, o.day);
    return {
      jy: j.jy, jm: j.jm, jd: j.jd,
      h: o.hour % 24, mi: o.minute, s: o.second,
      jdn: g2d(o.year, o.month, o.day)
    };
  }

  var api = {
    toJalali: toJalali, toGregorian: toGregorian, monthLength: monthLength, isLeap: isLeap,
    jdn: j2d, fromJdn: d2j, weekday: weekday, fmt: fmt, parse: parse, pad: pad,
    jdnOfStr: jdnOfStr, strOfJdn: strOfJdn, tehranNow: tehranNow, gregorianJdn: g2d
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Jalali = api;
})(typeof window !== 'undefined' ? window : this);

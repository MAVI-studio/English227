(function () {
  'use strict';

  var CFG = window.SITE_CONFIG, J = window.Jalali;

  /* ---------- ثابت‌ها ---------- */
  var TYPES = {
    exam:     { label: 'امتحان',  plural: 'امتحان‌ها',  icon: '📝' },
    homework: { label: 'تکلیف',   plural: 'تکلیف‌ها',   icon: '📚' },
    question: { label: 'پرسش',    plural: 'پرسش‌ها',    icon: '❓' },
    other:    { label: 'اطلاعیه', plural: 'اطلاعیه‌ها', icon: '📌' }
  };
  var TYPE_KEYS = ['exam', 'homework', 'question', 'other'];
  var WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  var WD_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

  /* ---------- ابزارها ---------- */
  function $(id) { return document.getElementById(id); }
  function fa(n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function en(s) { return String(s).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }); }
  function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      if (k === 'class') el.className = props[k];
      else if (k === 'text') el.textContent = props[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), props[k]);
      else el.setAttribute(k, props[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function dateLabel(jdn, withWeekday) {
    var j = J.fromJdn(jdn);
    return (withWeekday ? WEEKDAYS[J.weekday(jdn)] + ' ' : '') + fa(j.jd) + ' ' + MONTHS[j.jm - 1] + ' ' + fa(j.jy);
  }
  function relLabel(diff) {
    if (diff === 0) return 'امروز';
    if (diff === 1) return 'فردا';
    if (diff === 2) return 'پس‌فردا';
    if (diff < 0) return fa(-diff) + ' روز پیش';
    return fa(diff) + ' روز دیگر';
  }
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function strHash(s) { var x = 5381; for (var i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return String(x); }

  /* ---------- وضعیت ---------- */
  var state = {
    data: { items: [], schedule: {} },
    mode: 'server',            // server | local
    view: null,                // ماه نمایش‌داده‌شده {jy,jm}
    selected: null,            // jdn روز انتخابی
    hidden: {},                // نوع‌های پنهان در تقویم
    dayOffset: 1,
    now: J.tehranNow(),
    pass: null,
    adminTab: 'exam',
    editing: null,
    schedDay: 0
  };
  try { state.pass = sessionStorage.getItem('sc_pass'); } catch (e) {}

  /* ---------- لایهٔ داده ---------- */
  var LS_KEY = CFG.STORAGE_KEY || 'sc_local_data_v1';

  function normalize(d) {
    d = d || {};
    return { items: Array.isArray(d.items) ? d.items : [], schedule: d.schedule && typeof d.schedule === 'object' ? d.schedule : {} };
  }
  function localLoad() {
    try { var raw = localStorage.getItem(LS_KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) {}
    return null;
  }
  function localSave() { try { localStorage.setItem(LS_KEY, JSON.stringify(state.data)); } catch (e) {} }

  function seedDemo() {
    if (window.SITE_SEED) return JSON.parse(JSON.stringify(window.SITE_SEED));
    var t = J.tehranNow().jdn, S = J.strOfJdn;
    return {
      items: [
        { id: 'd1', type: 'exam', title: 'امتحان ریاضی – فصل ۳', subject: 'ریاضی', date: S(t + 3), desc: 'از ابتدای فصل تا آخر تمرین‌های صفحهٔ ۵۸' },
        { id: 'd2', type: 'homework', title: 'تمرین‌های صفحهٔ ۴۲', subject: 'علوم', date: S(t + 1), desc: 'سؤال‌های ۱ تا ۸' },
        { id: 'd3', type: 'question', title: 'پرسش شفاهی ادبیات', subject: 'ادبیات', date: S(t + 1), desc: 'شعر حفظی درس ۴' },
        { id: 'd4', type: 'other', title: 'اردوی کلاسی', subject: '', date: S(t + 6), desc: 'لباس ورزشی همراه داشته باشید' },
        { id: 'd5', type: 'homework', title: 'انشا دربارهٔ تابستان', subject: 'ادبیات', date: S(t + 8), desc: '' }
      ],
      schedule: {
        0: [{ time: '۰۸:۰۰', subject: 'ریاضی' }, { time: '۰۹:۰۰', subject: 'علوم' }, { time: '۱۰:۱۵', subject: 'ادبیات' }],
        1: [{ time: '۰۸:۰۰', subject: 'انگلیسی' }, { time: '۰۹:۰۰', subject: 'اجتماعی' }, { time: '۱۰:۱۵', subject: 'ورزش' }],
        2: [{ time: '۰۸:۰۰', subject: 'ریاضی' }, { time: '۰۹:۰۰', subject: 'قرآن' }],
        3: [{ time: '۰۸:۰۰', subject: 'علوم' }, { time: '۰۹:۰۰', subject: 'ادبیات' }, { time: '۱۰:۱۵', subject: 'هنر' }],
        4: [{ time: '۰۸:۰۰', subject: 'انگلیسی' }, { time: '۰۹:۰۰', subject: 'ریاضی' }]
      }
    };
  }

  function apiUrl(q) { return CFG.API_URL + (q || ''); }

  function fetchJSON(url, opts) {
    return fetch(url, opts).then(function (r) {
      return r.text().then(function (txt) {
        var j;
        try { j = JSON.parse(txt); } catch (e) { throw new Error('bad-json'); }
        if (!r.ok) { var err = new Error(j.error || 'http'); err.status = r.status; err.body = j; throw err; }
        return j;
      });
    });
  }

  /* ---- Supabase (دیتابیس اصلی) ---- */
  function useSB() { return !!(CFG.SUPABASE_URL && CFG.SUPABASE_KEY); }
  function sb(path, opts) {
    opts = opts || {};
    var headers = { apikey: CFG.SUPABASE_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_KEY, 'Content-Type': 'application/json' };
    return fetch(CFG.SUPABASE_URL + '/rest/v1/' + path, { method: opts.method || 'GET', headers: headers, cache: 'no-store', body: opts.body }).then(function (r) {
      return r.text().then(function (txt) {
        var j = null;
        if (txt) { try { j = JSON.parse(txt); } catch (e) { throw new Error('bad-json'); } }
        if (!r.ok) {
          var err = new Error((j && j.message) || 'http');
          err.status = (j && (j.code === '28000' || /unauthorized/.test(j.message || ''))) ? 401 : r.status;
          throw err;
        }
        return j;
      });
    });
  }
  function rpc(name, args) { return sb('rpc/' + name, { method: 'POST', body: JSON.stringify(args) }); }

  function loadFromSB() {
    return Promise.all([sb('items?select=*&order=date.asc'), sb('schedule?select=*')]).then(function (res) {
      var items = (res[0] || []).map(function (r) { var o = { id: r.id, type: r.type, title: r.title, subject: r.subject || '', date: r.date, desc: r.descr || '' }; if (r.pin) o.pin = true; return o; });
      var sch = {};
      (res[1] || []).forEach(function (r) { if (Array.isArray(r.rows) && r.rows.length) sch[r.weekday] = r.rows; });
      state.mode = 'server';
      state.data = normalize({ items: items, schedule: sch });
    });
  }

  function loadData() {
    if (useSB()) {
      return loadFromSB().catch(function () {
        if (state.mode !== 'server') state.mode = 'offline';
      });
    }
    if (!CFG.API_URL) {
      state.mode = 'local';
      var l0 = localLoad();
      state.data = l0 || seedDemo();
      return Promise.resolve();
    }
    return fetchJSON(apiUrl('?action=data&_=' + Date.now()), { cache: 'no-store' }).then(function (j) {
      if (!j || !Array.isArray(j.items)) throw new Error('bad-shape');
      state.mode = 'server';
      state.data = normalize(j);
    }).catch(function () {
      state.mode = 'local';
      var l = localLoad();
      if (!l) { l = seedDemo(); state.data = l; localSave(); } else state.data = l;
    });
  }

  function post(payload) {
    payload.password = state.pass || '';
    return fetchJSON(apiUrl(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
  }

  function saveItem(item) {
    if (state.mode === 'local') {
      var i = state.data.items.findIndex(function (x) { return x.id === item.id; });
      if (i >= 0) state.data.items[i] = item; else state.data.items.push(item);
      localSave();
      return Promise.resolve();
    }
    if (useSB()) return rpc('admin_save_item', { p: state.pass || '', it: item }).then(loadFromSB);
    return post({ action: 'save_item', item: item }).then(function (j) { state.data = normalize(j); });
  }
  function deleteItem(id) {
    if (state.mode === 'local') {
      state.data.items = state.data.items.filter(function (x) { return x.id !== id; });
      localSave();
      return Promise.resolve();
    }
    if (useSB()) return rpc('admin_delete_item', { p: state.pass || '', item_id: id }).then(loadFromSB);
    return post({ action: 'delete_item', id: id }).then(function (j) { state.data = normalize(j); });
  }
  function saveSchedule(schedule) {
    if (state.mode === 'local') { state.data.schedule = schedule; localSave(); return Promise.resolve(); }
    if (useSB()) return rpc('admin_save_schedule', { p: state.pass || '', sch: schedule }).then(loadFromSB);
    return post({ action: 'save_schedule', schedule: schedule }).then(function (j) { state.data = normalize(j); });
  }
  function checkLogin(pw) {
    if (state.mode === 'local') {
      return Promise.resolve(strHash(pw) === CFG.LOCAL_PASS_HASH);
    }
    if (useSB()) return rpc('admin_login', { p: pw }).then(function (ok) { return ok === true; });
    return fetchJSON(apiUrl(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', password: pw })
    }).then(function (j) { return !!j.ok; }).catch(function (e) {
      if (e.status === 401 || e.status === 429) return false;
      throw e;
    });
  }

  /* ---------- نمای کلی ---------- */
  function itemsOn(jdn) {
    var s = J.strOfJdn(jdn);
    return state.data.items.filter(function (it) { return it.date === s && !it.pin; });
  }

  /* ---- جلسه‌های کلاس ---- */
  var SESS = {};
  (window.CLASS_SESSIONS || []).forEach(function (s) { var j = J.jdnOfStr(s.date); if (j != null) SESS[j] = s; });
  function sessLabel(s) { return s.final ? 'امتحان نهایی (Final)' : 'جلسهٔ ' + fa(s.n) + ' کلاس'; }
  function sessTag(s) { return s.final ? '🎓' : 'ج' + fa(s.n); }
  function sessionCard(s) {
    return h('div', { class: 'item sess' + (s.final ? ' final' : '') },
      h('div', { class: 'ic', text: s.final ? '🎓' : '📖' }),
      h('div', { class: 'body' }, h('div', { class: 't', text: sessLabel(s) }), h('div', { class: 'm', text: 'کلاس زبان ۲۲۷' })));
  }

  function itemCard(it, opts) {
    opts = opts || {};
    var t = TYPES[it.type] || TYPES.other;
    return h('div', { class: 'item ' + it.type },
      h('div', { class: 'ic', text: t.icon }),
      h('div', { class: 'body' },
        h('div', { class: 't' }, it.title, h('span', { class: 'badge ' + it.type, text: t.label })),
        (it.subject || opts.date) ? h('div', { class: 'm', text: [it.subject, opts.date].filter(Boolean).join(' • ') }) : null,
        it.desc ? h('div', { class: 'd', text: it.desc }) : null
      ),
      opts.tools || null
    );
  }

  function scheduleBlock(wd) {
    var rows = (state.data.schedule && state.data.schedule[wd]) || [];
    var box = h('div', { class: 'sched' });
    if (!rows.length) { box.appendChild(h('div', { class: 'empty', text: wd === 6 ? 'جمعه تعطیله 😎' : 'برنامهٔ کلاسی این روز هنوز ثبت نشده' })); return box; }
    rows.forEach(function (r) {
      box.appendChild(h('div', { class: 'row' }, r.time ? h('span', { class: 'time', text: r.time }) : null, h('span', { class: 'sub-name', text: r.subject })));
    });
    return box;
  }

  function renderClock() {
    var n = state.now;
    $('clock').textContent = fa(J.pad(n.h) + ':' + J.pad(n.mi) + ':' + J.pad(n.s));
    $('todayDate').textContent = dateLabel(n.jdn, true);
    if (window.SpiderClock) window.SpiderClock.update(n);
  }

  function renderDayInfo() {
    var jdn = state.now.jdn + state.dayOffset;
    var box = clear($('dayInfo'));
    box.appendChild(h('div', { class: 'sec-title', text: (state.dayOffset ? 'فردا' : 'امروز') + ' • ' + dateLabel(jdn, true) }));
    var list = itemsOn(jdn);
    var l = h('div', { class: 'list' });
    if (SESS[jdn]) l.appendChild(sessionCard(SESS[jdn]));
    if (!list.length) l.appendChild(h('div', { class: 'empty', text: 'برای این روز تکلیف، امتحان یا پرسشی ثبت نشده 🎉' }));
    list.forEach(function (it) { l.appendChild(itemCard(it)); });
    box.appendChild(l);
    box.appendChild(h('div', { class: 'sec-title', text: '🕘 برنامهٔ کلاسی ' + (state.dayOffset ? 'فردا' : 'امروز') + ' (' + WEEKDAYS[J.weekday(jdn)] + ')' }));
    box.appendChild(scheduleBlock(J.weekday(jdn)));
    Array.prototype.forEach.call(document.querySelectorAll('#dayTabs .tab'), function (b) {
      b.setAttribute('aria-selected', String(+b.dataset.d === state.dayOffset));
    });
  }

  function renderCalendar() {
    var v = state.view, today = state.now;
    $('calTitle').textContent = '';
    $('calTitle').appendChild(document.createTextNode(MONTHS[v.jm - 1] + ' ' + fa(v.jy)));
    $('calTitle').appendChild(h('small', { text: 'ماه ' + fa(v.jm) + ' از سال ' + fa(v.jy) }));
    var grid = clear($('grid'));
    var first = J.jdn(v.jy, v.jm, 1), offset = J.weekday(first), len = J.monthLength(v.jy, v.jm);
    for (var b = 0; b < offset; b++) grid.appendChild(h('div', { class: 'day blank' }));
    for (var d = 1; d <= len; d++) {
      (function (d) {
        var jdn = first + d - 1, wd = J.weekday(jdn);
        var types = {};
        itemsOn(jdn).forEach(function (it) { if (!state.hidden[it.type]) types[it.type] = true; });
        var sx = !state.hidden.session && SESS[jdn];
        var cls = 'day' + (sx ? ' sess' + (sx.final ? ' final' : '') : '') + (wd === 6 ? ' fri' : '') + (jdn === today.jdn ? ' today' : '') + (jdn === state.selected ? ' sel' : '');
        var dots = h('div', { class: 'dots' });
        TYPE_KEYS.forEach(function (k) { if (types[k]) dots.appendChild(h('span', { class: 'dot ' + k })); });
        var cell = h('button', { class: cls, type: 'button', 'aria-label': dateLabel(jdn, true), onclick: function () { openDay(jdn); } },
          h('span', { text: fa(d) }), sx ? h('span', { class: 'sess-tag', text: sessTag(sx) }) : null, dots);
        grid.appendChild(cell);
      })(d);
    }
  }

  function renderUpcoming() {
    var box = clear($('upcoming'));
    var today = state.now.jdn;
    var list = state.data.items.map(function (it) { return { it: it, jdn: J.jdnOfStr(it.date) }; })
      .filter(function (x) { return x.jdn != null && x.jdn >= today && !state.hidden[x.it.type] && !x.it.pin; })
      .sort(function (a, b) { return a.jdn - b.jdn; });
    if (!list.length) { box.appendChild(h('div', { class: 'empty', text: 'فعلاً چیزی در پیش نیست ✨' })); return; }
    var groups = [], map = {};
    list.slice(0, 25).forEach(function (x) { if (!map[x.jdn]) { map[x.jdn] = []; groups.push(x.jdn); } map[x.jdn].push(x.it); });
    groups.forEach(function (jdn) {
      var g = h('div', { class: 'day-group' }, h('div', { class: 'day-head' }, h('span', { text: dateLabel(jdn, true) }), h('small', { text: relLabel(jdn - today) })));
      var l = h('div', { class: 'list' });
      map[jdn].forEach(function (it) { l.appendChild(itemCard(it)); });
      g.appendChild(l);
      box.appendChild(g);
    });
  }

  function renderLegend() {
    var box = clear($('legend'));
    box.appendChild(h('span', { class: state.hidden.session ? 'off' : '', onclick: function () { state.hidden.session = !state.hidden.session; renderLegend(); renderCalendar(); } },
      h('i', { class: 'dot sess' }), 'روز کلاس'));
    TYPE_KEYS.forEach(function (k) {
      box.appendChild(h('span', { class: state.hidden[k] ? 'off' : '', onclick: function () { state.hidden[k] = !state.hidden[k]; renderLegend(); renderCalendar(); renderUpcoming(); } },
        h('i', { class: 'dot ' + k }), TYPES[k].plural));
    });
  }

  function renderPinned() {
    var box = clear($('pinned'));
    state.data.items.filter(function (it) { return it.pin; }).forEach(function (it) {
      box.appendChild(h('div', { class: 'pin-card' },
        h('div', { class: 'pin-label', text: '📢 اطلاعیه مهم' }),
        h('div', { class: 'pin-title', text: it.title }),
        it.desc ? h('div', { class: 'pin-desc', text: it.desc }) : null));
    });
  }

  function renderNext() {
    var box = $('nextClass'), today = state.now.jdn, best = null;
    Object.keys(SESS).forEach(function (k) { k = +k; if (k >= today && (best === null || k < best)) best = k; });
    if (best === null) { box.hidden = true; return; }
    box.hidden = false;
    clear(box);
    box.appendChild(h('div', { class: 'big', text: SESS[best].final ? '🎓' : '📖' }));
    box.appendChild(h('div', null,
      h('div', { class: 'k', text: 'کلاس بعدی' }),
      h('div', { class: 'v', text: dateLabel(best, true) + ' • ' + sessLabel(SESS[best]) }),
      h('div', { class: 'r', text: relLabel(best - today) })));
  }

  function renderAll() {
    renderPinned(); renderNext(); renderClock(); renderDayInfo(); renderCalendar(); renderUpcoming(); renderLegend();
    var b = clear($('banner'));
    if (state.mode === 'offline') {
      b.appendChild(h('div', { class: 'banner', text: '⚠️ اتصال به سرور برقرار نشد. اینترنت یا فیلترشکن را بررسی کن؛ صفحه را دوباره باز کن.' }));
    }
    if (state.mode === 'local' && !CFG.STATIC_MODE) {
      b.appendChild(h('div', { class: 'banner', text: '🧪 حالت آزمایشی: سرور وصل نیست و اطلاعات فقط روی همین گوشی ذخیره می‌شود. (راهنمای README را ببینید)' }));
    }
  }

  /* ---------- پنجره‌ها ---------- */
  function openOv(id) { $(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeOv(id) {
    $(id).classList.remove('open');
    if (!document.querySelector('.overlay.open')) document.body.style.overflow = '';
  }
  Array.prototype.forEach.call(document.querySelectorAll('.overlay'), function (ov) {
    ov.addEventListener('click', function (e) { if (e.target === ov) closeOv(ov.id); });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', function () { closeOv(ov.id); }); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') Array.prototype.forEach.call(document.querySelectorAll('.overlay.open'), function (o) { closeOv(o.id); });
  });

  function openDay(jdn) {
    state.selected = jdn;
    renderCalendar();
    $('dayTitle').textContent = dateLabel(jdn, true);
    var body = clear($('dayBody'));
    var diff = jdn - state.now.jdn;
    body.appendChild(h('div', { class: 'm', style: 'font-weight:700;color:var(--mid);margin-bottom:8px', text: relLabel(diff) }));
    var list = itemsOn(jdn), l = h('div', { class: 'list' });
    if (SESS[jdn]) l.appendChild(sessionCard(SESS[jdn]));
    if (!list.length) l.appendChild(h('div', { class: 'empty', text: 'برای این روز تکلیف، امتحان یا پرسشی ثبت نشده' }));
    list.forEach(function (it) { l.appendChild(itemCard(it)); });
    body.appendChild(l);
    body.appendChild(h('div', { class: 'sec-title', text: '🕘 برنامهٔ کلاسی ' + WEEKDAYS[J.weekday(jdn)] }));
    body.appendChild(scheduleBlock(J.weekday(jdn)));
    openOv('dayOverlay');
  }

  /* ---------- پنل مدیریت ---------- */
  function openAdmin() {
    if (state.pass) { showAdmin(); return; }
    $('loginErr').textContent = ''; $('pass').value = '';
    openOv('loginOverlay');
    setTimeout(function () { $('pass').focus(); }, 80);
  }

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = $('pass').value;
    if (!pw) { $('loginErr').textContent = 'رمز را وارد کن'; return; }
    $('loginErr').textContent = 'در حال بررسی…';
    checkLogin(pw).then(function (ok) {
      if (!ok) { $('loginErr').textContent = '❌ رمز اشتباه است'; return; }
      state.pass = pw;
      try { sessionStorage.setItem('sc_pass', pw); } catch (e2) {}
      closeOv('loginOverlay');
      showAdmin();
    }).catch(function () { $('loginErr').textContent = 'ارتباط با سرور برقرار نشد'; });
  });

  $('logout').addEventListener('click', function () {
    state.pass = null;
    try { sessionStorage.removeItem('sc_pass'); } catch (e) {}
    closeOv('adminOverlay');
    toast('از پنل خارج شدی');
  });

  function showAdmin() { state.editing = null; renderAdmin(); openOv('adminOverlay'); }

  function adminError(err) {
    if (err && err.status === 401) {
      state.pass = null;
      try { sessionStorage.removeItem('sc_pass'); } catch (e) {}
      closeOv('adminOverlay');
      toast('رمز معتبر نیست؛ دوباره وارد شو');
      return;
    }
    toast('ذخیره نشد: ' + ((err && err.message === 'bad-json') ? 'سرور پاسخ درست نمی‌دهد' : (err && err.message) || 'خطا'));
  }

  function renderAdmin() {
    var tabs = clear($('adminTabs'));
    TYPE_KEYS.concat(['schedule', 'grades']).forEach(function (k) {
      tabs.appendChild(h('button', {
        class: 'tab', role: 'tab', 'aria-selected': String(state.adminTab === k),
        onclick: function () { state.adminTab = k; state.editing = null; renderAdmin(); }
      }, k === 'schedule' ? '🕘 برنامه کلاسی' : k === 'grades' ? '🏅 نمرات' : TYPES[k].icon + ' ' + TYPES[k].plural));
    });
    var body = clear($('adminBody'));
    if (CFG.STATIC_MODE) {
      body.appendChild(h('div', { class: 'banner', style: 'margin:0 0 12px', text: 'ℹ️ این نسخه بدون دیتابیس است: تغییرات پنل فقط روی همین گوشی دیده می‌شود. برای تغییر دائمی برای همه، «کپی داده‌ها» را بزن و برای سازنده بفرست.' }));
      body.appendChild(h('div', { class: 'actions', style: 'margin-bottom:12px' },
        h('button', { class: 'btn small slate', type: 'button', text: '📋 کپی داده‌ها', onclick: function () {
          var txt = JSON.stringify(state.data, null, 2);
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast('کپی شد ✅'); }, function () { toast('کپی نشد'); });
          else toast('کپی در این مرورگر ممکن نیست');
        } }),
        h('button', { class: 'btn small light', type: 'button', text: '↩️ بازگشت به داده‌های اصلی سایت', onclick: function () {
          try { localStorage.removeItem(LS_KEY); } catch (e) {}
          state.data = seedDemo(); renderAll(); renderAdmin(); toast('بازگردانی شد');
        } })));
    }
    if (state.adminTab === 'schedule') renderScheduleAdmin(body);
    else if (state.adminTab === 'grades') renderGradesAdmin(body);
    else renderItemsAdmin(body, state.adminTab);
  }

  function dateSelects(jdn) {
    var j = J.fromJdn(jdn), cy = state.now.jy;
    var ys = h('select', { class: 'input', id: 'fy', 'aria-label': 'سال' });
    for (var y = Math.min(cy - 1, j.jy); y <= Math.max(cy + 2, j.jy); y++) ys.appendChild(h('option', { value: y, text: fa(y) }));
    var ms = h('select', { class: 'input', id: 'fm', 'aria-label': 'ماه' });
    MONTHS.forEach(function (m, i) { ms.appendChild(h('option', { value: i + 1, text: m })); });
    var ds = h('select', { class: 'input', id: 'fd', 'aria-label': 'روز' });
    function fillDays(keep) {
      var len = J.monthLength(+ys.value, +ms.value), cur = keep || +ds.value || 1;
      clear(ds);
      for (var d = 1; d <= len; d++) ds.appendChild(h('option', { value: d, text: fa(d) }));
      ds.value = Math.min(cur, len);
    }
    ys.value = j.jy; ms.value = j.jm; fillDays(j.jd);
    ys.addEventListener('change', function () { fillDays(); });
    ms.addEventListener('change', function () { fillDays(); });
    return h('div', { class: 'date-row' }, ds, ms, ys);
  }

  function renderItemsAdmin(body, type) {
    var t = TYPES[type], ed = state.editing && state.editing.type === type ? state.editing : null;
    var startJdn = ed ? J.jdnOfStr(ed.date) : state.now.jdn + 1;

    var title = h('input', { class: 'input', id: 'ftitle', maxlength: '120', placeholder: type === 'exam' ? 'مثلاً: امتحان ریاضی فصل ۳' : type === 'homework' ? 'مثلاً: تمرین صفحهٔ ۴۲' : type === 'question' ? 'مثلاً: پرسش شفاهی ادبیات' : 'مثلاً: اردوی کلاسی' });
    var subject = h('input', { class: 'input', id: 'fsub', maxlength: '60', placeholder: 'مثلاً: ریاضی', list: 'subjects' });
    var subs = {};
    state.data.items.forEach(function (it) { if (it.subject) subs[it.subject] = 1; });
    Object.keys(state.data.schedule || {}).forEach(function (k) { (state.data.schedule[k] || []).forEach(function (r) { if (r.subject) subs[r.subject] = 1; }); });
    var dl = h('datalist', { id: 'subjects' });
    Object.keys(subs).forEach(function (s) { dl.appendChild(h('option', { value: s })); });
    var desc = h('textarea', { class: 'input', id: 'fdesc', maxlength: '600', placeholder: 'توضیحات (اختیاری)' });
    if (ed) { title.value = ed.title; subject.value = ed.subject || ''; desc.value = ed.desc || ''; }
    var pinBox = h('input', { type: 'checkbox', id: 'fpin' });
    if (ed && ed.pin) pinBox.checked = true;
    var err = h('p', { class: 'msg-err' });
    var saveBtn = h('button', { class: 'btn green', type: 'submit', text: ed ? '💾 ذخیرهٔ تغییرات' : '➕ ثبت ' + t.label });

    var form = h('form', { class: 'form-card', onsubmit: function (e) {
      e.preventDefault();
      var ttl = title.value.trim();
      if (!ttl) { err.textContent = 'عنوان را بنویس'; return; }
      var item = {
        id: ed ? ed.id : newId(), type: type, title: ttl, subject: subject.value.trim(),
        date: J.fmt(+$('fy').value, +$('fm').value, +$('fd').value), desc: desc.value.trim()
      };
      if (type === 'other' && pinBox.checked) item.pin = true;
      saveBtn.setAttribute('disabled', ''); err.textContent = '';
      saveItem(item).then(function () {
        state.editing = null; toast(ed ? 'تغییرات ذخیره شد ✅' : t.label + ' ثبت شد ✅');
        var j = J.parse(item.date); if (j) state.view = { jy: j.jy, jm: j.jm };
        renderAll(); renderAdmin();
      }).catch(function (e2) { saveBtn.removeAttribute('disabled'); adminError(e2); });
    } },
      h('div', { class: 'sec-title', style: 'margin-top:0', text: ed ? '✏️ ویرایش ' + t.label : '➕ ' + t.label + ' جدید' }),
      h('div', { class: 'field' }, h('label', { for: 'ftitle', text: 'عنوان' }), title),
      h('div', { class: 'field' }, h('label', { for: 'fsub', text: 'درس' }), subject, dl),
      h('div', { class: 'field' }, h('label', { text: 'تاریخ (شمسی)' }), dateSelects(startJdn)),
      h('div', { class: 'field' }, h('label', { for: 'fdesc', text: 'توضیحات' }), desc),
      type === 'other' ? h('label', { class: 'check' }, pinBox, ' این اطلاعیه «مهم» است و بالای صفحه نمایش داده شود') : null,
      err,
      h('div', { class: 'actions' }, saveBtn, ed ? h('button', { class: 'btn light', type: 'button', text: 'انصراف', onclick: function () { state.editing = null; renderAdmin(); } }) : null)
    );
    body.appendChild(form);

    body.appendChild(h('div', { class: 'sec-title', text: t.icon + ' ' + t.plural + ' ثبت‌شده' }));
    var list = h('div', { class: 'list' });
    var arr = state.data.items.filter(function (it) { return it.type === type; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    if (!arr.length) list.appendChild(h('div', { class: 'empty', text: 'هنوز چیزی ثبت نشده' }));
    arr.forEach(function (it) {
      var jdn = J.jdnOfStr(it.date);
      var tools = h('div', { class: 'tools' },
        h('button', { class: 'btn small light', type: 'button', text: '✏️', 'aria-label': 'ویرایش', onclick: function () { state.editing = it; renderAdmin(); $('adminBody').scrollTop = 0; document.querySelector('.admin-sheet').scrollTop = 0; } }),
        h('button', { class: 'btn small red', type: 'button', text: '🗑️', 'aria-label': 'حذف', onclick: function () {
          if (!confirm('«' + it.title + '» حذف شود؟')) return;
          deleteItem(it.id).then(function () { toast('حذف شد'); renderAll(); renderAdmin(); }).catch(adminError);
        } }));
      list.appendChild(itemCard(it, { date: it.pin ? '📢 مهم (بالای صفحه)' : (jdn != null ? dateLabel(jdn, true) : it.date), tools: tools }));
    });
    body.appendChild(list);
  }


  /* ---------- نمرات (فقط برای معلم، پشت رمز) ---------- */
  var LS_G = (CFG.STORAGE_KEY || 'sc') + '_grades';
  state.grades = { students: [], grades: [] };
  state.gSel = null; state.gEdit = null; state.gMax = 20;

  function gLocalLoad() {
    var g = null;
    try { g = JSON.parse(localStorage.getItem(LS_G) || 'null'); } catch (e) {}
    var names = window.STUDENTS_LOCAL || [];
    return { students: names.map(function (n, i) { return { id: i + 1, name: n }; }), grades: g ? (g.grades || []) : (window.GRADES_DEMO || []) };
  }
  function loadGrades() {
    if (useSB() && state.mode !== 'local') {
      return rpc('admin_list_grades', { p: state.pass || '' }).then(function (j) {
        state.grades = { students: j.students || [], grades: (j.grades || []).map(function (x) { return { id: x.id, student_id: x.student_id, topic: x.topic, score: +x.score, max: +x.max, date: x.date, note: x.note || '' }; }) };
      });
    }
    state.grades = gLocalLoad();
    return Promise.resolve();
  }
  function saveGrade(g) {
    if (useSB() && state.mode !== 'local') return rpc('admin_save_grade', { p: state.pass || '', g: g }).then(loadGrades);
    var i = state.grades.grades.findIndex(function (x) { return x.id === g.id; });
    if (i >= 0) state.grades.grades[i] = g; else state.grades.grades.push(g);
    try { localStorage.setItem(LS_G, JSON.stringify({ grades: state.grades.grades })); } catch (e) {}
    return Promise.resolve();
  }
  function deleteGrade(id) {
    if (useSB() && state.mode !== 'local') return rpc('admin_delete_grade', { p: state.pass || '', gid: id }).then(loadGrades);
    state.grades.grades = state.grades.grades.filter(function (x) { return x.id !== id; });
    try { localStorage.setItem(LS_G, JSON.stringify({ grades: state.grades.grades })); } catch (e) {}
    return Promise.resolve();
  }
  function fnum(x) { return fa(String(Math.round(x * 100) / 100)).replace('.', '٫'); }
  function pnum(s) { var t = en(String(s)).replace('٫', '.').replace(/[,،]/g, '.').trim(); return t === '' ? NaN : Number(t); }
  function pctClass(p) { return p >= 0.85 ? 'good' : p >= 0.6 ? 'mid' : 'low'; }

  function renderGradesAdmin(body) {
    body.appendChild(h('div', { class: 'empty', text: 'در حال بارگذاری نمرات…' }));
    loadGrades().then(function () {
      if (state.adminTab !== 'grades') return;
      clear(body); drawGrades(body);
    }).catch(function (e) { clear(body); body.appendChild(h('div', { class: 'msg-err', text: 'نمرات بارگذاری نشد' })); adminError(e); });
  }

  function drawGrades(body) {
    var G = state.grades, ed = state.gEdit;
    if (ed) state.gSel = ed.student_id;
    var byId = {}; G.students.forEach(function (s) { byId[s.id] = s; });
    if (!G.students.length) { body.appendChild(h('div', { class: 'empty', text: 'لیست دانش‌آموزان خالی است' })); return; }

    body.appendChild(h('div', { class: 'banner', style: 'margin:0 0 12px', text: '👀 نمره‌ای که ثبت کنی، دانش‌آموزان و والدین با دکمهٔ 🏅 «نمرات» پایین صفحه می‌بینند.' }));

    // انتخاب دانش‌آموز: دکمه‌های قرصی با میانگین
    var chips = h('div', { class: 'chips' });
    G.students.forEach(function (s) {
      var mine = G.grades.filter(function (g) { return g.student_id === s.id; });
      var avg = mine.length ? mine.reduce(function (t, g) { return t + g.score / g.max; }, 0) / mine.length * 20 : null;
      chips.appendChild(h('button', { type: 'button', class: 'chip' + (state.gSel === s.id ? ' on' : ''), 'aria-pressed': String(state.gSel === s.id),
        onclick: function () { state.gSel = state.gSel === s.id ? null : s.id; if (state.gEdit && state.gEdit.student_id !== s.id) state.gEdit = null; renderAdmin(); } },
        h('span', { class: 'cn', text: s.name }),
        h('span', { class: 'ca', text: avg === null ? 'بدون نمره' : 'میانگین ' + fnum(avg) + ' از ۲۰' })));
    });

    var topic = h('input', { class: 'input', id: 'gtopic', maxlength: '80', list: 'gtopics', placeholder: 'مثلاً: اسپیکینگ، فعالیت کلاسی' });
    var dl = h('datalist', { id: 'gtopics' });
    var tp = { 'اسپیکینگ': 1, 'فعالیت کلاسی': 1, 'لیسنینگ': 1, 'آزمون کتبی': 1, 'تکلیف': 1 };
    G.grades.forEach(function (g) { tp[g.topic] = 1; });
    Object.keys(tp).forEach(function (t) { dl.appendChild(h('option', { value: t })); });
    var score = h('input', { class: 'input', id: 'gscore', inputmode: 'decimal', autocomplete: 'off', placeholder: '۱۹', 'aria-label': 'نمره' });
    var max = h('input', { class: 'input', id: 'gmax', inputmode: 'decimal', autocomplete: 'off', placeholder: '۲۰', 'aria-label': 'از چند نمره' });
    var note = h('textarea', { class: 'input', id: 'gnote', maxlength: '300', placeholder: 'توضیح (اختیاری)' });
    max.value = fnum(ed ? ed.max : state.gMax);
    if (ed) { topic.value = ed.topic; score.value = fnum(ed.score); note.value = ed.note || ''; }
    var err = h('p', { class: 'msg-err' });
    var saveBtn = h('button', { class: 'btn green', type: 'submit', text: ed ? '💾 ذخیرهٔ تغییر نمره' : '➕ ثبت نمره' });

    var form = h('form', { class: 'form-card', onsubmit: function (e) {
      e.preventDefault();
      if (!state.gSel) { err.textContent = 'اول اسم دانش‌آموز را از لیست بالا انتخاب کن'; return; }
      var t = topic.value.trim(), sc = pnum(score.value), mx = pnum(max.value);
      if (!t) { err.textContent = 'موضوع نمره‌دهی را بنویس'; return; }
      if (!isFinite(mx) || mx <= 0 || mx > 1000) { err.textContent = '«از چند نمره» باید عدد مثبت باشد'; return; }
      if (!isFinite(sc) || sc < 0) { err.textContent = 'نمره باید عدد باشد'; return; }
      if (sc > mx) { err.textContent = 'نمره نمی‌تواند از ' + fnum(mx) + ' بیشتر باشد'; return; }
      var g = { id: ed ? ed.id : newId(), student_id: state.gSel, topic: t, score: sc, max: mx, date: J.fmt(+$('fy').value, +$('fm').value, +$('fd').value), note: note.value.trim() };
      state.gMax = mx; saveBtn.setAttribute('disabled', ''); err.textContent = '';
      saveGrade(g).then(function () {
        state.gEdit = null; toast('نمره ثبت شد ✅'); renderAdmin();
      }).catch(function (e2) { saveBtn.removeAttribute('disabled'); adminError(e2); });
    } },
      h('div', { class: 'sec-title', style: 'margin-top:0', text: ed ? '✏️ ویرایش نمره' : '🏅 ثبت نمرهٔ جدید' }),
      h('div', { class: 'field' }, h('label', { text: 'دانش‌آموز' }), state.gSel ? h('div', { class: 'picked', text: '✅ ' + (byId[state.gSel] || {}).name }) : h('div', { class: 'm', style: 'color:var(--muted)', text: 'از لیست بالا یک نفر را انتخاب کن' })),
      h('div', { class: 'field' }, h('label', { for: 'gtopic', text: 'موضوع نمره‌دهی' }), topic, dl),
      h('div', { class: 'score-row' },
        h('div', { class: 'field' }, h('label', { for: 'gscore', text: 'نمره' }), score),
        h('div', { class: 'of', text: 'از' }),
        h('div', { class: 'field' }, h('label', { for: 'gmax', text: 'چند نمره' }), max)),
      h('div', { class: 'field' }, h('label', { text: 'تاریخ (شمسی)' }), dateSelects(ed ? J.jdnOfStr(ed.date) : state.now.jdn)),
      h('div', { class: 'field' }, h('label', { for: 'gnote', text: 'توضیح' }), note),
      err,
      h('div', { class: 'actions' }, saveBtn, ed ? h('button', { class: 'btn light', type: 'button', text: 'انصراف', onclick: function () { state.gEdit = null; renderAdmin(); } }) : null));

    body.appendChild(h('div', { class: 'sec-title', style: 'margin-top:0', text: '👥 دانش‌آموزان (یکی را انتخاب کن)' }));
    body.appendChild(chips);
    body.appendChild(h('div', { style: 'height:14px' }));
    body.appendChild(form);

    var shown = G.grades.filter(function (g) { return !state.gSel || g.student_id === state.gSel; })
      .sort(function (x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : 0; });
    body.appendChild(h('div', { class: 'sec-title', text: state.gSel ? '📋 نمره‌های ' + (byId[state.gSel] || {}).name : '📋 همهٔ نمره‌ها' }));
    var list = h('div', { class: 'list' });
    if (!shown.length) list.appendChild(h('div', { class: 'empty', text: 'هنوز نمره‌ای ثبت نشده' }));
    shown.forEach(function (g) {
      var jd = J.jdnOfStr(g.date), p = g.score / g.max;
      list.appendChild(h('div', { class: 'item grade' },
        h('div', { class: 'ic', text: '🏅' }),
        h('div', { class: 'body' },
          h('div', { class: 't' }, g.topic, h('span', { class: 'score ' + pctClass(p), text: fnum(g.score) + ' از ' + fnum(g.max) })),
          h('div', { class: 'm', text: [(byId[g.student_id] || {}).name, jd != null ? dateLabel(jd, false) : g.date].filter(Boolean).join(' • ') }),
          g.note ? h('div', { class: 'd', text: g.note }) : null),
        h('div', { class: 'tools' },
          h('button', { class: 'btn small light', type: 'button', text: '✏️', 'aria-label': 'ویرایش', onclick: function () { state.gEdit = g; state.gSel = g.student_id; renderAdmin(); document.querySelector('.admin-sheet').scrollTop = 0; } }),
          h('button', { class: 'btn small red', type: 'button', text: '🗑️', 'aria-label': 'حذف', onclick: function () {
            if (!confirm('این نمره حذف شود؟')) return;
            deleteGrade(g.id).then(function () { toast('حذف شد'); renderAdmin(); }).catch(adminError);
          } }))));
    });
    body.appendChild(list);
  }

  /* ---------- نمرات برای دانش‌آموز و والدین (دکمهٔ شناور) ---------- */
  var LS_SEL = (CFG.STORAGE_KEY || 'sc') + '_mystudent';
  var pubState = { students: [], grades: [], sel: null, loaded: false };
  try { var sv = localStorage.getItem(LS_SEL); if (sv) pubState.sel = +sv; } catch (e) {}

  function loadPublicGrades() {
    if (useSB() && state.mode !== 'local') {
      return Promise.all([sb('students?select=*&order=id.asc'), sb('grades?select=*&order=date.desc')]).then(function (r) {
        pubState.students = r[0] || [];
        pubState.grades = (r[1] || []).map(function (x) { return { id: x.id, student_id: x.student_id, topic: x.topic, score: +x.score, max: +x.max, date: x.date, note: x.note || '' }; });
        pubState.loaded = true;
      });
    }
    var l = gLocalLoad(); pubState.students = l.students; pubState.grades = l.grades; pubState.loaded = true;
    return Promise.resolve();
  }

  function renderPublicGrades() {
    var chips = clear($('gChips')), res = clear($('gResult'));
    if (!pubState.students.length) { chips.appendChild(h('div', { class: 'empty', text: 'لیست دانش‌آموزان هنوز آماده نیست' })); return; }
    pubState.students.forEach(function (s) {
      chips.appendChild(h('button', { type: 'button', class: 'chip' + (pubState.sel === s.id ? ' on' : ''), 'aria-pressed': String(pubState.sel === s.id),
        onclick: function () {
          pubState.sel = s.id;
          try { localStorage.setItem(LS_SEL, String(s.id)); } catch (e) {}
          renderPublicGrades();
          var r = $('gResult'); if (r.scrollIntoView) r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } }, h('span', { class: 'cn', text: s.name })));
    });
    var st = pubState.students.filter(function (s) { return s.id === pubState.sel; })[0];
    if (!st) { res.appendChild(h('div', { class: 'empty', text: 'برای دیدن نمره‌ها، اسم خودت را بالا بزن 👆' })); return; }
    var mine = pubState.grades.filter(function (g) { return g.student_id === st.id; }).sort(function (x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : 0; });
    var avg = mine.length ? mine.reduce(function (t, g) { return t + g.score / g.max; }, 0) / mine.length : null;
    res.appendChild(h('div', { class: 'g-hero' },
      h('div', { class: 'g-name', text: st.name }),
      avg === null ? h('div', { class: 'm', text: 'هنوز نمره‌ای ثبت نشده' })
        : h('div', null, h('div', { class: 'g-big ' + pctClass(avg) }, fnum(avg * 20), h('small', { text: ' از ۲۰' })),
            h('div', { class: 'm', text: 'میانگین ' + fa(mine.length) + ' نمره' }))));
    var list = h('div', { class: 'list', style: 'margin-top:12px' });
    mine.forEach(function (g) {
      var jd = J.jdnOfStr(g.date);
      list.appendChild(h('div', { class: 'item grade' },
        h('div', { class: 'ic', text: '🏅' }),
        h('div', { class: 'body' },
          h('div', { class: 't' }, g.topic, h('span', { class: 'score ' + pctClass(g.score / g.max), text: fnum(g.score) + ' از ' + fnum(g.max) })),
          h('div', { class: 'm', text: jd != null ? dateLabel(jd, true) : g.date }),
          g.note ? h('div', { class: 'd', text: g.note }) : null)));
    });
    res.appendChild(list);
  }

  $('fab').addEventListener('click', function () {
    openOv('gradesOverlay');
    clear($('gResult')); clear($('gChips')).appendChild(h('div', { class: 'empty', text: 'در حال بارگذاری…' }));
    loadPublicGrades().then(renderPublicGrades).catch(function () {
      clear($('gChips')).appendChild(h('div', { class: 'empty', text: 'نمرات بارگذاری نشد. اینترنت یا فیلترشکن را بررسی کن.' }));
    });
  });

  function renderScheduleAdmin(body) {
    var draft = JSON.parse(JSON.stringify(state.data.schedule || {}));
    var wd = state.schedDay;
    var days = h('div', { class: 'tabs' });
    WEEKDAYS.forEach(function (n, i) {
      days.appendChild(h('button', { class: 'tab', type: 'button', 'aria-selected': String(i === wd), text: n, onclick: function () { state.schedDay = i; renderAdmin(); } }));
    });
    body.appendChild(days);
    var rows = draft[wd] || (draft[wd] = []);
    var box = h('div', { class: 'form-card' }, h('div', { class: 'sec-title', style: 'margin-top:0', text: 'برنامهٔ ' + WEEKDAYS[wd] }));
    var rowsBox = h('div');
    function drawRows() {
      clear(rowsBox);
      rows.forEach(function (r, i) {
        rowsBox.appendChild(h('div', { class: 'row-edit' },
          h('input', { class: 'input', placeholder: 'ساعت', value: r.time || '', maxlength: '20', 'aria-label': 'ساعت', oninput: function (e) { r.time = e.target.value; } }),
          h('input', { class: 'input', placeholder: 'درس', value: r.subject || '', maxlength: '60', 'aria-label': 'درس', oninput: function (e) { r.subject = e.target.value; } }),
          h('button', { class: 'btn small red', type: 'button', text: '✕', 'aria-label': 'حذف ردیف', onclick: function () { rows.splice(i, 1); drawRows(); } })));
      });
      if (!rows.length) rowsBox.appendChild(h('div', { class: 'empty', text: 'ردیفی نیست؛ «افزودن درس» را بزن' }));
    }
    drawRows();
    box.appendChild(rowsBox);
    var err = h('p', { class: 'msg-err' });
    var save = h('button', { class: 'btn green', type: 'button', text: '💾 ذخیرهٔ برنامه', onclick: function () {
      Object.keys(draft).forEach(function (k) {
        draft[k] = draft[k].map(function (r) { return { time: String(r.time || '').trim(), subject: String(r.subject || '').trim() }; })
          .filter(function (r) { return r.subject; });
      });
      save.setAttribute('disabled', '');
      saveSchedule(draft).then(function () { toast('برنامه ذخیره شد ✅'); renderAll(); renderAdmin(); }).catch(function (e) { save.removeAttribute('disabled'); adminError(e); });
    } });
    box.appendChild(h('div', { class: 'actions' },
      h('button', { class: 'btn slate', type: 'button', text: '➕ افزودن درس', onclick: function () { rows.push({ time: '', subject: '' }); drawRows(); } }), save));
    box.appendChild(err);
    body.appendChild(box);
    body.appendChild(h('p', { class: 'm', style: 'color:var(--mid);margin-top:10px', text: 'نکته: برنامهٔ هر روز هفته یک بار ثبت می‌شود و هر هفته تکرار می‌شود.' }));
  }

  /* ---------- رویدادها ---------- */
  $('openAdmin').addEventListener('click', openAdmin);
  $('prevM').addEventListener('click', function () { var v = state.view; state.view = v.jm === 1 ? { jy: v.jy - 1, jm: 12 } : { jy: v.jy, jm: v.jm - 1 }; renderCalendar(); });
  $('nextM').addEventListener('click', function () { var v = state.view; state.view = v.jm === 12 ? { jy: v.jy + 1, jm: 1 } : { jy: v.jy, jm: v.jm + 1 }; renderCalendar(); });
  $('goToday').addEventListener('click', function () { state.view = { jy: state.now.jy, jm: state.now.jm }; state.selected = state.now.jdn; renderCalendar(); });
  Array.prototype.forEach.call(document.querySelectorAll('#dayTabs .tab'), function (b) {
    b.addEventListener('click', function () { state.dayOffset = +b.dataset.d; renderDayInfo(); });
  });

  /* تمایل ملایم کارت‌ها (جلوهٔ سه‌بعدی) */
  Array.prototype.forEach.call(document.querySelectorAll('.tilt'), function (c) {
    c.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = 'perspective(900px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 5).toFixed(2) + 'deg)';
    });
    c.addEventListener('pointerleave', function () { c.style.transform = ''; });
  });

  /* ---------- شروع ---------- */
  CFG.LOCAL_PASS_HASH = CFG.LOCAL_PASS_HASH || strHash('polbol');
  document.title = CFG.SITE_NAME;
  $('siteSub').textContent = CFG.SITE_SUB;
  if (CFG.RUBIKA_LINK) $('rubikaBtn').href = CFG.RUBIKA_LINK; else $('rubikaBox').hidden = true;
  clear($('dow'));
  WD_SHORT.forEach(function (n) { $('dow').appendChild(h('div', { text: n })); });
  state.view = { jy: state.now.jy, jm: state.now.jm };
  state.selected = state.now.jdn;

  function tick() {
    var prev = state.now.jdn;
    state.now = J.tehranNow();
    renderClock();
    if (state.now.jdn !== prev) { renderAll(); }
  }
  setInterval(tick, 1000);

  function refresh() {
    return loadData().then(function () {
      renderAll();
      if ($('adminOverlay').classList.contains('open') && !state.editing && !document.activeElement.closest('#adminBody')) renderAdmin();
    });
  }
  refresh();
  setInterval(refresh, Math.max(15, CFG.REFRESH_SECONDS) * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });

  window.__sc = { state: state };
})();

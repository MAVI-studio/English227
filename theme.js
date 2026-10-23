/* کلید تم روشن/تیره: آدمک کنار چاله راه می‌رود؛ با تیره شدن تم داخل چاله می‌افتد و با روشن شدن بیرون می‌آید */
(function () {
  'use strict';
  var root = document.documentElement;
  var btn = document.getElementById('themeToggle');
  var cv = document.getElementById('stage');
  if (!btn || !cv) return;
  var ctx = cv.getContext('2d');
  var W = 148, H = 56, GROUND = 38, HOLE_X = 74, HOME_X = 108;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : { matches: false };

  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : mq.matches;
  }
  var dark = isDark();
  // idle | toHole | fall | gone | rise | toHome
  var st = { mode: dark ? 'gone' : 'idle', x: dark ? HOLE_X : HOME_X, y: dark ? 40 : 0, vy: 0, leg: 0, t: 0 };
  var raf = 0, last = 0;

  function css(name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var stick = css('--stick', '#091A36'), hole = css('--hole', 'rgba(9,26,54,.45)'), muted = css('--muted', '#6A7686');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // زمین
    ctx.strokeStyle = muted; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(54, GROUND + 3); ctx.lineTo(HOLE_X - 14, GROUND + 3);
    ctx.moveTo(HOLE_X + 14, GROUND + 3); ctx.lineTo(142, GROUND + 3); ctx.stroke();
    // ستاره‌ها در تم تیره
    if (isDark()) {
      ctx.fillStyle = stick;
      [[62, 14, 1.2], [84, 9, 1], [96, 20, 1.4], [70, 24, .9], [58, 30, .8]].forEach(function (s) {
        ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, 6.283); ctx.fill();
      });
    }
    // چاله
    ctx.fillStyle = hole;
    ctx.beginPath(); ctx.ellipse(HOLE_X, GROUND + 3, 13, 4.5, 0, 0, 6.283); ctx.fill();
    // آدمک (بالای زمین کلیپ می‌شود تا داخل چاله ناپدید شود)
    var falling = st.mode === 'fall' || st.mode === 'rise' || st.mode === 'gone';
    if (st.mode !== 'gone' || st.y < 38) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, GROUND + 3); ctx.clip();
      var fx = st.x, fy = GROUND + 3 + st.y;
      var walking = st.mode === 'toHole' || st.mode === 'toHome';
      var sw = walking ? Math.sin(st.leg) * 0.7 : 0;
      var dirn = (st.mode === 'toHole' || st.mode === 'idle') ? -1 : 1;
      ctx.strokeStyle = stick; ctx.fillStyle = stick; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(fx, fy - 23, 4.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx, fy - 18); ctx.lineTo(fx, fy - 9); ctx.stroke();
      // دست‌ها
      ctx.beginPath();
      if (falling) { ctx.moveTo(fx, fy - 16); ctx.lineTo(fx - 7, fy - 24); ctx.moveTo(fx, fy - 16); ctx.lineTo(fx + 7, fy - 24); }
      else { ctx.moveTo(fx, fy - 16); ctx.lineTo(fx + dirn * -sw * 7 - 4, fy - 9); ctx.moveTo(fx, fy - 16); ctx.lineTo(fx + dirn * sw * 7 + 4, fy - 9); }
      ctx.stroke();
      // پاها
      ctx.beginPath();
      ctx.moveTo(fx, fy - 9); ctx.lineTo(fx + dirn * (sw * 8) - 3, fy);
      ctx.moveTo(fx, fy - 9); ctx.lineTo(fx - dirn * (sw * 8) + 3, fy);
      ctx.stroke();
      ctx.restore();
    }
    // zzz در حالت تیره
    if (st.mode === 'gone') {
      ctx.fillStyle = muted; ctx.font = '700 9px sans-serif'; ctx.fillText('z', HOLE_X + 9, GROUND - 6);
      ctx.font = '700 12px sans-serif'; ctx.fillText('Z', HOLE_X + 15, GROUND - 14);
    }
  }

  function step(ts) {
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    var m = st.mode;
    if (m === 'toHole') {
      st.x -= 46 * dt; st.leg += dt * 14;
      if (st.x <= HOLE_X + 1) { st.x = HOLE_X; st.mode = 'fall'; st.vy = 0; }
    } else if (m === 'fall') {
      st.vy += 260 * dt; st.y += st.vy * dt;
      if (st.y > 42) { st.y = 42; st.mode = 'gone'; }
    } else if (m === 'rise') {
      st.y -= 40 * dt;
      if (st.y <= 0) { st.y = 0; st.mode = 'toHome'; }
    } else if (m === 'toHome') {
      st.x += 46 * dt; st.leg += dt * 14;
      if (st.x >= HOME_X) { st.x = HOME_X; st.mode = 'idle'; }
    }
    draw();
    if (st.mode === 'idle' || st.mode === 'gone') { raf = 0; last = 0; return; }
    raf = requestAnimationFrame(step);
  }
  function run() { if (!raf) { last = 0; raf = requestAnimationFrame(step); } }

  function snap(toDark) {
    st.mode = toDark ? 'gone' : 'idle'; st.x = toDark ? HOLE_X : HOME_X; st.y = toDark ? 42 : 0;
    draw();
  }

  function setUI(d) {
    btn.setAttribute('aria-checked', String(d));
    btn.setAttribute('aria-label', d ? 'تم تیره (برای روشن شدن بزن)' : 'تم روشن (برای تیره شدن بزن)');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', d ? '#0A1426' : '#091A36');
  }

  function toggle() {
    dark = !dark;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    setUI(dark);
    if (reduce) { snap(dark); return; }
    if (dark) { st.mode = (st.mode === 'rise' || st.y > 0) ? 'fall' : 'toHole'; if (st.mode === 'fall') st.vy = 0; }
    else { st.mode = (st.mode === 'gone' || st.mode === 'fall' || st.y > 0) ? 'rise' : 'toHome'; }
    run();
  }

  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  dark = isDark();
  st.mode = dark ? 'gone' : 'idle'; st.x = dark ? HOLE_X : HOME_X; st.y = dark ? 42 : 0;
  setUI(dark);
  draw();
  btn.addEventListener('click', toggle);
  if (mq.addEventListener) mq.addEventListener('change', function () {
    if (!root.getAttribute('data-theme')) { dark = isDark(); setUI(dark); snap(dark); }
  });
  window.addEventListener('load', draw);
})();

/*
 * RIDGE — 山稜ワイヤーフレーム (トップページの1要素だけの3Dモーション)
 *
 * - 依存ライブラリなし / canvas 2D のみ
 * - 谷（トレイル）を真ん中に、両側に稜線が並ぶ地形をゆっくり進む
 * - 入力は一切ハックしない（スクロール・マウス・タッチには反応しない。完全に自走）
 * - 画面外・タブ非表示では停止、prefers-reduced-motion では静止画1枚のみ
 * - 色は theme-vars.css の変数から取得（テーマ変更に自動追従）
 *   手前 = --main-font-color → 奥 = --doggo-color へ大気遠近でブレンド
 */
(function () {
  var canvas = document.getElementById('ridge');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var ROWS = 30, MAX_D = ROWS + 0.5, X_SPAN = 12, PX_STEP = 3, FPS = 30;
  var MAXP = 2048, PX = new Float32Array(MAXP), PY = new Float32Array(MAXP);
  var W = 0, H = 0, SC = 2, running = false, last = 0, t = 0, u = 0, near, far, bg;

  /* ---------- 色 ---------- */
  function parse(c, d) {
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((c || '').trim());
    if (!m) return d;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    var v = function (n) { return s.getPropertyValue(n); };
    near = parse(v('--main-font-color'), [255, 176, 0]);
    far = parse(v('--doggo-color'), [255, 95, 86]);
    bg = v('--main-bg-color').trim() || '#0d0a08';
  }
  function rgba(m, a) {
    return 'rgba(' + Math.round(near[0] + (far[0] - near[0]) * m) + ',' +
      Math.round(near[1] + (far[1] - near[1]) * m) + ',' +
      Math.round(near[2] + (far[2] - near[2]) * m) + ',' + a.toFixed(3) + ')';
  }

  /* ---------- 地形: ハッシュ値ノイズ + ridged fbm ---------- */
  function hash(x, z) {
    var n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function vnoise(x, z) {
    var xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), w = zf * zf * (3 - 2 * zf);
    var a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  }
  function bendAt(z) { return Math.sin(z * 0.23) * 1.4; } // 谷の中心線（ゆるく蛇行）
  function height(x, z) {
    var bend = bendAt(z);
    var wall = Math.min(1, Math.abs(x - bend) / 3.4);
    wall = wall * wall * (3 - 2 * wall);                  // smoothstep: 谷底は平ら
    var e = 0, amp = 1, fr = 0.55, sum = 0;
    for (var o = 0; o < 3; o++) {                         // ridged fbm 3 octaves
      var r = 1 - Math.abs(2 * vnoise(x * fr + 17.3, z * fr) - 1);
      e += r * r * amp; sum += amp; amp *= 0.45; fr *= 2.0;
    }
    return wall * (0.25 + (e / sum) * 3.0);
  }

  /* ---------- 描画 ---------- */
  function resize() {
    // サイズは canvas 自身ではなく「親の幅」から決め、canvas 側へインラインで指定する。
    // canvas の実寸を読み返すと、CSS が効いていない時（キャッシュ違い等）に
    // 既定300x150 → 描画バッファ2倍 → 表示も2倍 → …と拡大縮小のたびに倍々で崩れるため。
    var w = Math.round(canvas.parentNode.getBoundingClientRect().width);
    var h = window.matchMedia && matchMedia('(max-width: 768px)').matches ? 150 : 200; // CSSの高さと同じ境界
    if (w < 1) return;                                    // 非表示中は何もしない
    canvas.style.width = '100%';
    canvas.style.height = h + 'px';
    // 2倍以上で描く（1px線をにじませない）。ブラウザ拡大/高DPIでは上限3倍まで追従
    var sc = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 1)));
    if (w === W && h === H && sc === SC) return;
    W = w; H = h; SC = sc;
    canvas.width = W * SC;
    canvas.height = H * SC;
    draw();
  }

  function smooth(a, b, x) {
    x = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return x * x * (3 - 2 * x);
  }

  // 太陽: 下半分に横縞が入ったシンセウェイブ風ディスク
  function drawSun(cx, cy, r, ph) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.2832);
    ctx.clip();
    ctx.fillStyle = rgba(1, 0.9);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    for (var s = 0; s < 7; s++) {                          // 縞は下へ流れ、太くなりながら消える
      var u = s + ph;
      ctx.clearRect(cx - r, cy + r * (u * 0.15 - 0.1), r * 2, 0.2 + u * 0.75);
    }
    ctx.restore();
  }

  function draw() {
    if (!W || !H) return;
    var hy = H * 0.34, f = W * 0.62, cx = W / 2;
    var base = Math.floor(t), frac = t - base;
    var i, j, x;

    // 自走カメラ: 谷の蛇行に沿って進み、カーブでは機体を傾け（バンク）、ゆるく上下する
    var camX = bendAt(t + 1) * 0.85 + Math.sin(u * 0.6) * 0.5;
    var camY = 1.9 + Math.sin(u * 1.1) * 0.12;
    var roll = -Math.cos((t + 1) * 0.23) * 0.32 * 0.08;
    var pulse = MAX_D * (1 - (u * 0.22) % 1);              // 手前へ流れてくる走査光の位置

    ctx.setTransform(SC, 0, 0, SC, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(cx, H * 0.6); ctx.rotate(roll); ctx.translate(-cx, -H * 0.6);

    drawSun(cx, hy - H * 0.12 + Math.sin(u * 0.8) * 2, Math.min(H * 0.2, 36), (u * 0.5) % 1);
    ctx.lineJoin = 'round';

    for (i = ROWS - 1; i >= 0; i--) {
      var depth = 1.5 + i - frac, k = f / depth, zz = base + i;
      var xr = Math.min(X_SPAN, (W / 2 + 60) / k);        // 画面に入る範囲だけ（傾き分の余白込み）
      var dx = PX_STEP / k;                                // 画面上 ~3px 間隔でサンプル
      var n = Math.ceil(2 * xr / dx);

      // 稜線の頂点を1回だけ計算（fill と stroke で使い回す）
      if (n > MAXP - 1) n = MAXP - 1;
      for (j = 0; j <= n; j++) {
        x = camX - xr + j * dx;
        PX[j] = cx + (x - camX) * k;
        PY[j] = hy + (camY - height(x, zz)) * k;
      }

      // 手前の稜線で奥を隠す（隠線処理）
      ctx.beginPath();
      ctx.moveTo(PX[0], H + 40);
      for (j = 0; j <= n; j++) ctx.lineTo(PX[j], PY[j]);
      ctx.lineTo(PX[n], H + 40);
      ctx.closePath();
      ctx.fillStyle = bg;
      ctx.fill();

      // 連続量 depth から alpha / 太さ / 色を決める（行の入れ替わりで跳ねない）
      var m = Math.pow(depth / MAX_D, 0.8);
      var a = smooth(0.5, 2.6, depth) * Math.pow(1 - depth / MAX_D, 1.25);
      var pl = Math.exp(-(depth - pulse) * (depth - pulse) / 4); // 走査光: 通過中の稜線が明るく太く
      a = Math.min(1, a * (1 + 2.2 * pl));
      ctx.lineWidth = Math.min(1.6, Math.max(0.6, 0.45 + k * 0.008)) + pl * 0.5;
      ctx.strokeStyle = rgba(m, a);
      ctx.beginPath();
      ctx.moveTo(PX[0], PY[0]);
      for (j = 1; j <= n; j++) ctx.lineTo(PX[j], PY[j]);
      ctx.stroke();
    }
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (now - last < 1000 / FPS) return;
    var dt = Math.min(now - last, 100);
    t += dt * 0.0004;                                      // 前進速度（ゆっくり）
    u += dt * 0.0007;                                      // 揺れ・走査光・太陽の縞の時計（前進とは別）
    last = now;
    draw();
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  readColors();
  t = 3.2;
  resize();
  // ブラウザ拡大・回転・レイアウト変化でも実サイズに追従
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentNode);
  window.addEventListener('resize', resize);

  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 画面外・非表示タブでは止めて CPU/バッテリーを使わない
  var visible = true, tabOn = !document.hidden;
  function sync() { (visible && tabOn) ? start() : stop(); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[e.length - 1].isIntersecting; sync(); }).observe(canvas); // 複数エントリなら最新を採用
  }
  document.addEventListener('visibilitychange', function () { tabOn = !document.hidden; sync(); });
  sync();
})();

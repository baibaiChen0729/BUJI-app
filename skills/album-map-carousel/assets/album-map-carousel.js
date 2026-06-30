/*!
 * AlbumMapCarousel —— 固定 6 点位 · 水平列轮转 · 内容无限推送 · 焦点联动文案
 * ------------------------------------------------------------------
 * 零依赖 UMD。源自「步集」相册地图（Figma v2WOCWYFzvdDMsumz2cDoG / 361:1866）。
 *
 * 核心模型：
 *   - 固定的列×排网格（默认 4 列 × 2 排），中列大图作焦点、两侧错落露窄边
 *   - 水平拖拽 = 列轮转（wrapS 循环 + 惯性 + 列吸附），视口内恒定可见 3 列 × 2 排
 *   - 垂直拖拽 = 橡皮筋（tanh 限幅，松手回弹 0），第一排距顶恒定不变
 *   - 内容推送：某列轮出视口外(wrap)的一刻，悄悄换成 items 里的下一张
 *               → 一直滑，所有照片都会轮流流过「中列第一排」焦点位
 *   - 焦点联动：中列第一排的图 = 焦点，切换时回调 onFocus(item, index)
 * ------------------------------------------------------------------
 */
(function (global, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else global.AlbumMapCarousel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.container   舞台容器（需 position:relative/absolute + overflow:hidden）
   * @param {Array<{src:string,h:number,meta?:*}>} opts.items  照片序列（h=该图在列宽下的显示高度）
   * @param {(item, index)=>void} [opts.onFocus]  焦点切换回调（用来更新左上日期/文案）
   * @param {number} [opts.cardWidth=270]  列宽
   * @param {number} [opts.gap=18]         间距
   * @param {number} [opts.baseTop=37]     第一排距容器顶（恒定不变）
   * @param {number[]} [opts.colStart=[0,87,87,142]]  各列错落起始 y
   * @param {number} [opts.numCols=4]      列数（≥3；可见 3 列，多出的在视口外做轮转缓冲）
   * @param {number} [opts.panYMax=52]     垂直橡皮筋最大临时位移
   * @param {number} [opts.cardRadius=20]  卡片圆角
   * @param {string} [opts.cardShadow]     卡片阴影
   */
  function AlbumMapCarousel(opts) {
    if (!opts || !opts.container) throw new Error('AlbumMapCarousel: opts.container is required');
    this.stage = opts.container;
    this.items = opts.items || [];
    if (!this.items.length) throw new Error('AlbumMapCarousel: opts.items must be a non-empty array');
    this.onFocus = opts.onFocus || function () {};

    this.CW = opts.cardWidth != null ? opts.cardWidth : 270;
    this.GAP = opts.gap != null ? opts.gap : 18;
    this.COL_STEP = this.CW + this.GAP;
    this.BASE_TOP = opts.baseTop != null ? opts.baseTop : 37;
    this.COL_START = opts.colStart || [0, 87, 87, 142];
    this.numCols = opts.numCols != null ? opts.numCols : 4;
    this.centerCol = Math.floor((this.numCols - 1) / 2);
    this.PANY_MAX = opts.panYMax != null ? opts.panYMax : 52;
    this.cardRadius = opts.cardRadius != null ? opts.cardRadius : 20;
    this.cardShadow = opts.cardShadow != null ? opts.cardShadow : '0 0 0 1px #ffffff, 0 4px 16px rgba(0,0,0,0.06)';

    this.rotation = 0;     // 水平：单位=列
    this.panY = 0;         // 垂直：橡皮筋临时位移
    this.nextC = 0;        // 下一张要推送的内容序号
    this._focusIdx = 0;
    this._cards = [];
    this._raf = null;

    this._build();
  }

  var P = AlbumMapCarousel.prototype;

  P._makeCard = function (src, w, h) {
    var card = document.createElement('div');
    card.style.cssText =
      'position:absolute;top:0;left:0;overflow:hidden;will-change:transform;' +
      'border-radius:' + this.cardRadius + 'px;box-shadow:' + this.cardShadow + ';';
    card.style.width = w + 'px';
    card.style.height = h + 'px';
    var img = document.createElement('img');
    img.src = src;
    img.draggable = false;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;';
    card.appendChild(img);
    return { card: card, img: img };
  };

  // 列错落起始 y（线性插值，随列轮转平滑过渡）
  P.colExtra = function (s) {
    var arr = this.COL_START, n = arr.length;
    var f = Math.floor(s), fr = s - f;
    var a = arr[((f % n) + n) % n];
    var b = arr[(((f + 1) % n) + n) % n];
    return a * (1 - fr) + b * fr;
  };

  // 把列下标 wrap 到居中可见范围 [-numCols/2, numCols/2)
  P.wrapS = function (s) {
    var n = this.numCols;
    var w = ((s % n) + n) % n;
    if (w > n / 2) w -= n;
    return w;
  };

  P._cx0 = function () { return this.stage.clientWidth / 2 - this.CW / 2; };

  P._build = function () {
    var count = this.numCols * 2;     // 列 × 2 排
    for (var i = 0; i < count; i++) {
      var col = Math.floor(i / 2), row = i % 2;
      var row0 = this.items[(col * 2) % this.items.length];
      var rowYOffset = row === 0 ? 0 : (row0.h + this.GAP);
      var idx = i % this.items.length;
      var it = this.items[idx];
      var made = this._makeCard(it.src, this.CW, it.h);
      this.stage.appendChild(made.card);
      this._cards.push({ el: made.card, img: made.img, col: col, row: row, rowYOffset: rowYOffset, cIdx: idx, _s: null });
    }
    this.nextC = count;
    this._bind();
    this.place(false);
    this._updateFocus();
  };

  P.place = function (anim) {
    var c0 = this._cx0(), self = this, N = this.items.length;
    this._cards.forEach(function (it) {
      var s = self.wrapS(it.col - self.centerCol - self.rotation);
      var x = c0 + s * self.COL_STEP;
      var y = self.BASE_TOP + self.colExtra(s) + it.rowYOffset + self.panY;
      var jumped = it._s != null && Math.abs(s - it._s) > 1.5;
      if (jumped) {                       // ★ 内容推送：刚 wrap 到视口外 → 换下一张（用户看不到突变）
        it.cIdx = self.nextC % N; self.nextC++;
        it.img.src = self.items[it.cIdx].src;
      }
      it.el.style.transition = (anim && !jumped) ? 'transform 0.34s cubic-bezier(0.22,1,0.36,1)' : 'none';
      it.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      it._s = s;
    });
  };

  // 焦点 = wrap 后最接近中列第一排（s≈0, row0）的卡片
  P._updateFocus = function () {
    var best = null, bd = Infinity, self = this;
    this._cards.forEach(function (it) {
      var s = self.wrapS(it.col - self.centerCol - self.rotation);
      var d = Math.abs(s) * 2 + it.row;
      if (d < bd) { bd = d; best = it; }
    });
    if (best) {
      this._focusIdx = best.cIdx % this.items.length;
      this.onFocus(this.items[this._focusIdx], this._focusIdx);
    }
  };

  P._bind = function () {
    var self = this, st = this.stage;
    var d = { on: false, sx: 0, sy: 0, r0: 0, v: 0, lr: 0, lt: 0 };
    st.style.touchAction = 'none';

    function down(e) {
      cancelAnimationFrame(self._raf);
      d.on = true; st.classList.add('dragging');
      d.sx = e.clientX; d.sy = e.clientY; d.r0 = self.rotation;
      d.v = 0; d.lr = self.rotation; d.lt = performance.now();
      if (st.setPointerCapture) try { st.setPointerCapture(e.pointerId); } catch (_) {}
    }
    function move(e) {
      if (!d.on) return;
      var now = performance.now(), dt = now - d.lt;
      var nr = d.r0 - (e.clientX - d.sx) / self.COL_STEP;
      if (dt > 0) d.v = 0.75 * d.v + 0.25 * (nr - d.lr) / dt;
      d.lr = nr; d.lt = now; self.rotation = nr;
      var dy = e.clientY - d.sy;
      self.panY = self.PANY_MAX * Math.tanh(dy / 160);   // 垂直只给橡皮筋手感
      self.place(false); self._updateFocus();
    }
    function up() {
      if (!d.on) return;
      d.on = false; st.classList.remove('dragging');
      cancelAnimationFrame(self._raf);
      var last = performance.now();
      function tick(now) {
        var dt = Math.min(40, now - last); last = now;
        self.panY += (0 - self.panY) * 0.2;
        var vDone = Math.abs(self.panY) < 0.4;
        if (vDone) self.panY = 0;
        var hDone = false;
        if (Math.abs(d.v) > 0.0006) {
          self.rotation += d.v * dt; d.v *= Math.pow(0.94, dt / 16);
        } else {
          var tg = Math.round(self.rotation), df = tg - self.rotation;
          self.rotation += df * 0.16;
          if (Math.abs(df) < 0.0015) { self.rotation = tg; hDone = true; }
        }
        self.place(false); self._updateFocus();
        if (hDone && vDone) { self.place(false); self._updateFocus(); return; }
        self._raf = requestAnimationFrame(tick);
      }
      self._raf = requestAnimationFrame(tick);
    }

    this._handlers = { down: down, move: move, up: up };
    st.addEventListener('pointerdown', down);
    st.addEventListener('pointermove', move);
    st.addEventListener('pointerup', up);
    st.addEventListener('pointercancel', up);
  };

  /** 当前焦点照片 / 下标 */
  P.getFocus = function () { return this.items[this._focusIdx]; };
  P.getFocusIndex = function () { return this._focusIdx; };

  /** 重新布局（容器尺寸变化时调用） */
  P.relayout = function () { this.place(false); this._updateFocus(); };

  /** 销毁：解绑事件、移除卡片 */
  P.destroy = function () {
    cancelAnimationFrame(this._raf);
    var st = this.stage, h = this._handlers;
    if (h) {
      st.removeEventListener('pointerdown', h.down);
      st.removeEventListener('pointermove', h.move);
      st.removeEventListener('pointerup', h.up);
      st.removeEventListener('pointercancel', h.up);
    }
    this._cards.forEach(function (c) { c.el.remove(); });
    this._cards = [];
  };

  return AlbumMapCarousel;
});

/*!
 * DotMaskCompositor v1.0.0
 * 双区上下对照的「实心 ↔ 镂空」波点实时合成器
 * 适配场景：相机/视频/图像 → 添加波点遮罩艺术滤镜（步集 / dooo0t 风格）
 *
 * 渲染结构（默认 swapped=false）：
 *   ┌──────────────────────────┐
 *   │  取景区（实时画面）        │  ← frameY = 0
 *   │  + dotColor 实心圆遮挡    │
 *   ├──────────────────────────┤  ← 无缝衔接（gap=0）
 *   │  遮罩区（maskColor 蒙版） │  ← maskY = singleH
 *   │  + 圆形镂空露出取景       │
 *   └──────────────────────────┘
 *
 * 两区的圆形位置完全相同 → "实心-镂空"镜像对照美学
 *
 * 用法：
 *   const comp = new DotMaskCompositor({ canvas, source: video });
 *   comp.start();   // 启动 rAF 循环
 *
 * 作者：陈文静 chenwenjing2@xiaohongshu.com
 * 协议：内部复用
 */
(function (global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    global.DotMaskCompositor = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /** 比例字符串 → 宽高比对象 */
  const RATIO_MAP = {
    '16:9': { w: 16, h: 9 },
    '4:3':  { w: 4,  h: 3 },
    '1:1':  { w: 1,  h: 1 },
    '3:4':  { w: 3,  h: 4 },
    '9:16': { w: 9,  h: 16 },
  };

  /** YIQ 亮度判定（用于水印反色） */
  function isHexDark(hex) {
    if (!hex || hex[0] !== '#') return false;
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }

  /** 计算 cover 模式的源裁剪矩形 */
  function computeCoverRect(srcW, srcH, dstW, dstH) {
    const srcAspect = srcW / srcH;
    const dstAspect = dstW / dstH;
    let sw, sh, sx, sy;
    if (srcAspect > dstAspect) {
      sh = srcH;
      sw = srcH * dstAspect;
      sx = (srcW - sw) / 2;
      sy = 0;
    } else {
      sw = srcW;
      sh = srcW / dstAspect;
      sx = 0;
      sy = (srcH - sh) / 2;
    }
    return { sx, sy, sw, sh };
  }

  // ───────────────────────────────────────────────
  //  DotMaskCompositor
  // ───────────────────────────────────────────────
  class DotMaskCompositor {
    /**
     * @param {Object} options
     * @param {HTMLCanvasElement} options.canvas      - 输出画布
     * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} [options.source] - 输入源
     * @param {string} [options.ratio='1:1']          - 单区域比例
     * @param {number} [options.maxWidth=366]         - 最大宽度（px）
     * @param {number} [options.maxHeight=820]        - 最大总高度（px，含两区）
     * @param {number} [options.dpr]                  - 设备像素比，默认 window.devicePixelRatio
     * @param {string} [options.maskColor='#ffffff']  - 遮罩区底色
     * @param {string} [options.dotColor='#ffffff']   - 取景区遮挡圆色
     * @param {string} [options.shape='circle']       - circle / teardrop / char
     * @param {string} [options.char='喵']             - shape='char' 时的字符
     * @param {Array}  [options.dots]                  - 波点数组，每项 {x,y,sizeMul}，x/y∈[0,1]
     * @param {number} [options.dotBaseSize=20]       - 基准半径（px）
     * @param {number} [options.dotOpacity=0.95]      - 取景区遮挡圆不透明度
     * @param {boolean}[options.swapped=false]        - 上下交换：true→取景在下
     * @param {string} [options.bgColor='#0a0a14']    - canvas 背景兜底色
     * @param {string} [options.watermark]            - 右下水印文字（可选）
     * @param {Function}[options.onFps]               - 每秒回调 fps，签名 (fps:number)=>void
     */
    constructor(options = {}) {
      if (!options.canvas) throw new Error('[DotMaskCompositor] options.canvas 必传');

      this.canvas = options.canvas;
      this.ctx = this.canvas.getContext('2d');
      this.source = options.source || null;

      this.opts = {
        ratio:       options.ratio       || '1:1',
        maxWidth:    options.maxWidth    || 366,
        maxHeight:   options.maxHeight   || 820,
        dpr:         options.dpr         || (typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2),
        maskColor:   options.maskColor   || '#ffffff',
        dotColor:    options.dotColor    || options.maskColor || '#ffffff',
        shape:       options.shape       || 'circle',
        char:        options.char        || '喵',
        charWeight:  options.charWeight  || 'normal',
        polygonSides: options.polygonSides || 6,
        starPoints:  options.starPoints  || 5,
        starInnerRatio: options.starInnerRatio != null ? options.starInnerRatio : 0.42,
        dots:        options.dots        || [],
        dotBaseSize: options.dotBaseSize || 20,
        dotOpacity:  options.dotOpacity != null ? options.dotOpacity : 0.95,
        swapped:     !!options.swapped,
        bgColor:     options.bgColor     || '#0a0a14',
        watermark:   options.watermark   || '',
        onFps:       options.onFps       || null,
      };

      this._dims = null;
      this._rafId = null;
      this._frameCount = 0;
      this._lastFpsTime = 0;

      this._updateCanvasSize();
    }

    // ─── 配置 setter ───────────────────────────────
    setSource(src)        { this.source = src; }
    setRatio(r)           { if (RATIO_MAP[r]) { this.opts.ratio = r; this._updateCanvasSize(); } }
    setMaskColor(c)       { this.opts.maskColor = c; if (!this._dotColorExplicit) this.opts.dotColor = c; }
    setDotColor(c)        { this.opts.dotColor = c; this._dotColorExplicit = true; }
    setShape(s)           { this.opts.shape = s; }
    setPolygonSides(n)    { this.opts.polygonSides = n; }
    setCharWeight(w)      { this.opts.charWeight = w; }
    setStarPoints(n)      { this.opts.starPoints = n; }
    setStarInnerRatio(n)  { this.opts.starInnerRatio = n; }
    setChar(c)            { this.opts.char = c; }
    setDots(arr)          { this.opts.dots = arr || []; }
    setDotBaseSize(n)     { this.opts.dotBaseSize = n; }
    setDotOpacity(n)      { this.opts.dotOpacity = n; }
    setSwapped(b)         { this.opts.swapped = !!b; }
    setWatermark(s)       { this.opts.watermark = s || ''; }

    /** 获取当前画布尺寸信息 */
    getDimensions()       { return Object.assign({}, this._dims); }

    // ─── 渲染控制 ──────────────────────────────────
    /** 渲染单帧（用于静态图像/手动驱动） */
    render() { this._renderFrame(); }

    /** 启动 rAF 渲染循环（用于视频/Demo） */
    start() {
      if (this._rafId != null) return;
      this._lastFpsTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      const loop = () => {
        this._renderFrame();
        this._rafId = requestAnimationFrame(loop);
      };
      this._rafId = requestAnimationFrame(loop);
    }

    /** 停止 rAF 渲染循环 */
    stop() {
      if (this._rafId != null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
    }

    /** 导出当前画布为 dataURL（PNG） */
    toDataURL(type = 'image/png', quality) { return this.canvas.toDataURL(type, quality); }

    /** 导出当前画布为 Blob */
    toBlob(type = 'image/png', quality) {
      return new Promise(resolve => this.canvas.toBlob(resolve, type, quality));
    }

    // ─── 内部：canvas 尺寸 ────────────────────────
    _updateCanvasSize() {
      const r = RATIO_MAP[this.opts.ratio] || RATIO_MAP['1:1'];
      const aspect = r.w / r.h;
      const GAP = 0;  // 无缝衔接
      let singleW = this.opts.maxWidth;
      let singleH = singleW / aspect;
      if (singleH * 2 + GAP > this.opts.maxHeight) {
        singleH = (this.opts.maxHeight - GAP) / 2;
        singleW = singleH * aspect;
      }
      const totalW = singleW;
      const totalH = singleH * 2 + GAP;
      const dpr = this.opts.dpr;

      this.canvas.width  = Math.round(totalW * dpr);
      this.canvas.height = Math.round(totalH * dpr);
      this.canvas.style.width  = totalW + 'px';
      this.canvas.style.height = totalH + 'px';

      // 重置变换并应用 dpr（避免重复 scale 累积）
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);

      this._dims = { totalW, totalH, singleW, singleH, gap: GAP };
    }

    // ─── 内部：核心渲染 ───────────────────────────
    _renderFrame() {
      const dims = this._dims;
      const ctx = this.ctx;
      const o = this.opts;
      if (!dims || !this.source) {
        // 空源时，仅清空 + 画遮罩底
        if (dims) {
          ctx.fillStyle = o.bgColor;
          ctx.fillRect(0, 0, dims.totalW, dims.totalH);
        }
        return;
      }
      const { totalW, totalH, singleW, singleH, gap } = dims;

      // 取景/遮罩区位置（swap 决定上下）
      let frameY, maskY;
      if (o.swapped) { maskY = 0; frameY = singleH + gap; }
      else           { frameY = 0; maskY = singleH + gap; }

      // 源尺寸
      const src = this.source;
      const srcW = src.videoWidth || src.naturalWidth || src.width || 640;
      const srcH = src.videoHeight || src.naturalHeight || src.height || 480;
      const cover = computeCoverRect(srcW, srcH, singleW, singleH);
      const { sx, sy, sw, sh } = cover;

      // ① 清空背景
      ctx.fillStyle = o.bgColor;
      ctx.fillRect(0, 0, totalW, totalH);

      // ② 取景区 cover 填充
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, frameY, singleW, singleH);
      ctx.clip();
      try { ctx.drawImage(src, sx, sy, sw, sh, 0, frameY, singleW, singleH); } catch (e) {}
      ctx.restore();

      // ③ 取景区波点遮挡
      o.dots.forEach(dot => {
        const px = dot.x * singleW;
        const py = frameY + dot.y * singleH;
        const r  = o.dotBaseSize * (dot.sizeMul || 1);
        this._drawDot(px, py, r, 'mask-on-frame', src, sx, sy, sw, sh, frameY, singleW, singleH);
      });

      // ④ 遮罩区底色
      ctx.fillStyle = o.maskColor;
      ctx.fillRect(0, maskY, singleW, singleH);

      // ⑤ 遮罩区镂空波点
      o.dots.forEach(dot => {
        const px = dot.x * singleW;
        const py = maskY + dot.y * singleH;
        const r  = o.dotBaseSize * (dot.sizeMul || 1);
        this._drawDot(px, py, r, 'window-on-mask', src, sx, sy, sw, sh, maskY, singleW, singleH);
      });

      // ⑥ 水印（可选）
      if (o.watermark) {
        const dark = isHexDark(o.maskColor);
        ctx.fillStyle = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
        ctx.font = '600 9px -apple-system, "PingFang SC", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(o.watermark, singleW - 8, maskY + singleH - 6);
      }

      // ⑦ FPS 回调
      if (o.onFps) {
        this._frameCount++;
        const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        if (now - this._lastFpsTime > 1000) {
          const fps = Math.round(this._frameCount * 1000 / (now - this._lastFpsTime));
          try { o.onFps(fps); } catch (e) {}
          this._frameCount = 0;
          this._lastFpsTime = now;
        }
      }
    }

    // ─── 内部：生成形状路径（中心 cx,cy，外接半径 r）────
    //   circle / polygon（正多边形）/ star（星形）/ teardrop（水滴）
    _tracePath(cx, cy, r) {
      const ctx = this.ctx;
      const shape = this.opts.shape;
      if (shape === 'polygon') {
        const n = this.opts.polygonSides;
        const rot = -Math.PI / 2;
        for (let i = 0; i < n; i++) {
          const a = rot + i * 2 * Math.PI / n;
          const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else if (shape === 'star') {
        const p = this.opts.starPoints;
        const inner = r * this.opts.starInnerRatio;
        const rot = -Math.PI / 2;
        for (let i = 0; i < p * 2; i++) {
          const rr = (i % 2 === 0) ? r : inner;
          const a = rot + i * Math.PI / p;
          const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else if (shape === 'teardrop') {
        // 设计稿真实水滴 path（原始坐标系 23.1×34.67，顶尖朝上），归一化为高度=2r
        const s = (2 * r) / 34.6667;
        const ox = 11.5685, oy = 17.3333;
        const P = (x, y) => [cx + (x - ox) * s, cy + (y - oy) * s];
        let p = P(11.5685, 0);        ctx.moveTo(p[0], p[1]);
        p = P(21.5741, 17.343);       ctx.lineTo(p[0], p[1]);
        let a = P(26.0168, 25.0438), b = P(20.459, 34.6667), e = P(11.5685, 34.6667);
        ctx.bezierCurveTo(a[0], a[1], b[0], b[1], e[0], e[1]);
        a = P(2.67797, 34.6667); b = P(-2.87985, 25.0438); e = P(1.56295, 17.343);
        ctx.bezierCurveTo(a[0], a[1], b[0], b[1], e[0], e[1]);
        p = P(11.5685, 0);            ctx.lineTo(p[0], p[1]);
        ctx.closePath();
      } else {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
    }

    // ─── 内部：离屏画布（字符开窗用，避免 source-in 污染主画布）──
    _getOffscreen(w, h) {
      if (!this._off) {
        this._off = document.createElement('canvas');
        this._offCtx = this._off.getContext('2d');
      }
      const W = Math.ceil(w * 2), H = Math.ceil(h * 2);
      if (this._off.width !== W || this._off.height !== H) {
        this._off.width = W; this._off.height = H;
      }
      return { canvas: this._off, ctx: this._offCtx, scale: 2 };
    }

    // ─── 内部：单个波点绘制 ───────────────────────
    /**
     * @param px,py    - 圆心
     * @param r        - 半径
     * @param mode     - 'mask-on-frame'：在取景区盖遮挡 | 'window-on-mask'：在遮罩区挖洞
     * @param baseY    - 该圆所在区域的顶部 Y（必须 = py - dot.y * singleH）
     */
    _drawDot(px, py, r, mode, src, sx, sy, sw, sh, baseY, singleW, singleH) {
      const ctx = this.ctx;
      const o = this.opts;

      // ── 字符形状：用 fillText（无法走通用 path clip）──
      if (o.shape === 'char') {
        if (mode === 'mask-on-frame') {
          ctx.save();
          ctx.font = `${o.charWeight} ${r * 1.8}px -apple-system, "PingFang SC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = o.dotColor;
          ctx.globalAlpha = Math.min(1, o.dotOpacity);
          ctx.fillText(o.char, px, py);
          ctx.restore();
        } else {
          // 字符开窗：在【离屏画布】做 source-in 合成，再整体贴回
          //   绝不能在主 ctx 上直接 source-in，否则会清掉遮罩区其他像素
          const off = this._getOffscreen(singleW, singleH);
          const octx = off.ctx;
          octx.setTransform(off.scale, 0, 0, off.scale, 0, 0);
          octx.clearRect(0, 0, singleW, singleH);
          octx.font = `${o.charWeight} ${r * 1.8}px -apple-system, "PingFang SC", sans-serif`;
          octx.textAlign = 'center';
          octx.textBaseline = 'middle';
          octx.fillStyle = '#000';
          octx.fillText(o.char, px, py - baseY);
          octx.globalCompositeOperation = 'source-in';
          try { octx.drawImage(src, sx, sy, sw, sh, 0, 0, singleW, singleH); } catch (e) {}
          octx.globalCompositeOperation = 'source-over';
          ctx.drawImage(off.canvas, 0, 0, singleW * off.scale, singleH * off.scale, 0, baseY, singleW, singleH);
        }
        return;
      }

      // ── 几何形状：circle / polygon / star / teardrop 统一 path + clip ──
      ctx.save();
      ctx.beginPath();
      this._tracePath(px, py, r);
      ctx.clip();
      if (mode === 'mask-on-frame') {
        ctx.fillStyle = o.dotColor;
        ctx.globalAlpha = Math.min(1, o.dotOpacity);
        ctx.fillRect(px - r * 1.6, py - r * 1.6, r * 3.2, r * 3.2);
      } else {
        try { ctx.drawImage(src, sx, sy, sw, sh, 0, baseY, singleW, singleH); } catch (e) {}
      }
      ctx.restore();
    }
  }

  // ───────────────────────────────────────────────
  //  静态工具：拒绝采样生成不重叠波点
  // ───────────────────────────────────────────────
  /**
   * 生成"防重叠 + 大小聚散对比"的波点数组（拒绝采样）
   * @param {Object} cfg
   * @param {number} cfg.count          - 目标点数
   * @param {number} [cfg.baseSize=20]  - 基准半径
   * @param {number} [cfg.minGap=3]     - 圆与圆最小空隙（参考宽度下的 px）
   * @param {number} [cfg.refSize=360]  - 距离比较的参考宽度
   * @param {number} [cfg.bigRatio=0.3] - 大圆占比（0~1）
   * @param {number} [cfg.variance]     - 差异 0~1：大小离散度（传入则覆盖 smallMul/bigMul）
   *                                      v=0 全部≈1（一致）；v=1 大圆≈1.8/小圆≈0.45（强烈聚散）
   * @param {Array<number>} [cfg.smallMul=[0.55,1.0]] - 小圆 sizeMul 区间（variance 未传时生效）
   * @param {Array<number>} [cfg.bigMul=[1.1,1.7]]    - 大圆 sizeMul 区间（variance 未传时生效）
   * @returns {Array<{x:number,y:number,sizeMul:number}>}
   */
  DotMaskCompositor.generateDots = function (cfg) {
    cfg = cfg || {};
    const count    = cfg.count || 8;
    const baseR    = cfg.baseSize || 20;
    const minGap   = cfg.minGap != null ? cfg.minGap : 3;
    const REF      = cfg.refSize || 360;
    const bigRatio = cfg.bigRatio != null ? cfg.bigRatio : 0.3;
    const useVar   = cfg.variance != null;
    const v        = cfg.variance;
    const sm       = cfg.smallMul || [0.55, 1.0];
    const bg       = cfg.bigMul || [1.1, 1.7];
    const maxAttempts = count * 120;
    const dots = [];
    let attempts = 0;

    while (dots.length < count && attempts < maxAttempts) {
      attempts++;
      const isBig = Math.random() < bigRatio;
      const sizeMul = useVar
        ? (isBig ? 1 + v * (0.2 + Math.random() * 0.6)
                 : 1 - v * (0.05 + Math.random() * 0.5))
        : (isBig ? bg[0] + Math.random() * (bg[1] - bg[0])
                 : sm[0] + Math.random() * (sm[1] - sm[0]));
      const r = baseR * sizeMul;
      const margin = r / REF + 0.015;
      const cand = {
        x: margin + Math.random() * (1 - margin * 2),
        y: margin + Math.random() * (1 - margin * 2),
        sizeMul,
      };
      let collide = false;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const dx = (cand.x - d.x) * REF;
        const dy = (cand.y - d.y) * REF;
        const dist = Math.hypot(dx, dy);
        const need = r + baseR * d.sizeMul + minGap;
        if (dist < need) { collide = true; break; }
      }
      if (!collide) dots.push(cand);
    }
    return dots;
  };

  /**
   * 增量调整点数，保持已有点位置不变（用于"数量"滑块这类交互）
   *   - target ≤ 现有数量：截断末尾
   *   - target > 现有数量：追加新点（拒绝采样，避开所有已有点）
   * @param {Array} existing - 现有点数组 [{x,y,seed,sizeMul}, ...]
   * @param {number} target  - 目标点数
   * @param {Object} [cfg]   - { baseSize, minGap, refSize, variance }
   * @returns {Array} 新的点数组（已有点位置不变）
   */
  DotMaskCompositor.appendDots = function (existing, target, cfg) {
    cfg = cfg || {};
    const baseR = cfg.baseSize || 20;
    const REF = cfg.refSize || 360;
    const minGap = cfg.minGap != null ? cfg.minGap : 3;
    const v = cfg.variance != null ? cfg.variance : 0.5;
    const SPREAD = 0.85;
    const dots = (existing || []).slice();
    if (target <= dots.length) return dots.slice(0, target);
    const reserve = baseR * 1.4;
    const need = reserve * 2 + minGap;
    const margin = reserve / REF + 0.015;
    let attempts = 0;
    const maxAttempts = (target - dots.length) * 300;
    while (dots.length < target && attempts < maxAttempts) {
      attempts++;
      const seed = Math.random();
      const cand = {
        x: margin + Math.random() * (1 - margin * 2),
        y: margin + Math.random() * (1 - margin * 2),
        seed,
        sizeMul: 1 + (seed - 0.5) * 2 * v * SPREAD,
      };
      let collide = false;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const dx = (cand.x - d.x) * REF, dy = (cand.y - d.y) * REF;
        if (Math.hypot(dx, dy) < need) { collide = true; break; }
      }
      if (!collide) dots.push(cand);
    }
    return dots;
  };

  /**
   * Figma「步集」设计稿默认 8 点预设
   * 区域归一化坐标，sizeMul 以 baseSize=20 为基准
   */
  DotMaskCompositor.FIGMA_PRESET_DOTS = [
    { x: 0.073, y: 0.318, sizeMul: 0.78 },
    { x: 0.291, y: 0.500, sizeMul: 0.80 },
    { x: 0.415, y: 0.793, sizeMul: 0.73 },
    { x: 0.445, y: 0.026, sizeMul: 0.73 },
    { x: 0.651, y: 0.641, sizeMul: 1.58 },
    { x: 0.808, y: 0.302, sizeMul: 1.10 },
    { x: 0.965, y: 0.550, sizeMul: 0.73 },
    { x: 0.035, y: 0.781, sizeMul: 1.10 },
  ];

  /** 常用色板 */
  DotMaskCompositor.PRESET_PALETTES = [
    { id: 'classic', name: '经典白', maskColor: '#ffffff', dotColor: '#ffffff' },
    { id: 'milk',    name: '奶咖',   maskColor: '#f5efe0', dotColor: '#f5efe0' },
    { id: 'mint',    name: '薄荷',   maskColor: '#d4f1e8', dotColor: '#d4f1e8' },
    { id: 'pink',    name: '樱粉',   maskColor: '#ffd6e4', dotColor: '#ffd6e4' },
    { id: 'sky',     name: '天空',   maskColor: '#cce5f5', dotColor: '#cce5f5' },
    { id: 'night',   name: '夜色',   maskColor: '#1a1a2e', dotColor: '#1a1a2e' },
  ];

  DotMaskCompositor.version = '1.0.0';
  return DotMaskCompositor;
});

---
name: dot-mask-compositor
description: 把任意视频/图像/相机画面实时合成为「上方实心遮挡 + 下方镂空透出」的双区波点对照美学图像。适用场景包括：相机滤镜 App、海报生成器、艺术风照片墙、双区对照展示（dooo0t / 步集 / Memoji 拼贴风）。当用户需求出现关键词如「波点相机 / 镂空遮罩 / 双区拼贴 / 步集风 / dooo0t 风 / 实时滤镜合成 / 圆形挖空 / 拍立得式艺术滤镜」时使用本 skill。提供：(1) 一个零依赖可复用的 DotMaskCompositor JS 类（支持 video/image/canvas 源），(2) 拒绝采样防重叠的波点生成器，(3) Figma 真实排布预设，(4) 圆形/水滴/字符三种形状。
---

# DotMaskCompositor · 双区波点对照合成器

把任意视频/图像/相机画面，实时合成为一种独特的「上方实心遮挡 + 下方镂空透出」的双区波点对照美学图像。

> 灵感来源：步集 App 相机模块的图像合成逻辑（Figma 文件 `v2WOCWYFzvdDMsumz2cDoG / 181:1915`）。

---

## 🎯 何时使用本 skill

用户的请求**包含以下任一意图**：

1. 做一款**带波点滤镜/遮罩**的拍照、相机或图像处理 App
2. 想要「**上下两个画面对照**」的视觉表现（一边完整、一边被波点遮挡或开窗）
3. 要把摄像头实时画面变成「**步集风 / dooo0t 风 / Memoji 拼贴风**」
4. 想做**双区对照展示**（如：原图 vs 艺术化、A vs B、风格切换）
5. 想要**实时滤镜**（30+ fps），但不想引入 WebGL / shader 工具链

**典型触发例子：**
- "做一个相机 App，拍出来的照片是上面完整、下面是奶咖色蒙版加圆形挖洞露出原图"
- "我要一个海报生成器，能把照片做成 dooo0t 那种双区波点效果"
- "把视频流实时合成成上下镜像的波点对照画面"
- "需要一种『艺术化照片墙』的视觉，上下两个区域对照展示"

**不应使用本 skill 的场景：**
- 普通的滤镜（如：黑白、复古、HDR）→ 直接用 Canvas filter 或 WebGL
- 复杂的几何变换（贴纸、面部跟踪）→ 用 face-api.js / MediaPipe
- 静态海报排版（无实时性需求）→ 直接 SVG/CSS

---

## 📦 本 skill 提供的资源

```
dot-mask-compositor/
├── SKILL.md                                ← 本文件
├── _meta.json
├── assets/
│   ├── dot-mask-compositor.js              ← 核心 JS 类（零依赖，UMD）
│   └── demo-minimal.html                   ← 80 行可跑示例
└── references/
    └── api-reference.md                    ← 完整 API 文档
```

---

## 🚀 三步集成指南

### Step 1 · 复制核心 JS

```bash
cp ~/.config/codewiz/skills/dot-mask-compositor/assets/dot-mask-compositor.js <用户工程>/
```

### Step 2 · 在 HTML 中实例化（最小用法 = 6 行）

```html
<canvas id="cv"></canvas>
<script src="./dot-mask-compositor.js"></script>
<script>
  const comp = new DotMaskCompositor({
    canvas: document.getElementById('cv'),
    source: videoElement,  // 也可以是 <img>、另一个 canvas
    ratio: '1:1',
    maskColor: '#f5efe0',
    dots: DotMaskCompositor.FIGMA_PRESET_DOTS,
  });
  comp.start();  // rAF 循环渲染
</script>
```

### Step 3 · 接入数据源

| 源类型 | 接入代码 |
|---|---|
| **摄像头** | `getUserMedia` → `<video>` → `comp.setSource(video)` |
| **图片** | `new Image()` → `img.onload = () => { comp.setSource(img); comp.render(); }` |
| **另一个 Canvas** | `comp.setSource(canvas)`（可做"画中画"效果） |
| **视频文件** | `<video src="x.mp4" autoplay>` → `comp.setSource(video)` |

---

## 🎨 五种波点形状

| shape | 视觉效果 | 适用场景 |
|---|---|---|
| `circle`（默认） | 圆形遮挡/开窗 | 90% 场景，最经典 |
| `polygon` | 正多边形（边数可配 `polygonSides`，默认 6） | 几何、潮流、硬朗风 |
| `star` | 星形（角数 `starPoints` 默认 5，内径比 `starInnerRatio` 默认 0.42） | 闪耀、童趣、节日 |
| `teardrop` | 水滴形 | 雨天、清新、自然主题 |
| `char` | 用文字字符做形状 | "喵"、"❤"、品牌字符、表情 |

切换：`comp.setShape('star')`；多边形边数：`comp.setPolygonSides(5)`；星星角数：`comp.setStarPoints(6)`。

> 形状对齐 Figma「步集」参数面板（圆 / 多边形 / 星星 / 喵）。

---

## 🧠 核心设计原则（决定它「美」的关键）

1. **上下区域用完全相同的 dot.x / dot.y 坐标** → 形成"实心 ↔ 镂空"镜像对照
2. **上下区域显示同一帧画面** → 圆洞内外的画面是连续的，不会突兀
3. **gap = 0 无缝衔接** → 中间不要有黑线/缝隙
4. **拒绝采样防重叠** → 圆与圆有 minGap 像素空隙，但不强制均匀分布
5. **大小二分布**（30% 大圆 + 70% 小圆） → 自然形成"聚散对比"，比纯随机更耐看
6. **maskColor 与 dotColor 一致** → 上方圆色 = 下方蒙版色，强化"同质遮挡 / 同质开窗"的对照感

> 这些细节是迭代 5 版才稳定下来的，复用时**不要试图简化**，会破坏美学。

---

## 🔌 完整 API 一览

详见 [`references/api-reference.md`](references/api-reference.md)。常用方法：

```js
// 构造
new DotMaskCompositor({ canvas, source, ratio, maskColor, dotColor, dots, ... })

// 实例方法
.setSource(video|image|canvas)
.setRatio('16:9' | '4:3' | '1:1' | '3:4' | '9:16')
.setMaskColor('#hex')
.setDotColor('#hex')
.setShape('circle' | 'polygon' | 'star' | 'teardrop' | 'char')
.setPolygonSides(6)     // 多边形边数
.setStarPoints(5)       // 星星角数
.setStarInnerRatio(0.42)// 星星内径比
.setChar('喵')
.setDots([{x, y, sizeMul}, ...])
.setDotBaseSize(20)
.setSwapped(true|false)
.setWatermark('品牌名')
.render()       // 单帧
.start()        // rAF 循环
.stop()
.toDataURL()    // 导出 PNG
.toBlob()       // → Promise<Blob>

// 静态工具
DotMaskCompositor.generateDots({ count, baseSize, minGap, bigRatio, refSize })
DotMaskCompositor.FIGMA_PRESET_DOTS   // 8 点 Figma 设计稿预设
DotMaskCompositor.PRESET_PALETTES     // 6 套色板：经典白/奶咖/薄荷/樱粉/天空/夜色
```

---

## 🚦 执行规约（务必遵守）

1. **复制 JS 到用户工程根目录或 `lib/` 子目录**，**不要内联**进 HTML（除非用户明确要单文件）。
2. **canvas 尺寸由 compositor 内部管理**，不要在外面手动设 `canvas.width/height`，会被覆盖。
3. **接入 video 前必须等 `await video.play()`**，否则首帧没有内容。
4. **`maskColor` 改了一般要同步 `dotColor`**——除非用户想要"对比色波点"（如夜色蒙版 + 樱粉波点），否则保持两者一致才是设计灵魂。
5. **HTTPS / localhost 才能调摄像头**，外网部署提醒用户配证书。
6. **微信 / 钉钉内置浏览器 getUserMedia 受限**，必要时回退到上传图片模式。
7. **如果用户后端要存合成图**，用 `await comp.toBlob()` 拿 Blob，FormData 上传，不要走 base64（大）。
8. **如果用户要做小程序版**：本 skill 仅适用 Web/WebView；小程序需要换成 canvas 2D 接口（API 类似但 ctx.drawImage 行为有差异），届时提示用户单独适配。

---

## 🧪 已验证的真实案例

| 案例 | 文件 | 用了哪些能力 |
|---|---|---|
| 步集 · 实时模板相机 v3 | `/Users/chenwenjing2/Desktop/codewize/live-template-camera.html` | **v2 容器模型** / 4 形状（圆·雨滴·五角星·喵）/ 自定义填充色 / 裁切占比 / 横竖分割 / swap |

> ⭐ **这是本 skill 的标杆产物，也是 v2 容器模型的完整参考实现**。开发同类相机时，**优先直接参考/复用这个文件**，它经过大量真机细节打磨。

---

## 🧱 v2 容器模型（步集实际采用，强烈推荐）

> 注意：本目录的 `dot-mask-compositor.js` 是 **v1 双等区模型**（两个等高区域，适合简单场景）。
> 步集相机最终采用的是下面的 **v2 可变容器 + 裁切模型**，更贴近 dooo0t 真实交互，完整实现见 `live-template-camera.html`。

**v2 四大核心机制：**

1. **横竖 = 分割方向（容器比例随之变）**
   - 竖屏：上下分割，单区 4:3 横，50 时容器 2:3 竖
   - 横屏：左右分割，单区 3:4 竖，50 时容器 4:3 横

2. **占比 = 裁切（不是移动分割线）**
   - 元素（波点 + 照片）**固定**在「50 时最大基准坐标系」
   - 占比只平移裁切窗口：`v≤50` 遮罩从外侧边裁、`v≥50` 取景从外侧边裁
   - 拖占比时元素**纹丝不动**，只是容器边缘裁掉/露出
   - 实现：`getLayout()` 算固定 `baseFrame/baseMask` + 裁切偏移 `offX/offY`，渲染时 `ctx.translate(-offX,-offY)` 进入基准系

3. **取景区与遮罩区画面一致**
   - 两区**各自 cover 同一张照片**到各自基准矩形（尺寸相同 → 画面完全一致）
   - 圆洞露出的 = 取景区同一画面（连续）

4. **自定义填充色**
   - 预设色 swatch + `<input type="color">`（真机 iOS 唤起系统原生取色器；原生 app 换 SwiftUI `ColorPicker`）

**关键代码锚点（在 `live-template-camera.html`）：**
- `getLayout()`：可变容器 + 裁切偏移
- `renderFrame()`：translate 进基准系 + 各区 cover
- `drawDot()`：实心遮挡 / 镂空开窗 / 字符离屏
- `tracePath()`：圆 / 雨滴(设计稿真实 path) / 五角星
- `MEOW_PATH`：喵字细线矢量 Path2D

---

## 💡 衍生玩法（启发用户的灵感）

- **拍立得双图对照** → 1:1 比例 + 奶咖色 + 8 点
- **波点海报生成器** → 9:16 比例 + 夜色 + 自定义文字（char 形状）
- **直播艺术滤镜** → 16:9 比例 + 樱粉 + 动态切色板
- **A/B 对照视频** → 上区接 source A，下区接 source B（需要扩展为双源版，参考 [`api-reference.md`](references/api-reference.md) 「双源扩展」章节）
- **个人主页 hero 图** → 静态图片 + char 形状（用户名首字母）+ 品牌色
- **微信头像生成器** → 1:1 + 上传图 + 6 套预设色 + 一键保存

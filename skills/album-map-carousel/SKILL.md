---
name: album-map-carousel
description: 一种「固定 6 点位 + 水平列轮转 + 内容无限推送 + 焦点联动」的相册/卡片墙交互。把照片错落排布成「中列大图焦点 + 两侧露窄边」的固定 6 点位，左右拖拽做列轮转浏览；某列轮出视口外时悄悄换成下一张，于是所有照片都会轮流流过中列第一排「焦点位」，并实时联动左上角的日期/文案。适用场景：相册地图、照片墙、带说明文案的画廊、卡片轮播展示墙、Memoji/拍立得拼贴墙。当用户需求出现「相册地图 / 照片墙轮播 / 焦点卡片墙 / 6 点位 / 中央焦点联动文案 / 错落卡片左右滑 / 步集相册」等关键词时使用本 skill。提供：(1) 零依赖可复用的 AlbumMapCarousel JS 类，(2) Figma 真实错落排布预设，(3) 内容无限推送 + 焦点回调机制。
---

# 相册地图（AlbumMapCarousel）· 6 点位焦点轮播卡片墙

把一组照片排布成「中列大图焦点 + 两侧错落露窄边」的固定 6 点位，左右拖拽列轮转浏览；一直滑，所有照片都会轮流流过中列第一排「焦点位」，并实时联动左上角文案。

> 源自「步集」App 相册地图（Figma 文件 `v2WOCWYFzvdDMsumz2cDoG / 361:1866`）。

---

## 🎯 何时使用本 skill

用户的请求**包含以下任一意图**：

1. 做一个**相册地图 / 照片墙**，照片错落排布、可左右滑浏览
2. 想要「**中央焦点 + 周围错落预览**」的卡片墙视觉（C 位突出，两侧露边）
3. 需要**焦点位联动说明文案**（中央那张图变化时，标题/日期/描述跟着变）
4. 照片很多，想让**每张都能轮流到中央焦点**展示（内容无限轮播/推送）
5. 想要「**步集相册 / 拍立得拼贴墙 / Memoji 墙**」那种错落卡片的左右滑体验

**典型触发例子：**
- "做一个相册页，中间一张大图，两边露出旁边照片的窄边，能左右滑切换"
- "照片墙，滑动时中央焦点的图换了，上面的标题文案也跟着换"
- "我有很多照片，想让它们轮流在中央展示并关联每张的日期"

**不应使用本 skill 的场景：**
- 普通横向 1:1 轮播（一次一张全屏）→ 用 Swiper / 原生 scroll-snap
- 瀑布流无限下滑列表 → 用虚拟列表（react-virtual 等）
- 需要每张图原始比例自适应高度的真瀑布流 → 本 skill 是固定点位（卡片尺寸固定）

---

## 📦 本 skill 提供的资源

```
album-map-carousel/
├── SKILL.md                          ← 本文件
├── _meta.json
├── assets/
│   ├── album-map-carousel.js         ← 核心 JS 类（零依赖，UMD）
│   └── demo-minimal.html             ← 自包含可跑示例（内置 SVG 占位图）
└── references/
    └── api-reference.md              ← 完整 API 文档
```

---

## 🚀 三步集成

### Step 1 · 复制核心 JS

```bash
cp ~/.config/codewiz/skills/album-map-carousel/assets/album-map-carousel.js <用户工程>/
```

### Step 2 · 准备一个舞台容器（必须 overflow:hidden）

```html
<div id="date">6月23日</div>
<div id="caption">本人今天又出去玩了</div>
<div id="stage" style="position:absolute; left:0; top:203px; right:0; bottom:0; overflow:hidden; touch-action:none;"></div>
<script src="./album-map-carousel.js"></script>
```

### Step 3 · 实例化（最小用法）

```js
const carousel = new AlbumMapCarousel({
  container: document.getElementById('stage'),
  items: [
    { src: 'p1.png', h: 357, meta: { date: '6月23日', caption: '本人今天又出去玩了' } },
    { src: 'p2.png', h: 361, meta: { date: '6月22日', caption: '看到一棵很好看的树' } },
    // ……可无限张
  ],
  onFocus: (item) => {                       // 焦点切换 → 联动左上文案
    document.getElementById('date').textContent = item.meta.date;
    document.getElementById('caption').textContent = item.meta.caption;
  },
});
```

就这样：左右拖拽即可列轮转浏览，所有照片轮流到中央焦点，文案自动联动。

---

## 🧠 核心设计原则（决定它「好看 + 好用」的关键）

1. **6 点位固定**：中列 1 张大图（焦点）+ 两侧各露窄边，视口内恒定 3 列 × 2 排 = 6 张，**位置永不乱**
2. **第一排距顶恒定**：`baseTop=37` 永远不变，焦点图始终在「最上方最中央」
3. **横向错落**：`colStart=[0,87,87,142]` 让各列起始 y 不同，形成参差美感（Figma 实测值）
4. **垂直锁定（橡皮筋）**：上下拖只给 `tanh` 限幅的手感，松手必回弹 0 → 永远保持 6 点位
5. **内容推送 ≠ 改展示**：列轮转动画完全不变，**只在列轮出视口外(wrap)的一刻**悄悄换图 → 用户看不到突变，却能无限浏览所有照片
6. **焦点联动**：每次焦点切换回调 `onFocus(item, index)`，把该图专属的日期/文案映射到左上角

> 这套交互是迭代十余版才稳定的。复用时**不要把「内容推送」做成连续轮播或位置移动**——那会破坏「6 点位永远不乱」的核心体验（踩过的坑）。

---

## 🔌 API 一览

详见 [`references/api-reference.md`](references/api-reference.md)。

```js
new AlbumMapCarousel({
  container,        // 必填：舞台容器（overflow:hidden）
  items,            // 必填：[{ src, h, meta? }]，h=列宽下的显示高度
  onFocus,          // 焦点切换回调 (item, index) => void
  cardWidth = 270,  // 列宽
  gap = 18,         // 间距
  baseTop = 37,     // 第一排距顶（恒定）
  colStart = [0,87,87,142],  // 各列错落起始 y
  numCols = 4,      // 列数（≥3，可见 3 列，多出的做轮转缓冲）
  panYMax = 52,     // 垂直橡皮筋幅度
  cardRadius = 20,
  cardShadow = '0 0 0 1px #fff, 0 4px 16px rgba(0,0,0,.06)',
});

// 实例方法
.getFocus()        // 当前焦点 item
.getFocusIndex()   // 当前焦点下标
.relayout()        // 容器尺寸变化后重排
.destroy()         // 解绑事件、移除卡片
```

---

## 🚦 执行规约（务必遵守）

1. **舞台容器必须 `overflow:hidden`**，否则两侧/上下轮转的卡片会溢出。
2. **容器要有明确尺寸**（绝对定位 + 四边或固定宽高），库靠 `clientWidth/clientHeight` 计算居中。
3. **`items[].h` 是「列宽下的显示高度」**：卡片宽固定 = `cardWidth`，图用 `object-fit:cover` 填充，所以 h 决定卡片高、也决定错落。建议按真实照片比例给 h（如 270 宽配 357/360/332 等）。
4. **照片数量随意**：≥1 即可；`numCols×2` 个展示位会先用前若干张填充，轮出视口时按 `items` 顺序循环推送，所以即使只有 8 张也能无限滑。
5. **想让每张图有专属文案**：把文案放进 `item.meta`，在 `onFocus` 里读取并写到 DOM。
6. **不要在外部手动改卡片 transform**，由库统一管理（`place()`）。
7. **响应式**：窗口/容器尺寸变化后调用 `relayout()`。
8. **小程序 / RN**：本库基于 DOM + pointer 事件，仅适用 Web/WebView；其他端需按同样数学模型（wrapS/colExtra/内容推送）重写。

---

## 🧪 已验证的真实案例

| 案例 | 文件 | 用了哪些能力 |
|---|---|---|
| 步集 · 相册地图 | `/Users/chenwenjing2/Desktop/codewize/album-map.html` | 6 点位列轮转 / 内容推送 / 焦点联动 momozhuanji 手写文案 / 垂直橡皮筋锁定 |

> ⭐ 这是本 skill 的标杆产物。开发同类相册墙时，可直接参考该文件（含手机外壳、状态栏、手写字体 header 等完整页面）。

---

## 💡 衍生玩法

- **旅行相册地图** → 每张图 meta 带地点+日期，焦点联动地名
- **作品集 / Portfolio 墙** → 焦点联动项目标题与一句话简介
- **菜单/商品墙** → 焦点联动菜名与价格
- **回忆胶囊** → 焦点联动「那天的心情」手写文案（配 momozhuanji 字体最佳）
- **Memoji / 头像墙** → cardWidth 调小、numCols 调大，做密集错落头像墙

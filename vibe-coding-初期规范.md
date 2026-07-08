# Vibe Coding 初期规范

> 面向「从 0 到 1 快速开发一个 App / 原型」的初期决策与避坑清单。
> 目标：在确定想法、进入开发阶段时能直接复用，减少返工。
>
> 沉淀来源：「步集 BUJI」App 从纯前端原型 → 前后端分离 → 真机预览的完整迭代过程。

---

## 一、技术栈选择：先判断是否需要后端

拿到需求后，**第一步不是写代码，而是判断要不要后端介入**。可以先问自己 / 用户几个问题：

1. 需不需要联网 / 多设备同步 / 数据持久化？
2. 后续有没有持续的视觉打磨、功能迭代计划？
3. 业务逻辑是单一功能，还是多个功能点交织？
4. 视觉元素是简单还是丰富（丰富时前端交互逻辑会急剧变复杂）？
5. 需不需要热更新（不发版就能改内容 / 配置）？

### ✅ 纯前端即可

- 不需要联网
- 对视觉要求低，无后续 UI / 前端迭代需求
- 功能简单（如记事本），不需要热更新
- 视觉元素少（元素一多，前端逻辑 + 交互逻辑会非常复杂）

### 🔀 需要前后端分离

- **有迭代需求**：前期只想做初步 demo，但后期计划做得更美观完整 → 后端处理业务逻辑，前端专注包装 / 呈现
- **业务逻辑复杂**：功能点多、彼此关联 → 需要后端支撑；单一记录功能则纯前端也够

### 案例：步集 App 的前后端划分

| 功能点 | 归属 | 原因 |
|--------|------|------|
| 任务收集 + 分发成简短文案 | 后端 | 涉及数据 / 生成逻辑，需热更新 |
| 波点相机合成器 | 前端 | 实时 canvas 渲染、依赖摄像头，必须在端上 |
| 成片存储 / 相册数据 | 后端 | 持久化 + 多端一致 |
| 相册地图展示逻辑 | 前端 | 纯交互 / 视觉，数据来自后端 |

> **经验法则**：「实时渲染 / 设备能力」放前端，「数据 / 业务规则 / 需要热更新的内容」放后端。

### 🏗 Web Demo 推荐技术栈：别从原生手写，站在框架肩膀上

> 沉淀来源：从步集原生 HTML/CSS/JS 一路踩坑后的反思，以及内部分享文档（《AI 从精通到更精通》）的方案。

**最大的教训：原生代码在功能简单时问题不大，一旦功能增多、需要迭代，代码量指数级上涨，AI 也越来越难精确维护。** 提前选对框架，就是给后续所有迭代省时间。

#### 📦 推荐技术栈组合（Web / Demo / 内部工具）

| 工具 | 用途 | 为什么选它 |
|---|---|---|
| **React** | 前端 UI 框架 | 组件化复用；AI 生成的代码质量高、文档丰富 |
| **Next.js** | 全栈框架（前后端一体） | 丝滑部署到 Vercel；内置路由、API Route，免配服务器 |
| **Tailwind CSS** | 样式 | class 写样式，无需手写 CSS 文件；AI 生成几乎不会报错 |
| **Lucide** | 图标库（2000+ 个） | 风格统一；避免 AI 自己乱写 SVG 或使用风格不一的 icon |
| **Neon** | Postgres 数据库 | 与 Vercel 深度打通；免费套餐够 Demo 用；AI 可直接生成 SQL |
| **Vercel AI SDK** | 流式 AI 接入 | 封装好流式渲染、上下文管理、聊天界面，不需要从零写 |
| **Vercel** | 部署平台 | 推代码自动部署；免费；分享一个 URL 就能让别人看到 |

#### ⚡ 为什么不继续用原生 HTML/CSS/JS

| 场景 | 原生的问题 | 框架的优势 |
|---|---|---|
| 功能越加越多 | 全局变量/函数越来越多，AI 难以精确定位改哪里 | 组件化；修改范围清晰 |
| 样式调整 | 手写 CSS 命名混乱、覆盖冲突高频发生 | Tailwind class 即样式，无命名冲突 |
| 数据持久化 | 只能 localStorage，无多端同步 | Next.js API + Neon 几十行搞定 |
| 需要接 AI 能力 | 流式渲染、token 计数要自己实现 | Vercel AI SDK 直接封装好 |
| 多人分享预览 | 要解决 HTTPS / 局域网 / 证书等问题 | Vercel 一键部署，全球 HTTPS |

#### 🚀 快速上手路径

```bash
# 1. 创建 Next.js 项目（含 Tailwind、Lucide 等）
npx create-next-app@latest my-demo --typescript --tailwind --eslint

# 2. 安装常用依赖
npm install lucide-react @vercel/ai ai

# 3. 连接 Neon 数据库（在 Vercel Dashboard 里一键绑定，自动注入环境变量）

# 4. 本地开发
npm run dev

# 5. 部署（推到 GitHub 后，Vercel 自动 CI/CD）
git push
```

#### 🎯 选型决策树

```
需要联网 / 数据持久化 / 多端同步？
├── 否 → 纯前端原型：React 单页 + Tailwind（无需 Next.js）
└── 是 → 需要后端：Next.js（API Route）+ Neon + Vercel 部署
         └── 还需接入 AI？→ 加 Vercel AI SDK
```

> **什么时候还可以用原生**：功能确实极简（单屏、无状态、纯动效 Demo）且**明确不会迭代**，原生反而启动快。步集相机页的 canvas 合成因为强依赖设备能力，原生是合理选择，但业务逻辑部分应抽到后端。

---

## 二、手机真机预览（最大的坑：HTTPS 自签名证书）

### 为什么一定要真机预览

网页预览（PC 浏览器缩放模拟手机）**始终差一点**：真实触摸手感、相机、传感器、安全区、性能都测不准。搬到真机才能暴露真实问题——但代价是要解决 HTTPS / 证书 / 局域网访问这些环境问题。

### 🔑 证书踩坑的准确总结

真机上相机（`getUserMedia`）需要**安全上下文**，手机用局域网 IP 访问就必须 HTTPS，于是要自签名证书。这里踩了一个坑，分两版：

#### ❌ 第一版（失败）：单张自签名叶证书

用 `openssl req -x509` 直接生成一张自签名证书：

- 它是一张 **叶证书 / 服务器证书（end-entity）**，**不是 CA 证书**
- 即使 SAN 里正确写了 IP，把它装进手机后，**iOS 的「证书信任设置」里根本不显示它**，也就无法开启「完全信任」
- 结果：页面能靠"仍然访问"勉强打开，但**所有 `fetch()` 请求全部 `Load failed`**（浏览器对未受信任证书的 XHR/fetch 校验更严格，无法绕过）

#### ✅ 第二版（正确）：两级证书结构（根 CA + 服务器证书）

- **根 CA 证书**：带 `basicConstraints = critical, CA:TRUE` —— 只有 CA 证书才能出现在 iOS「证书信任设置」并被开启完全信任
- **服务器证书**：用根 CA 签发，带 SAN（访问用的 IP）+ `extendedKeyUsage = serverAuth`
- 服务器（server.js）用 `服务器证书 + 根CA` 的 **fullchain** 作为 cert
- **手机只需安装并完全信任「根 CA」**；之后服务器证书由这个可信根签发，TLS 校验自然通过

> **一句话结论**：手机能直观预览的关键，是 **安装并信任一张「根 CA 证书」（CA:TRUE），再用它签发带正确 IP 的服务器证书**。直接把一张服务器叶证书塞给手机是行不通的。

#### 参考命令（两级证书生成）

```bash
# ca.cnf
# [req] distinguished_name=dn; prompt=no
# [dn] CN = XXX Local CA
# [v3_ca] basicConstraints=critical,CA:TRUE; keyUsage=critical,keyCertSign,cRLSign

# server.cnf
# [req] distinguished_name=dn; prompt=no
# [dn] CN = xxx-local
# [v3_req] basicConstraints=CA:FALSE; keyUsage=critical,digitalSignature,keyEncipherment;
#          extendedKeyUsage=serverAuth; subjectAltName=@alt
# [alt] IP.1=<局域网IP>; IP.2=127.0.0.1; DNS.1=localhost

# 1) 根 CA
openssl req -x509 -newkey rsa:2048 -nodes -keyout ca-key.pem -out ca-cert.pem -days 3650 -config ca.cnf -extensions v3_ca
# 2) 服务器私钥 + CSR
openssl req -newkey rsa:2048 -nodes -keyout key.pem -out server.csr -config server.cnf
# 3) 用根 CA 签发服务器证书（有效期 <825 天）
openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -days 820 -extfile server.cnf -extensions v3_req
# 4) fullchain 给服务器用
cat server-cert.pem ca-cert.pem > cert.pem
# 5) 根 CA 转 DER，给手机安装
openssl x509 -in ca-cert.pem -outform der -out ca-cert.cer
```

### iOS 证书的硬性要求

1. 必须是 **CA 证书（CA:TRUE）** 才能被「完全信任」
2. 必须有 **SAN** 且包含访问用的 IP（iOS 13+ 忽略 CN，只认 SAN）
3. 服务器证书有效期 **≤ 825 天**（iOS 13+ 强制）
4. 服务器证书需 `extendedKeyUsage = serverAuth`

### iOS 端安装的三步（缺一不可）

1. **下载**：证书要通过 **HTTP 端口**提供下载（此时 HTTPS 还没被信任，鸡生蛋）。用 **DER 格式（.cer）** + 响应头 `Content-Type: application/x-x509-ca-cert`，iOS 才会识别为可安装的描述文件
2. **安装描述文件**：设置 → 通用 → VPN与设备管理 →（已下载的描述文件）→ 安装（**下载 ≠ 安装，这步最容易漏**）
3. **开启完全信任**：设置 → 通用 → 关于本机 → 证书信任设置 → 打开对应根证书开关

---

## 三、从 0 到 1 开发的其他通用坑

以下都是实际踩到、下次新开一个 App 大概率还会遇到的：

### 1. Service Worker 缓存（PWA）—— 常规解法 vs 死锁终极解法

- SW 会缓存 HTML/JS/CSS，**改了代码但手机拿到旧版本**是高频困惑源
- **常规对策**：改动后 **bump `CACHE` 版本号**（`network-first` 策略下，bump 版本号 + 强刷通常够用）
- **死锁场景**（本次踩到）：bump 了好几次版本号、也强刷了，页面**依然是旧效果**——此时不要继续怀疑业务代码，大概率是**更早期注册的旧 SW**本身策略有问题（例如曾经是 `cache-first`），它会一直拦截请求返回旧缓存，新 `sw.js` 永远等不到被下载/激活的机会
- **终极解法：让新 SW"自毁"**——不再和旧 SW 比版本号，而是发一个新版 `sw.js`，其唯一职责是 `activate` 时：`caches.keys()` 全删 → `self.registration.unregister()` → `clients.matchAll().navigate(url)` 强制重刷所有受控页面。浏览器检查 `sw.js` 字节变化时**必定走网络**（不经过 SW 缓存拦截），所以这个自毁版一定能被送达执行，从根上解除死锁
- **开发阶段更彻底的做法**：容器页面（如 `buji.html`）里**不再 `register()` 新 SW**，改成主动 `getRegistrations().forEach(r => r.unregister())` + 清空 `caches`，开发期完全不引入 SW，改动永远即时生效；上线前再决定是否启用 PWA 离线能力
- **排查心法**：一旦怀疑"改了代码但效果没变"，**先怀疑缓存，再怀疑逻辑**——用一个全新的、能明确区分"新/旧"的样本去验证（例如本次用"重新拍一张照片 vs 看历史图片"），几分钟就能判断问题到底出在缓存、还是数据、还是代码本身，避免在错误方向上反复调整代码

### 2. Service Worker 不能转发 POST

- iOS Safari 的 SW 转发**带 body 的 POST** 会报 `FetchEvent.respondWith ... Load failed`
- 对策：fetch 事件开头 `if (e.request.method !== 'GET') return;`，让非 GET 请求完全绕过 SW

### 3. 图片上传体积（canvas 导出）

- 高 DPR 手机上 `canvas.toDataURL('image/png')` 生成的 base64 可达 **8–15MB**，超 body 上限且传输失败
- 对策：改用 **JPEG + 质量参数**（`toDataURL('image/jpeg', 0.82)`），体积降到几百 KB

### 4. iframe 嵌套的等比缩放

- 设计稿固定尺寸（如 430×932）嵌进 iframe，绝对定位元素会被裁切
- 对策：JS 计算 `scale = min(iframeW/designW, iframeH/designH)`，配合 `transform-origin: top center` 等比缩放

### 5. CSS `!important` 压制 inline style

- CSS `transform: scale(1) !important` 会盖过 JS 的 `element.style.transform`（无 important）
- 对策：JS 用 `element.style.setProperty('transform', value, 'important')`

### 6. 预加载 iframe 的数据刷新

- 容器预加载的 iframe（如相册页）数据只在**首次加载**拉取；产生新数据后滑过去看到的是旧数据
- 对策：操作完成后由容器 `postMessage('refresh')` 通知 iframe 重新拉取

### 7. iframe 相机权限

- iframe 内 `getUserMedia` 需要父级显式 `allow="camera; microphone; geolocation"`，否则被静默拦截

### 8. 数据量边界要在初期就设计

- 同一个展示模块，**0 / 1 / 少量 / 大量** 数据往往需要不同呈现（如相册：1 张单图 / 2–3 张卡片 / ≥4 张地图）
- 初期就把边界情况纳入设计，避免后期改交互伤筋动骨

### 9. 减少"中间步骤"页

- 能靠系统能力一步完成的，别自己加中间页（如相机授权：直接触发系统弹窗，别做"点击开启相机"的自定义中间页）

### 10. "实时预览 + 一键固化成文件"类功能：缺陷会被永久烤死

- 典型场景：Canvas 实时合成（相机取景 + 蒙版 + 波点特效）→ 用户点击确认 → `toDataURL()` 导出成图片文件保存。**预览态可以随时纠错，但一旦导出固化，缺陷就被永久封存**——哪怕后续把合成逻辑修好了，**已经生成的旧文件不会自动变好**
- 本次踩坑：相册里部分历史成片图片上下带大块黑色，查了半天相册端的 CSS/JS 显示逻辑（一度怀疑瀑布流高度计算、SW 缓存），最后才确认是**图片文件本身**在某次合成参数调整的中间状态下被拍摄固化的（Canvas 有一层黑色兜底背景 `fillRect`，正常应被内容完全覆盖，某次尺寸没对齐时露了出来，被直接烤进 JPEG）
- **对策**：
  1. 合成/导出逻辑发生改动后，**清空历史测试数据重新生成**，避免新旧版本产物混用、干扰排查（新旧数据混着看，很难判断问题是"代码现在还有 bug"还是"旧数据的历史遗留"）
  2. 有条件的话，导出前做一次**完整性校验**（如采样检测四角/边缘像素是否被预期内容覆盖），异常则重新渲染一帧再导出，而不是无脑 `toDataURL`
  3. 排查"展示异常"类问题时，**先隔离数据层和展示层**：直接打开图片原文件 URL 肉眼确认文件本身是否有问题，别一上来就扎进展示端代码（CSS/JS）里找

### 11. 排查"看起来是 bug"的问题时，先用最小对照样本切割范围

- 遇到"改了代码但效果不对"时，本能反应容易是继续抠代码细节，但更高效的第一步是**造一个能明确区分"新/旧"或"好/坏"的最小对照**：
  - 怀疑缓存 → 造一个绕不开缓存的新请求（新文件名/带时间戳参数）对比
  - 怀疑数据 vs 逻辑 → 用一份全新生成的数据 vs 一份历史数据分别过一遍同样的展示逻辑，看是否都异常
- 本次「相册黑块」排查就是靠这一步破局的：让用户**重新拍一张照片**，新照片完全正常、历史照片依旧有黑块 → 直接把问题范围从"相册展示代码"精确锁定到"历史图片文件本身"，避免了继续在展示端代码里做无效排查

---

## 四、UI 稿精确还原：数据驱动，拒绝"凭感觉"

> 沉淀来源：步集相机页按 Figma 设计稿逐像素还原的多轮迭代。这是「视觉打磨」阶段最大的一类返工来源。

### 🎯 核心原则：零自造，一切有迹可循

还原 UI 稿时，最容易犯的错是 **"凭感觉发挥"**——自己画图标、自己加描边、自己估字号/间距。这些在设计师眼里立刻穿帮，且反复返工。

**铁律：页面上每个元素的尺寸、坐标、颜色、圆角、字号、渐变，都必须能在设计稿里找到出处，绝不自造。**

实际踩的自造坑（都被打回重做）：

| 自造的东西 | 设计稿真相 |
|---|---|
| 自己画的"调节滑块"设置icon | 应导出设计稿里的真实图标 |
| 给选中态加了黄色描边 | 设计稿没有描边 |
| 给滑块两侧加了小太阳icon | 该节点 `visible=false`，本就不显示 |
| 收起icon 只画了箭头 | 设计是"箭头 + 底部一横线" |
| 凭感觉给 17px 字号 | 设计稿是 14px |

### 🔧 Figma REST API 工作流（别靠目测截图）

用结构化数据代替肉眼估算：

1. **拿节点精确属性**（坐标 / 尺寸 / 圆角 / 颜色 / 渐变 / 字号）
   `GET /v1/files/{fileKey}/nodes?ids={nodeId}`，header 带 `X-Figma-Token`
   递归遍历 children，读 `absoluteBoundingBox`（换算成相对根 Frame 的坐标）、`cornerRadius`、`fills`/`strokes`（SOLID 取 color；`GRADIENT_ANGULAR` 取 `gradientStops`）、`style.fontSize`
2. **导出矢量切图**
   `GET /v1/images/{fileKey}?ids={nodeId}&format=svg` → 返回 S3 链接 → 再 `curl` 下载
3. **导出整屏对照图**：`format=png` 导出设计图逐帧比对

### 📐 根 Frame 尺寸是一切绝对定位的基准

- 设计稿根 Frame（如 430×932）尺寸**必须精确**。一旦容器高度错了（曾误用 1012），所有绝对定位元素的间距**全盘偏移**，表现为"整体偏高 / 间距全不对"。
- 排查"间距全错"时 **先核对根容器尺寸**，根不对，子元素再准也没用。
- 尺寸常散落多处（CSS 高度 + JS scale 计算），改时要全局搜索旧值。

### 🖼 切图 vs CSS 还原：怎么选

| 元素类型 | 方式 | 说明 |
|---|---|---|
| 复杂矢量图标（设置/随机/形状） | Figma 导出 SVG | 与设计一致，零自造 |
| 简单几何（色环/进度条/圆角矩形） | CSS 实现 | 但**色值/尺寸必须抄 Figma 数据** |

> 例：颜色按钮外圈是 `GRADIENT_ANGULAR`（conic 色环），用 CSS `conic-gradient` 还原，但 stops 精确抄设计稿（`#ff0000→#ffe600→#05ff00→…`）。

### 🧩 看清"状态图层"结构，别把选中态当默认态

- 设计稿里一个组件常含多个状态图层。例：形状选择器的**第一个（波点）是选中态**——比其他多叠了一层黑遮罩 + 随机icon。
- 直接导出这个节点当默认图会带上遮罩（错）。正确：**导出纯图形（未选中态），选中态用 CSS 叠加遮罩 + icon**。
- 导出图标要精确到**子节点**：整个按钮节点（含半透明圆底 + 图标）会导致"双层底"，应只导出图标子节点。

### 🎚 原生控件默认样式简陋，需按设计手动还原

- `input[type=range]` 默认只有细轨 + 圆点，缺设计的"灰色总轨 + 左侧高亮已选段 + 白色圆球"。
- 还原：CSS 定制 `::-webkit-slider-thumb`（圆球）+ JS 动态 `linear-gradient` 背景（按 value 百分比分割 高亮/灰 两段）。

### 🗂 待办功能的处理：删实现、留记录

- 需求已提出但"本期暂不做"时：**回退实现代码，保留一段说明注释**（记录触点设计、已验证的能力、启用条件）。既保持代码干净，又不丢需求上下文。

### 🤝 协作节奏

- 设计还原是**小步验证**的活：拿数据 → 改一批 → 用户比对 → 再校准，比一次性大改更高效。
- 设计稿会更新（对方可能中途重新调整 Figma），**每轮以最新拉取的数据为准**，不要用缓存的旧值。
- 涉及导出/下载等操作，**严格按对方授权的范围执行**，别顺手多做（多导出无关资源会被打断）。

---

## 附：本次迭代问题速查表

| 现象 | 根因 | 解法 |
|------|------|------|
| 手机 fetch 全部 `Load failed` | 自签名**叶证书** iOS 不认，信任设置里不显示 | 改用**根 CA + 服务器证书**两级结构，手机信任根 CA |
| `FetchEvent.respondWith ... Load failed` | SW 转发带 body 的 POST 失败 | 非 GET 请求不拦截（`method !== 'GET' → return`） |
| 发布网络错误 / body 过大 | PNG 全屏图 base64 8–15MB 超限 | 改 JPEG 0.82 压缩 |
| 相机快门被裁切 | CSS `!important` 压制 JS inline scale | `setProperty(..., 'important')` |
| 页面按钮被 iframe 裁切 | 固定设计稿未等比缩放 | JS `fitShellToIframe` 等比 scale |
| 相册看不到新发布的图 | 预加载 iframe 未刷新 | 发布后 `postMessage('refresh')` 重拉 |
| 改了代码手机没生效 | SW 缓存旧资源 | bump `CACHE` 版本号 |
| bump 版本号 + 强刷仍没生效 | 旧 SW 策略死锁（如曾是 cache-first），新 SW 永远等不到激活 | 发**自毁版 SW**：activate 时清缓存+注销+强制重刷所有页面；开发期容器页干脆不再 `register()` |
| 相册图片上下有大块黑色 | 历史成片是合成参数调整中间态下拍摄固化的，缺陷被 `toDataURL` 永久烤进 JPEG | 确认现在合成逻辑本身正常（新拍照片无异常）后，**清空历史测试数据**重新验证，而非继续抠展示端代码 |
| 整体偏高 / 面板间距全错 | 根 Frame 尺寸用错（1012 vs 932） | 全局改回设计稿根尺寸 |
| icon / 描边 / 字号"看着不对" | 凭感觉自造，非设计稿数据 | Figma API 拿精确值 / 导出真实切图 |
| 导出的图标带多余底 / 遮罩 | 导出了含状态图层的父节点 | 导出纯图形子节点，状态用 CSS 叠加 |
| 滑块样式简陋无高亮段 | 用了 `range` 默认样式 | 定制 thumb + JS 渐变填充轨道 |

---

*文档状态：第四版（新增「SW 死锁终极解法」「实时合成数据固化」「最小对照样本排查法」）。可继续补充，后续整理为可复用 Skill。*

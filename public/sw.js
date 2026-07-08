// ══════════════════════════════════════════════════════════
//  步集 BUJI — Service Worker（自毁版 v39）
//  ⚠ 之前的旧 SW 缓存住了旧版 HTML，导致改动不生效（相册黑底等）。
//  本版本的唯一职责：注销自身 + 清空所有缓存，彻底解除缓存死锁。
//  浏览器检查 sw.js 时走网络（绕过 SW 缓存），因此本版必被加载执行。
//  之后页面无 SW 接管 → 所有静态资源直连网络 → 改动立即生效。
// ══════════════════════════════════════════════════════════

self.addEventListener('install', () => {
  // 立即跳过等待，尽快激活本自毁版
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 1) 删除所有 cache
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    // 2) 注销自身
    await self.registration.unregister();
    // 3) 强刷所有受控页面，加载最新代码
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});

// 存活期间：一律直连网络，不做任何缓存
self.addEventListener('fetch', (e) => {
  // 非 GET 不拦截（保持发布 POST 正常）
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request));
});

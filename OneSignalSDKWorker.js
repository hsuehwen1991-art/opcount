importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// =========================================================================
// IHG Duo - App Icon 未讀通知數字擴充（模式 A：收到推播 +1，進搶房分頁才歸零）
// 僅累計本機計數並同步 Web Badging API，不呼叫 showNotification() 以免重複跳通知
// =========================================================================
(function () {
  'use strict';

  const BADGE_CACHE_NAME = 'ihg-duo-badge-v1';

  function getBadgeKey() {
    try {
      const scopeUrl = (self.registration && self.registration.scope) || self.location.href;
      return new URL('__ihg_duo_badge_count__', scopeUrl).href;
    } catch (_) {
      return '/__ihg_duo_badge_count__';
    }
  }

  async function readCount() {
    try {
      const cache = await caches.open(BADGE_CACHE_NAME);
      const res = await cache.match(getBadgeKey());
      if (!res) return 0;
      const data = await res.json();
      const n = Number(data && data.count);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch (_) {
      return 0;
    }
  }

  async function writeCount(count) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    try {
      const cache = await caches.open(BADGE_CACHE_NAME);
      await cache.put(
        getBadgeKey(),
        new Response(JSON.stringify({ count: safeCount, updatedAt: Date.now() }), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
    } catch (_) {}
    return safeCount;
  }

  async function applyBadge(count) {
    try {
      if (count > 0) {
        if (self.navigator && typeof self.navigator.setAppBadge === 'function') {
          await self.navigator.setAppBadge(count);
        }
      } else {
        if (self.navigator && typeof self.navigator.clearAppBadge === 'function') {
          await self.navigator.clearAppBadge();
        }
      }
    } catch (_) {}
  }

  async function broadcastBadge(count) {
    try {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientList.forEach(client => {
        try {
          client.postMessage({ type: 'IHG_BADGE_UPDATED', count });
        } catch (_) {}
      });
    } catch (_) {}
  }

  // 背景或鎖屏收到推播時自動將未讀數 +1 並更新主畫面 App Icon 紅點數字
  self.addEventListener('push', (event) => {
    event.waitUntil((async () => {
      const nextCount = (await readCount()) + 1;
      await writeCount(nextCount);
      await applyBadge(nextCount);
      await broadcastBadge(nextCount);
    })());
  });

  // 接收前端指令（進入「180 天搶房」分頁時歸零清除紅點）
  self.addEventListener('message', (event) => {
    const msg = event && event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'IHG_BADGE_CLEAR') {
      const task = (async () => {
        await writeCount(0);
        await applyBadge(0);
        await broadcastBadge(0);
      })();
      if (event.waitUntil) event.waitUntil(task);
    } else if (msg.type === 'IHG_BADGE_SYNC') {
      const task = (async () => {
        const current = await readCount();
        await applyBadge(current);
      })();
      if (event.waitUntil) event.waitUntil(task);
    }
  });
})();

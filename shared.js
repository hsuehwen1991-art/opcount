// =========================================================================
// IHG Duo - 共用核心模組 (shared.js v8 App Icon Badge & True 3-Layer Liquid Glass Edition)
// 支援：最多 4 間房(8行)、雙軌會籍/獎勵計算、搶房提醒、雙向寫入 API、
//       半透明液態 Liquid Glass 導覽列、跨頁滑動轉場、3 秒像素貓咪冷啟動動畫、
//       並行載入匯率與日曆、localStorage SWR 秒開快取與自動版號清理
// =========================================================================
(function (global) {
  'use strict';

  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyDWevi8zV-rEJSx4qjcFQ4jLFeQK9Slw5twdel8UcA_73U34DcIrch_NyGOL08GE-a/exec';
  const ONESIGNAL_APP_ID = '6dd089b1-9382-4040-a935-29e08722b78e';
  const LOGO_BASE_PATH = './logos/';
  const SPLASH_CAT_URL = `${LOGO_BASE_PATH}loading-cat.webp`;
  const HOTEL_ANNUAL_CAP = 14;
  const POINTS_TO_TWD = 0.16;
  const MAX_ROOMS_PER_EVENT = 4;
  const APP_DATA_VERSION = 'v4';
  const RATES_TTL_MS = 12 * 60 * 60 * 1000;   // 匯率快取有效 12 小時
  const DATA_FRESH_MS = 2 * 60 * 1000;        // 跨頁切換 2 分鐘內視為新鮮，不重複打 GAS
  const SPLASH_MIN_MS = 3000;                 // 冷啟動貓咪動畫最少播放 3 秒
  const SPLASH_MAX_WAIT_MS = 6500;            // 弱網／離線防呆上限 6.5 秒
  const BADGE_CACHE_NAME = 'ihg-duo-badge-v1'; // App Icon 未讀推播計數快取

  const STORAGE_KEYS = {
    DATA_VERSION: 'ihg_duo_data_version',
    SELECTED_YEAR: 'ihg_selected_year_v4',
    RATES: 'ihg_exchange_rates_v4',
    DATA_PREFIX: 'ihg_calendar_cache_v4_',
    ADMIN_PIN: 'ihg_duo_admin_pin_v1',        // 寫入安全鎖：升版與清除快取時絕對保留
    NAV_TRANSITION: 'ihg_duo_nav_transition_v1',
    BOOTED: 'ihg_duo_booted_v1'               // sessionStorage 冷啟動旗標（換頁不重播動畫）
  };

  const NAV_ITEMS = [
    {
      id: 'index', label: '數據總覽', shortLabel: '總覽', href: 'index.html',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />'
    },
    {
      id: 'hotels', label: '各飯店總覽', shortLabel: '飯店', href: 'hotels.html',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />'
    },
    {
      id: 'details', label: '住宿明細', shortLabel: '明細', href: 'details.html',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />'
    },
    {
      id: 'milestones', label: '進階獎勵', shortLabel: '獎勵', href: 'milestones.html',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />'
    },
    {
      id: 'manage', label: '行程管理', shortLabel: '管理', href: 'manage.html',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />'
    }
  ];

  const EMPLOYEE_PLANS = {
    'IHG One Pass 優享價': { limit: 30, order: 1 },
    'IHG One Pass 彈性價': { limit: Infinity, order: 2 },
    'IHG One Pass 友人價': { limit: 50, order: 3 }
  };

  const PRESET_PLANS = [
    'IHG One Pass 優享價',
    'IHG One Pass 彈性價',
    'IHG One Pass 友人價',
    '大使免費週末住宿',
    '獎勵住宿'
  ];

  const HOTEL_BRAND_RULES = [
    { keyword: '智選假日', brand: 'Holiday Inn Express', file: 'HolidayInnExpress.svg' },
    { keyword: '皇冠', brand: 'Crowne Plaza', file: 'Crowne.svg' },
    { keyword: '洲至奢選', brand: 'Vignette Collection', file: 'Vignette.svg' },
    { keyword: '洲際', brand: 'InterContinental', file: 'InterContinental.svg' },
    { keyword: '金普頓', brand: 'Kimpton', file: 'Kimpton.svg' },
    { keyword: '英迪格', brand: 'Hotel Indigo', file: 'Indigo.svg' },
    { keyword: 'voco', brand: 'voco', file: 'voco.svg' },
    { keyword: '華邑', brand: 'HUALUXE', file: 'HUALUXE.svg' },
    { keyword: '假日酒店', brand: 'Holiday Inn', file: 'HolidayInn.svg' }
  ];

  const PLAN_STYLES = {
    'IHG One Pass 優享價': { badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500', chartColor: '#0284c7' },
    'IHG One Pass 彈性價': { badge: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500', chartColor: '#0d9488' },
    'IHG One Pass 友人價': { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', chartColor: '#4f46e5' },
    '大使免費週末住宿': { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', chartColor: '#d97706' },
    '獎勵住宿': { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', chartColor: '#9333ea' }
  };

  const OTHER_PLAN_STYLE = {
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    chartColor: '#94a3b8'
  };

  const MILESTONE_REWARDS = [
    {
      nights: 20, pickCount: 1, highlight: false,
      options: ['5,000 獎勵積分', '2 張 US$20 餐飲抵用券', '1 張可確認套房升級券']
    },
    {
      nights: 30, pickCount: 1, highlight: false,
      options: ['5,000 獎勵積分', '2 張 US$20 餐飲抵用券']
    },
    {
      nights: 40, pickCount: 2, highlight: true, tag: '核心目標',
      options: ['年度行政酒廊使用權（限選 1 次）', '1 張可確認套房升級券（限選 1 次）', '10,000 獎勵積分', '5 張 US$20 餐飲抵用券']
    },
    {
      nights: 50, pickCount: 1, highlight: false,
      options: ['10,000 獎勵積分', '5 張 US$20 餐飲抵用券']
    },
    {
      nights: 60, pickCount: 1, highlight: false,
      options: ['10,000 獎勵積分', '5 張 US$20 餐飲抵用券']
    },
    {
      nights: 70, pickCount: 2, highlight: false, tag: '鑽石滿級',
      options: ['年度行政酒廊使用權（限選 1 次）', '2 張可確認套房升級券（限選 1 次）', '10,000 獎勵積分', '5 張 US$20 餐飲抵用券']
    }
  ];

  const CURRENCY_TOKEN = '(?:NT\\$|US\\$|HK\\$|SG\\$|TWD|USD|THB|VND|JPY|EUR|CNY|RMB|HKD|SGD|KRW|MYR|台幣|美金|美元|泰銖|越南盾|日圓|日幣|歐元|人民幣|港幣|新幣|韓元|馬幣|元|積分|點|pts?|points?|[\\$€¥฿₫₩])';
  const PRICE_LINE_REGEX = new RegExp(`^${CURRENCY_TOKEN}?\\s*[\\d,]+(?:\\.\\d+)?\\s*${CURRENCY_TOKEN}?$`, 'i');

  const SUPPORTED_CURRENCIES = ['TWD', 'USD', 'THB', 'VND', 'JPY', 'EUR', 'CNY', 'HKD', 'SGD', 'KRW', 'MYR'];

  const DEFAULT_RATES = {
    TWD: 1,
    USD: 32.0,
    THB: 0.95,
    VND: 0.00126,
    JPY: 0.21,
    EUR: 34.5,
    CNY: 4.4,
    HKD: 4.1,
    SGD: 23.8,
    KRW: 0.023,
    MYR: 7.2
  };

  const state = {
    activePage: 'index',
    hideControls: false,
    onRender: null,
    selectedYear: new Date().getFullYear(),
    exchangeRates: { ...DEFAULT_RATES },
    ratesLoadedFromLive: false,
    rawBookingEvents: [],
    allProcessedBookings: [],
    currentYearProcessed: [],
    promos: [],
    rollovers: [],
    snipers: [],
    membership: null,
    latestRequestId: 0,
    chromeRendered: false,
    nativeVTActive: false,
    isNavigating: false,
    lastRawPayload: null,
    lastPayloadSignature: '',
    hasHydratedData: false
  };

  // =========================================================================
  // 工具函式
  // =========================================================================
  function safeSessionGet(key) {
    try { return global.sessionStorage.getItem(key); } catch (_) { return null; }
  }
  function safeSessionSet(key, val) {
    try { global.sessionStorage.setItem(key, val); } catch (_) {}
  }
  function safeSessionRemove(key) {
    try { global.sessionStorage.removeItem(key); } catch (_) {}
  }
  function safeLocalGet(key) {
    try { return global.localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeLocalSet(key, val) {
    try { global.localStorage.setItem(key, val); } catch (_) {}
  }
  function safeLocalRemove(key) {
    try { global.localStorage.removeItem(key); } catch (_) {}
  }

  function ensureDataVersion() {
    const savedVer = safeLocalGet(STORAGE_KEYS.DATA_VERSION);
    if (savedVer === APP_DATA_VERSION) return;

    const legacyPrefixes = [
      'ihg_calendar_cache_',
      'ihg_duo_calendar_cache_',
      'ihg_exchange_rates_',
      'ihg_duo_exchange_rates_'
    ];

    [global.localStorage, global.sessionStorage].forEach(store => {
      try {
        if (!store) return;
        const toRemove = [];
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (!k || k === STORAGE_KEYS.ADMIN_PIN) continue;
          if (legacyPrefixes.some(p => k.startsWith(p))) {
            toRemove.push(k);
          }
        }
        toRemove.forEach(k => store.removeItem(k));
      } catch (_) {}
    });

    safeLocalSet(STORAGE_KEYS.DATA_VERSION, APP_DATA_VERSION);
  }

  function clearDataCache() {
    state.lastPayloadSignature = '';
    [global.localStorage, global.sessionStorage].forEach(store => {
      try {
        if (!store) return;
        const toRemove = [];
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (k && k !== STORAGE_KEYS.ADMIN_PIN && k.startsWith(STORAGE_KEYS.DATA_PREFIX)) {
            toRemove.push(k);
          }
        }
        toRemove.forEach(k => store.removeItem(k));
      } catch (_) {}
    });
  }

  function computePayloadSignature(payload) {
    if (!payload) return '';
    try {
      return JSON.stringify({
        items: payload.items || [],
        promos: payload.promos || [],
        rollovers: payload.rollovers || [],
        snipers: payload.snipers || []
      });
    } catch (_) {
      return '';
    }
  }

  // =========================================================================
  // App Icon 通知數字管理（Web Badging API，模式 A：進搶房分頁才清除）
  // =========================================================================
  function getBadgeCacheKey() {
    try {
      return new URL('__ihg_duo_badge_count__', global.location.href).href;
    } catch (_) {
      return '/__ihg_duo_badge_count__';
    }
  }

  async function readNotificationBadgeCount() {
    try {
      if (typeof global.caches === 'undefined') return 0;
      const cache = await global.caches.open(BADGE_CACHE_NAME);
      const res = await cache.match(getBadgeCacheKey());
      if (!res) return 0;
      const data = await res.json();
      const n = Number(data && data.count);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch (_) {
      return 0;
    }
  }

  async function writeNotificationBadgeCount(count) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    try {
      if (typeof global.caches !== 'undefined') {
        const cache = await global.caches.open(BADGE_CACHE_NAME);
        await cache.put(
          getBadgeCacheKey(),
          new Response(JSON.stringify({ count: safeCount, updatedAt: Date.now() }), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }
    } catch (_) {}
    return safeCount;
  }

  function renderNavUnreadBadges(count) {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    const label = n > 9 ? '9+' : String(n);
    document.querySelectorAll('[data-manage-unread-badge]').forEach(el => {
      if (n > 0) {
        el.textContent = label;
        el.classList.remove('hidden');
      } else {
        el.textContent = '';
        el.classList.add('hidden');
      }
    });
    try {
      global.dispatchEvent(new CustomEvent('ihg-badge-change', { detail: { count: n } }));
    } catch (_) {}
  }

  async function applyNavigatorAppBadge(count) {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    try {
      if (n > 0) {
        if (navigator && typeof navigator.setAppBadge === 'function') {
          await navigator.setAppBadge(n);
        }
      } else {
        if (navigator && typeof navigator.clearAppBadge === 'function') {
          await navigator.clearAppBadge();
        }
      }
    } catch (_) {}
  }

  async function syncNotificationBadge() {
    const count = await readNotificationBadgeCount();
    await applyNavigatorAppBadge(count);
    renderNavUnreadBadges(count);
    return count;
  }

  async function postBadgeMessageToSW(type) {
    try {
      if (!('serviceWorker' in navigator)) return;
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type });
      }
      const regs = await navigator.serviceWorker.getRegistrations();
      regs.forEach(reg => {
        if (reg && reg.active) {
          try { reg.active.postMessage({ type }); } catch (_) {}
        }
      });
    } catch (_) {}
  }

  async function clearNotificationBadge() {
    await writeNotificationBadgeCount(0);
    await applyNavigatorAppBadge(0);
    renderNavUnreadBadges(0);
    await postBadgeMessageToSW('IHG_BADGE_CLEAR');
  }

  function checkServiceWorkerUpdate() {
    try {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => {
          if (reg && typeof reg.update === 'function') {
            reg.update().catch(() => {});
          }
        });
      }).catch(() => {});
    } catch (_) {}
  }

  // 監聽 Service Worker 推播回傳的新未讀數，以及從背景切回前景時同步狀態
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const msg = event && event.data;
      if (msg && msg.type === 'IHG_BADGE_UPDATED') {
        const n = Math.max(0, Math.floor(Number(msg.count) || 0));
        applyNavigatorAppBadge(n);
        renderNavUnreadBadges(n);
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncNotificationBadge();
    }
  });

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getNavIndexById(id) {
    const idx = NAV_ITEMS.findIndex(item => item.id === id);
    return idx >= 0 ? idx : 0;
  }

  function getNavIndexByUrl(urlStr) {
    if (!urlStr) return -1;
    try {
      const u = new URL(urlStr, global.location.href);
      const path = (u.pathname || '').toLowerCase();
      for (let i = 0; i < NAV_ITEMS.length; i++) {
        if (path.endsWith('/' + NAV_ITEMS[i].href.toLowerCase()) || path === NAV_ITEMS[i].href.toLowerCase()) {
          return i;
        }
      }
      if (path === '/' || path.endsWith('/')) return 0;
    } catch (_) {}
    return -1;
  }

  function readPendingTransition() {
    const raw = safeSessionGet(STORAGE_KEYS.NAV_TRANSITION);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (data && typeof data.ts === 'number' && (Date.now() - data.ts) < 3500) {
        return data;
      }
    } catch (_) {}
    return null;
  }

  function savePendingTransition(fromIdx, toIdx, dir) {
    safeSessionSet(STORAGE_KEYS.NAV_TRANSITION, JSON.stringify({
      fromIdx,
      toIdx,
      dir,
      ts: Date.now()
    }));
  }

  function supportsCrossDocVT() {
    try {
      return ('onpagereveal' in global) &&
        typeof global.CSS !== 'undefined' &&
        typeof global.CSS.supports === 'function' &&
        global.CSS.supports('view-transition-name', 'ihg-page-content');
    } catch (_) {
      return false;
    }
  }

  function prefersReducedMotion() {
    try {
      return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function getPlanStyle(basePlan) {
    return PLAN_STYLES[basePlan] || OTHER_PLAN_STYLE;
  }

  function detectHotelBrand(hotelName) {
    const normalized = (hotelName || '').toLowerCase();
    for (const rule of HOTEL_BRAND_RULES) {
      if (normalized.includes(rule.keyword.toLowerCase())) {
        return { brand: rule.brand, file: rule.file, logoUrl: `${LOGO_BASE_PATH}${rule.file}` };
      }
    }
    return null;
  }

  function buildBrandLogoHtml(hotelName, size = 'sm') {
    const brandInfo = detectHotelBrand(hotelName);
    const boxCls = size === 'lg'
      ? 'w-11 h-11 rounded-xl border border-slate-200/80 bg-white shadow-sm'
      : 'w-8 h-8 rounded-lg border border-slate-200/80 bg-white shadow-sm';
    const fallbackTextCls = size === 'lg' ? 'text-[11px]' : 'text-[9px]';

    if (!brandInfo) {
      return `<span class="${boxCls} inline-flex items-center justify-center shrink-0 bg-slate-50 text-slate-400 font-bold ${fallbackTextCls} tracking-tighter select-none" title="未分類品牌">IHG</span>`;
    }

    return `
      <span class="${boxCls} inline-flex items-center justify-center shrink-0 overflow-hidden" title="${escapeHtml(brandInfo.brand)}">
        <img src="${escapeHtml(brandInfo.logoUrl)}" alt="${escapeHtml(brandInfo.brand)}" loading="lazy"
          class="w-full h-full object-contain"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <span style="display:none" class="w-full h-full items-center justify-center bg-sky-50 text-sky-600 font-bold ${fallbackTextCls} tracking-tighter select-none">IHG</span>
      </span>
    `;
  }

  function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function toIsoDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDaysIso(isoStr, days) {
    const [y, m, d] = isoStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  }

  function subtractDaysIso(isoStr, days) {
    return addDaysIso(isoStr, -days);
  }

  function zonedMidnightToUtcDate(isoDateStr, timeZone) {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0);

    function getOffsetMs(utcMs, tz) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(new Date(utcMs));
      const map = {};
      parts.forEach(p => { if (p.type !== 'literal') map[p.type] = Number(p.value); });
      const h = map.hour === 24 ? 0 : map.hour;
      const asUtc = Date.UTC(map.year, map.month - 1, map.day, h, map.minute, map.second);
      return asUtc - utcMs;
    }

    const offset1 = getOffsetMs(utcGuess, timeZone);
    let targetUtc = utcGuess - offset1;
    const offset2 = getOffsetMs(targetUtc, timeZone);
    if (offset2 !== offset1) {
      targetUtc = utcGuess - offset2;
    }
    return new Date(targetUtc);
  }

  function formatTaiwanDateTime(dateInput, includeSeconds = false) {
    const dt = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    if (isNaN(dt.getTime())) return '—';
    const opts = {
      timeZone: 'Asia/Taipei',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    };
    if (includeSeconds) opts.second = '2-digit';
    const parts = new Intl.DateTimeFormat('en-US', opts).formatToParts(dt);
    const m = {};
    parts.forEach(p => { if (p.type !== 'literal') m[p.type] = p.value; });
    const h = m.hour === '24' ? '00' : m.hour;
    return includeSeconds
      ? `${m.year}/${m.month}/${m.day} ${h}:${m.minute}:${m.second}`
      : `${m.year}/${m.month}/${m.day} ${h}:${m.minute}`;
  }

  function formatDateSlash(dateStr) {
    return String(dateStr || '').replace(/-/g, '/');
  }

  function formatSyncTimestamp(dateObj) {
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const mm = String(dateObj.getMinutes()).padStart(2, '0');
    return `${m}/${d} ${hh}:${mm}`;
  }

  // =========================================================================
  // iOS Liquid Glass 樣式與跨頁滑動轉場
  // =========================================================================
  function injectLiquidGlassStyles() {
    if (document.getElementById('ihg-shared-styles')) return;
    const style = document.createElement('style');
    style.id = 'ihg-shared-styles';
    style.textContent = `
      @view-transition {
        navigation: auto;
      }

      :root {
        --ihg-slide-dist: 16%;
        --ihg-spring: cubic-bezier(0.28, 1.24, 0.36, 1);
        --ihg-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
      }

      html {
        overflow-x: clip;
      }

      .safe-top-header {
        padding-top: env(safe-area-inset-top, 0px);
      }

      .safe-bottom-dock {
        padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
      }

      @media (max-width: 767px) {
        :root {
          --ihg-slide-dist: 36%;
        }
        body {
          padding-bottom: calc(6.2rem + env(safe-area-inset-bottom, 0px));
        }
      }

      /* 頂部頁首：純淨半透明液態玻璃層 */
      .lg-header {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.36) 100%);
        backdrop-filter: blur(28px) saturate(200%) brightness(1.04);
        -webkit-backdrop-filter: blur(28px) saturate(200%) brightness(1.04);
        border-bottom: 1px solid rgba(255, 255, 255, 0.74);
        box-shadow:
          0 8px 26px -12px rgba(15, 23, 42, 0.09),
          inset 0 -1px 0 rgba(255, 255, 255, 0.45);
        view-transition-name: ihg-header;
      }

      /* =====================================================================
         三層獨立式 Liquid Glass 導覽列架構（底層 20% 玻璃 → 中層字樣 → 頂層透明水滴）
         ===================================================================== */
      .lg-glass-shell {
        position: relative;
        isolation: isolate;
      }

      /* Layer 1：最底層玻璃膠囊（約 20% 半透明白底 ＋ 高倍率毛玻璃折射） */
      .lg-dock-surface {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        z-index: 0;
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.26) 0%,
          rgba(255, 255, 255, 0.16) 52%,
          rgba(255, 255, 255, 0.22) 100%
        );
        backdrop-filter: blur(22px) saturate(185%) brightness(1.03);
        -webkit-backdrop-filter: blur(22px) saturate(185%) brightness(1.03);
        border: 1px solid rgba(255, 255, 255, 0.62);
        box-shadow:
          0 12px 32px -10px rgba(15, 23, 42, 0.16),
          0 2px 8px -2px rgba(15, 23, 42, 0.06),
          inset 0 1px 1.5px rgba(255, 255, 255, 0.85),
          inset 0 -1px 1.5px rgba(15, 23, 42, 0.08);
      }

      .lg-dock-surface::before {
        content: '';
        position: absolute;
        inset: 1px 1px auto 1px;
        height: 44%;
        border-radius: inherit;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0) 100%);
        pointer-events: none;
      }

      .lg-dock-surface-mobile {
        view-transition-name: ihg-bottom-nav-bg;
      }

      .lg-dock-surface-desktop {
        view-transition-name: ihg-desktop-nav-bg;
        box-shadow:
          0 8px 22px -10px rgba(15, 23, 42, 0.13),
          0 2px 8px -3px rgba(15, 23, 42, 0.06),
          inset 0 1px 1px rgba(255, 255, 255, 0.85),
          inset 0 -1px 1px rgba(15, 23, 42, 0.07);
      }

      /* Layer 2：選單字樣與圖示層（獨立 View Transition 圖層，確保換頁與移動絕不被覆蓋） */
      .lg-mobile-items {
        position: relative;
        z-index: 10;
        view-transition-name: ihg-bottom-nav-items;
      }

      .lg-desktop-items {
        position: relative;
        z-index: 10;
        view-transition-name: ihg-desktop-nav-items;
      }

      /* Layer 3：頂層液態透明位置指示器（純透明水滴鏡面外框，不加 backdrop-filter 與實白填色，移動時絕不變白塊） */
      .lg-pill-track {
        position: absolute;
        inset: 6px;
        pointer-events: none;
        z-index: 20;
      }

      .lg-pill {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        border-radius: 9999px;
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.34) 0%,
          rgba(255, 255, 255, 0.05) 42%,
          rgba(255, 255, 255, 0.02) 72%,
          rgba(255, 255, 255, 0.22) 100%
        );
        border: 1px solid rgba(255, 255, 255, 0.82);
        box-shadow:
          0 4px 14px -4px rgba(15, 23, 42, 0.14),
          0 1px 3px rgba(15, 23, 42, 0.06),
          inset 0 1.5px 2px rgba(255, 255, 255, 0.96),
          inset 0 -1.5px 2.5px rgba(15, 23, 42, 0.10),
          inset 1px 0 1.5px rgba(255, 255, 255, 0.58),
          inset -1px 0 1.5px rgba(255, 255, 255, 0.58);
        pointer-events: none;
        will-change: transform, left, width;
      }

      .lg-pill::before {
        content: '';
        position: absolute;
        inset: 1px 10% auto 10%;
        height: 36%;
        border-radius: inherit;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0) 100%);
        pointer-events: none;
      }

      .lg-pill-mobile {
        border-radius: 22px;
        view-transition-name: ihg-mobile-pill;
        transition: transform 0.4s var(--ihg-spring), box-shadow 0.25s ease;
      }

      .lg-pill-desktop {
        top: 5px;
        bottom: 5px;
        z-index: 20;
        view-transition-name: ihg-desktop-pill;
        transition: left 0.4s var(--ihg-spring), width 0.4s var(--ihg-spring), box-shadow 0.25s ease;
      }

      .lg-pill.is-no-transition {
        transition: none !important;
      }

      .lg-pill.is-gliding {
        box-shadow:
          0 8px 20px -5px rgba(15, 23, 42, 0.18),
          inset 0 2px 3px rgba(255, 255, 255, 1),
          inset 0 -2px 3.5px rgba(15, 23, 42, 0.12),
          inset 1.5px 0 2px rgba(255, 255, 255, 0.72),
          inset -1.5px 0 2px rgba(255, 255, 255, 0.72);
      }

      .lg-pill.is-bouncing {
        animation: ihg-liquid-bounce 380ms var(--ihg-spring);
      }

      .lg-nav-link {
        position: relative;
        z-index: 1;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.55);
        transition: color 0.22s ease, transform 0.22s var(--ihg-spring), background-color 0.2s ease;
        -webkit-tap-highlight-color: transparent;
      }

      .lg-nav-link:active {
        transform: scale(0.93);
      }

      .lg-nav-link.is-tapped {
        transform: scale(0.94);
      }

      /* 站內「管理」導覽列未讀紅點（引導進入 180 天搶房分頁檢視並清除） */
      .ihg-nav-unread-badge {
        position: absolute;
        top: -4px;
        right: -8px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 9999px;
        background: #f43f5e;
        color: #ffffff;
        font-family: 'JetBrains Mono', 'Inter', monospace;
        font-size: 10px;
        font-weight: 700;
        line-height: 16px;
        text-align: center;
        box-shadow: 0 2px 6px rgba(244, 63, 94, 0.45);
        border: 1.5px solid #ffffff;
        pointer-events: none;
      }

      .ihg-desktop-unread-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 16px;
        height: 16px;
        margin-left: 4px;
        padding: 0 4px;
        border-radius: 9999px;
        background: #f43f5e;
        color: #ffffff;
        font-family: 'JetBrains Mono', 'Inter', monospace;
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        box-shadow: 0 2px 6px rgba(244, 63, 94, 0.35);
      }

      .ihg-nav-unread-badge.hidden,
      .ihg-desktop-unread-badge.hidden {
        display: none;
      }

      /* 全站卡片微調：純淨半透明毛玻璃 */
      .tech-card {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0.64) 100%) !important;
        backdrop-filter: blur(22px) saturate(185%) !important;
        -webkit-backdrop-filter: blur(22px) saturate(185%) !important;
        border: 1px solid rgba(255, 255, 255, 0.84) !important;
        box-shadow:
          0 8px 28px -10px rgba(15, 23, 42, 0.08),
          0 2px 8px -2px rgba(15, 23, 42, 0.04),
          inset 0 1px 1px rgba(255, 255, 255, 0.96) !important;
      }

      .tech-card.tech-card-hover:hover {
        border-color: rgba(255, 255, 255, 0.98) !important;
        box-shadow:
          0 12px 32px -8px rgba(15, 23, 42, 0.13),
          inset 0 1px 1px rgba(255, 255, 255, 1) !important;
      }

      /* 冷啟動 3 秒像素貓咪覆蓋層（僅新工作階段冷啟動顯示，換頁不重播） */
      html.ihg-splash-active,
      html.ihg-splash-active body {
        overflow: hidden;
      }

      #ihg-splash {
        position: fixed;
        inset: 0;
        z-index: 200;
        background-color: #f3f7fc;
        background-image:
          radial-gradient(circle at 15% 10%, rgba(14, 165, 233, 0.10) 0%, transparent 42%),
          radial-gradient(circle at 85% 90%, rgba(99, 102, 241, 0.08) 0%, transparent 42%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        transition: opacity 0.34s ease, transform 0.34s var(--ihg-ease-out);
      }

      #ihg-splash.ihg-splash-exit {
        opacity: 0;
        transform: scale(1.03);
        pointer-events: none;
      }

      .ihg-splash-box {
        width: 100%;
        max-width: 248px;
        text-align: center;
      }

      .ihg-splash-media {
        width: 128px;
        height: 128px;
        margin: 0 auto 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ihg-splash-cat {
        width: 128px;
        height: 128px;
        object-fit: contain;
        image-rendering: pixelated;
        user-select: none;
        -webkit-user-drag: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .ihg-splash-cat.is-loaded {
        opacity: 1;
      }

      .ihg-splash-cat.is-instant {
        transition: none;
        opacity: 1;
      }

      .ihg-splash-fallback {
        width: 84px;
        height: 84px;
        border-radius: 1.35rem;
        background: linear-gradient(135deg, #06b6d4 0%, #0284c7 55%, #4f46e5 100%);
        color: #ffffff;
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        box-shadow: 0 12px 28px -8px rgba(2, 132, 199, 0.42);
        animation: ihg-splash-float 1.6s ease-in-out infinite;
      }

      .ihg-progress-track {
        width: 100%;
        height: 8px;
        border-radius: 9999px;
        background: rgba(203, 213, 225, 0.72);
        overflow: hidden;
        padding: 1px;
        box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.08);
      }

      .ihg-progress-fill {
        height: 100%;
        border-radius: 9999px;
        background: linear-gradient(90deg, #38bdf8 0%, #0284c7 55%, #06b6d4 100%);
        box-shadow: 0 0 10px rgba(2, 132, 199, 0.40);
        transition: width 0.12s linear;
      }

      @keyframes ihg-splash-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }

      /* 頁面主內容區：參與跨頁滑動轉場 */
      main {
        view-transition-name: ihg-page-content;
      }

      /* =====================================================================
         原生 Cross-Document View Transitions（iOS Safari / Chrome / Edge）
         ===================================================================== */
      ::view-transition-group(ihg-header) {
        z-index: 30;
        animation-duration: 0ms;
      }
      ::view-transition-old(ihg-header) { display: none; }
      ::view-transition-new(ihg-header) { animation: none; }

      /* Layer 1：底層玻璃膠囊固定於 z-index 40 */
      ::view-transition-group(ihg-bottom-nav-bg),
      ::view-transition-group(ihg-desktop-nav-bg) {
        z-index: 40;
        animation-duration: 0ms;
      }
      ::view-transition-old(ihg-bottom-nav-bg),
      ::view-transition-old(ihg-desktop-nav-bg) { display: none; }
      ::view-transition-new(ihg-bottom-nav-bg),
      ::view-transition-new(ihg-desktop-nav-bg) {
        animation: none;
        mix-blend-mode: normal;
      }

      /* Layer 2：選單字樣與圖示固定於 z-index 42（置於底層之上） */
      ::view-transition-group(ihg-bottom-nav-items),
      ::view-transition-group(ihg-desktop-nav-items) {
        z-index: 42;
        animation-duration: 0ms;
      }
      ::view-transition-old(ihg-bottom-nav-items),
      ::view-transition-old(ihg-desktop-nav-items) { display: none; }
      ::view-transition-new(ihg-bottom-nav-items),
      ::view-transition-new(ihg-desktop-nav-items) {
        animation: none;
        mix-blend-mode: normal;
      }

      /* Layer 3：頂層液態透明位置滑塊於 z-index 45 透明滑過（無實白底色、保持下方藍色字樣清晰可見） */
      ::view-transition-group(ihg-desktop-pill),
      ::view-transition-group(ihg-mobile-pill) {
        z-index: 45;
        animation-duration: 380ms;
        animation-timing-function: cubic-bezier(0.28, 1.24, 0.36, 1);
      }
      ::view-transition-old(ihg-desktop-pill),
      ::view-transition-old(ihg-mobile-pill) {
        display: none;
      }
      ::view-transition-new(ihg-desktop-pill),
      ::view-transition-new(ihg-mobile-pill) {
        height: 100%;
        mix-blend-mode: normal;
        animation: ihg-liquid-stretch 380ms cubic-bezier(0.28, 1.24, 0.36, 1);
      }

      ::view-transition-group(ihg-page-content) {
        z-index: 1;
        overflow: clip;
      }

      html[data-nav-dir="forward"]::view-transition-old(ihg-page-content) {
        animation: ihg-slide-out-left 320ms var(--ihg-ease-out) both;
      }
      html[data-nav-dir="forward"]::view-transition-new(ihg-page-content) {
        animation: ihg-slide-in-right 340ms var(--ihg-ease-out) both;
      }

      html[data-nav-dir="backward"]::view-transition-old(ihg-page-content) {
        animation: ihg-slide-out-right 320ms var(--ihg-ease-out) both;
      }
      html[data-nav-dir="backward"]::view-transition-new(ihg-page-content) {
        animation: ihg-slide-in-left 340ms var(--ihg-ease-out) both;
      }

      /* JS 降級滑動動畫（不支援原生跨頁 View Transitions 的舊瀏覽器自動啟用） */
      main.ihg-js-out-forward {
        animation: ihg-slide-out-left 190ms var(--ihg-ease-out) forwards;
      }
      main.ihg-js-out-backward {
        animation: ihg-slide-out-right 190ms var(--ihg-ease-out) forwards;
      }
      main.ihg-js-in-forward {
        animation: ihg-slide-in-right 320ms var(--ihg-ease-out) both;
      }
      main.ihg-js-in-backward {
        animation: ihg-slide-in-left 320ms var(--ihg-ease-out) both;
      }

      @keyframes ihg-slide-out-left {
        from { opacity: 1; transform: translate3d(0, 0, 0); }
        to   { opacity: 0; transform: translate3d(calc(var(--ihg-slide-dist) * -1), 0, 0); }
      }
      @keyframes ihg-slide-in-right {
        from { opacity: 0; transform: translate3d(var(--ihg-slide-dist), 0, 0); }
        to   { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      @keyframes ihg-slide-out-right {
        from { opacity: 1; transform: translate3d(0, 0, 0); }
        to   { opacity: 0; transform: translate3d(var(--ihg-slide-dist), 0, 0); }
      }
      @keyframes ihg-slide-in-left {
        from { opacity: 0; transform: translate3d(calc(var(--ihg-slide-dist) * -1), 0, 0); }
        to   { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      @keyframes ihg-liquid-stretch {
        0%   { transform: scale(1, 1); }
        35%  { transform: scale(1.10, 0.92); }
        75%  { transform: scale(0.97, 1.03); }
        100% { transform: scale(1, 1); }
      }
      @keyframes ihg-liquid-bounce {
        0%   { filter: brightness(1); scale: 1 1; }
        40%  { filter: brightness(1.08); scale: 1.06 0.94; }
        100% { filter: brightness(1); scale: 1 1; }
      }

      @media (prefers-reduced-motion: reduce) {
        ::view-transition-group(*),
        ::view-transition-old(*),
        ::view-transition-new(*) {
          animation-duration: 0.01ms !important;
        }
        .lg-pill, main, #ihg-splash, .ihg-splash-fallback {
          transition: none !important;
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  injectLiquidGlassStyles();

  // =========================================================================
  // 冷啟動 3 秒像素貓咪啟動畫面控制器（MayMayHome 共用殼層模式：換分頁不重播）
  // =========================================================================
  const splashCtrl = (function initColdStartSplash() {
    const noop = { active: false, setStatus() {}, markReady() {} };
    if (safeSessionGet(STORAGE_KEYS.BOOTED) === '1') {
      return noop;
    }

    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let syncReady = false;
    let finished = false;
    let splashEl = null;
    let barEl = null;
    let pctEl = null;
    let statusEl = null;

    function mountSplash() {
      if (splashEl || !document.body) return;
      document.documentElement.classList.add('ihg-splash-active');
      splashEl = document.createElement('div');
      splashEl.id = 'ihg-splash';
      splashEl.setAttribute('aria-live', 'polite');
      splashEl.innerHTML = `
        <div class="ihg-splash-box">
          <div class="ihg-splash-media" role="img" aria-label="IHG Duo 載入中">
            <img id="ihg-splash-cat" width="128" height="128" alt="" decoding="async" fetchpriority="high" class="ihg-splash-cat" />
            <div id="ihg-splash-fallback" class="ihg-splash-fallback" aria-hidden="true">
              <span style="font-size: 20px; letter-spacing: 0.08em; line-height: 1;">IHG</span>
              <span style="font-size: 10px; letter-spacing: 0.2em; opacity: 0.9; margin-top: 4px;">DUO</span>
            </div>
          </div>
          <div class="space-y-1.5">
            <div class="ihg-progress-track">
              <div id="ihg-splash-bar" class="ihg-progress-fill" style="width: 4%;"></div>
            </div>
            <div class="flex items-center justify-between text-[11px] font-medium text-slate-500 px-0.5">
              <span id="ihg-splash-status">正在啟動 IHG Duo...</span>
              <span id="ihg-splash-pct" class="font-mono-num text-sky-700 font-semibold">4%</span>
            </div>
          </div>
        </div>
      `;
      document.body.prepend(splashEl);

      barEl = document.getElementById('ihg-splash-bar');
      pctEl = document.getElementById('ihg-splash-pct');
      statusEl = document.getElementById('ihg-splash-status');

      // 鎖定單一路徑 ./logos/loading-cat.webp，載入完成才顯示（完全避免 404 試錯與破圖閃現）
      const catImg = document.getElementById('ihg-splash-cat');
      const fallbackEl = document.getElementById('ihg-splash-fallback');
      if (catImg) {
        catImg.addEventListener('load', () => {
          if (catImg.naturalWidth > 0) {
            catImg.classList.add('is-loaded');
          }
        }, { once: true });
        catImg.addEventListener('error', () => {
          catImg.style.display = 'none';
          if (fallbackEl) fallbackEl.style.display = 'flex';
        }, { once: true });
        catImg.src = SPLASH_CAT_URL;
        if (catImg.complete && catImg.naturalWidth > 0) {
          catImg.classList.add('is-instant');
        }
      }
    }

    function setBar(pct) {
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      if (barEl) barEl.style.width = clamped + '%';
      if (pctEl) pctEl.textContent = clamped + '%';
    }

    function dismiss() {
      if (finished) return;
      finished = true;
      safeSessionSet(STORAGE_KEYS.BOOTED, '1');
      setBar(100);
      if (statusEl) statusEl.textContent = '準備完成！';
      setTimeout(() => {
        if (!splashEl) {
          document.documentElement.classList.remove('ihg-splash-active');
          return;
        }
        splashEl.classList.add('ihg-splash-exit');
        setTimeout(() => {
          if (splashEl && splashEl.parentNode) splashEl.parentNode.removeChild(splashEl);
          document.documentElement.classList.remove('ihg-splash-active');
        }, 350);
      }, 200);
    }

    function tick(nowTs) {
      if (finished) return;
      const now = (typeof nowTs === 'number') ? nowTs : ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());
      const elapsed = Math.max(0, now - startTime);
      const ratio = Math.min(1, elapsed / SPLASH_MIN_MS);
      const eased = 1 - Math.pow(1 - ratio, 2.2);
      const visualPct = 4 + eased * (syncReady ? 94 : 88);
      setBar(visualPct);

      if (elapsed >= SPLASH_MIN_MS && (syncReady || elapsed >= SPLASH_MAX_WAIT_MS)) {
        dismiss();
        return;
      }
      if (typeof global.requestAnimationFrame === 'function') {
        global.requestAnimationFrame(tick);
      } else {
        setTimeout(() => tick(Date.now()), 32);
      }
    }

    if (document.body) {
      mountSplash();
    } else {
      document.addEventListener('DOMContentLoaded', mountSplash, { once: true });
    }

    if (typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(tick);
    } else {
      setTimeout(() => tick(Date.now()), 32);
    }

    return {
      active: true,
      setStatus(text) {
        if (!finished && statusEl && text) statusEl.textContent = text;
      },
      markReady() {
        syncReady = true;
      }
    };
  })();
  (function primeInitialDirection() {
    const pending = readPendingTransition();
    if (pending && (pending.dir === 'forward' || pending.dir === 'backward')) {
      document.documentElement.dataset.navDir = pending.dir;
    }
  })();

  function resolveDirFromActivation(activation) {
    if (activation && activation.from && activation.entry) {
      const fromIdx = getNavIndexByUrl(activation.from.url);
      const toIdx = getNavIndexByUrl(activation.entry.url);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        return toIdx > fromIdx ? 'forward' : 'backward';
      }
    }
    const pending = readPendingTransition();
    return pending ? pending.dir : null;
  }

  global.addEventListener('pageswap', (e) => {
    if (!e || !e.viewTransition) return;
    const dir = resolveDirFromActivation(e.activation);
    if (dir) {
      document.documentElement.dataset.navDir = dir;
    }
  });

  global.addEventListener('pagereveal', (e) => {
    const pending = readPendingTransition();
    if (e && e.viewTransition) {
      state.nativeVTActive = true;
      const dir = resolveDirFromActivation(e.activation);
      if (dir) {
        document.documentElement.dataset.navDir = dir;
      }
      e.viewTransition.finished.finally(() => {
        delete document.documentElement.dataset.navDir;
        safeSessionRemove(STORAGE_KEYS.NAV_TRANSITION);
      });
    } else if (pending && !prefersReducedMotion()) {
      runFallbackEnterAnimation(pending);
      safeSessionRemove(STORAGE_KEYS.NAV_TRANSITION);
    } else {
      delete document.documentElement.dataset.navDir;
      safeSessionRemove(STORAGE_KEYS.NAV_TRANSITION);
    }
  });

  function runFallbackEnterAnimation(pending) {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      const cls = pending.dir === 'backward' ? 'ihg-js-in-backward' : 'ihg-js-in-forward';
      mainEl.classList.remove('ihg-js-in-forward', 'ihg-js-in-backward');
      void mainEl.offsetWidth;
      mainEl.classList.add(cls);
      mainEl.addEventListener('animationend', () => mainEl.classList.remove(cls), { once: true });
    }
    const targetIdx = getNavIndexById(state.activePage);
    if (typeof pending.fromIdx === 'number' && pending.fromIdx !== targetIdx) {
      positionMobilePill(pending.fromIdx, false);
      positionDesktopPill(pending.fromIdx, false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          positionMobilePill(targetIdx, true);
          positionDesktopPill(targetIdx, true);
        });
      });
    }
    delete document.documentElement.dataset.navDir;
  }

  // =========================================================================
  // 液態滑塊定位與互動控制
  // =========================================================================
  function positionMobilePill(index, animate = false) {
    const pill = document.getElementById('mobileLiquidPill');
    if (!pill) return;
    if (!animate) pill.classList.add('is-no-transition');
    else pill.classList.add('is-gliding');

    pill.style.width = `${100 / NAV_ITEMS.length}%`;
    pill.style.transform = `translate3d(${index * 100}%, 0, 0)`;

    if (!animate) {
      void pill.offsetWidth;
      pill.classList.remove('is-no-transition');
    } else {
      setTimeout(() => pill.classList.remove('is-gliding'), 420);
    }
  }

  function positionDesktopPill(index, animate = false) {
    const nav = document.getElementById('desktopLiquidNav');
    const pill = document.getElementById('desktopLiquidPill');
    if (!nav || !pill || nav.offsetWidth === 0) return;

    const targetLink = nav.querySelector(`.lg-desktop-link[data-nav-index="${index}"]`);
    if (!targetLink) return;

    const navRect = nav.getBoundingClientRect();
    const linkRect = targetLink.getBoundingClientRect();
    if (linkRect.width <= 0) return;

    if (!animate) pill.classList.add('is-no-transition');
    else pill.classList.add('is-gliding');

    pill.style.left = `${linkRect.left - navRect.left}px`;
    pill.style.width = `${linkRect.width}px`;
    pill.style.opacity = '1';

    if (!animate) {
      void pill.offsetWidth;
      pill.classList.remove('is-no-transition');
    } else {
      setTimeout(() => pill.classList.remove('is-gliding'), 420);
    }
  }

  function triggerActiveBounce() {
    ['mobileLiquidPill', 'desktopLiquidPill'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('is-bouncing');
      void el.offsetWidth;
      el.classList.add('is-bouncing');
      el.addEventListener('animationend', () => el.classList.remove('is-bouncing'), { once: true });
    });
  }

  function bindLiquidNavInteractions() {
    const links = document.querySelectorAll('.nav-link-item[data-nav-id]');
    links.forEach(link => {
      if (link.dataset.lgBound === '1') return;
      link.dataset.lgBound = '1';

      link.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

        const targetId = link.getAttribute('data-nav-id');
        const targetHref = link.getAttribute('href');
        if (!targetId || !targetHref) return;

        const fromIdx = getNavIndexById(state.activePage);
        const toIdx = getNavIndexById(targetId);

        if (targetId === state.activePage) {
          e.preventDefault();
          triggerActiveBounce();
          global.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        if (state.isNavigating) {
          e.preventDefault();
          return;
        }

        const dir = toIdx > fromIdx ? 'forward' : 'backward';
        savePendingTransition(fromIdx, toIdx, dir);
        document.documentElement.dataset.navDir = dir;
        link.classList.add('is-tapped');

        if (supportsCrossDocVT() && !prefersReducedMotion()) {
          return;
        }

        e.preventDefault();
        state.isNavigating = true;

        positionMobilePill(toIdx, true);
        positionDesktopPill(toIdx, true);

        const mainEl = document.querySelector('main');
        if (mainEl && !prefersReducedMotion()) {
          mainEl.classList.add(dir === 'forward' ? 'ihg-js-out-forward' : 'ihg-js-out-backward');
          setTimeout(() => {
            global.location.href = targetHref;
          }, 185);
        } else {
          global.location.href = targetHref;
        }
      });
    });
  }

  // =========================================================================
  // 共用導覽列（電腦頂部 Liquid Glass ＋ 手機底部高霧面懸浮 Liquid Glass）與控制列
  // =========================================================================
  function renderSharedChrome() {
    if (state.chromeRendered) return;
    injectLiquidGlassStyles();

    const activeIdx = getNavIndexById(state.activePage);
    const headerEl = document.getElementById('appHeader');
    if (headerEl) {
      const desktopNavHtml = NAV_ITEMS.map((item, idx) => {
        const isActive = item.id === state.activePage;
        const cls = isActive
          ? 'text-sky-700 font-semibold'
          : 'text-slate-600 hover:text-slate-900 font-medium';
        const unreadHtml = item.id === 'manage'
          ? '<span data-manage-unread-badge class="ihg-desktop-unread-badge hidden" aria-hidden="true"></span>'
          : '';
        return `
          <a data-nav-href="${item.href}" data-nav-id="${item.id}" data-nav-index="${idx}" href="${item.href}?year=${state.selectedYear}"
             class="nav-link-item lg-nav-link lg-desktop-link inline-flex items-center px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap ${cls}">
            <span>${item.label}</span>${unreadHtml}
          </a>
        `;
      }).join('');

      headerEl.innerHTML = `
        <header class="safe-top-header lg-header sticky top-0 z-30">
          <div class="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <a data-nav-href="index.html" data-nav-id="index" href="index.html?year=${state.selectedYear}" class="nav-link-item flex items-center gap-2.5 group min-w-0">
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 text-white flex flex-col items-center justify-center font-bold leading-none shadow-md shadow-sky-500/25 ring-1 ring-white/60 shrink-0">
                <span class="text-[11px] sm:text-xs tracking-wider">IHG</span>
                <span class="text-[8px] sm:text-[9px] tracking-widest opacity-90 mt-0.5">DUO</span>
              </div>
              <div class="flex items-center gap-2 min-w-0">
                <h1 class="text-base sm:text-lg font-bold tracking-tight text-slate-900 group-hover:text-sky-700 transition truncate">IHG Duo</h1>
                <span class="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-white/70 text-sky-600 border border-sky-200/80 shadow-2xs">
                  員工價住宿統計
                </span>
              </div>
            </a>

            <nav id="desktopLiquidNav" aria-label="主導覽列" class="hidden md:flex items-center lg-glass-shell rounded-full p-1.5">
              <div class="lg-dock-surface lg-dock-surface-desktop" aria-hidden="true"></div>
              <div class="lg-desktop-items flex items-center gap-0.5">
                ${desktopNavHtml}
              </div>
              <div id="desktopLiquidPill" class="lg-pill lg-pill-desktop" style="opacity: 0;" aria-hidden="true"></div>
            </nav>

            <div class="flex items-center gap-2 shrink-0">
              <div id="statusBadge" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/75 backdrop-blur-md text-sky-700 text-[11px] sm:text-xs font-medium font-mono-num border border-sky-200/80 shadow-2xs">
                <span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                <span>同步中...</span>
              </div>
              <button id="refreshBtn" onclick="IHGApp.refresh()" class="px-2.5 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-semibold shadow-md shadow-sky-500/25 ring-1 ring-white/40 transition flex items-center gap-1.5 active:scale-[0.96]" title="重新同步日曆">
                <svg id="refreshIcon" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="hidden sm:inline">重新同步</span>
              </button>
            </div>
          </div>
        </header>
      `;
    }

    // 手機版懸浮 Liquid Glass 5 格底部功能列（高霧面＋清晰按鈕對比）
    let bottomNav = document.getElementById('mobileBottomNav');
    if (!bottomNav) {
      bottomNav = document.createElement('nav');
      bottomNav.id = 'mobileBottomNav';
      bottomNav.setAttribute('aria-label', '手機版底部導覽列');
      document.body.appendChild(bottomNav);
    }
    bottomNav.className = 'md:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none px-3.5 safe-bottom-dock';
    bottomNav.innerHTML = `
      <div id="mobileLiquidDock" class="pointer-events-auto lg-glass-shell relative mx-auto max-w-md rounded-[28px] p-1.5">
        <div class="lg-dock-surface lg-dock-surface-mobile" aria-hidden="true"></div>
        <div class="lg-mobile-items grid grid-cols-5">
          ${NAV_ITEMS.map((item, idx) => {
            const isActive = item.id === state.activePage;
            const colorCls = isActive ? 'text-sky-600 font-bold' : 'text-slate-700 hover:text-slate-900 font-medium';
            const unreadHtml = item.id === 'manage'
              ? '<span data-manage-unread-badge class="ihg-nav-unread-badge hidden" aria-hidden="true"></span>'
              : '';
            return `
              <a data-nav-href="${item.href}" data-nav-id="${item.id}" data-nav-index="${idx}" href="${item.href}?year=${state.selectedYear}"
                 class="nav-link-item lg-nav-link flex flex-col items-center justify-center gap-0.5 py-2 rounded-[22px] ${colorCls}">
                <span class="relative inline-flex items-center justify-center">
                  <svg class="w-[21px] h-[21px]" fill="none" stroke="currentColor" stroke-width="${isActive ? '2.3' : '1.9'}" viewBox="0 0 24 24">
                    ${item.icon}
                  </svg>
                  ${unreadHtml}
                </span>
                <span class="text-[11px] leading-tight tracking-tight">${item.shortLabel}</span>
              </a>
            `;
          }).join('')}
        </div>
        <div class="lg-pill-track" aria-hidden="true">
          <div id="mobileLiquidPill" class="lg-pill lg-pill-mobile" style="width: ${100 / NAV_ITEMS.length}%; transform: translate3d(${activeIdx * 100}%, 0, 0);"></div>
        </div>
      </div>
    `;

    const controlsEl = document.getElementById('appControls');
    if (controlsEl && !state.hideControls) {
      controlsEl.innerHTML = `
        <section class="tech-card rounded-2xl p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div class="flex flex-wrap items-center gap-3 sm:gap-4">
            <div>
              <label for="yearSelect" class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">檢視年份</label>
              <select id="yearSelect" onchange="IHGApp.onYearChange()" class="rounded-xl border border-slate-200/90 bg-white/75 px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 outline-none transition">
              </select>
            </div>
            <div class="h-8 w-px bg-slate-200/80 hidden sm:block"></div>
            <div>
              <span class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">同步資料範圍</span>
              <span id="syncRangeDisplay" class="font-mono-num inline-flex items-center px-3 py-1 rounded-xl bg-sky-50/80 text-sky-700 border border-sky-200/70 text-xs font-semibold">
                ${state.selectedYear - 1} – ${state.selectedYear + 1} 年
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/65 border border-slate-200/80 max-w-full overflow-x-auto">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></span>
            <div id="rateInfo" class="font-mono-num text-[11px] text-slate-500 whitespace-nowrap">
              即時匯率載入中...（1 積分 = 0.16 TWD）
            </div>
          </div>
        </section>
      `;
    }

    state.chromeRendered = true;

    positionMobilePill(activeIdx, false);
    positionDesktopPill(activeIdx, false);
    bindLiquidNavInteractions();

    global.addEventListener('resize', () => {
      positionDesktopPill(getNavIndexById(state.activePage), false);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        positionDesktopPill(getNavIndexById(state.activePage), false);
      });
    }
  }

  function resolveInitialYear() {
    const nowYear = new Date().getFullYear();
    const urlParams = new URLSearchParams(global.location.search);
    const paramYear = parseInt(urlParams.get('year'), 10);
    if (!isNaN(paramYear) && paramYear >= 2020 && paramYear <= 2099) return paramYear;
    const savedYear = parseInt(safeSessionGet(STORAGE_KEYS.SELECTED_YEAR), 10);
    if (!isNaN(savedYear) && savedYear >= 2020 && savedYear <= 2099) return savedYear;
    return nowYear;
  }

  function initYearSelect(initialYear) {
    const yearSelect = document.getElementById('yearSelect');
    const nowYear = new Date().getFullYear();
    const minOptionYear = Math.min(nowYear - 1, initialYear);
    const maxOptionYear = Math.max(nowYear + 5, initialYear);

    if (yearSelect) {
      yearSelect.innerHTML = '';
      for (let yr = minOptionYear; yr <= maxOptionYear; yr++) {
        const opt = document.createElement('option');
        opt.value = yr;
        opt.textContent = `${yr} 年`;
        yearSelect.appendChild(opt);
      }
      yearSelect.value = String(initialYear);
    }
    updateYearArtifacts(initialYear);
  }

  function updateYearArtifacts(year) {
    state.selectedYear = year;
    safeSessionSet(STORAGE_KEYS.SELECTED_YEAR, String(year));

    const rangeEl = document.getElementById('syncRangeDisplay');
    if (rangeEl) rangeEl.textContent = `${year - 1} – ${year + 1} 年`;

    document.querySelectorAll('.nav-link-item').forEach(link => {
      const baseHref = link.getAttribute('data-nav-href');
      if (baseHref) link.setAttribute('href', `${baseHref}?year=${year}`);
    });

    try {
      const url = new URL(global.location.href);
      url.searchParams.set('year', String(year));
      global.history.replaceState(null, '', url.toString());
    } catch (_) {}
  }

  function setStatus(type, text) {
    const badge = document.getElementById('statusBadge');
    if (!badge) return;
    const styles = {
      loading: ['bg-white/75 text-sky-700 border-sky-200/80', 'bg-sky-500 animate-pulse'],
      success: ['bg-emerald-50/85 text-emerald-700 border-emerald-200/80', 'bg-emerald-500'],
      error: ['bg-amber-50/85 text-amber-800 border-amber-200/90', 'bg-amber-500']
    };
    const [boxCls, dotCls] = styles[type] || styles.loading;
    badge.className = `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-medium font-mono-num backdrop-blur-md border shadow-2xs ${boxCls}`;
    badge.innerHTML = `<span class="w-2 h-2 rounded-full ${dotCls}"></span><span>${escapeHtml(text)}</span>`;
  }

  // =========================================================================
  // 匯率（依當年度實際使用幣別動態切換顯示）與 API 通訊
  // =========================================================================
  function updateDynamicRateDisplay() {
    const rateInfoEl = document.getElementById('rateInfo');
    if (!rateInfoEl) return;

    const usedForeignCurrencies = new Set();
    state.currentYearProcessed.forEach(b => {
      if (!b.priceInfo.isPoints && b.priceInfo.currency && b.priceInfo.currency !== 'TWD') {
        usedForeignCurrencies.add(b.priceInfo.currency);
      }
    });

    const listToShow = usedForeignCurrencies.size > 0
      ? Array.from(usedForeignCurrencies)
      : ['USD', 'THB'];

    const parts = listToShow.map(cur => {
      const rate = state.exchangeRates[cur] || DEFAULT_RATES[cur] || 1;
      const digits = rate < 0.05 ? 4 : (rate < 2 ? 3 : 2);
      return `1 ${cur} ≈ ${rate.toFixed(digits)} TWD`;
    });
    parts.push(`1 積分 = ${POINTS_TO_TWD} TWD`);
    const prefix = state.ratesLoadedFromLive ? '' : '預設匯率：';
    rateInfoEl.textContent = prefix + parts.join(' ｜ ');
  }

  function hydrateRatesFromCacheSync() {
    const cachedRaw = safeLocalGet(STORAGE_KEYS.RATES);
    if (!cachedRaw) return { hit: false, fresh: false };
    try {
      const cached = JSON.parse(cachedRaw);
      if (cached && cached.rates) {
        state.exchangeRates = { ...DEFAULT_RATES, ...cached.rates };
        state.ratesLoadedFromLive = Boolean(cached.live);
        updateDynamicRateDisplay();
        const savedAt = typeof cached.savedAt === 'number' ? cached.savedAt : 0;
        const isFresh = Boolean(cached.live) && savedAt > 0 && (Date.now() - savedAt) < RATES_TTL_MS;
        return { hit: true, fresh: isFresh };
      }
    } catch (_) {}
    return { hit: false, fresh: false };
  }

  async function loadExchangeRates(forceRefresh = false, timeoutMs = 3500) {
    if (!forceRefresh) {
      const cacheInfo = hydrateRatesFromCacheSync();
      if (cacheInfo.fresh) return false;
    }

    const prevRates = { ...state.exchangeRates };
    const prevLive = state.ratesLoadedFromLive;

    let timerId = null;
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (controller) timerId = setTimeout(() => controller.abort(), timeoutMs);
      const fetchPromise = fetch('https://open.er-api.com/v6/latest/TWD', controller ? { signal: controller.signal } : {});
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('匯率逾時')), timeoutMs + 200));
      const res = await Promise.race([fetchPromise, timeoutPromise]);
      if (timerId) clearTimeout(timerId);

      const data = await res.json();
      if (data && data.result === 'success' && data.rates) {
        const nextRates = { ...state.exchangeRates };
        SUPPORTED_CURRENCIES.forEach(cur => {
          if (cur !== 'TWD' && data.rates[cur]) {
            nextRates[cur] = 1 / data.rates[cur];
          }
        });
        nextRates.TWD = 1;

        const ratesChanged = !prevLive || SUPPORTED_CURRENCIES.some(
          cur => Math.abs((nextRates[cur] || 0) - (prevRates[cur] || 0)) > 1e-7
        );

        state.exchangeRates = nextRates;
        state.ratesLoadedFromLive = true;
        safeLocalSet(STORAGE_KEYS.RATES, JSON.stringify({
          rates: state.exchangeRates,
          live: true,
          savedAt: Date.now()
        }));
        updateDynamicRateDisplay();

        // 若日曆資料已先渲染（快取或並行先到達），且即時匯率有變動，背景無縫重算台幣金額
        if (ratesChanged && state.hasHydratedData && state.lastRawPayload) {
          hydrateData(state.lastRawPayload);
          triggerPageRender();
        }
        return true;
      }
    } catch (e) {
      if (timerId) clearTimeout(timerId);
      console.warn('即時匯率取得失敗，改用快取或預設匯率', e);
    }

    updateDynamicRateDisplay();
    return false;
  }

  function jsonpRequest(url, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const cbName = 'ihgGasCb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
      const script = document.createElement('script');
      let settled = false;

      const cleanup = () => {
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete global[cbName]; } catch (_) { global[cbName] = undefined; }
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('API 連線逾時，請稍後重試'));
      }, timeoutMs);

      global[cbName] = (data) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error('無法連線至後端 API'));
      };

      const sep = url.includes('?') ? '&' : '?';
      script.src = `${url}${sep}callback=${cbName}&_t=${Date.now()}`;
      document.body.appendChild(script);
    });
  }

  async function postApi(action, payload = {}, pinOverride = null) {
    const pin = pinOverride !== null ? String(pinOverride) : (safeLocalGet(STORAGE_KEYS.ADMIN_PIN) || '');
    const res = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, pin, payload }),
      redirect: 'follow'
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (_) {
      throw new Error('後端回應格式異常，請確認 Code.gs 已部署為最新版');
    }
    if (!json || json.status !== 'success') {
      const err = new Error((json && json.message) || '操作失敗');
      err.code = json && json.code;
      throw err;
    }
    return json;
  }

  function hydrateCalendarFromCacheSync() {
    const selectedYear = state.selectedYear;
    const cacheKey = `${STORAGE_KEYS.DATA_PREFIX}${selectedYear - 1}_${selectedYear + 1}`;
    const cachedRaw = safeLocalGet(cacheKey);
    if (!cachedRaw) return { hit: false, fresh: false };
    try {
      const cached = JSON.parse(cachedRaw);
      if (cached && Array.isArray(cached.items)) {
        state.lastRawPayload = cached;
        state.lastPayloadSignature = computePayloadSignature(cached);
        state.hasHydratedData = true;
        hydrateData(cached);
        setStatus('success', cached.syncedAt || formatSyncTimestamp(new Date()));
        triggerPageRender();
        const savedAt = typeof cached.savedAt === 'number' ? cached.savedAt : 0;
        const isFresh = savedAt > 0 && (Date.now() - savedAt) < DATA_FRESH_MS;
        return { hit: true, fresh: isFresh };
      }
    } catch (_) {}
    return { hit: false, fresh: false };
  }

  async function fetchCalendarData(forceRefresh = false, opts = {}) {
    const reqId = ++state.latestRequestId;
    const selectedYear = state.selectedYear;
    const startYear = selectedYear - 1;
    const endYear = selectedYear + 1;
    const cacheKey = `${STORAGE_KEYS.DATA_PREFIX}${startYear}_${endYear}`;

    let isBackground = Boolean(opts.background);
    if (!forceRefresh && !opts.alreadyHydrated) {
      const cacheInfo = hydrateCalendarFromCacheSync();
      if (cacheInfo.fresh && !opts.forceNetwork) return;
      if (cacheInfo.hit) isBackground = true;
    }

    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    if (refreshBtn && !isBackground) refreshBtn.disabled = true;
    if (refreshIcon) refreshIcon.classList.add('animate-spin');
    setStatus('loading', isBackground ? '更新中...' : '同步中...');

    try {
      const query = new URLSearchParams({
        startYear: String(startYear),
        endYear: String(endYear),
        strictColor: 'false'
      });
      const data = await jsonpRequest(`${GAS_API_URL}?${query.toString()}`);

      if (reqId !== state.latestRequestId) return;
      if (!data || data.status !== 'success') {
        throw new Error((data && data.message) || '後端回傳資料格式異常');
      }

      const now = new Date();
      const payload = {
        items: data.items || [],
        promos: data.promos || [],
        rollovers: data.rollovers || [],
        snipers: data.snipers || [],
        syncedAt: formatSyncTimestamp(now),
        savedAt: now.getTime()
      };
      safeLocalSet(cacheKey, JSON.stringify(payload));

      const nextSig = computePayloadSignature(payload);
      const dataChanged = !isBackground || !state.hasHydratedData || nextSig !== state.lastPayloadSignature;

      state.lastRawPayload = payload;
      state.lastPayloadSignature = nextSig;
      state.hasHydratedData = true;

      if (dataChanged) {
        hydrateData(payload);
        triggerPageRender();
      }
      setStatus('success', payload.syncedAt);
    } catch (err) {
      if (reqId !== state.latestRequestId) return;
      console.error(err);
      if (isBackground && state.hasHydratedData) {
        // 背景同步失敗時保留畫面上的快取資料，不清空畫面
        setStatus('error', '離線快取（同步失敗）');
      } else {
        setStatus('error', err.message || '同步失敗');
        state.lastRawPayload = null;
        state.lastPayloadSignature = '';
        state.hasHydratedData = false;
        hydrateData({ items: [], promos: [], rollovers: [], snipers: [] });
        triggerPageRender();
      }
    } finally {
      if (reqId === state.latestRequestId) {
        if (refreshBtn) refreshBtn.disabled = false;
        if (refreshIcon) refreshIcon.classList.remove('animate-spin');
      }
    }
  }

  // =========================================================================
  // 核心解析與雙軌房晚計算引擎（支援最多 4 間房 / 8 行說明）
  // =========================================================================
  let _htmlDecodeTextarea = null;
  function stripHtmlToLines(desc) {
    if (!desc) return [];
    const withNewlines = String(desc)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    if (!_htmlDecodeTextarea) {
      _htmlDecodeTextarea = document.createElement('textarea');
    }
    _htmlDecodeTextarea.innerHTML = withNewlines;
    return _htmlDecodeTextarea.value
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  function isValidPriceLine(line) {
    const str = (line || '').trim();
    return Boolean(str) && PRICE_LINE_REGEX.test(str);
  }

  function parsePriceString(rawPrice) {
    const str = (rawPrice || '').trim();
    const ptsMatch = str.match(/([\d,]+)\s*(?:積分|點|pts?|points?)/i);
    if (ptsMatch) {
      const points = parseInt(ptsMatch[1].replace(/,/g, ''), 10) || 0;
      const twd = Math.round(points * POINTS_TO_TWD);
      return {
        isPoints: true,
        currency: 'POINTS',
        rawAmount: points,
        points,
        twd,
        display: `${points.toLocaleString()} 積分（約${twd.toLocaleString()}元）`
      };
    }

    const numMatch = str.match(/([\d,]+(?:\.\d+)?)/);
    const amount = numMatch ? parseFloat(numMatch[1].replace(/,/g, '')) : 0;

    let currency = 'TWD';
    if (/US\$|USD|美金|美元|\$/i.test(str) && !/NT\$|TWD|HK\$|SG\$/i.test(str)) {
      currency = 'USD';
    } else if (/THB|฿|泰銖/i.test(str)) {
      currency = 'THB';
    } else if (/VND|₫|越南盾/i.test(str)) {
      currency = 'VND';
    } else if (/JPY|¥|日圓|日幣/i.test(str)) {
      currency = 'JPY';
    } else if (/EUR|€|歐元/i.test(str)) {
      currency = 'EUR';
    } else if (/CNY|RMB|人民幣/i.test(str)) {
      currency = 'CNY';
    } else if (/HK\$|HKD|港幣/i.test(str)) {
      currency = 'HKD';
    } else if (/SG\$|SGD|新幣/i.test(str)) {
      currency = 'SGD';
    } else if (/KRW|₩|韓元/i.test(str)) {
      currency = 'KRW';
    } else if (/MYR|馬幣/i.test(str)) {
      currency = 'MYR';
    }

    const rate = state.exchangeRates[currency] || DEFAULT_RATES[currency] || 1;
    const twd = Math.round(amount * rate);
    return {
      isPoints: false,
      currency,
      rawAmount: amount,
      points: 0,
      twd,
      display: `${twd.toLocaleString()} 元`
    };
  }

  function parsePlanInfo(planRaw, fallbackYear) {
    const cleaned = (planRaw || '').trim();
    const suffixMatch = cleaned.match(/^(.*?)-(\d{4})$/);
    const basePlan = suffixMatch ? suffixMatch[1].trim() : cleaned;
    const quotaYear = suffixMatch ? parseInt(suffixMatch[2], 10) : fallbackYear;
    const isEmployeePlan = Object.prototype.hasOwnProperty.call(EMPLOYEE_PLANS, basePlan);

    return { rawPlan: cleaned, basePlan, quotaYear, isEmployeePlan };
  }

  function hydrateData(payload) {
    processEvents(payload.items || []);
    processPromos(payload.promos || []);
    processRollovers(payload.rollovers || []);
    processSnipers(payload.snipers || []);
    computeMembership();
    updateDynamicRateDisplay();
  }

  function processEvents(events) {
    const rawBookings = [];
    const groupedEvents = [];

    events.forEach(ev => {
      if (ev.status === 'cancelled') return;
      if (!ev.start || !ev.start.date || !ev.end || !ev.end.date) return;

      const lines = stripHtmlToLines(ev.description);
      if (lines.length < 2 || !lines[0] || !isValidPriceLine(lines[1])) return;

      const hotelName = (ev.summary || '未命名飯店').trim();
      const checkInStr = ev.start.date;
      const checkOutStr = subtractDaysIso(ev.end.date, 1);
      const checkInYear = parseInt(checkInStr.slice(0, 4), 10);
      const dIn = parseLocalDate(checkInStr);
      const dOut = parseLocalDate(checkOutStr);
      const nights = Math.max(0, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));

      const rooms = [];
      for (let r = 0; r < MAX_ROOMS_PER_EVENT; r++) {
        const planLine = lines[r * 2];
        const priceLine = lines[r * 2 + 1];
        if (!planLine || !isValidPriceLine(priceLine)) break;
        const planInfo = parsePlanInfo(planLine, checkInYear);
        const priceInfo = parsePriceString(priceLine);
        rooms.push({
          roomIndex: r + 1,
          planRaw: planLine,
          priceRaw: priceLine,
          planInfo,
          priceInfo
        });
      }

      if (rooms.length === 0) return;

      groupedEvents.push({
        id: ev.id || '',
        hotelName,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        stayYear: checkInYear,
        stayMonth: parseInt(checkInStr.slice(5, 7), 10),
        nights,
        rooms,
        description: ev.description || ''
      });

      rooms.forEach(rm => {
        rawBookings.push({
          eventId: ev.id || '',
          roomIndex: rm.roomIndex,
          totalRoomsInEvent: rooms.length,
          hotelName,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          stayYear: checkInYear,
          stayMonth: parseInt(checkInStr.slice(5, 7), 10),
          nights,
          planInfo: rm.planInfo,
          priceInfo: rm.priceInfo
        });
      });
    });

    groupedEvents.sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut));
    rawBookings.sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut) || a.roomIndex - b.roomIndex);

    state.rawBookingEvents = groupedEvents;

    const occupiedDatesByYear = {};
    const quotaUsedTracker = {};
    const hotelUsedTracker = {};

    state.allProcessedBookings = rawBookings.map(item => {
      const y = item.stayYear;
      if (!occupiedDatesByYear[y]) occupiedDatesByYear[y] = new Set();

      let qualifyingNights = 0;
      const qualifyingDates = [];
      const startD = parseLocalDate(item.checkIn);
      for (let i = 0; i < item.nights; i++) {
        const cur = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate() + i);
        const iso = toIsoDate(cur);
        if (!occupiedDatesByYear[y].has(iso)) {
          occupiedDatesByYear[y].add(iso);
          qualifyingNights++;
          qualifyingDates.push(iso);
        }
      }

      let employeeQuotaDisplay = '0晚（不計入）';
      let hotelLimitDisplay = '不計入';
      let hotelLimitExceeded = false;

      if (item.planInfo.isEmployeePlan) {
        const basePlan = item.planInfo.basePlan;
        const qYear = item.planInfo.quotaYear;
        const qKey = `${qYear}_${basePlan}`;
        quotaUsedTracker[qKey] = (quotaUsedTracker[qKey] || 0) + item.nights;

        const cap = EMPLOYEE_PLANS[basePlan].limit;
        if (cap === Infinity) {
          employeeQuotaDisplay = `${item.nights}晚（剩餘不限）`;
        } else {
          const rem = cap - quotaUsedTracker[qKey];
          employeeQuotaDisplay = rem >= 0
            ? `${item.nights}晚（剩餘${rem}晚）`
            : `${item.nights}晚（超額${Math.abs(rem)}晚）`;
        }

        const hKey = `${y}_${item.hotelName}`;
        hotelUsedTracker[hKey] = (hotelUsedTracker[hKey] || 0) + item.nights;
        const hUsed = hotelUsedTracker[hKey];
        hotelLimitDisplay = `已用${hUsed}晚`;
        if (hUsed > HOTEL_ANNUAL_CAP) hotelLimitExceeded = true;
      }

      return {
        ...item,
        qualifyingNights,
        qualifyingDates,
        employeeQuotaDisplay,
        hotelLimitDisplay,
        hotelLimitExceeded
      };
    });

    state.currentYearProcessed = state.allProcessedBookings.filter(b => b.stayYear === state.selectedYear);
  }

  function processPromos(rawPromos) {
    state.promos = rawPromos.map(ev => {
      const title = (ev.summary || '').trim();
      const name = title.replace(/^【(?:IHG加倍|IHG\s*洲際優悅會定向活動[：:]?)[^】]*】/, '').trim() || title;
      const startDate = ev.start && ev.start.date ? ev.start.date : '';
      const endDate = ev.end && ev.end.date ? subtractDaysIso(ev.end.date, 1) : startDate;
      const lines = stripHtmlToLines(ev.description);
      const firstLine = lines[0] || '';
      const capMatch = firstLine.match(/(\d+)/);
      const unlimited = /無上限/i.test(firstLine) || (!capMatch && firstLine === '');
      const cap = unlimited ? Infinity : parseInt(capMatch[1], 10);
      const statusOnly = lines.some(l => /僅會籍/.test(l));

      return {
        id: ev.id || '',
        rawTitle: title,
        name,
        startDate,
        endDate,
        cap,
        unlimited,
        statusOnly
      };
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  function processRollovers(rawRollovers) {
    state.rollovers = rawRollovers.map(ev => {
      const title = (ev.summary || '').trim();
      const year = ev.start && ev.start.date ? parseInt(ev.start.date.slice(0, 4), 10) : 0;
      const m = title.match(/(\d+)/);
      const nights = m ? parseInt(m[1], 10) : 0;
      return { id: ev.id || '', year, nights, rawTitle: title };
    });
  }

  function processSnipers(rawSnipers) {
    state.snipers = rawSnipers.map(ev => ({
      id: ev.id || '',
      hotelName: ev.hotelName || (ev.summary || '').replace(/^【搶房】/, '').trim(),
      checkIn: ev.checkIn || '',
      timeZone: ev.timeZone || 'Asia/Taipei',
      openIso: ev.openIso || '',
      startIso: ev.startIso || '',
      endIso: ev.endIso || '',
      pushDayId: ev.pushDayId || '',
      push15mId: ev.push15mId || ''
    })).sort((a, b) => new Date(a.openIso).getTime() - new Date(b.openIso).getTime());
  }

  function getTierInfo(statusNights) {
    if (statusNights >= 70) return { name: '鑽石精英會員', badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (statusNights >= 40) return { name: '白金精英會員', badgeCls: 'bg-sky-50 text-sky-700 border-sky-200' };
    if (statusNights >= 20) return { name: '金卡精英會員', badgeCls: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (statusNights >= 10) return { name: '銀卡精英會員', badgeCls: 'bg-slate-100 text-slate-700 border-slate-300' };
    return { name: '俱樂部會員', badgeCls: 'bg-slate-100 text-slate-600 border-slate-200' };
  }

  function computeMembership() {
    const y = state.selectedYear;
    const yearDates = new Set();
    const prevYearDates = new Set();

    state.allProcessedBookings.forEach(b => {
      if (b.stayYear === y) {
        (b.qualifyingDates || []).forEach(d => yearDates.add(d));
      } else if (b.stayYear === y - 1) {
        (b.qualifyingDates || []).forEach(d => prevYearDates.add(d));
      }
    });

    const actualQualifyingNights = yearDates.size;

    const manualRoll = state.rollovers.find(r => r.year === y);
    let rolloverNights = 0;
    let rolloverSource = 'auto';
    if (manualRoll) {
      rolloverNights = manualRoll.nights;
      rolloverSource = 'manual';
    } else {
      const prevActual = prevYearDates.size;
      if (prevActual >= 70) rolloverNights = prevActual - 70;
      else if (prevActual >= 40) rolloverNights = prevActual - 40;
      else if (prevActual >= 20) rolloverNights = prevActual - 20;
      else rolloverNights = 0;
    }

    const yearStartIso = `${y}-01-01`;
    const yearEndIso = `${y}-12-31`;
    const yearPromos = state.promos.filter(p => p.startDate <= yearEndIso && p.endDate >= yearStartIso);

    let statusBonusNights = 0;
    let milestoneBonusNights = 0;

    const promoStats = yearPromos.map(p => {
      let matched = 0;
      yearDates.forEach(d => {
        if (d >= p.startDate && d <= p.endDate) matched++;
      });
      const granted = p.unlimited ? matched : Math.min(matched, p.cap);
      statusBonusNights += granted;
      if (!p.statusOnly) milestoneBonusNights += granted;
      return {
        ...p,
        matchedNights: matched,
        grantedNights: granted,
        remainingCap: p.unlimited ? Infinity : Math.max(0, p.cap - granted)
      };
    });

    const totalStatusNights = rolloverNights + actualQualifyingNights + statusBonusNights;
    const totalMilestoneNights = actualQualifyingNights + milestoneBonusNights;

    const nextMilestone = MILESTONE_REWARDS.find(m => totalMilestoneNights < m.nights) || null;

    state.membership = {
      selectedYear: y,
      rolloverNights,
      rolloverSource,
      actualQualifyingNights,
      statusBonusNights,
      milestoneBonusNights,
      totalStatusNights,
      totalMilestoneNights,
      currentTier: getTierInfo(totalStatusNights),
      toPlatinum: Math.max(0, 40 - totalStatusNights),
      toDiamond: Math.max(0, 70 - totalStatusNights),
      toLounge: Math.max(0, 40 - totalMilestoneNights),
      nextMilestone,
      promoStats
    };
  }

  function triggerPageRender() {
    state.currentYearProcessed = state.allProcessedBookings.filter(b => b.stayYear === state.selectedYear);
    computeMembership();
    updateDynamicRateDisplay();

    if (typeof state.onRender === 'function') {
      state.onRender({
        selectedYear: state.selectedYear,
        rawBookingEvents: state.rawBookingEvents,
        allBookings: state.allProcessedBookings,
        yearBookings: state.currentYearProcessed,
        promos: state.promos,
        snipers: state.snipers,
        membership: state.membership
      });
    }
  }

  // =========================================================================
  // 啟動流程
  // =========================================================================
  async function startApp() {
    try {
      ensureDataVersion();
      state.selectedYear = resolveInitialYear();
      renderSharedChrome();
      initYearSelect(state.selectedYear);
      syncNotificationBadge();
      if (splashCtrl.active) {
        checkServiceWorkerUpdate();
      }

      if (!supportsCrossDocVT()) {
        const pending = readPendingTransition();
        if (pending && !prefersReducedMotion()) {
          runFallbackEnterAnimation(pending);
        }
        safeSessionRemove(STORAGE_KEYS.NAV_TRANSITION);
      }

      // 1. 同步讀取 localStorage 快取（0 秒秒開／離線保底）
      const ratesCache = hydrateRatesFromCacheSync();
      const dataCache = hydrateCalendarFromCacheSync();

      // 2. 並行觸發網路請求：冷啟動期間一律於貓咪 3 秒動畫背後同步最新日曆；站內換頁則依 2 分鐘新鮮度吃快取秒開
      const tasks = [];
      const needCalendarSync = splashCtrl.active || !dataCache.fresh;

      if (splashCtrl.active) {
        splashCtrl.setStatus(ratesCache.fresh ? '同步最新日曆資料...' : '同步即時匯率與日曆資料...');
      }

      if (!ratesCache.fresh) {
        tasks.push(loadExchangeRates(false, 3500));
      }
      if (needCalendarSync) {
        tasks.push(fetchCalendarData(false, {
          alreadyHydrated: dataCache.hit,
          background: dataCache.hit,
          forceNetwork: splashCtrl.active
        }));
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }

      if (splashCtrl.active) {
        splashCtrl.setStatus('計算雙軌會籍與額度...');
        splashCtrl.markReady();
      }
    } catch (err) {
      console.error('初始化失敗:', err);
      setStatus('error', `錯誤：${err.message || err}`);
      splashCtrl.markReady();
    }
  }

  global.addEventListener('error', (e) => {
    const badge = document.getElementById('statusBadge');
    if (badge && badge.textContent.includes('同步中')) {
      setStatus('error', `程式錯誤：${e.message || '請檢查主控台'}`);
    }
  });

  global.IHGApp = {
    APP_DATA_VERSION,
    GAS_API_URL,
    ONESIGNAL_APP_ID,
    HOTEL_ANNUAL_CAP,
    POINTS_TO_TWD,
    MAX_ROOMS_PER_EVENT,
    EMPLOYEE_PLANS,
    PRESET_PLANS,
    SUPPORTED_CURRENCIES,
    MILESTONE_REWARDS,
    escapeHtml,
    formatDateSlash,
    formatTaiwanDateTime,
    addDaysIso,
    subtractDaysIso,
    zonedMidnightToUtcDate,
    getPlanStyle,
    detectHotelBrand,
    buildBrandLogoHtml,
    parsePriceString,
    parsePlanInfo,
    clearDataCache,
    postApi,
    getNotificationBadgeCount: readNotificationBadgeCount,
    syncNotificationBadge,
    clearNotificationBadge,

    getSavedPin() { return safeLocalGet(STORAGE_KEYS.ADMIN_PIN) || ''; },
    savePin(pin) { safeLocalSet(STORAGE_KEYS.ADMIN_PIN, String(pin || '')); },
    clearPin() { safeLocalRemove(STORAGE_KEYS.ADMIN_PIN); },

    getExchangeRates() { return { ...state.exchangeRates }; },

    getKnownHotels() {
      const set = new Set();
      state.rawBookingEvents.forEach(ev => { if (ev.hotelName) set.add(ev.hotelName); });
      state.snipers.forEach(s => { if (s.hotelName) set.add(s.hotelName); });
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    },

    init({ activePage, hideControls = false, onRender }) {
      ensureDataVersion();
      state.activePage = activePage || 'index';
      state.hideControls = Boolean(hideControls);
      state.onRender = onRender || null;

      state.selectedYear = resolveInitialYear();
      if (document.getElementById('appHeader')) {
        renderSharedChrome();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApp);
      } else {
        startApp();
      }
    },

    onYearChange() {
      const yearSelect = document.getElementById('yearSelect');
      const nextYear = parseInt(yearSelect && yearSelect.value, 10) || new Date().getFullYear();
      updateYearArtifacts(nextYear);
      fetchCalendarData(false);
    },

    setYear(year) {
      const yr = parseInt(year, 10);
      if (isNaN(yr)) return;
      const yearSelect = document.getElementById('yearSelect');
      if (yearSelect) yearSelect.value = String(yr);
      updateYearArtifacts(yr);
      fetchCalendarData(false);
    },

    async refresh(skipRates = false) {
      clearDataCache();
      setStatus('loading', '重新同步...');
      const tasks = [fetchCalendarData(true)];
      if (!skipRates) tasks.push(loadExchangeRates(true, 3500));
      await Promise.all(tasks);
    },

    getState() {
      return {
        selectedYear: state.selectedYear,
        rawBookingEvents: state.rawBookingEvents,
        allBookings: state.allProcessedBookings,
        yearBookings: state.currentYearProcessed,
        promos: state.promos,
        snipers: state.snipers,
        membership: state.membership
      };
    }
  };
})(window);

// =========================================================================
// IHG Duo - 共用核心模組 (shared.js v3)
// 支援：最多 4 間房(8行)、雙軌會籍/獎勵計算、搶房提醒、雙向寫入 API、手機底部導覽列
// =========================================================================
(function (global) {
  'use strict';

  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyDWevi8zV-rEJSx4qjcFQ4jLFeQK9Slw5twdel8UcA_73U34DcIrch_NyGOL08GE-a/exec';
  const ONESIGNAL_APP_ID = '6dd089b1-9382-4040-a935-29e08722b78e';
  const LOGO_BASE_PATH = './logos/';
  const HOTEL_ANNUAL_CAP = 14;
  const POINTS_TO_TWD = 0.16;
  const MAX_ROOMS_PER_EVENT = 4;

  const STORAGE_KEYS = {
    SELECTED_YEAR: 'ihg_selected_year_v3',
    RATES: 'ihg_exchange_rates_v3',
    DATA_PREFIX: 'ihg_calendar_cache_v3_',
    ADMIN_PIN: 'ihg_duo_admin_pin_v1'
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
    latestRequestId: 0
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
  function safeLocalGet(key) {
    try { return global.localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeLocalSet(key, val) {
    try { global.localStorage.setItem(key, val); } catch (_) {}
  }
  function safeLocalRemove(key) {
    try { global.localStorage.removeItem(key); } catch (_) {}
  }

  function clearDataCache() {
    try {
      const toRemove = [];
      for (let i = 0; i < global.sessionStorage.length; i++) {
        const k = global.sessionStorage.key(i);
        if (k && k.startsWith(STORAGE_KEYS.DATA_PREFIX)) toRemove.push(k);
      }
      toRemove.forEach(k => global.sessionStorage.removeItem(k));
    } catch (_) {}
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
  // 共用導覽列（電腦頂部 ＋ 手機底部固定 5 格分頁列）與控制列
  // =========================================================================
  function injectResponsiveStyles() {
    if (document.getElementById('ihg-shared-styles')) return;
    const style = document.createElement('style');
    style.id = 'ihg-shared-styles';
    style.textContent = `
      .safe-top-header {
        padding-top: env(safe-area-inset-top, 0px);
      }
      .safe-bottom-nav {
        padding-bottom: max(0.35rem, env(safe-area-inset-bottom, 0px));
      }
      @media (max-width: 767px) {
        body {
          padding-bottom: calc(4.75rem + env(safe-area-inset-bottom, 0px));
        }
      }
    `;
    document.head.appendChild(style);
  }

  function renderSharedChrome() {
    injectResponsiveStyles();

    const headerEl = document.getElementById('appHeader');
    if (headerEl) {
      const desktopNavHtml = NAV_ITEMS.map(item => {
        const isActive = item.id === state.activePage;
        const cls = isActive
          ? 'bg-white text-sky-700 shadow-sm ring-1 ring-sky-200/80 font-semibold'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium';
        return `
          <a data-nav-href="${item.href}" href="${item.href}?year=${state.selectedYear}"
             class="nav-link-item px-3.5 py-1.5 rounded-lg text-sm transition whitespace-nowrap ${cls}">
            ${item.label}
          </a>
        `;
      }).join('');

      headerEl.innerHTML = `
        <header class="safe-top-header sticky top-0 z-30 bg-white/85 backdrop-blur-lg border-b border-sky-100/90 shadow-[0_2px_16px_-4px_rgba(14,165,233,0.10)]">
          <div class="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <a data-nav-href="index.html" href="index.html?year=${state.selectedYear}" class="nav-link-item flex items-center gap-2.5 group min-w-0">
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 text-white flex flex-col items-center justify-center font-bold leading-none shadow-md shadow-sky-500/25 ring-1 ring-white/50 shrink-0">
                <span class="text-[11px] sm:text-xs tracking-wider">IHG</span>
                <span class="text-[8px] sm:text-[9px] tracking-widest opacity-90 mt-0.5">DUO</span>
              </div>
              <div class="flex items-center gap-2 min-w-0">
                <h1 class="text-base sm:text-lg font-bold tracking-tight text-slate-900 group-hover:text-sky-700 transition truncate">IHG Duo</h1>
                <span class="hidden xl:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider bg-sky-50 text-sky-600 border border-sky-200/80">
                  員工價住宿統計
                </span>
              </div>
            </a>

            <nav aria-label="主導覽列" class="hidden md:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <div class="flex items-center gap-1">
                ${desktopNavHtml}
              </div>
            </nav>

            <div class="flex items-center gap-2 shrink-0">
              <div id="statusBadge" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-sky-50 text-sky-700 text-[11px] sm:text-xs font-medium font-mono-num border border-sky-200/80">
                <span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                <span>同步中...</span>
              </div>
              <button id="refreshBtn" onclick="IHGApp.refresh()" class="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-sky-500/25 transition flex items-center gap-1.5 active:scale-[0.98]" title="重新同步日曆">
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

    // 手機版底部固定 5 格分頁列 (Bottom Tab Bar)
    let bottomNav = document.getElementById('mobileBottomNav');
    if (!bottomNav) {
      bottomNav = document.createElement('nav');
      bottomNav.id = 'mobileBottomNav';
      bottomNav.setAttribute('aria-label', '手機版底部導覽列');
      document.body.appendChild(bottomNav);
    }
    bottomNav.className = 'md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/92 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_-6px_rgba(15,23,42,0.10)] safe-bottom-nav';
    bottomNav.innerHTML = `
      <div class="grid grid-cols-5 max-w-lg mx-auto px-1 pt-1.5">
        ${NAV_ITEMS.map(item => {
          const isActive = item.id === state.activePage;
          const colorCls = isActive ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium';
          const pillCls = isActive ? 'bg-sky-50 text-sky-600' : '';
          return `
            <a data-nav-href="${item.href}" href="${item.href}?year=${state.selectedYear}"
               class="nav-link-item flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition active:scale-95 ${colorCls}">
              <span class="w-10 h-6 rounded-full flex items-center justify-center transition ${pillCls}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="${isActive ? '2.2' : '1.8'}" viewBox="0 0 24 24">
                  ${item.icon}
                </svg>
              </span>
              <span class="text-[11px] leading-tight tracking-tight">${item.shortLabel}</span>
            </a>
          `;
        }).join('')}
      </div>
    `;

    const controlsEl = document.getElementById('appControls');
    if (controlsEl && !state.hideControls) {
      controlsEl.innerHTML = `
        <section class="tech-card rounded-2xl p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div class="flex flex-wrap items-center gap-3 sm:gap-4">
            <div>
              <label for="yearSelect" class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">檢視年份</label>
              <select id="yearSelect" onchange="IHGApp.onYearChange()" class="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 outline-none transition">
              </select>
            </div>
            <div class="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div>
              <span class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">同步資料範圍</span>
              <span id="syncRangeDisplay" class="font-mono-num inline-flex items-center px-3 py-1 rounded-xl bg-sky-50/80 text-sky-700 border border-sky-200/70 text-xs font-semibold">
                ${state.selectedYear - 1} – ${state.selectedYear + 1} 年
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50/90 border border-slate-200/80 max-w-full overflow-x-auto">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></span>
            <div id="rateInfo" class="font-mono-num text-[11px] text-slate-500 whitespace-nowrap">
              即時匯率載入中...（1 積分 = 0.16 TWD）
            </div>
          </div>
        </section>
      `;
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
      loading: ['bg-sky-50 text-sky-700 border-sky-200/80', 'bg-sky-500 animate-pulse'],
      success: ['bg-emerald-50 text-emerald-700 border-emerald-200/80', 'bg-emerald-500'],
      error: ['bg-amber-50 text-amber-800 border-amber-200/90', 'bg-amber-500']
    };
    const [boxCls, dotCls] = styles[type] || styles.loading;
    badge.className = `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-medium font-mono-num border ${boxCls}`;
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

  async function loadExchangeRates(forceRefresh = false, timeoutMs = 3500) {
    if (!forceRefresh) {
      const cachedRaw = safeSessionGet(STORAGE_KEYS.RATES);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          if (cached && cached.rates) {
            state.exchangeRates = { ...DEFAULT_RATES, ...cached.rates };
            state.ratesLoadedFromLive = Boolean(cached.live);
            updateDynamicRateDisplay();
            return;
          }
        } catch (_) {}
      }
    }

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
        SUPPORTED_CURRENCIES.forEach(cur => {
          if (cur !== 'TWD' && data.rates[cur]) {
            state.exchangeRates[cur] = 1 / data.rates[cur];
          }
        });
        state.ratesLoadedFromLive = true;
        safeSessionSet(STORAGE_KEYS.RATES, JSON.stringify({ rates: state.exchangeRates, live: true }));
        updateDynamicRateDisplay();
        return;
      }
    } catch (e) {
      if (timerId) clearTimeout(timerId);
      console.warn('即時匯率取得失敗，改用預設匯率', e);
    }

    state.ratesLoadedFromLive = false;
    updateDynamicRateDisplay();
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

  async function fetchCalendarData(forceRefresh = false) {
    const reqId = ++state.latestRequestId;
    const selectedYear = state.selectedYear;
    const startYear = selectedYear - 1;
    const endYear = selectedYear + 1;
    const cacheKey = `${STORAGE_KEYS.DATA_PREFIX}${startYear}_${endYear}`;

    if (!forceRefresh) {
      const cachedRaw = safeSessionGet(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          if (cached && Array.isArray(cached.items)) {
            hydrateData(cached);
            setStatus('success', cached.syncedAt || formatSyncTimestamp(new Date()));
            triggerPageRender();
            return;
          }
        } catch (_) {}
      }
    }

    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    if (refreshBtn) refreshBtn.disabled = true;
    if (refreshIcon) refreshIcon.classList.add('animate-spin');
    setStatus('loading', '同步中...');

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

      const payload = {
        items: data.items || [],
        promos: data.promos || [],
        rollovers: data.rollovers || [],
        snipers: data.snipers || [],
        syncedAt: formatSyncTimestamp(new Date())
      };
      safeSessionSet(cacheKey, JSON.stringify(payload));

      hydrateData(payload);
      setStatus('success', payload.syncedAt);
      triggerPageRender();
    } catch (err) {
      if (reqId !== state.latestRequestId) return;
      console.error(err);
      setStatus('error', err.message || '同步失敗');
      hydrateData({ items: [], promos: [], rollovers: [], snipers: [] });
      triggerPageRender();
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
  function stripHtmlToLines(desc) {
    if (!desc) return [];
    const withNewlines = String(desc)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    const textarea = document.createElement('textarea');
    textarea.innerHTML = withNewlines;
    return textarea.value
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
      // Google 日曆全天行程結束日為排他性（Exclusive End Date），須減 1 天還原實際退房日
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

    // 1) 結轉房晚（優先讀取「IHG活動」日曆手動指定，否則依前一年實際定級房晚自動計算）
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

    // 2) 定向加倍活動統計
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
  // 公開 API
  // =========================================================================
  async function startApp() {
    try {
      state.selectedYear = resolveInitialYear();
      renderSharedChrome();
      initYearSelect(state.selectedYear);

      setStatus('loading', '讀取匯率...');
      await loadExchangeRates(false, 3500);
      await fetchCalendarData(false);
    } catch (err) {
      console.error('初始化失敗:', err);
      setStatus('error', `錯誤：${err.message || err}`);
    }
  }

  global.addEventListener('error', (e) => {
    const badge = document.getElementById('statusBadge');
    if (badge && badge.textContent.includes('同步中')) {
      setStatus('error', `程式錯誤：${e.message || '請檢查主控台'}`);
    }
  });

  global.IHGApp = {
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
      state.activePage = activePage || 'index';
      state.hideControls = Boolean(hideControls);
      state.onRender = onRender || null;

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
      if (!skipRates) await loadExchangeRates(true, 3500);
      await fetchCalendarData(true);
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

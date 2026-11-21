// =========================================================================
// IHG 員工價住宿統計儀表板 - 共用核心模組 (shared.js)
// =========================================================================
(function (global) {
  'use strict';

  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyDWevi8zV-rEJSx4qjcFQ4jLFeQK9Slw5twdel8UcA_73U34DcIrch_NyGOL08GE-a/exec';
  const LOGO_BASE_PATH = './logos/';
  const HOTEL_ANNUAL_CAP = 14;
  const POINTS_TO_TWD = 0.16;

  const STORAGE_KEYS = {
    SELECTED_YEAR: 'ihg_selected_year_v1',
    RATES: 'ihg_exchange_rates_v1',
    DATA_PREFIX: 'ihg_calendar_cache_v2_'
  };

  const NAV_ITEMS = [
    { id: 'index', label: '數據總覽', href: 'index.html' },
    { id: 'hotels', label: '各飯店總覽', href: 'hotels.html' },
    { id: 'details', label: '住宿明細', href: 'details.html' },
    { id: 'milestones', label: '進階獎勵', href: 'milestones.html' }
  ];

  const EMPLOYEE_PLANS = {
    'IHG One Pass 優享價': { limit: 30, order: 1 },
    'IHG One Pass 彈性價': { limit: Infinity, order: 2 },
    'IHG One Pass 友人價': { limit: 50, order: 3 }
  };

  const MEMBERSHIP_TIERS = [
    { id: 'club', name: '俱樂部會員', minNights: 0, badgeCls: 'bg-slate-100 text-slate-600 border-slate-200' },
    { id: 'silver', name: '銀卡精英', minNights: 10, badgeCls: 'bg-slate-100 text-slate-700 border-slate-300' },
    { id: 'gold', name: '金卡精英', minNights: 20, badgeCls: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'platinum', name: '白金精英', minNights: 40, badgeCls: 'bg-sky-50 text-sky-700 border-sky-200' },
    { id: 'diamond', name: '鑽石精英', minNights: 70, badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
  ];

  // 進階獎勵里程碑（僅保留 20 – 70 晚，共 6 階）
  const MILESTONE_REWARDS = [
    {
      nights: 20,
      picks: 1,
      isCoreGoal: false,
      options: ['5,000 獎勵積分', '2 張 US$20 餐飲抵用券', '1 張可確認套房升級券']
    },
    {
      nights: 30,
      picks: 1,
      isCoreGoal: false,
      options: ['5,000 獎勵積分', '2 張 US$20 餐飲抵用券']
    },
    {
      nights: 40,
      picks: 2,
      isCoreGoal: true,
      coreLabel: '核心目標：年度行政酒廊',
      options: [
        '年度行政酒廊使用權（限選 1 次）',
        '1 張可確認套房升級券（限選 1 次）',
        '10,000 獎勵積分',
        '5 張 US$20 餐飲抵用券'
      ]
    },
    {
      nights: 50,
      picks: 1,
      isCoreGoal: false,
      options: ['10,000 獎勵積分', '5 張 US$20 餐飲抵用券']
    },
    {
      nights: 60,
      picks: 1,
      isCoreGoal: false,
      options: ['10,000 獎勵積分', '5 張 US$20 餐飲抵用券']
    },
    {
      nights: 70,
      picks: 2,
      isCoreGoal: false,
      options: [
        '年度行政酒廊使用權（限選 1 次）',
        '2 張可確認套房升級券（限選 1 次）',
        '10,000 獎勵積分',
        '5 張 US$20 餐飲抵用券'
      ]
    }
  ];

  // 飯店品牌關鍵字比對規則（將「智選假日」「皇冠」排在「假日酒店」之前，避免誤判）
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
    'IHG One Pass 優享價': {
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
      chartColor: '#0284c7'
    },
    'IHG One Pass 彈性價': {
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      dot: 'bg-teal-500',
      chartColor: '#0d9488'
    },
    'IHG One Pass 友人價': {
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dot: 'bg-indigo-500',
      chartColor: '#4f46e5'
    },
    '大使免費週末住宿': {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      chartColor: '#d97706'
    },
    '獎勵住宿': {
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      dot: 'bg-purple-500',
      chartColor: '#9333ea'
    }
  };

  const OTHER_PLAN_STYLE = {
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    chartColor: '#94a3b8'
  };

  // 價格行驗證規則（替代顏色過濾）
  const CURRENCY_TOKEN = '(?:NT\\$|US\\$|HK\\$|SG\\$|TWD|USD|THB|VND|JPY|EUR|CNY|RMB|HKD|SGD|KRW|MYR|台幣|美金|美元|泰銖|越南盾|日圓|日幣|歐元|人民幣|港幣|新幣|韓元|馬幣|元|積分|點|pts?|points?|[\\$€¥฿₫₩])';
  const PRICE_LINE_REGEX = new RegExp(`^${CURRENCY_TOKEN}?\\s*[\\d,]+(?:\\.\\d+)?\\s*${CURRENCY_TOKEN}?$`, 'i');

  // 【IHG活動】日曆標題解析規則
  const ROLLOVER_TITLE_REGEX = /(?:【\s*)?會員等級結轉(?:\s*】)?\s*[:：]?\s*(\d+)\s*晚?/;
  const PROMO_TITLE_REGEX = /IHG\s*洲際優悅會定向活動\s*[:：]\s*(\d+)\s*房?晚加[倍被]/i;
  const PROMO_FALLBACK_REGEX = /(\d+)\s*房?晚加[倍被]/;
  const PROMO_UNLIMITED_REGEX = /IHG\s*洲際優悅會定向活動.*無上限|無上限.*加[倍被]/i;

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
    onRender: null,
    selectedYear: new Date().getFullYear(),
    exchangeRates: { ...DEFAULT_RATES },
    allProcessedBookings: [],
    currentYearProcessed: [],
    activityCalendarFound: false,
    manualRolloverByYear: {},
    promoRules: [],
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
        return {
          brand: rule.brand,
          file: rule.file,
          logoUrl: `${LOGO_BASE_PATH}${rule.file}`
        };
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
      return `
        <span class="${boxCls} inline-flex items-center justify-center shrink-0 bg-slate-50 text-slate-400 font-bold ${fallbackTextCls} tracking-tighter select-none" title="未分類品牌">
          IHG
        </span>
      `;
    }

    return `
      <span class="${boxCls} inline-flex items-center justify-center shrink-0 overflow-hidden" title="${escapeHtml(brandInfo.brand)}">
        <img
          src="${escapeHtml(brandInfo.logoUrl)}"
          alt="${escapeHtml(brandInfo.brand)}"
          loading="lazy"
          class="w-full h-full object-contain"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
        />
        <span style="display:none" class="w-full h-full items-center justify-center bg-sky-50 text-sky-600 font-bold ${fallbackTextCls} tracking-tighter select-none">
          IHG
        </span>
      </span>
    `;
  }

  function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDaysIso(dateStr, deltaDays) {
    const d = parseLocalDate(dateStr);
    d.setDate(d.getDate() + deltaDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDateSlash(dateStr) {
    return (dateStr || '').replace(/-/g, '/');
  }

  function formatSyncTimestamp(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const mm = String(dateObj.getMinutes()).padStart(2, '0');
    const ss = String(dateObj.getSeconds()).padStart(2, '0');
    return `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
  }

  // =========================================================================
  // 共用導覽列與控制列渲染
  // =========================================================================
  function renderSharedChrome() {
    const headerEl = document.getElementById('appHeader');
    if (headerEl) {
      const navLinksHtml = NAV_ITEMS.map(item => {
        const isActive = item.id === state.activePage;
        const cls = isActive
          ? 'bg-white text-sky-700 shadow-sm ring-1 ring-sky-200/80 font-semibold'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium';
        return `
          <a data-nav-href="${item.href}" href="${item.href}?year=${state.selectedYear}"
             class="nav-link-item px-3 py-1.5 rounded-lg text-xs sm:text-sm transition whitespace-nowrap ${cls}">
            ${item.label}
          </a>
        `;
      }).join('');

      headerEl.innerHTML = `
        <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-sky-100/90 shadow-[0_2px_16px_-4px_rgba(14,165,233,0.10)]">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <a data-nav-href="index.html" href="index.html?year=${state.selectedYear}" class="nav-link-item flex items-center gap-3 group">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-md shadow-sky-500/25 ring-1 ring-white/50">
                  IHG
                </div>
                <div class="flex items-center gap-2">
                  <h1 class="text-base sm:text-lg font-bold tracking-tight text-slate-900 group-hover:text-sky-700 transition">IHG 員工價住宿統計儀表板</h1>
                  <span class="hidden xl:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-widest bg-sky-50 text-sky-600 border border-sky-200/80">
                    ANALYTICS
                  </span>
                </div>
              </a>
            </div>

            <nav aria-label="頁面切換" class="order-3 lg:order-2 w-full lg:w-auto flex items-center justify-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 overflow-x-auto">
              <div class="flex items-center gap-1 w-full lg:w-auto justify-around lg:justify-start">
                ${navLinksHtml}
              </div>
            </nav>

            <div class="order-2 lg:order-3 flex items-center gap-2.5">
              <div id="statusBadge" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-medium font-mono-num border border-sky-200/80">
                <span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                初始化中...
              </div>
              <button id="refreshBtn" onclick="IHGApp.refresh()" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-sky-500/25 transition flex items-center gap-1.5 active:scale-[0.98]">
                <svg id="refreshIcon" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重新同步
              </button>
            </div>
          </div>
        </header>
      `;
    }

    const controlsEl = document.getElementById('appControls');
    if (controlsEl) {
      controlsEl.innerHTML = `
        <section class="tech-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-4">
            <div>
              <label for="yearSelect" class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">檢視年份</label>
              <select id="yearSelect" onchange="IHGApp.onYearChange()" class="rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 outline-none transition">
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

          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50/90 border border-slate-200/80">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            <div id="rateInfo" class="font-mono-num text-[11px] text-slate-500">
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
    if (!isNaN(paramYear) && paramYear >= 2020 && paramYear <= 2099) {
      return paramYear;
    }
    const savedYear = parseInt(safeSessionGet(STORAGE_KEYS.SELECTED_YEAR), 10);
    if (!isNaN(savedYear) && savedYear >= 2020 && savedYear <= 2099) {
      return savedYear;
    }
    return nowYear;
  }

  function initYearSelect(initialYear) {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect) return;

    const nowYear = new Date().getFullYear();
    const minOptionYear = Math.min(nowYear - 1, initialYear);
    const maxOptionYear = Math.max(nowYear + 5, initialYear);

    yearSelect.innerHTML = '';
    for (let yr = minOptionYear; yr <= maxOptionYear; yr++) {
      const opt = document.createElement('option');
      opt.value = yr;
      opt.textContent = `${yr} 年`;
      yearSelect.appendChild(opt);
    }
    yearSelect.value = String(initialYear);
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
    badge.className = `inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium font-mono-num border ${boxCls}`;
    badge.innerHTML = `<span class="w-2 h-2 rounded-full ${dotCls}"></span>${escapeHtml(text)}`;
  }

  // =========================================================================
  // 匯率與 GAS API 通訊（含 sessionStorage 跨頁快取）
  // =========================================================================
  async function loadExchangeRates(forceRefresh = false, timeoutMs = 3500) {
    const rateInfoEl = document.getElementById('rateInfo');

    if (!forceRefresh) {
      const cachedRaw = safeSessionGet(STORAGE_KEYS.RATES);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          if (cached && cached.rates) {
            state.exchangeRates = { ...DEFAULT_RATES, ...cached.rates };
            if (rateInfoEl && cached.label) rateInfoEl.textContent = cached.label;
            return;
          }
        } catch (_) {}
      }
    }

    let timerId = null;
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (controller) {
        timerId = setTimeout(() => controller.abort(), timeoutMs);
      }
      const fetchPromise = fetch('https://open.er-api.com/v6/latest/TWD', controller ? { signal: controller.signal } : {});
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('匯率請求逾時')), timeoutMs + 200)
      );
      const res = await Promise.race([fetchPromise, timeoutPromise]);
      if (timerId) clearTimeout(timerId);

      const data = await res.json();
      if (data && data.result === 'success' && data.rates) {
        ['USD', 'THB', 'VND', 'JPY', 'EUR', 'CNY', 'HKD', 'SGD', 'KRW', 'MYR'].forEach(cur => {
          if (data.rates[cur]) {
            state.exchangeRates[cur] = 1 / data.rates[cur];
          }
        });
        const label = `1 USD ≈ ${state.exchangeRates.USD.toFixed(2)} TWD ｜ 1 THB ≈ ${state.exchangeRates.THB.toFixed(3)} TWD ｜ 1 積分 = 0.16 TWD`;
        if (rateInfoEl) rateInfoEl.textContent = label;
        safeSessionSet(STORAGE_KEYS.RATES, JSON.stringify({ rates: state.exchangeRates, label }));
        return;
      }
    } catch (e) {
      if (timerId) clearTimeout(timerId);
      console.warn('即時匯率取得失敗或逾時，改用內建預設匯率', e);
    }

    const fallbackLabel = `預設匯率：1 USD = ${state.exchangeRates.USD.toFixed(2)} TWD ｜ 1 THB = ${state.exchangeRates.THB.toFixed(2)} TWD ｜ 1 積分 = 0.16 TWD`;
    if (rateInfoEl) rateInfoEl.textContent = fallbackLabel;
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
            state.activityCalendarFound = Boolean(cached.activityCalendarFound);
            processEvents(cached.items);
            processActivityEvents(cached.activityItems || []);
            setStatus('success', `已同步 ${cached.syncedAt || formatSyncTimestamp(new Date())}`);
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
    setStatus('loading', '正在同步最新資料...');

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

      const items = data.items || [];
      const activityItems = data.activityItems || [];
      const activityCalendarFound = Boolean(data.activityCalendarFound);
      const syncedAt = formatSyncTimestamp(new Date());

      safeSessionSet(cacheKey, JSON.stringify({
        items,
        activityItems,
        activityCalendarFound,
        syncedAt
      }));

      state.activityCalendarFound = activityCalendarFound;
      processEvents(items);
      processActivityEvents(activityItems);
      setStatus('success', `已同步 ${syncedAt}`);
      triggerPageRender();
    } catch (err) {
      if (reqId !== state.latestRequestId) return;
      console.error(err);
      setStatus('error', err.message || '資料同步失敗');
      state.allProcessedBookings = [];
      state.currentYearProcessed = [];
      state.manualRolloverByYear = {};
      state.promoRules = [];
      triggerPageRender();
    } finally {
      if (reqId === state.latestRequestId) {
        if (refreshBtn) refreshBtn.disabled = false;
        if (refreshIcon) refreshIcon.classList.remove('animate-spin');
      }
    }
  }

  // =========================================================================
  // 核心解析 1：住宿日曆（陳保志）
  // =========================================================================
  function stripHtmlToLines(desc) {
    if (!desc) return [];
    const withNewlines = desc
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
    if (!str) return false;
    return PRICE_LINE_REGEX.test(str);
  }

  function parsePriceString(rawPrice) {
    const str = (rawPrice || '').trim();
    const ptsMatch = str.match(/([\d,]+)\s*(?:積分|點|pts?|points?)/i);
    if (ptsMatch) {
      const points = parseInt(ptsMatch[1].replace(/,/g, ''), 10) || 0;
      const twd = Math.round(points * POINTS_TO_TWD);
      return {
        isPoints: true,
        points,
        twd,
        display: `${points.toLocaleString()} 積分（約${twd.toLocaleString()}元）`
      };
    }

    const numMatch = str.match(/([\d,]+(?:\.\d+)?)/);
    const amount = numMatch ? parseFloat(numMatch[1].replace(/,/g, '')) : 0;

    let rate = 1;
    if (/US\$|USD|美金|美元|\$/i.test(str) && !/NT\$|TWD|HK\$|SG\$/i.test(str)) {
      rate = state.exchangeRates.USD;
    } else if (/THB|฿|泰銖/i.test(str)) {
      rate = state.exchangeRates.THB;
    } else if (/VND|₫|越南盾/i.test(str)) {
      rate = state.exchangeRates.VND;
    } else if (/JPY|¥|日圓|日幣/i.test(str)) {
      rate = state.exchangeRates.JPY;
    } else if (/EUR|€|歐元/i.test(str)) {
      rate = state.exchangeRates.EUR;
    } else if (/CNY|RMB|人民幣/i.test(str)) {
      rate = state.exchangeRates.CNY;
    } else if (/HK\$|HKD|港幣/i.test(str)) {
      rate = state.exchangeRates.HKD;
    } else if (/SG\$|SGD|新幣/i.test(str)) {
      rate = state.exchangeRates.SGD;
    } else if (/KRW|₩|韓元/i.test(str)) {
      rate = state.exchangeRates.KRW;
    } else if (/MYR|馬幣/i.test(str)) {
      rate = state.exchangeRates.MYR;
    }

    const twd = Math.round(amount * rate);
    return {
      isPoints: false,
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

    return {
      rawPlan: cleaned,
      basePlan,
      quotaYear,
      isEmployeePlan
    };
  }

  function processEvents(events) {
    const rawBookings = [];

    events.forEach(ev => {
      if (ev.status === 'cancelled') return;
      if (!ev.start || !ev.start.date || !ev.end || !ev.end.date) return;

      const lines = stripHtmlToLines(ev.description);
      if (lines.length < 2 || !lines[0] || !isValidPriceLine(lines[1])) return;

      const hotelName = (ev.summary || '未命名飯店').trim();
      const checkInStr = ev.start.date;
      const checkOutStr = ev.end.date;
      const checkInYear = parseInt(checkInStr.slice(0, 4), 10);
      const dIn = parseLocalDate(checkInStr);
      const dOut = parseLocalDate(checkOutStr);
      const nights = Math.max(0, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));

      rawBookings.push({
        hotelName,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        stayYear: checkInYear,
        stayMonth: parseInt(checkInStr.slice(5, 7), 10),
        nights,
        planInfo: parsePlanInfo(lines[0], checkInYear),
        priceInfo: parsePriceString(lines[1])
      });

      if (lines.length >= 4 && lines[2] && isValidPriceLine(lines[3])) {
        rawBookings.push({
          hotelName,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          stayYear: checkInYear,
          stayMonth: parseInt(checkInStr.slice(5, 7), 10),
          nights,
          planInfo: parsePlanInfo(lines[2], checkInYear),
          priceInfo: parsePriceString(lines[3])
        });
      }
    });

    rawBookings.sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut));

    const occupiedDatesByYear = {};
    const quotaUsedTracker = {};
    const hotelUsedTracker = {};

    state.allProcessedBookings = rawBookings.map(item => {
      const y = item.stayYear;
      if (!occupiedDatesByYear[y]) occupiedDatesByYear[y] = new Set();

      const qualifyingDates = [];
      const startD = parseLocalDate(item.checkIn);
      for (let i = 0; i < item.nights; i++) {
        const cur = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate() + i);
        const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        if (!occupiedDatesByYear[y].has(iso)) {
          occupiedDatesByYear[y].add(iso);
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
        qualifyingNights: qualifyingDates.length,
        qualifyingDates,
        employeeQuotaDisplay,
        hotelLimitDisplay,
        hotelLimitExceeded
      };
    });

    state.currentYearProcessed = state.allProcessedBookings.filter(b => b.stayYear === state.selectedYear);
  }

  // =========================================================================
  // 核心解析 2：【IHG活動】日曆（結轉初始值與房晚加倍活動）
  // =========================================================================
  function processActivityEvents(activityItems) {
    const manualRolloverByYear = {};
    const promoRules = [];

    (activityItems || []).forEach(ev => {
      if (!ev || !ev.start || !ev.start.date || !ev.end || !ev.end.date) return;

      const title = (ev.summary || '').trim();
      const desc = (ev.description || '').trim();
      const startDate = ev.start.date;
      const rawEndDate = ev.end.date;
      const exclusiveEndDate = rawEndDate > startDate ? rawEndDate : addDaysIso(startDate, 1);
      const displayEndDate = addDaysIso(exclusiveEndDate, -1);

      // 1. 檢查是否為【會員等級結轉】xx晚
      const rolloverMatch = title.match(ROLLOVER_TITLE_REGEX);
      if (rolloverMatch) {
        const year = parseInt(startDate.slice(0, 4), 10);
        const nights = Math.max(0, parseInt(rolloverMatch[1], 10) || 0);
        manualRolloverByYear[year] = {
          nights,
          title,
          date: startDate
        };
        return;
      }

      // 2. 檢查是否為【IHG 洲際優悅會定向活動：xx房晚加倍】（同時相容「加被」與「無上限」）
      let cap = null;
      const exactPromo = title.match(PROMO_TITLE_REGEX);
      if (exactPromo) {
        cap = parseInt(exactPromo[1], 10);
      } else if (PROMO_UNLIMITED_REGEX.test(title) || (/定向活動/i.test(title) && /無上限/.test(desc))) {
        cap = Infinity;
      } else {
        const fallbackPromo = title.match(PROMO_FALLBACK_REGEX);
        if (fallbackPromo) {
          cap = parseInt(fallbackPromo[1], 10);
        }
      }

      if (cap !== null && (cap === Infinity || cap > 0)) {
        const countsForMilestones = !/僅會籍|不計入進階|不算進階/.test(desc);
        promoRules.push({
          title,
          startDate,
          exclusiveEndDate,
          displayEndDate,
          cap,
          countsForMilestones,
          description: desc
        });
      }
    });

    promoRules.sort((a, b) => a.startDate.localeCompare(b.startDate));
    state.manualRolloverByYear = manualRolloverByYear;
    state.promoRules = promoRules;
  }

  // =========================================================================
  // 雙軌計算：會籍定級（含結轉＋加倍）vs 進階獎勵（不含結轉）
  // =========================================================================
  function getTierForNights(nights) {
    let current = MEMBERSHIP_TIERS[0];
    for (const tier of MEMBERSHIP_TIERS) {
      if (nights >= tier.minNights) current = tier;
    }
    const idx = MEMBERSHIP_TIERS.findIndex(t => t.id === current.id);
    const next = idx >= 0 && idx < MEMBERSHIP_TIERS.length - 1 ? MEMBERSHIP_TIERS[idx + 1] : null;
    return { current, next };
  }

  function getActualQualifyingNightsInYear(year) {
    return state.allProcessedBookings
      .filter(b => b.stayYear === year)
      .reduce((sum, b) => sum + b.qualifyingNights, 0);
  }

  function computeMembershipSummary(selectedYear) {
    const yearStart = `${selectedYear}-01-01`;
    const yearEndExclusive = `${selectedYear + 1}-01-01`;

    const yearNightEntries = [];
    state.allProcessedBookings
      .filter(b => b.stayYear === selectedYear)
      .forEach(b => {
        (b.qualifyingDates || []).forEach(iso => {
          yearNightEntries.push({ date: iso, hotelName: b.hotelName });
        });
      });
    yearNightEntries.sort((a, b) => a.date.localeCompare(b.date));

    const actualQualifyingNights = yearNightEntries.length;

    let rolloverNights = 0;
    let rolloverSource = 'none';
    let rolloverNote = '無結轉房晚';

    if (Object.prototype.hasOwnProperty.call(state.manualRolloverByYear, selectedYear)) {
      const manual = state.manualRolloverByYear[selectedYear];
      rolloverNights = manual.nights;
      rolloverSource = 'calendar';
      rolloverNote = `來自【IHG活動】日曆（${formatDateSlash(manual.date)}）`;
    } else {
      const prevYear = selectedYear - 1;
      const prevActual = getActualQualifyingNightsInYear(prevYear);
      if (prevActual >= 70) {
        rolloverNights = prevActual - 70;
        rolloverSource = 'auto';
        rolloverNote = `${prevYear} 年實住 ${prevActual} 晚（達鑽石，扣除 70 晚結轉）`;
      } else if (prevActual >= 40) {
        rolloverNights = prevActual - 40;
        rolloverSource = 'auto';
        rolloverNote = `${prevYear} 年實住 ${prevActual} 晚（達白金，扣除 40 晚結轉）`;
      } else if (prevActual >= 20) {
        rolloverNights = prevActual - 20;
        rolloverSource = 'auto';
        rolloverNote = `${prevYear} 年實住 ${prevActual} 晚（達金卡，扣除 20 晚結轉）`;
      }
    }

    let statusBonusNights = 0;
    let milestoneBonusNights = 0;
    const yearPromos = [];

    state.promoRules.forEach(rule => {
      const overlapsYear = rule.startDate < yearEndExclusive && rule.exclusiveEndDate > yearStart;
      if (!overlapsYear) return;

      const matchedEntries = [];
      for (const entry of yearNightEntries) {
        if (entry.date >= rule.startDate && entry.date < rule.exclusiveEndDate) {
          if (rule.cap === Infinity || matchedEntries.length < rule.cap) {
            matchedEntries.push(entry);
          }
        }
      }

      const earnedNights = matchedEntries.length;
      const remainingCap = rule.cap === Infinity ? Infinity : Math.max(0, rule.cap - earnedNights);

      statusBonusNights += earnedNights;
      if (rule.countsForMilestones) {
        milestoneBonusNights += earnedNights;
      }

      yearPromos.push({
        ...rule,
        earnedNights,
        remainingCap,
        matchedEntries
      });
    });

    const totalStatusNights = actualQualifyingNights + statusBonusNights + rolloverNights;
    const totalMilestoneNights = actualQualifyingNights + milestoneBonusNights;

    const { current: currentTier, next: nextTier } = getTierForNights(totalStatusNights);
    const toPlatinum = Math.max(0, 40 - totalStatusNights);
    const toDiamond = Math.max(0, 70 - totalStatusNights);
    const toLounge = Math.max(0, 40 - totalMilestoneNights);

    const unlockedMilestones = MILESTONE_REWARDS.filter(m => totalMilestoneNights >= m.nights);
    const nextMilestone = MILESTONE_REWARDS.find(m => totalMilestoneNights < m.nights) || null;

    return {
      selectedYear,
      activityCalendarFound: state.activityCalendarFound,
      actualQualifyingNights,
      rolloverNights,
      rolloverSource,
      rolloverNote,
      statusBonusNights,
      milestoneBonusNights,
      totalStatusNights,
      totalMilestoneNights,
      currentTier,
      nextTier,
      toPlatinum,
      toDiamond,
      toLounge,
      unlockedMilestonesCount: unlockedMilestones.length,
      nextMilestone,
      promos: yearPromos
    };
  }

  function triggerPageRender() {
    state.currentYearProcessed = state.allProcessedBookings.filter(b => b.stayYear === state.selectedYear);
    const membership = computeMembershipSummary(state.selectedYear);
    if (typeof state.onRender === 'function') {
      state.onRender({
        selectedYear: state.selectedYear,
        allBookings: state.allProcessedBookings,
        yearBookings: state.currentYearProcessed,
        membership
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

      setStatus('loading', '讀取即時匯率...');
      await loadExchangeRates(false, 3500);
      await fetchCalendarData(false);
    } catch (err) {
      console.error('初始化失敗:', err);
      setStatus('error', `初始化錯誤：${err.message || err}`);
    }
  }

  global.addEventListener('error', (e) => {
    const badge = document.getElementById('statusBadge');
    if (badge && badge.textContent.includes('初始化中')) {
      setStatus('error', `程式錯誤：${e.message || '請開啟 F12 檢視'}`);
    }
  });

  global.IHGApp = {
    HOTEL_ANNUAL_CAP,
    EMPLOYEE_PLANS,
    MEMBERSHIP_TIERS,
    MILESTONE_REWARDS,
    escapeHtml,
    formatDateSlash,
    getPlanStyle,
    detectHotelBrand,
    buildBrandLogoHtml,
    computeMembershipSummary,

    init({ activePage, onRender }) {
      state.activePage = activePage || 'index';
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

    async refresh() {
      setStatus('loading', '重新同步匯率與資料...');
      await loadExchangeRates(true, 3500);
      await fetchCalendarData(true);
    },

    getState() {
      return {
        selectedYear: state.selectedYear,
        allBookings: state.allProcessedBookings,
        yearBookings: state.currentYearProcessed,
        membership: computeMembershipSummary(state.selectedYear)
      };
    }
  };
})(window);

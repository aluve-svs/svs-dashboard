/**
 * ============================================================
 * SCRIPT.JS — SVS Manager Dashboard
 * ============================================================
 * Halaman yang sudah aktif: OVERVIEW.
 * 3 halaman lain (Project Explorer, Performa Sales, Log Aktivitas)
 * masih placeholder — dibangun di tahap berikutnya.
 * ============================================================ */

/* ============================================================
   1. STATE
   ============================================================ */
const State = {
  currentTab: 'overview',
  filters: { date_from: '', date_to: '', sales_code: '', pipeline_stage: '' },
  trendGranularity: 'daily',
  overviewData: null,
  charts: {}, // menyimpan instance Chart.js supaya bisa di-destroy sebelum render ulang
  logOffset: 0,
  logLimit: 25,
  logTotalCount: 0
};

/* ============================================================
   2. API
   ============================================================ */
const Api = {
  async call(action, payload) {
    const body = Object.assign({ action }, payload || {});
    try {
      const res = await fetch(MGR_CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Gagal terhubung ke server. Cek koneksi internet.' };
    }
  }
};

/* ============================================================
   2b. LOADING INDICATOR — animasi titik pada teks loading
   ("Memuat data" -> "Memuat data." -> ".." -> "...")
   ============================================================ */
const LoadingIndicator = {
  intervals: {},
  start(elId) {
    const el = document.querySelector('#' + elId + ' .loading-container-text');
    if (!el) return;
    const base = el.dataset.baseText || el.textContent;
    let dots = 0;
    this.stop(elId);
    this.intervals[elId] = setInterval(() => {
      dots = (dots + 1) % 4;
      el.textContent = base + '.'.repeat(dots);
    }, 400);
  },
  stop(elId) {
    if (this.intervals[elId]) {
      clearInterval(this.intervals[elId]);
      delete this.intervals[elId];
    }
  }
};

/* ============================================================
   3. SNACKBAR
   ============================================================ */
const Snackbar = {
  el: null,
  timer: null,
  init() { this.el = document.getElementById('snackbar'); },
  show(message, type) {
    if (!this.el) return;
    this.el.textContent = message;
    this.el.className = 'snackbar show snackbar-' + (type || 'info');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.remove('show'), 3000);
  }
};

/* ============================================================
   4. THEME TOGGLE
   ============================================================ */
const ThemeToggle = {
  STORAGE_KEY: 'mgr_theme',
  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    this.updateIcon();
    document.getElementById('btn-theme-toggle').addEventListener('click', () => this.toggle());
  },
  toggle() {
    const next = this.isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(this.STORAGE_KEY, next);
    this.updateIcon();
    // Grafik Chart.js perlu digambar ulang supaya warna teks/grid ikut tema baru
    OverviewPage.renderAllCharts();
  },
  isDark() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr) return attr === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  updateIcon() {
    document.getElementById('btn-theme-toggle').classList.toggle('is-dark', this.isDark());
  }
};

/* ============================================================
   5. UTILS
   ============================================================ */
const Utils = {
  formatCurrency(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
  },
  formatShortDate(dateValue) {
    if (!dateValue) return '-';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '-';
    const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return d.getDate() + ' ' + bulan[d.getMonth()];
  },
  /** Warna grafik konsisten dengan token desain (biru/hijau/kuning/merah + variasi) */
  chartPalette: ['#1E3A8A', '#16A34A', '#F59E0B', '#DC2626', '#0EA5E9', '#8B5CF6', '#EC4899', '#64748B'],
  chartTextColor() {
    return ThemeToggle.isDark() ? '#9CA3AF' : '#6B7280';
  },
  chartGridColor() {
    return ThemeToggle.isDark() ? '#2E3036' : '#E5E7EB';
  }
};

/* ============================================================
   6. TAB NAVIGATION
   ============================================================ */
const TabNav = {
  init() {
    document.querySelectorAll('.mgr-tab').forEach((tab) => {
      tab.addEventListener('click', () => this.goTo(tab.dataset.tab));
    });
  },
  goTo(tabName) {
    State.currentTab = tabName;
    document.querySelectorAll('.mgr-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));
    document.querySelectorAll('.mgr-tab-content').forEach((c) => c.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');

    if (tabName === 'overview' && !State.overviewData) {
      OverviewPage.load();
    }
    if (tabName === 'explorer' && !State.explorerLoaded) {
      ExplorerPage.load();
    }
    if (tabName === 'performance' && !State.performanceLoaded) {
      PerformancePage.load();
    }
    if (tabName === 'log' && !State.logLoaded) {
      LogPage.load();
    }
  }
};

/* ============================================================
   7. FILTER BAR
   ============================================================ */
const FilterBar = {
  async init() {
    await this.loadSalesOptions();
    await this.loadStageOptions();

    document.getElementById('btn-apply-filter').addEventListener('click', () => {
      State.filters.date_from = document.getElementById('filter-date-from').value;
      State.filters.date_to = document.getElementById('filter-date-to').value;
      State.filters.sales_code = document.getElementById('filter-sales').value;
      State.filters.pipeline_stage = document.getElementById('filter-stage').value;
      OverviewPage.load();
    });

    document.getElementById('btn-reset-filter').addEventListener('click', () => {
      document.getElementById('filter-date-from').value = '';
      document.getElementById('filter-date-to').value = '';
      document.getElementById('filter-sales').value = '';
      document.getElementById('filter-stage').value = '';
      State.filters = { date_from: '', date_to: '', sales_code: '', pipeline_stage: '' };
      OverviewPage.load();
    });
  },

  async loadSalesOptions() {
    const result = await Api.call('readSalesList', {});
    const select = document.getElementById('filter-sales');
    State.salesNameByCode = {};
    if (result.success && result.data) {
      result.data.forEach((s) => {
        State.salesNameByCode[s.sales_code] = s.sales_name;
        const opt = document.createElement('option');
        opt.value = s.sales_code;
        opt.textContent = s.sales_name;
        select.appendChild(opt);
      });
    }
  },

  /**
   * Diambil dari sheet Lookup yang SAMA dipakai app Sales (action
   * readLookupOptions) — supaya kalau Anda tambah/ubah pipeline stage
   * lewat Google Sheets, filter di sini otomatis ikut ter-update tanpa
   * perlu edit kode. Daftar ini juga dipakai ulang oleh grafik Funnel
   * Pipeline supaya SEMUA stage tampil walau belum ada datanya (0).
   */
  async loadStageOptions() {
    const result = await Api.call('readLookupOptions', {});
    const stages = (result.success && result.data && result.data.Pipeline_Stage) || [];
    State.lookupStages = stages;

    const select = document.getElementById('filter-stage');
    stages.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
    });
  }
};

/* ============================================================
   8. HALAMAN OVERVIEW
   ============================================================ */
const OverviewPage = {
  async load() {
    document.getElementById('overview-loading').hidden = false;
    LoadingIndicator.start('overview-loading');
    document.getElementById('overview-content').hidden = true;

    const payload = {};
    if (State.filters.date_from) payload.date_from = State.filters.date_from;
    if (State.filters.date_to) payload.date_to = State.filters.date_to;
    if (State.filters.sales_code) payload.sales_code = State.filters.sales_code;
    if (State.filters.pipeline_stage) payload.pipeline_stage = State.filters.pipeline_stage;

    const result = await Api.call('readManagerOverview', payload);

    document.getElementById('overview-loading').hidden = true;
    LoadingIndicator.stop('overview-loading');

    if (!result.success) {
      Snackbar.show(result.message || 'Gagal memuat data overview', 'error');
      return;
    }

    State.overviewData = result.data;
    document.getElementById('overview-content').hidden = false;

    this.renderKpi(result.data.kpi);
    this.renderWidgets(result.data);
    await this.loadTrend();
    this.renderAllCharts();
  },

  renderKpi(kpi) {
    document.getElementById('kpi-total-projects').textContent = kpi.total_projects;
    document.getElementById('kpi-pipeline-value').textContent = Utils.formatCurrency(kpi.total_pipeline_value);
    document.getElementById('kpi-won-value').textContent = Utils.formatCurrency(kpi.won_value);
    document.getElementById('kpi-win-rate').textContent = kpi.win_rate_percent + '%';
    document.getElementById('kpi-total-activities').textContent = kpi.total_activities_period;
  },

  renderWidgets(data) {
    const staleEl = document.getElementById('widget-stale-list');
    staleEl.innerHTML = data.stale_projects.length === 0
      ? '<p class="empty-state">Tidak ada project yang butuh perhatian.</p>'
      : data.stale_projects.map((p) =>
          '<div class="widget-item"><div class="widget-item-title">' + p.project_name + '</div>' +
          '<div class="widget-item-sub">' + p.sales_name + ' · Tidak ada aktivitas ' + p.days_since_activity + ' hari</div></div>'
        ).join('');

    const followupEl = document.getElementById('widget-followup-list');
    followupEl.innerHTML = data.followups_today.length === 0
      ? '<p class="empty-state">Tidak ada follow up jatuh tempo hari ini.</p>'
      : data.followups_today.map((f) =>
          '<div class="widget-item"><div class="widget-item-title">' + f.project_name + '</div>' +
          '<div class="widget-item-sub">' + f.sales_name + '</div></div>'
        ).join('');

    const recentEl = document.getElementById('widget-recent-list');
    recentEl.innerHTML = data.recent_activities.length === 0
      ? '<p class="empty-state">Belum ada aktivitas.</p>'
      : data.recent_activities.map((a) =>
          '<div class="widget-item"><div class="widget-item-title">' + a.project_name + ' — ' + a.activity_type + '</div>' +
          '<div class="widget-item-sub">' + a.sales_name + ' · ' + Utils.formatShortDate(a.timestamp) + '</div></div>'
        ).join('');
  },

  async loadTrend() {
    const payload = { granularity: State.trendGranularity };
    if (State.filters.sales_code) payload.sales_code = State.filters.sales_code;
    const result = await Api.call('readTrendData', payload);
    State.trendData = (result.success && result.data) ? result.data : [];
  },

  renderAllCharts() {
    if (!State.overviewData) return;
    this.renderFunnelChart(State.overviewData.funnel);
    this.renderStatusPie(State.overviewData.status_breakdown);
    this.renderTrendChart(State.trendData || []);
    this.renderSalesRankingChart(State.overviewData.sales_ranking);
    this.renderLostReasonsPie(State.overviewData.lost_reasons);
  },

  destroyChart(key) {
    if (State.charts[key]) { State.charts[key].destroy(); delete State.charts[key]; }
  },

  renderFunnelChart(funnel) {
    this.destroyChart('funnel');

    // Pakai daftar stage dari sheet Lookup (State.lookupStages) sebagai
    // dasar — supaya SEMUA stage tampil di funnel walau belum ada satu
    // project pun di stage itu (nilainya 0), bukan cuma stage yang
    // kebetulan sudah punya data.
    const baseStages = (State.lookupStages && State.lookupStages.length > 0)
      ? State.lookupStages.slice()
      : ['New Visit', 'Qualified', 'Quotation Sent', 'Negotiation', 'Won', 'Lost'];

    // Tambahkan juga stage yang ADA di data tapi entah kenapa tidak ada
    // di daftar Lookup (jaga-jaga data lama/tidak sinkron)
    Object.keys(funnel).forEach((s) => {
      if (!baseStages.includes(s)) baseStages.push(s);
    });

    const labels = baseStages;
    const values = baseStages.map((s) => funnel[s] || 0);

    const ctx = document.getElementById('chart-funnel').getContext('2d');
    State.charts.funnel = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: Utils.chartPalette[0], borderRadius: 6 }] },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: Utils.chartTextColor(), stepSize: 1 }, grid: { color: Utils.chartGridColor() } },
          y: { ticks: { color: Utils.chartTextColor() }, grid: { display: false } }
        }
      }
    });
  },

  renderStatusPie(status) {
    this.destroyChart('statusPie');
    const ctx = document.getElementById('chart-status-pie').getContext('2d');
    State.charts.statusPie = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Won', 'Lost', 'Masih Berjalan'],
        datasets: [{ data: [status.won, status.lost, status.ongoing], backgroundColor: [Utils.chartPalette[1], Utils.chartPalette[3], Utils.chartPalette[0]] }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { color: Utils.chartTextColor() } } } }
    });
  },

  renderTrendChart(trend) {
    this.destroyChart('trend');
    const ctx = document.getElementById('chart-trend').getContext('2d');
    State.charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.map((t) => t.label),
        datasets: [
          { label: 'Visit', data: trend.map((t) => t.visit_count), borderColor: Utils.chartPalette[0], tension: 0.3 },
          { label: 'Won', data: trend.map((t) => t.won_count), borderColor: Utils.chartPalette[1], tension: 0.3 },
          { label: 'Lost', data: trend.map((t) => t.lost_count), borderColor: Utils.chartPalette[3], tension: 0.3 }
        ]
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { color: Utils.chartTextColor() } } },
        scales: {
          x: { ticks: { color: Utils.chartTextColor() }, grid: { color: Utils.chartGridColor() } },
          y: { ticks: { color: Utils.chartTextColor() }, grid: { color: Utils.chartGridColor() }, beginAtZero: true }
        }
      }
    });
  },

  renderSalesRankingChart(ranking) {
    this.destroyChart('salesRanking');
    const ctx = document.getElementById('chart-sales-ranking').getContext('2d');
    State.charts.salesRanking = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ranking.map((r) => r.sales_name),
        datasets: [{ data: ranking.map((r) => r.total_activities), backgroundColor: Utils.chartPalette[2], borderRadius: 6 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: Utils.chartTextColor() }, grid: { display: false } },
          y: { ticks: { color: Utils.chartTextColor() }, grid: { color: Utils.chartGridColor() } }
        }
      }
    });
  },

  renderLostReasonsPie(reasons) {
    this.destroyChart('lostReasons');
    const ctx = document.getElementById('chart-lost-reasons').getContext('2d');
    const labels = Object.keys(reasons);
    State.charts.lostReasons = new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ data: labels.map((l) => reasons[l]), backgroundColor: Utils.chartPalette }] },
      options: { plugins: { legend: { position: 'bottom', labels: { color: Utils.chartTextColor() } } } }
    });
  },

  initGranularityToggle() {
    document.getElementById('trend-granularity-chips').addEventListener('click', async (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#trend-granularity-chips .chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      State.trendGranularity = chip.dataset.granularity;
      await this.loadTrend();
      this.renderTrendChart(State.trendData || []);
    });
  }
};

/* ============================================================
   9. EXPORT
   ============================================================ */
/* ============================================================
   9. HALAMAN PROJECT EXPLORER
   ============================================================ */
const ExplorerPage = {
  async init() {
    document.getElementById('btn-explorer-search').addEventListener('click', () => this.load());
    document.getElementById('explorer-search').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.load();
    });
  },

  async load() {
    document.getElementById('explorer-loading').hidden = false;
    LoadingIndicator.start('explorer-loading');
    document.getElementById('explorer-table-wrap').hidden = true;

    const keyword = document.getElementById('explorer-search').value.trim();
    let result;

    if (keyword) {
      result = await Api.call('searchProject', { keyword });
    } else {
      const payload = {};
      if (State.filters.date_from) payload.date_from = State.filters.date_from;
      if (State.filters.date_to) payload.date_to = State.filters.date_to;
      if (State.filters.sales_code) payload.sales_code = State.filters.sales_code;
      if (State.filters.pipeline_stage) payload.pipeline_stage = State.filters.pipeline_stage;
      result = await Api.call('filterProject', payload);
    }

    document.getElementById('explorer-loading').hidden = true;
    LoadingIndicator.stop('explorer-loading');
    document.getElementById('explorer-table-wrap').hidden = false;
    State.explorerLoaded = true;

    if (!result.success) {
      Snackbar.show(result.message || 'Gagal memuat daftar project', 'error');
      return;
    }

    this.render(result.data || []);
  },

  render(projects) {
    const tbody = document.getElementById('explorer-table-body');
    const emptyEl = document.getElementById('explorer-empty');

    if (projects.length === 0) {
      tbody.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    projects.sort((a, b) => new Date(b.Date_Last_Activity) - new Date(a.Date_Last_Activity));

    tbody.innerHTML = projects.map((p) => {
      const valueText = p.Estimated_Value ? Utils.formatCurrency(p.Estimated_Value) : '-';
      const salesName = (State.salesNameByCode && State.salesNameByCode[p.Sales_Code]) || p.Sales_Code;
      return '<tr data-project-id="' + p.Project_ID + '" data-project-name="' + p.Project_Name + '" data-project-stage="' + p.Pipeline_Stage + '" data-project-value="' + valueText + '" data-project-address="' + (p.Location_Address || '-') + '">' +
        '<td>' + p.Project_Name + '</td>' +
        '<td>' + salesName + '</td>' +
        '<td>' + p.Pipeline_Stage + '</td>' +
        '<td>' + valueText + '</td>' +
        '<td>' + (p.Location_Address || '-') + '</td>' +
        '<td>' + Utils.formatShortDate(p.Date_Last_Activity) + '</td>' +
        '</tr>';
    }).join('');

    tbody.querySelectorAll('tr').forEach((row) => {
      row.addEventListener('click', () => {
        DetailModal.open(
          row.dataset.projectId,
          row.dataset.projectName,
          row.dataset.projectStage,
          row.dataset.projectValue,
          row.dataset.projectAddress
        );
      });
    });
  }
};

/* ============================================================
   10. MODAL DETAIL PROJECT (dipakai dari Project Explorer)
   ============================================================ */
const DetailModal = {
  init() {
    document.getElementById('btn-close-detail').addEventListener('click', () => this.close());
    document.getElementById('project-detail-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'project-detail-overlay') this.close();
    });
    document.getElementById('btn-close-lightbox').addEventListener('click', () => Lightbox.close());
    document.getElementById('photo-lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'photo-lightbox') Lightbox.close();
    });
  },

  async open(projectId, projectName, stage, valueText, address) {
    document.getElementById('detail-project-name').textContent = projectName;
    document.getElementById('detail-project-stage').textContent = stage;
    document.getElementById('detail-project-value').textContent = valueText;
    document.getElementById('detail-project-address').textContent = address;
    document.getElementById('detail-contacts').innerHTML = '<p class="empty-state">Memuat kontak...</p>';
    document.getElementById('detail-photo-grid').innerHTML = '';
    document.getElementById('detail-timeline').innerHTML = '<p class="loading-text">Memuat riwayat...</p>';

    document.getElementById('project-detail-overlay').hidden = false;

    const [contactsResult, timelineResult] = await Promise.all([
      Api.call('readProjectContacts', { project_id: projectId }),
      Api.call('readActivityTimeline', { project_id: projectId })
    ]);

    this.renderContacts(contactsResult.success ? contactsResult.data : []);
    this.renderTimelineAndPhotos(timelineResult.success ? timelineResult.data : []);
  },

  close() {
    document.getElementById('project-detail-overlay').hidden = true;
  },

  renderContacts(contacts) {
    const el = document.getElementById('detail-contacts');
    if (!contacts || contacts.length === 0) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = contacts.map((c) => {
      const digits = String(c.Phone_Number).replace(/\D/g, '');
      const waNumber = digits.startsWith('0') ? '62' + digits.slice(1) : digits;
      return '<div class="contact-item">' +
        '<div class="contact-name-row">' + c.Contact_Name + ' (' + c.Role + ')</div>' +
        '<a href="tel:' + digits + '" class="contact-link">Telpon</a>' +
        '<a href="https://wa.me/' + waNumber + '" target="_blank" rel="noopener" class="contact-link">WhatsApp</a>' +
        '</div>';
    }).join('');
  },

  renderTimelineAndPhotos(activities) {
    const timelineEl = document.getElementById('detail-timeline');
    const photoGridEl = document.getElementById('detail-photo-grid');

    if (!activities || activities.length === 0) {
      timelineEl.innerHTML = '<p class="empty-state">Belum ada aktivitas.</p>';
      photoGridEl.innerHTML = '';
      return;
    }

    const allPhotos = [];
    activities.forEach((a) => {
      if (a.photos) a.photos.forEach((p) => allPhotos.push(p.url));
    });
    photoGridEl.innerHTML = allPhotos.length === 0
      ? '<p class="empty-state">Belum ada foto.</p>'
      : allPhotos.map((url) => '<img src="' + url + '" alt="Foto project" loading="lazy" data-full="' + url + '" />').join('');

    photoGridEl.querySelectorAll('img').forEach((img) => {
      img.addEventListener('click', () => Lightbox.open(img.dataset.full));
    });

    timelineEl.innerHTML = activities.map((a) =>
      '<div class="timeline-item">' +
      '<p class="timeline-date">' + Utils.formatShortDate(a.Timestamp) + ' · ' + a.Activity_Type + '</p>' +
      '<p class="timeline-note">' + a.Activity_Note + '</p>' +
      '</div>'
    ).join('');
  }
};

/* ============================================================
   11. LIGHTBOX FOTO — klik thumbnail untuk perbesar
   ============================================================ */
const Lightbox = {
  open(url) {
    document.getElementById('lightbox-image').src = url;
    document.getElementById('photo-lightbox').hidden = false;
  },
  close() {
    document.getElementById('photo-lightbox').hidden = true;
  }
};

/* ============================================================
   12. HALAMAN PERFORMA SALES
   ============================================================ */
const PerformancePage = {
  async load() {
    document.getElementById('performance-loading').hidden = false;
    LoadingIndicator.start('performance-loading');
    document.getElementById('performance-content').hidden = true;

    const payload = {};
    if (State.filters.date_from) payload.date_from = State.filters.date_from;
    if (State.filters.date_to) payload.date_to = State.filters.date_to;

    const result = await Api.call('readSalesPerformance', payload);

    document.getElementById('performance-loading').hidden = true;
    LoadingIndicator.stop('performance-loading');
    document.getElementById('performance-content').hidden = false;
    State.performanceLoaded = true;

    if (!result.success) {
      Snackbar.show(result.message || 'Gagal memuat data performa sales', 'error');
      return;
    }

    this.render(result.data || []);
  },

  render(performance) {
    const tbody = document.getElementById('performance-table-body');
    if (performance.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><p class="empty-state">Belum ada data aktivitas.</p></td></tr>';
      return;
    }

    tbody.innerHTML = performance.map((p) =>
      '<tr data-sales-code="' + p.sales_code + '" data-sales-name="' + p.sales_name + '">' +
      '<td><strong>' + p.sales_name + '</strong></td>' +
      '<td>' + p.total_activities + '</td>' +
      '<td>' + p.visit_count + '</td>' +
      '<td>' + p.won_count + '</td>' +
      '<td>' + p.lost_count + '</td>' +
      '<td>' + Utils.formatCurrency(p.won_value) + '</td>' +
      '<td>' + p.active_projects_count + '</td>' +
      '</tr>'
    ).join('');

    tbody.querySelectorAll('tr').forEach((row) => {
      row.addEventListener('click', () => {
        this.loadDetail(row.dataset.salesCode, row.dataset.salesName);
      });
    });
  },

  async loadDetail(salesCode, salesName) {
    document.getElementById('performance-detail').hidden = false;
    document.getElementById('performance-detail-title').textContent = 'Detail — ' + salesName;
    document.getElementById('performance-detail-kpi').innerHTML = '<p class="loading-text">Memuat...</p>';

    const overviewPayload = { sales_code: salesCode };
    if (State.filters.date_from) overviewPayload.date_from = State.filters.date_from;
    if (State.filters.date_to) overviewPayload.date_to = State.filters.date_to;

    const [overviewResult, trendResult] = await Promise.all([
      Api.call('readManagerOverview', overviewPayload),
      Api.call('readTrendData', { granularity: State.trendGranularity, sales_code: salesCode })
    ]);

    if (overviewResult.success) {
      const kpi = overviewResult.data.kpi;
      document.getElementById('performance-detail-kpi').innerHTML =
        '<div class="kpi-card glow-primary"><span class="kpi-label">Total Project</span><span class="kpi-value">' + kpi.total_projects + '</span></div>' +
        '<div class="kpi-card glow-success"><span class="kpi-label">Nilai Pipeline</span><span class="kpi-value">' + Utils.formatCurrency(kpi.total_pipeline_value) + '</span></div>' +
        '<div class="kpi-card glow-warning"><span class="kpi-label">Win Rate</span><span class="kpi-value">' + kpi.win_rate_percent + '%</span></div>' +
        '<div class="kpi-card glow-danger"><span class="kpi-label">Total Aktivitas</span><span class="kpi-value">' + kpi.total_activities_period + '</span></div>';
    }

    if (trendResult.success) {
      this.renderTrendChart(trendResult.data || []);
    }

    document.getElementById('performance-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  renderTrendChart(trend) {
    if (State.charts.performanceTrend) { State.charts.performanceTrend.destroy(); }
    const ctx = document.getElementById('chart-performance-trend').getContext('2d');
    State.charts.performanceTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.map((t) => t.label),
        datasets: [
          { label: 'Visit', data: trend.map((t) => t.visit_count), borderColor: Utils.chartPalette[0], tension: 0.3 },
          { label: 'Won', data: trend.map((t) => t.won_count), borderColor: Utils.chartPalette[1], tension: 0.3 },
          { label: 'Lost', data: trend.map((t) => t.lost_count), borderColor: Utils.chartPalette[3], tension: 0.3 }
        ]
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { color: Utils.chartTextColor() } } },
        scales: {
          x: { ticks: { color: Utils.chartTextColor() }, grid: { color: Utils.chartGridColor() } },
          y: { ticks: { color: Utils.chartTextColor() }, grid: { color: Utils.chartGridColor() }, beginAtZero: true }
        }
      }
    });
  }
};

/* ============================================================
   13. HALAMAN LOG AKTIVITAS
   ============================================================ */
const LogPage = {
  init() {
    document.getElementById('btn-log-filter').addEventListener('click', () => {
      State.logOffset = 0;
      this.load();
    });
    document.getElementById('btn-log-prev').addEventListener('click', () => {
      if (State.logOffset - State.logLimit >= 0) {
        State.logOffset -= State.logLimit;
        this.load();
      }
    });
    document.getElementById('btn-log-next').addEventListener('click', () => {
      if (State.logOffset + State.logLimit < State.logTotalCount) {
        State.logOffset += State.logLimit;
        this.load();
      }
    });
  },

  async load() {
    document.getElementById('log-loading').hidden = false;
    LoadingIndicator.start('log-loading');
    document.getElementById('log-table-wrap').hidden = true;

    const payload = {
      limit: State.logLimit,
      offset: State.logOffset
    };
    if (State.filters.date_from) payload.date_from = State.filters.date_from;
    if (State.filters.date_to) payload.date_to = State.filters.date_to;
    if (State.filters.sales_code) payload.sales_code = State.filters.sales_code;
    const activityType = document.getElementById('log-activity-type').value;
    if (activityType) payload.activity_type = activityType;

    const result = await Api.call('readActivityLog', payload);

    document.getElementById('log-loading').hidden = true;
    LoadingIndicator.stop('log-loading');
    document.getElementById('log-table-wrap').hidden = false;
    State.logLoaded = true;

    if (!result.success) {
      Snackbar.show(result.message || 'Gagal memuat log aktivitas', 'error');
      return;
    }

    State.logTotalCount = result.data.total_count;
    this.render(result.data.activities || []);
    this.renderPagination();
  },

  render(activities) {
    const tbody = document.getElementById('log-table-body');
    const emptyEl = document.getElementById('log-empty');

    if (activities.length === 0) {
      tbody.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    tbody.innerHTML = activities.map((a) =>
      '<tr>' +
      '<td>' + Utils.formatShortDate(a.timestamp) + '</td>' +
      '<td>' + a.project_name + '</td>' +
      '<td>' + a.sales_name + '</td>' +
      '<td>' + a.activity_type + '</td>' +
      '<td>' + (a.note || '-') + '</td>' +
      '<td>' + (a.pipeline_stage || '-') + '</td>' +
      '</tr>'
    ).join('');
  },

  renderPagination() {
    const start = State.logTotalCount === 0 ? 0 : State.logOffset + 1;
    const end = Math.min(State.logOffset + State.logLimit, State.logTotalCount);
    document.getElementById('log-page-info').textContent = start + '–' + end + ' dari ' + State.logTotalCount;
    document.getElementById('btn-log-prev').disabled = State.logOffset === 0;
    document.getElementById('btn-log-next').disabled = (State.logOffset + State.logLimit) >= State.logTotalCount;
  }
};

const ExportManager = {
  init() {
    document.getElementById('btn-export-excel').addEventListener('click', () => this.exportExcel());
    document.getElementById('btn-print-pdf').addEventListener('click', () => window.print());
  },

  exportExcel() {
    if (!State.overviewData) {
      Snackbar.show('Data belum dimuat, coba lagi sebentar', 'error');
      return;
    }
    const d = State.overviewData;
    const wb = XLSX.utils.book_new();

    const kpiSheet = XLSX.utils.aoa_to_sheet([
      ['Ringkasan KPI'],
      ['Total Project', d.kpi.total_projects],
      ['Nilai Pipeline Aktif', d.kpi.total_pipeline_value],
      ['Nilai Deal Won', d.kpi.won_value],
      ['Win Rate (%)', d.kpi.win_rate_percent],
      ['Total Aktivitas (Periode)', d.kpi.total_activities_period]
    ]);
    XLSX.utils.book_append_sheet(wb, kpiSheet, 'Ringkasan');

    const rankingRows = [['Sales', 'Total Aktivitas', 'Visit', 'Won', 'Lost', 'Nilai Won']];
    d.sales_ranking.forEach((r) => rankingRows.push([r.sales_name, r.total_activities, r.visit_count, r.won_count, r.lost_count, r.won_value]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rankingRows), 'Ranking Sales');

    const activityRows = [['Project', 'Sales', 'Jenis Aktivitas', 'Catatan', 'Tanggal']];
    d.recent_activities.forEach((a) => activityRows.push([a.project_name, a.sales_name, a.activity_type, a.note, a.timestamp]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(activityRows), 'Aktivitas Terbaru');

    XLSX.writeFile(wb, 'SVS_Manager_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }
};

/* ============================================================
   10. INIT
   ============================================================ */
function initApp() {
  Snackbar.init();
  ThemeToggle.init();
  TabNav.init();
  ExportManager.init();
  OverviewPage.initGranularityToggle();
  ExplorerPage.init();
  DetailModal.init();
  LogPage.init();

  document.getElementById('header-subtitle').textContent =
    'Halo, ' + MGR_CONFIG.MANAGER_NAME + ' — data real-time dari seluruh tim sales';

  const headerLogo = document.getElementById('header-logo');
  headerLogo.addEventListener('error', () => { headerLogo.style.display = 'none'; });

  FilterBar.init().then(() => {
    OverviewPage.load();
  });
}

document.addEventListener('DOMContentLoaded', initApp);

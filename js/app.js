/* ========== State ========== */
let currentTab = 'overview';
let currentSort = { key: null, asc: true };
let searchQuery = '';
let charts = {};

/* ========== DOM refs ========== */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const dom = {
  themeToggle: $('#themeToggle'),
  navItems: $$('.nav-item'),
  tabs: $$('.tab-content'),
  pageTitle: $('#pageTitle'),
  pageSubtitle: $('#pageSubtitle'),
  filterMarketplace: $('#filterMarketplace'),
  filterCategory: $('#filterCategory'),
  filterDateFrom: $('#filterDateFrom'),
  filterDateTo: $('#filterDateTo'),
  filterReset: $('#filterReset'),
  tableHead: $('#tableHead'),
  tableBody: $('#tableBody'),
  tableSearch: $('#tableSearch'),
  tableInfo: $('#tableInfo'),
  mTotal: $('#mTotal'),
  mTotalChange: $('#mTotalChange'),
  mAvgPrice: $('#mAvgPrice'),
  mAvgPriceChange: $('#mAvgPriceChange'),
  mMinPrice: $('#mMinPrice'),
  mMinPriceChange: $('#mMinPriceChange'),
  mRating: $('#mRating'),
  mRatingChange: $('#mRatingChange'),
};

const pageMeta = {
  overview: { title: 'Обзор', sub: 'Сводная статистика по всем товарам и маркетплейсам' },
  products: { title: 'Товары', sub: 'Детальный каталог с поиском и сортировкой' },
  analytics: { title: 'Аналитика', sub: 'Сравнение цен и анализ данных' },
};

/* ========== Theme ========== */
function initTheme() {
  const saved = localStorage.getItem('marketpulse-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  dom.themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('marketpulse-theme', next);
  dom.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  updateChartTheme();
}

function updateChartTheme() {
  if (typeof Chart === 'undefined') return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const color = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? '#334155' : '#e2e8f0';
  try { Chart.defaults.color = color; } catch (e) {}
  Object.values(charts).forEach(chart => {
    if (chart) {
      try {
        chart.options.plugins.legend.labels.color = color;
        if (chart.options.scales) {
          Object.values(chart.options.scales).forEach(scale => {
            if (scale) {
              scale.ticks.color = color;
              scale.grid.color = grid;
            }
          });
        }
        chart.update();
      } catch (e) {}
    }
  });
}

/* ========== Tabs ========== */
function switchTab(tab) {
  currentTab = tab;
  dom.navItems.forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  dom.tabs.forEach(el => el.classList.toggle('active', el.id === `tab-${tab}`));
  const meta = pageMeta[tab];
  dom.pageTitle.textContent = meta.title;
  dom.pageSubtitle.textContent = meta.sub;

  setTimeout(() => {
    Object.values(charts).forEach(chart => {
      if (chart && chart.options.animation) {
        chart.update();
      }
    });
  }, 50);
}

/* ========== Filters ========== */
function getFilters() {
  return {
    marketplace: dom.filterMarketplace.value,
    category: dom.filterCategory.value,
    dateFrom: dom.filterDateFrom.value,
    dateTo: dom.filterDateTo.value,
  };
}

function filterProducts(prods) {
  const f = getFilters();

  let result = [...prods];

  if (f.category !== 'all') {
    result = result.filter(p => p.category === f.category);
  }

  if (f.marketplace === 'Wildberries') {
    result = result.filter(p => p.wbPrice <= p.ozonPrice);
  } else if (f.marketplace === 'Ozon') {
    result = result.filter(p => p.ozonPrice <= p.wbPrice);
  }

  if (f.dateFrom || f.dateTo) {
    result = result.filter(p => {
      const last = p.priceHistory[p.priceHistory.length - 1];
      if (!last) return true;
      if (f.dateFrom && last.dateISO < f.dateFrom) return false;
      if (f.dateTo && last.dateISO > f.dateTo) return false;
      return true;
    });
  }

  return result;
}

function getFilteredPriceHistory(prods) {
  const f = getFilters();
  const allDates = {};
  prods.forEach(p => {
    p.priceHistory.forEach(entry => {
      if (f.dateFrom && entry.dateISO < f.dateFrom) return;
      if (f.dateTo && entry.dateISO > f.dateTo) return;
      if (!allDates[entry.dateISO]) {
        allDates[entry.dateISO] = { date: entry.date, dateISO: entry.dateISO, wb: [], ozon: [] };
      }
      allDates[entry.dateISO].wb.push(entry.wb);
      allDates[entry.dateISO].ozon.push(entry.ozon);
    });
  });

  const sorted = Object.values(allDates).sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  return sorted.map(d => ({
    date: d.date,
    wb: +(d.wb.reduce((s, v) => s + v, 0) / d.wb.length).toFixed(0),
    ozon: +(d.ozon.reduce((s, v) => s + v, 0) / d.ozon.length).toFixed(0),
  }));
}

/* ========== Metrics ========== */
function updateMetrics(prods) {
  const f = getFilters();
  const total = prods.length;

  dom.mTotal.textContent = total;

  let prices;
  if (f.marketplace === 'Wildberries') {
    prices = prods.map(p => p.wbPrice);
  } else if (f.marketplace === 'Ozon') {
    prices = prods.map(p => p.ozonPrice);
  } else {
    prices = prods.map(p => Math.min(p.wbPrice, p.ozonPrice));
  }

  const avgPrice = prices.length ? +(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0) : 0;
  dom.mAvgPrice.textContent = avgPrice ? `${avgPrice.toLocaleString()} ₽` : '—';

  const minPrice = prices.length ? Math.min(...prices) : 0;
  dom.mMinPrice.textContent = minPrice ? `${minPrice.toLocaleString()} ₽` : '—';

  const avgRating = prods.length ? +(prods.reduce((s, p) => s + p.rating, 0) / prods.length).toFixed(1) : 0;
  dom.mRating.textContent = avgRating || '—';

  if (total > 0) {
    dom.mTotalChange.textContent = `${total} ед. в выборке`;
    dom.mTotalChange.className = 'change';
    dom.mAvgPriceChange.textContent = avgPrice ? `средняя по ${f.marketplace === 'all' ? 'мин. цене' : f.marketplace}` : '';
    dom.mAvgPriceChange.className = 'change';
    dom.mMinPriceChange.textContent = minPrice ? `от ${minPrice.toLocaleString()} ₽` : '';
    dom.mMinPriceChange.className = 'change up';
    dom.mRatingChange.textContent = avgRating ? `${avgRating} / 5.0` : '';
    dom.mRatingChange.className = 'change';
  }
}

/* ========== Charts ========== */
function destroyCharts() {
  Object.keys(charts).forEach(k => {
    if (charts[k]) {
      charts[k].destroy();
      delete charts[k];
    }
  });
}

function buildPriceTrendChart(data) {
  const ctx = document.getElementById('priceTrendChart').getContext('2d');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  charts.priceTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [
        {
          label: 'Wildberries',
          data: data.map(d => d.wb),
          borderColor: '#cb11ab',
          backgroundColor: 'rgba(203,17,171,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#cb11ab',
          borderWidth: 2,
        },
        {
          label: 'Ozon',
          data: data.map(d => d.ozon),
          borderColor: '#005bff',
          backgroundColor: 'rgba(0,91,255,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#005bff',
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          labels: { color: textColor, font: { size: 12 }, usePointStyle: true, padding: 16 }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f1f5f9' : '#1e293b',
          bodyColor: isDark ? '#94a3b8' : '#64748b',
          borderColor: gridColor,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} ₽`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, maxTicksLimit: 10, font: { size: 11 } },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: textColor, font: { size: 11 }, callback: (v) => v.toLocaleString() + ' ₽' },
          grid: { color: gridColor }
        }
      }
    }
  });
}

function buildTopSalesChart(prods) {
  const sorted = [...prods].sort((a, b) => b.sales - a.sales).slice(0, 10);
  const ctx = document.getElementById('topSalesChart').getContext('2d');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  charts.topSales = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(p => p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name),
      datasets: [{
        label: 'Продажи',
        data: sorted.map(p => p.sales),
        backgroundColor: sorted.map((_, i) => {
          const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4'];
          return colors[i % colors.length];
        }),
        borderRadius: 6,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f1f5f9' : '#1e293b',
          bodyColor: isDark ? '#94a3b8' : '#64748b',
          borderColor: gridColor,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: (ctx) => `${ctx.parsed.x.toLocaleString()} прод.`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 11 }, callback: (v) => v.toLocaleString() },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}

function buildCategoryChart(prods) {
  const counts = {};
  prods.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });
  const labels = Object.keys(counts);
  const data = Object.values(counts);
  const ctx = document.getElementById('categoryChart').getContext('2d');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'],
        borderWidth: 2,
        borderColor: isDark ? '#1e293b' : '#ffffff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, font: { size: 11 }, padding: 12, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f1f5f9' : '#1e293b',
          bodyColor: isDark ? '#94a3b8' : '#64748b',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function buildCategoryPriceChart(prods) {
  const f = getFilters();
  const cats = {};
  prods.forEach(p => {
    if (!cats[p.category]) cats[p.category] = { wb: [], ozon: [] };
    cats[p.category].wb.push(p.wbPrice);
    cats[p.category].ozon.push(p.ozonPrice);
  });
  const labels = Object.keys(cats);
  const wbAvg = labels.map(c => +(cats[c].wb.reduce((s, v) => s + v, 0) / cats[c].wb.length).toFixed(0));
  const ozonAvg = labels.map(c => +(cats[c].ozon.reduce((s, v) => s + v, 0) / cats[c].ozon.length).toFixed(0));
  const ctx = document.getElementById('categoryPriceChart').getContext('2d');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  charts.categoryPrice = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Wildberries', data: wbAvg, backgroundColor: 'rgba(203,17,171,0.7)', borderRadius: 4 },
        { label: 'Ozon', data: ozonAvg, backgroundColor: 'rgba(0,91,255,0.7)', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: textColor, font: { size: 11 }, usePointStyle: true, padding: 12 }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f1f5f9' : '#1e293b',
          bodyColor: isDark ? '#94a3b8' : '#64748b',
          borderColor: gridColor,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} ₽` }
        }
      },
      scales: {
        x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
        y: {
          ticks: { color: textColor, font: { size: 11 }, callback: (v) => v.toLocaleString() + ' ₽' },
          grid: { color: gridColor }
        }
      }
    }
  });
}

function buildScatterChart(prods) {
  const ctx = document.getElementById('scatterChart').getContext('2d');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const f = getFilters();

  const wbData = prods.map(p => ({ x: p.wbPrice, y: p.sales }));
  const ozonData = prods.map(p => ({ x: p.ozonPrice, y: p.sales }));

  charts.scatter = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Wildberries',
          data: wbData,
          backgroundColor: 'rgba(203,17,171,0.5)',
          borderColor: '#cb11ab',
          pointRadius: 5,
        },
        {
          label: 'Ozon',
          data: ozonData,
          backgroundColor: 'rgba(0,91,255,0.5)',
          borderColor: '#005bff',
          pointRadius: 5,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: textColor, font: { size: 11 }, usePointStyle: true, padding: 12 }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f1f5f9' : '#1e293b',
          bodyColor: isDark ? '#94a3b8' : '#64748b',
          borderColor: gridColor,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.x.toLocaleString()} ₽, ${ctx.parsed.y} прод.`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 10 }, callback: (v) => v.toLocaleString() + ' ₽' },
          grid: { color: gridColor },
          title: { display: true, text: 'Цена (₽)', color: textColor, font: { size: 11 } }
        },
        y: {
          ticks: { color: textColor, font: { size: 10 }, callback: (v) => v.toLocaleString() },
          grid: { color: gridColor },
          title: { display: true, text: 'Продажи', color: textColor, font: { size: 11 } }
        }
      }
    }
  });
}

function buildComparisonChart(prods) {
  const cats = {};
  prods.forEach(p => {
    if (!cats[p.category]) cats[p.category] = { wb: [], ozon: [] };
    cats[p.category].wb.push(p.wbPrice);
    cats[p.category].ozon.push(p.ozonPrice);
  });
  const labels = Object.keys(cats);
  const diff = labels.map(c => {
    const wbAvg = cats[c].wb.reduce((s, v) => s + v, 0) / cats[c].wb.length;
    const ozonAvg = cats[c].ozon.reduce((s, v) => s + v, 0) / cats[c].ozon.length;
    return +((ozonAvg - wbAvg) / wbAvg * 100).toFixed(1);
  });
  const ctx = document.getElementById('comparisonChart').getContext('2d');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  charts.comparison = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Разница цен Ozon vs WB (%)',
        data: diff,
        backgroundColor: diff.map(v => v > 0 ? 'rgba(239,68,68,0.7)' : 'rgba(16,185,129,0.7)'),
        borderRadius: 6,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: textColor, font: { size: 11 }, padding: 12 }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f1f5f9' : '#1e293b',
          bodyColor: isDark ? '#94a3b8' : '#64748b',
          borderColor: gridColor,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.x;
              return v > 0 ? `Ozon дороже на ${v}%` : `WB дороже на ${Math.abs(v)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 11 }, callback: (v) => v + '%' },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}

/* ========== Table ========== */
function renderTable(prods) {
  const mp = getFilters().marketplace;

  const showWb = mp === 'all' || mp === 'Wildberries';
  const showOzon = mp === 'all' || mp === 'Ozon';
  const showCompare = mp === 'all';

  const columns = [
    { key: 'id', label: 'Артикул' },
    { key: 'name', label: 'Название' },
    { key: 'category', label: 'Категория' },
  ];
  if (showWb) columns.push({ key: 'wbPrice', label: 'Цена WB' });
  if (showOzon) columns.push({ key: 'ozonPrice', label: 'Цена Ozon' });
  if (showCompare) {
    columns.push({ key: 'diff', label: 'Разница' });
    columns.push({ key: 'winner', label: 'Где дешевле' });
  }
  columns.push(
    { key: 'sales', label: 'Продажи' },
    { key: 'rating', label: 'Рейтинг' },
    { key: 'lastUpdated', label: 'Дата обновления' },
  );

  const colspan = columns.length;

  let data = [...prods];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    data = data.filter(p =>
      p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }

  if (currentSort.key) {
    const getVal = (p, key) => {
      if (key === 'diff') return p.ozonPrice - p.wbPrice;
      if (key === 'winner') {
        const d = p.ozonPrice - p.wbPrice;
        return d < -50 ? -1 : d > 50 ? 1 : 0;
      }
      return p[key];
    };
    data.sort((a, b) => {
      let va = getVal(a, currentSort.key);
      let vb = getVal(b, currentSort.key);
      if (typeof va === 'string') {
        const cmp = va.localeCompare(vb);
        return currentSort.asc ? cmp : -cmp;
      }
      return currentSort.asc ? va - vb : vb - va;
    });
  }

  dom.tableInfo.textContent = `Показано: ${data.length} из ${prods.length}`;

  const sortIcon = (key) => {
    if (currentSort.key === key) return currentSort.asc ? '▲' : '▼';
    return '▲';
  };

  const headerHtml = columns.map(c =>
    `<th data-sort="${c.key}" class="${currentSort.key === c.key ? 'sorted' : ''}">${c.label} <span class="sort-icon">${sortIcon(c.key)}</span></th>`
  ).join('');

  dom.tableHead.innerHTML = `<tr>${headerHtml}</tr>`;

  if (!data.length) {
    dom.tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:40px;color:var(--text-secondary)">Ничего не найдено</td></tr>`;
    return;
  }

  const rows = data.map(p => {
    const diff = p.ozonPrice - p.wbPrice;
    const diffPct = p.wbPrice ? ((diff / p.wbPrice) * 100).toFixed(1) : 0;
    const winner = diff < -50 ? 'Ozon' : diff > 50 ? 'WB' : '=';

    let winnerBadge;
    if (winner === 'WB') winnerBadge = '<span class="badge wb">WB ✓</span>';
    else if (winner === 'Ozon') winnerBadge = '<span class="badge ozon">Ozon ✓</span>';
    else winnerBadge = '<span class="badge equal">≈ равно</span>';

    const stars = '★'.repeat(Math.round(p.rating)).padEnd(5, '☆');

    const cells = [
      `<td><code>${p.id}</code></td>`,
      `<td><strong>${p.name}</strong></td>`,
      `<td>${p.category}</td>`,
    ];
    if (showWb) cells.push(`<td class="${p.wbPrice <= p.ozonPrice ? 'price-winner' : ''}">${p.wbPrice.toLocaleString()} ₽</td>`);
    if (showOzon) cells.push(`<td class="${p.ozonPrice <= p.wbPrice ? 'price-winner' : ''}">${p.ozonPrice.toLocaleString()} ₽</td>`);
    if (showCompare) {
      cells.push(`<td class="${diff > 0 ? 'price-loser' : 'price-winner'}">${diff > 0 ? '+' : ''}${diff.toLocaleString()} ₽ (${diffPct}%)</td>`);
      cells.push(`<td>${winnerBadge}</td>`);
    }
    cells.push(
      `<td>${p.sales.toLocaleString()}</td>`,
      `<td><span class="stars">${stars}</span> ${p.rating}</td>`,
      `<td>${p.lastUpdatedLabel || '—'}</td>`,
    );

    return `<tr>${cells.join('')}</tr>`;
  }).join('');

  dom.tableBody.innerHTML = rows;

  $$('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (currentSort.key === key) {
        currentSort.asc = !currentSort.asc;
      } else {
        currentSort.key = key;
        currentSort.asc = true;
      }
      renderTable(filterProducts(products));
    });
  });
}

/* ========== Full Refresh ========== */
function refreshDashboard() {
  const filtered = filterProducts(products);
  const trendData = getFilteredPriceHistory(filtered);

  updateMetrics(filtered);
  renderTable(filtered);

  destroyCharts();

  try { if (trendData.length > 1) buildPriceTrendChart(trendData); } catch (e) {}
  try { buildTopSalesChart(filtered); } catch (e) {}
  try { buildCategoryChart(filtered); } catch (e) {}

  if (currentTab === 'analytics') {
    try { buildCategoryPriceChart(filtered); } catch (e) {}
    try { buildScatterChart(filtered); } catch (e) {}
    try { buildComparisonChart(filtered); } catch (e) {}
  }
}

/* ========== init ========== */
function init() {
  initTheme();
  dom.themeToggle.addEventListener('click', toggleTheme);

  dom.navItems.forEach(el => {
    el.addEventListener('click', () => {
      switchTab(el.dataset.tab);
      refreshDashboard();
    });
  });

  dom.filterMarketplace.addEventListener('change', refreshDashboard);
  dom.filterCategory.addEventListener('change', refreshDashboard);
  dom.filterDateFrom.addEventListener('change', refreshDashboard);
  dom.filterDateTo.addEventListener('change', refreshDashboard);
  dom.filterReset.addEventListener('click', () => {
    dom.filterMarketplace.value = 'all';
    dom.filterCategory.value = 'all';
    dom.filterDateFrom.value = '';
    dom.filterDateTo.value = '';
    refreshDashboard();
  });

  dom.tableSearch.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTable(filterProducts(products));
  });

  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    dom.filterCategory.appendChild(opt);
  });

  refreshDashboard();
}

document.addEventListener('DOMContentLoaded', init);

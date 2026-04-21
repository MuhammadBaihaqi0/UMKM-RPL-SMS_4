import Chart from 'chart.js/auto'

function rupiahShort(value) {
  return `Rp ${value / 1000}K`
}

function labelCurrency(prefix, value) {
  return `${prefix}Rp${value.toLocaleString('id-ID')}`
}

export function destroyCharts(chartStore) {
  Object.values(chartStore).forEach((chart) => {
    if (chart) {
      chart.destroy()
    }
  })
}

export function renderCharts(analisis, chartStore) {
  destroyCharts(chartStore)

  renderTrendChart(analisis.tren_bulanan, chartStore)
  renderSourceChart(analisis.performa_per_sumber, chartStore)
  renderDistributionChart(analisis.distribusi_tipe, chartStore)
  renderFeeChart(analisis.breakdown_fee, chartStore)
}

function renderTrendChart(data, chartStore) {
  const canvas = document.getElementById('tren-chart')
  if (!canvas || !data?.length) return

  chartStore.tren = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map((item) => item.bulan),
      datasets: [
        {
          label: 'Total Penjualan',
          data: data.map((item) => item.total_penjualan),
          borderColor: '#4f8cff',
          backgroundColor: 'rgba(79,140,255,0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#4f8cff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
        },
        {
          label: 'Net Amount',
          data: data.map((item) => item.net_amount),
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168,85,247,0.05)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          borderDash: [5, 5],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#8888aa',
            font: { family: 'Inter' },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => labelCurrency(`${context.dataset.label}: `, context.parsed.y),
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#555577' },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: {
            color: '#555577',
            callback: (value) => rupiahShort(value),
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
    },
  })
}

function renderSourceChart(data, chartStore) {
  const canvas = document.getElementById('sumber-chart')
  if (!canvas || !data?.length) return

  const filtered = data.filter((item) => item.total_penjualan > 0)
  const colors = ['#4f8cff', '#a855f7', '#34d399', '#fb923c', '#f87171']

  chartStore.sumber = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: filtered.map((item) => item.source_app),
      datasets: [
        {
          label: 'Total Penjualan',
          data: filtered.map((item) => item.total_penjualan),
          backgroundColor: colors.slice(0, filtered.length).map((color) => `${color}33`),
          borderColor: colors.slice(0, filtered.length),
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 40,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Rp${context.parsed.y.toLocaleString('id-ID')}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#555577' },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: '#555577',
            callback: (value) => rupiahShort(value),
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
    },
  })
}

function renderDistributionChart(data, chartStore) {
  const canvas = document.getElementById('distribusi-chart')
  if (!canvas || !data) return

  const labels = Object.keys(data).map((key) => key.replace('_', ' '))
  const values = Object.values(data).map((value) => value.count)
  const colors = ['#4f8cff', '#f87171', '#fbbf24', '#a855f7', '#34d399']

  chartStore.distribusi = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors.slice(0, values.length),
          borderColor: '#0a0a1a',
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#8888aa',
            font: { family: 'Inter', size: 11 },
            padding: 12,
          },
        },
      },
    },
  })
}

function renderFeeChart(data, chartStore) {
  const canvas = document.getElementById('fee-chart')
  if (!canvas || !data) return

  const labels = [
    'Marketplace (2%)',
    'POS (1%)',
    'Supplier (3%)',
    'Logistik (5%)',
    'Bank (1%)',
    'Gateway (0.5%)',
    'Pajak (2%)',
  ]
  const values = [
    data.fee_marketplace,
    data.fee_pos,
    data.fee_supplier,
    data.fee_logistik,
    data.fee_bank,
    data.fee_gateway,
    data.pajak,
  ]
  const colors = ['#4f8cff', '#a855f7', '#fb923c', '#34d399', '#fbbf24', '#06b6d4', '#f87171']

  chartStore.fee = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Fee',
          data: values,
          backgroundColor: colors.map((color) => `${color}44`),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 6,
          barThickness: 24,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Rp${context.parsed.x.toLocaleString('id-ID')}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#555577',
            callback: (value) => rupiahShort(value),
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: {
            color: '#8888aa',
            font: { size: 11 },
          },
          grid: { display: false },
        },
      },
    },
  })
}

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
          borderColor: '#0F4C3A',
          backgroundColor: 'rgba(15, 76, 58, 0.08)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0F4C3A',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
        },
        {
          label: 'Net Amount',
          data: data.map((item) => item.net_amount),
          borderColor: '#2D8A67',
          backgroundColor: 'rgba(45, 138, 103, 0.04)',
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
            color: '#64748B',
            font: { family: 'Inter, sans-serif' },
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
          ticks: { color: '#94A3B8' },
          grid: { color: 'rgba(0,0,0,0.03)' },
        },
        y: {
          ticks: {
            color: '#94A3B8',
            callback: (value) => rupiahShort(value),
          },
          grid: { color: 'rgba(0,0,0,0.03)' },
        },
      },
    },
  })
}

function renderSourceChart(data, chartStore) {
  const canvas = document.getElementById('sumber-chart')
  if (!canvas || !data?.length) return

  const filtered = data.filter((item) => item.total_penjualan > 0)
  const colors = ['#0F4C3A', '#1B6B52', '#2D8A67', '#10B981', '#6EE7B7']

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
          ticks: { color: '#94A3B8' },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: '#94A3B8',
            callback: (value) => rupiahShort(value),
          },
          grid: { color: 'rgba(0,0,0,0.03)' },
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
  const colors = ['#0F4C3A', '#1B6B52', '#2D8A67', '#10B981', '#6EE7B7']

  chartStore.distribusi = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors.slice(0, values.length),
          borderColor: '#FFFFFF',
          borderWidth: 2,
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
            color: '#64748B',
            font: { family: 'Inter, sans-serif', size: 11 },
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
  const colors = ['#0F4C3A', '#1B6B52', '#2D8A67', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B']

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
            color: '#94A3B8',
            callback: (value) => rupiahShort(value),
          },
          grid: { color: 'rgba(0,0,0,0.03)' },
        },
        y: {
          ticks: {
            color: '#64748B',
            font: { family: 'Inter, sans-serif', size: 11 },
          },
          grid: { display: false },
        },
      },
    },
  })
}

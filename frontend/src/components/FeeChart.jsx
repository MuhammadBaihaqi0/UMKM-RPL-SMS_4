import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export default function FeeChart({ data }) {
  if (!data) return null
  const labels = ['Marketplace (2%)', 'POS (1%)', 'Supplier (3%)', 'Logistik (5%)', 'Bank (1%)', 'Gateway (0.5%)', 'Pajak (2%)']
  const values = [data.fee_marketplace, data.fee_pos, data.fee_supplier, data.fee_logistik, data.fee_bank, data.fee_gateway, data.pajak]
  const colors = ['#4f8cff', '#a855f7', '#fb923c', '#34d399', '#fbbf24', '#06b6d4', '#f87171']

  const chartData = {
    labels,
    datasets: [{ label: 'Total Fee', data: values,
      backgroundColor: colors.map(c => c + '44'), borderColor: colors,
      borderWidth: 2, borderRadius: 6, barThickness: 24
    }]
  }

  const options = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'Rp' + ctx.parsed.x.toLocaleString('id-ID') } } },
    scales: {
      x: { ticks: { color: '#555577', callback: v => 'Rp' + (v/1000) + 'K' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#8888aa', font: { size: 11 } }, grid: { display: false } }
    }
  }

  return <Bar data={chartData} options={options} />
}

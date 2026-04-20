import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export default function SumberChart({ data }) {
  if (!data) return null
  const filtered = data.filter(s => s.total_penjualan > 0)
  const colors = ['#4f8cff', '#a855f7', '#34d399', '#fb923c', '#f87171']

  const chartData = {
    labels: filtered.map(s => s.source_app),
    datasets: [{
      label: 'Total Penjualan', data: filtered.map(s => s.total_penjualan),
      backgroundColor: colors.slice(0, filtered.length).map(c => c + '33'),
      borderColor: colors.slice(0, filtered.length), borderWidth: 2, borderRadius: 8, barThickness: 40
    }]
  }

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'Rp' + ctx.parsed.y.toLocaleString('id-ID') } } },
    scales: {
      x: { ticks: { color: '#555577' }, grid: { display: false } },
      y: { ticks: { color: '#555577', callback: v => 'Rp' + (v/1000) + 'K' }, grid: { color: 'rgba(255,255,255,0.04)' } }
    }
  }

  return <Bar data={chartData} options={options} />
}

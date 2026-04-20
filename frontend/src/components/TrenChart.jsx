import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function TrenChart({ data }) {
  if (!data || data.length === 0) return <p>Tidak ada data tren</p>

  const chartData = {
    labels: data.map(t => t.bulan),
    datasets: [
      {
        label: 'Total Penjualan',
        data: data.map(t => t.total_penjualan),
        borderColor: '#4f8cff', backgroundColor: 'rgba(79,140,255,0.1)',
        borderWidth: 3, fill: true, tension: 0.4,
        pointBackgroundColor: '#4f8cff', pointBorderColor: '#fff',
        pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 8
      },
      {
        label: 'Net Amount',
        data: data.map(t => t.net_amount),
        borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.05)',
        borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3, borderDash: [5, 5]
      }
    ]
  }

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#8888aa', font: { family: 'Inter' } } },
      tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': Rp' + ctx.parsed.y.toLocaleString('id-ID') } }
    },
    scales: {
      x: { ticks: { color: '#555577' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#555577', callback: v => 'Rp' + (v/1000) + 'K' }, grid: { color: 'rgba(255,255,255,0.04)' } }
    }
  }

  return <Line data={chartData} options={options} />
}

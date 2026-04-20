import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function DistribusiChart({ data }) {
  if (!data) return null
  const labels = Object.keys(data).map(k => k.replace('_', ' '))
  const values = Object.values(data).map(v => v.count)
  const colors = ['#4f8cff', '#f87171', '#fbbf24', '#a855f7', '#34d399']

  const chartData = {
    labels,
    datasets: [{
      data: values, backgroundColor: colors.slice(0, values.length),
      borderColor: '#0a0a1a', borderWidth: 3, hoverOffset: 8
    }]
  }

  const options = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: { legend: { position: 'bottom', labels: { color: '#8888aa', font: { family: 'Inter', size: 11 }, padding: 12 } } }
  }

  return <Doughnut data={chartData} options={options} />
}

<template>
  <div class="chart-page" dir="rtl">
    <h1>نمودار مجموع ظرفیت بر اساس زمان crawl</h1>

    <div class="filters">
      <label>
        تاریخ سفر (date)
        <input v-model="date" type="text" placeholder="1405-03-11" @change="loadTravels">
      </label>
      <label>
        سفر
        <select v-model="travelId" @change="onTravelChange">
          <option value="">انتخاب سفر</option>
          <option v-for="item in travels" :key="item.id" :value="item.id">
            {{ item.label }}
          </option>
        </select>
      </label>
      <button type="button" @click="loadChart">نمایش نمودار</button>
    </div>

    <div class="chart-wrap">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <p v-if="message" :class="{ error: isError }">{{ message }}</p>
  </div>
</template>

<script>
import axios from 'axios'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { BACKEND_URL } from '../config/env'

const API = {
  defaultDate: `${BACKEND_URL}/safar724/api/default-date/`,
  travels: `${BACKEND_URL}/safar724/api/travels/`,
  chartData: `${BACKEND_URL}/safar724/api/chart-data/`,
}

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
)

export default {
  name: 'CapacityChartView',
  data() {
    return {
      date: '',
      travelId: '',
      travels: [],
      message: '',
      isError: false,
      chartInstance: null,
    }
  },
  async mounted() {
    await this.initPage()
  },
  beforeUnmount() {
    if (this.chartInstance) {
      this.chartInstance.destroy()
    }
  },
  methods: {
    async initPage() {
      try {
        const { data } = await axios.get(API.defaultDate)
        this.date = data.date
        await this.loadTravels()
        if (this.travelId) {
          await this.loadChart()
        }
      } catch (error) {
        this.setMessage('خطا در بارگذاری تاریخ پیش‌فرض', true)
      }
    },
    async loadTravels() {
      if (!this.date) {
        this.travels = []
        return
      }

      try {
        const { data } = await axios.get(API.travels, { params: { date: this.date } })
        this.travels = data.travels
        if (!this.travels.find((item) => item.id === this.travelId)) {
          this.travelId = this.travels.length ? this.travels[0].id : ''
        }
      } catch (error) {
        this.setMessage('خطا در دریافت لیست سفرها', true)
      }
    },
    onTravelChange() {
      if (this.travelId) {
        this.loadChart()
      }
    },
    async loadChart() {
      this.message = ''
      this.isError = false

      if (!this.date || !this.travelId) {
        this.setMessage('تاریخ و سفر را انتخاب کنید.', true)
        return
      }

      try {
        const { data } = await axios.get(API.chartData, {
          params: { date: this.date, travel: this.travelId },
        })
        if (!data.points.length) {
          this.setMessage('داده‌ای برای نمایش وجود ندارد.')
          this.renderChart([], [])
          return
        }

        const labels = data.points.map((point) => point.time)
        const values = data.points.map((point) => point.total_capacity)
        this.setMessage(`${data.points.length} crawl برای این سفر یافت شد.`)
        this.renderChart(labels, values)
      } catch (error) {
        const detail = error.response?.data
        this.setMessage(
          detail ? JSON.stringify(detail) : 'خطا در دریافت داده نمودار',
          true,
        )
      }
    },
    renderChart(labels, values) {
      const canvas = this.$refs.chartCanvas
      if (!canvas) {
        return
      }

      if (this.chartInstance) {
        this.chartInstance.destroy()
      }

      this.chartInstance = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'مجموع capacity (items)',
              data: values,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.15)',
              fill: true,
              tension: 0.25,
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true },
          },
          scales: {
            x: {
              title: { display: true, text: 'زمان crawl' },
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: 'مجموع capacity' },
            },
          },
        },
      })
    },
    setMessage(text, isError = false) {
      this.message = text
      this.isError = isError
    },
  },
}
</script>

<style scoped>
.chart-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  font-family: Tahoma, Arial, sans-serif;
  color: #1a1a1a;
}

h1 {
  font-size: 1.5rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  align-items: end;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
}

input,
select,
button {
  font: inherit;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

button {
  background: #2563eb;
  color: #fff;
  border: none;
  cursor: pointer;
}

.chart-wrap {
  position: relative;
  height: 420px;
}

.message,
p {
  margin-top: 12px;
  color: #666;
  font-size: 0.9rem;
}

.error {
  color: #b91c1c;
}
</style>

<template>
  <div class="chart-build-page" dir="rtl">
    <header class="header">
      <h1>{{ pageTitle }}</h1>
      <router-link to="/safar724/charttype" class="link-back">
        تغییر نوع نمودار
      </router-link>
    </header>

    <p v-if="!chartConfig" class="status error">
      نوع نمودار انتخاب نشده است.
      <router-link to="/safar724/charttype">بازگشت به انتخاب نوع</router-link>
    </p>

    <template v-else>
      <div class="filters">
        <label>
          روز حرکت (date)
          <input
            v-model="date"
            type="text"
            placeholder="1405-03-11"
            @change="loadTravels"
          >
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
        <button type="button" :disabled="!canShowChart" @click="loadChart">
          نمایش نمودار
        </button>
      </div>

      <div class="chart-wrap">
        <canvas ref="chartCanvas"></canvas>
      </div>
      <p v-if="message" :class="{ error: isError }">{{ message }}</p>
    </template>
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
import { loadChartConfig } from '../utils/chartConfigStorage'

const API = {
  defaultDate: `${BACKEND_URL}/safar724/api/default-date/`,
  travels: `${BACKEND_URL}/safar724/api/travels/`,
  cartsSummary: `${BACKEND_URL}/safar724/api/carts-summary/`,
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
  name: 'ChartBuildView',
  data() {
    return {
      chartConfig: null,
      date: '',
      travelId: '',
      travels: [],
      message: '',
      isError: false,
      chartInstance: null,
    }
  },
  computed: {
    pageTitle() {
      return this.chartConfig?.label || 'نمودار'
    },
    canShowChart() {
      return Boolean(this.date && this.travelId)
    },
  },
  async mounted() {
    this.chartConfig = loadChartConfig()
    if (!this.chartConfig) {
      return
    }
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
      } catch {
        this.setMessage('خطا در بارگذاری تاریخ پیش‌فرض', true)
      }
    },
    async loadTravels() {
      if (!this.date) {
        this.travels = []
        this.travelId = ''
        return
      }

      try {
        const { data } = await axios.get(API.travels, { params: { date: this.date } })
        this.travels = data.travels
        if (!this.travels.find((item) => item.id === this.travelId)) {
          this.travelId = this.travels.length ? this.travels[0].id : ''
        }
      } catch {
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
        this.setMessage('روز حرکت و سفر را انتخاب کنید.', true)
        return
      }

      if (this.chartConfig.chartTypeId !== 'daily-seat-changes') {
        this.setMessage('این نوع نمودار هنوز پشتیبانی نمی‌شود.', true)
        return
      }

      try {
        const { data } = await axios.get(API.cartsSummary, {
          params: { date: this.date, travel: this.travelId },
        })
        const samples = data.samples || []
        if (!samples.length) {
          this.setMessage('داده‌ای برای نمایش وجود ندارد.')
          this.renderChart([], [])
          return
        }

        const labels = samples.map((sample) => sample.time)
        const values = samples.map((sample) => sample.total_capacity)
        this.setMessage(`${samples.length} نمونه برای این سفر یافت شد.`)
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
              label: 'تعداد صندلی',
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
              title: { display: true, text: 'زمان نمونه‌برداری' },
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: 'تعداد صندلی' },
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
.chart-build-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  font-family: Tahoma, Arial, sans-serif;
  color: #1a1a1a;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

.link-back {
  color: #2563eb;
  text-decoration: none;
  font-size: 0.9rem;
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

button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.chart-wrap {
  position: relative;
  height: 420px;
}

.status.error,
p.error {
  color: #b91c1c;
}

p {
  margin-top: 12px;
  color: #666;
  font-size: 0.9rem;
}
</style>

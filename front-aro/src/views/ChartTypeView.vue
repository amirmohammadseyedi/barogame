<template>
  <div class="chart-type-page" dir="rtl">
    <h1>انتخاب نوع نمودار</h1>
    <p class="lead">نوع نمودار را انتخاب کنید؛ در مرحله بعد روز حرکت و سفر را مشخص می‌کنید.</p>

    <div class="types">
      <label
        v-for="chartType in chartTypes"
        :key="chartType.id"
        class="type-card"
        :class="{ active: selectedTypeId === chartType.id }"
      >
        <input
          v-model="selectedTypeId"
          type="radio"
          name="chart-type"
          :value="chartType.id"
        >
        <div class="type-body">
          <span class="type-title">{{ chartType.label }}</span>
          <span class="type-desc">{{ chartType.description }}</span>
        </div>
      </label>
    </div>

    <button
      type="button"
      class="btn-next"
      :disabled="!selectedTypeId || going"
      @click="goNext"
    >
      {{ going ? 'در حال انتقال...' : 'ادامه' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
import { CHART_TYPES, getChartTypeById } from '../constants/chartTypes'
import { saveChartConfig } from '../utils/chartConfigStorage'

export default {
  name: 'ChartTypeView',
  data() {
    return {
      chartTypes: CHART_TYPES,
      selectedTypeId: CHART_TYPES[0]?.id || '',
      going: false,
      error: '',
    }
  },
  methods: {
    goNext() {
      const chartType = getChartTypeById(this.selectedTypeId)
      if (!chartType) {
        return
      }

      this.going = true
      this.error = ''
      try {
        saveChartConfig({
          chartTypeId: chartType.id,
          label: chartType.label,
        })
        this.$router.push({ name: 'safar724-chart-build' })
      } catch {
        this.error = 'خطا در ذخیره انتخاب'
        this.going = false
      }
    },
  },
}
</script>

<style scoped>
.chart-type-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
  font-family: Tahoma, Arial, sans-serif;
}

h1 {
  margin-top: 0;
  font-size: 1.5rem;
}

.lead {
  margin: 0 0 24px;
  color: #555;
  font-size: 0.95rem;
}

.types {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.type-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.type-card:hover {
  border-color: #93c5fd;
}

.type-card.active {
  border-color: #2563eb;
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.12);
}

.type-card input {
  margin-top: 4px;
}

.type-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.type-title {
  font-weight: 700;
  font-size: 1rem;
}

.type-desc {
  font-size: 0.88rem;
  color: #666;
  line-height: 1.5;
}

.btn-next {
  font: inherit;
  padding: 10px 28px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-next:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.error {
  margin-top: 12px;
  color: #b91c1c;
  font-size: 0.9rem;
}
</style>

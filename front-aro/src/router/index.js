import { createRouter, createWebHistory } from 'vue-router'
import CapacityChartView from '../views/CapacityChartView.vue'

const routes = [
  {
    path: '/',
    redirect: '/safar724',
  },
  {
    path: '/safar724',
    name: 'safar724-chart',
    component: CapacityChartView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router

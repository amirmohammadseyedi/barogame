import { createRouter, createWebHistory } from 'vue-router'
import CapacityChartView from '../views/CapacityChartView.vue'
import ChartTypeView from '../views/ChartTypeView.vue'

const routes = [
  {
    path: '/',
    redirect: '/safar724',
  },
  {
    path: '/safar724',
    redirect: '/safar724/charttype',
  },
  {
    path: '/safar724/chart',
    name: 'safar724-chart-build',
    component: () => import('../views/ChartBuildView.vue'),
  },
  {
    path: '/safar724/chart/legacy',
    name: 'safar724-chart-legacy',
    component: CapacityChartView,
  },
  {
    path: '/safar724/charttype',
    name: 'safar724-chart-type',
    component: ChartTypeView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router

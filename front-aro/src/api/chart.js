import axios from 'axios'
import { BACKEND_URL } from '../config/env'

/**
 * وقتی endpoint بک‌اند آماده شد، مسیر را اینجا عوض کن.
 * مثال: POST /safar724/api/chart/build/
 */
export function buildChart(payload) {
  return axios.post(`${BACKEND_URL}/safar724/api/chart/build/`, payload)
}

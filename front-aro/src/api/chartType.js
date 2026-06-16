import axios from 'axios'
import { BACKEND_URL } from '../config/env'

export function fetchChartTypeConfig() {
  return axios.get(`${BACKEND_URL}/safar724/api/chart-type-config/`)
}

const STORAGE_KEY = 'safar724_chart_config'

export function saveChartConfig(config) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function loadChartConfig() {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearChartConfig() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export const CHART_TYPES = [
  {
    id: 'daily-seat-changes',
    label: 'نمودار تغییرات صندلی‌ها در هر روز',
    description:
      'نمایش تغییر تعداد صندلی در طول زمان نمونه‌برداری برای یک سفر در روز حرکت مشخص',
  },
]

export function getChartTypeById(id) {
  return CHART_TYPES.find((item) => item.id === id) || null
}
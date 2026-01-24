export interface AnalyticsTab {
  id: string; // Уникальный ID (используется для логики и имени файла)
  label: string; // То, что видит юзер ("Z-Velocity")
  hasChart: boolean; // Нужно ли рисовать график (для Overview может быть false)
}

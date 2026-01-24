// ============================================
// 🧠 Smart Formatting Helper
// ============================================

export function getSmartPriceFormat(price: number) {
  // Для дорогих активов (BTC, ETH) - 2 знака
  if (price >= 1000) {
    return { type: 'price' as const, precision: 2, minMove: 0.01 };
  }
  // Для средних (SOL, LTC) - 3-4 знака
  if (price >= 1) {
    return { type: 'price' as const, precision: 4, minMove: 0.0001 };
  }
  // Для дешевых (XRP, ADA) - 5-6 знаков
  if (price >= 0.001) {
    return { type: 'price' as const, precision: 6, minMove: 0.000001 };
  }
  // Для мем-коинов (PEPE, SHIB) - 8 знаков
  return { type: 'price' as const, precision: 8, minMove: 0.00000001 };
}

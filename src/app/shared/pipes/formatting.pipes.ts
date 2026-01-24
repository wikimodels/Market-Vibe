import { Pipe, PipeTransform } from '@angular/core';

/**
 * (НОВЫЙ ПАЙП)
 * Форматирует числа, избегая e-нотации, и обрабатывает null/undefined/NaN.
 * Использование: {{ myValue | formatNumber }}
 */
@Pipe({
  name: 'formatNumber',
  standalone: true,
})
export class FormatNumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    // Теперь мы также проверяем isNaN, что очень важно для EMA
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A'; // Возвращаем 'N/A' для null, undefined И NaN
    }

    // Проверяем, целое ли это число (н-р, volume, openInterest)
    if (value % 1 === 0) {
      return value.toFixed(0); // Принудительно в строку: "5849000"
    }

    // Проверяем очень маленькие числа (н-р, fundingRate)
    if (Math.abs(value) < 0.01) {
      return value.toFixed(8); // Показываем 8 знаков
    }

    // Это число с плавающей точкой (н-р, цена)
    return value.toFixed(4); // 4 знака по умолчанию
  }
}

/**
 * (НОВЫЙ ПАЙП)
 * Форматирует timestamp в локальную строку даты/времени.
 * Использование: {{ myTimestamp | formatTimestamp }}
 */
@Pipe({
  name: 'formatTimestamp',
  standalone: true,
})
export class FormatTimestampPipe implements PipeTransform {
  transform(timestamp: any): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  }
}

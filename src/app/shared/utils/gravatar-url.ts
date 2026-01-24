import { Md5 } from 'ts-md5'; // ✅ ИМПОРТ: Используем ts-md5 для надежного хеширования

// Gravatar Utils
// Этот файл содержит функции для генерации URL аватара Gravatar
// из адреса электронной почты. Gravatar URL безопасны для кросс-доменных
// запросов (CORS-friendly), в отличие от некоторых прямых URL Google.

/**
 * MD5 Hashing Utility.
 * Использует импортированную библиотеку ts-md5 для получения 32-символьного хеша.
 */
function md5(s: string): string {
  // Gravatar требует 32-символьный хэш в нижнем регистре.
  // Md5.hashStr(s, false) возвращает строку в нужном формате.
  const hash = Md5.hashStr(s, false);

  if (typeof hash === 'string') {
    return hash;
  }
  // В случае ошибки хеширования возвращаем пустую строку, чтобы Gravatar
  // гарантированно вернул стандартную заглушку.
  return '';
}

/**
 * Генерирует URL аватара Gravatar из Email пользователя.
 *
 * Процесс:
 * 1. Email приводится к нижнему регистру и обрезаются пробелы.
 * 2. Вычисляется MD5-хеш с использованием ts-md5.
 * 3. Хеш вставляется в URL Gravatar.
 *
 * @param email Адрес электронной почты.
 * @param size Размер изображения (s) в пикселях (по умолчанию 100).
 * @param defaultImage Тип изображения по умолчанию (d), если аватар не найден (mp = mystery person).
 * @returns Полный URL Gravatar.
 */
export function getGravatarUrl(
  email: string | null | undefined,
  size: number = 100,
  defaultImage: string = 'mp'
): string {
  if (!email) {
    // Если email отсутствует, возвращаем URL-заглушку с указанным размером
    return `https://www.gravatar.com/avatar/?d=${defaultImage}&s=${size}`;
  }

  // 1. Очистка и приведение к нижнему регистру (обязательные шаги Gravatar)
  const safeEmail = email.trim().toLowerCase();

  // 2. MD5-хеширование с использованием ts-md5
  const hash = md5(safeEmail);

  // Если хеширование не удалось, возвращаем URL без хеша.
  if (!hash) {
    return `https://www.gravatar.com/avatar/?d=${defaultImage}&s=${size}`;
  }

  // 3. Построение URL
  return `https://www.gravatar.com/avatar/${hash}?d=${defaultImage}&s=${size}`;
}

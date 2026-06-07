# ShortScreener — Инструкции для AI-бота

Этот документ описывает архитектуру проекта, логику всех ключевых расчётов и правила расширения кода.
Читай его **целиком** перед любыми изменениями в `short_screener.py`.

---

## 1. Назначение проекта

`ShortScreener` — асинхронный скринер фьючерсных пар на нескольких биржах (Bitget, MEXC, Bybit, Binance, OKX, Gate.io, BingX).

Цель: находить инструменты, у которых цена большую часть времени торгуется **ниже скользящего VWAP** — признак слабости и доминирования продавцов (шорт-сетап).

Основной файл с логикой: `short_screener.py`.  
HTTP-сервер: `short_server.py`.  
Результаты сохраняются в: `logs/screener_results.jsonl`.

---

## 2. Конфигурация по умолчанию (`DEFAULTS`)

```python
DEFAULTS = {
    "exchange":    "bitget",
    "volume_min":  5_000,     # мин. суточный объём в USDT
    "volume_max":  100_000,   # макс. суточный объём в USDT
    "stdev_mult":  1.0,       # множитель стандартного отклонения для верхней полосы
    "candles":     48,        # размер аналитического окна (часов)
    "concurrency": 10,        # параллельных запросов к бирже
    "delay_s":     0.05,      # задержка между запросами (сек)
}
```

---

## 3. Получение свечей

### Сколько свечей запрашивается

```python
raw = await get_candles(session, exchange, sym, cfg["candles"] + 24)
```

Всегда запрашивается **`candles + 24`** штук (по умолчанию **72 часовые свечи = 3 дня**).

Лишние 24 свечи нужны для того, чтобы с **первой** аналитической свечи уже было готово полное 24-часовое VWAP-окно. Без них первые 23 позиции серии RVWAP были бы `None`.

### Формат одной свечи (универсальный)

```
[timestamp_ms, open, high, low, close, volume]
```

Каждая биржа возвращает свой формат; роутер `get_candles()` нормализует его в единый список.

---

## 4. Функция `analyse_candles` — полная логика

**Сигнатура:**
```python
def analyse_candles(
    raw_candles: list,
    stdev_mult: float,
    analysis_window: int = 48
) -> Optional[dict]
```

Возвращает словарь с метриками если инструмент прошёл все фильтры, иначе `None`.

---

### 4.1 Параметры

| Параметр | Тип | Описание |
|---|---|---|
| `raw_candles` | `list` | Список свечей от биржи (нормализованный) |
| `stdev_mult` | `float` | Множитель σ для верхней полосы Боллинджера (обычно `1.0`) |
| `analysis_window` | `int` | Количество последних свечей для анализа (обычно `48`) |

Внутренняя константа:
```python
W = 24  # Ширина скользящего VWAP-окна (24 часа)
```

---

### 4.2 Шаг 1 — Вычисление Rolling VWAP (RVWAP) и StDev для каждой свечи

Для каждой позиции `i` в массиве свечей (начиная с `i = W-1 = 23`, когда накопилось 24 свечи):

```python
# Скользящее окно: свечи с [i-23] по [i] включительно
window_highs  = highs[i-W+1 : i+1]
window_lows   = lows[i-W+1 : i+1]
window_closes = closes[i-W+1 : i+1]
window_vols   = vols[i-W+1 : i+1]

sum_tp_vol  = 0.0  # Σ(типичная_цена × объём)
sum_vol     = 0.0  # Σ(объём)
sum_tp2_vol = 0.0  # Σ(объём × типичная_цена²)  — для дисперсии

for k in range(W):
    tp = (high[k] + low[k] + close[k]) / 3.0   # Typical Price
    v  = vol[k]
    sum_tp_vol  += tp * v
    sum_vol     += v
    sum_tp2_vol += v * (tp ** 2)

rvwap    = sum_tp_vol / sum_vol
variance = (sum_tp2_vol / sum_vol) - (rvwap ** 2)
variance = max(0.0, variance)          # защита от отрицательной погрешности float
stdev    = sqrt(variance)
```

**Что такое Typical Price (TP):**  
Стандартная формула TradingView: `TP = (High + Low + Close) / 3`

**Что такое RVWAP:**  
Объём-взвешенная средняя типичная цена за скользящие 24 часа. Перекатывается вперёд с каждой новой свечой (не сбрасывается в полночь как обычный VWAP).

**Результат этого шага:**
```python
rvwap_series  # список из N значений; первые 23 = None
stdev_series  # список из N значений; первые 23 = None
```

---

### 4.3 Шаг 2 — Выделение аналитического окна

Из 72 свечей берутся последние 48 (аналитическое окно):

```python
start_idx = N - analysis_window   # = 72 - 48 = 24

an_closes = closes[start_idx:]    # 48 значений цен закрытия
an_highs  = highs[start_idx:]     # 48 значений максимумов
an_lows   = lows[start_idx:]      # 48 значений минимумов
an_rvwap  = rvwap_series[start_idx:]  # 48 значений RVWAP (все не-None)
an_stdev  = stdev_series[start_idx:]  # 48 значений StDev
```

Если хотя бы одно значение в `an_rvwap` равно `None` — функция возвращает `None`.

---

### 4.4 Шаг 3 — ⭐ ФИЛЬТР: Гравитация VWAP (свечи НИЖЕ VWAP за 48 часов)

**Это главный фильтр скринера.**

```python
below_count = sum(
    1 for i in range(analysis_window)
    if an_closes[i] < an_rvwap[i]   # закрытие свечи НИЖЕ RVWAP
)
gravity_pct = below_count / analysis_window  # доля от 0.0 до 1.0

if gravity_pct < 0.70:
    return None   # инструмент не прошёл фильтр
```

**Пример:**
- `analysis_window = 48`
- `below_count = 35` → `gravity_pct = 35/48 ≈ 0.729 = 72.9%`
- Порог 70% пройден → продолжаем анализ

**Экономический смысл:**
Если более 70% свечей за последние 48 часов закрываются **ниже** взвешенной по объёму средней цены — продавцы доминируют. Инструмент находится в структурной слабости. Это необходимое условие для шорт-сетапа.

**Метрика в результате:**
```python
"gravity_pct": 0.729,   # 72.9% свечей закрылись ниже RVWAP
"candles_used": 48,
```

---

### 4.5 Шаг 4 — ФИЛЬТР: Триггер (пробой верхней полосы)

Ищет хотя бы одну свечу в **последних 6** из 48, где максимум достиг верхней полосы:

```python
upper_band = an_rvwap[i] + an_stdev[i] * stdev_mult   # RVWAP + 1σ

trigger_found = any(
    an_highs[i] >= upper_band
    for i in range(max(0, analysis_window - 6), analysis_window)
)

if not trigger_found:
    return None
```

**Смысл:** В условиях слабости был краткосрочный выброс вверх (покупатели пытались развернуть, но провалились). Это классический момент входа в шорт.

---

### 4.6 Шаг 5 — Вычисление вспомогательных метрик

```python
# Средний размер полосы (волатильность)
avg_std_pct = sum(s / r for s, r in zip(an_stdev, an_rvwap)) / analysis_window * 100

# Средний swing (размах свечи относительно закрытия)
swings = [(high - low) / close * 100 for high, low, close in ...]
avg_swing_pct = sum(swings) / len(swings)

# Количество пересечений RVWAP (смен знака: close переходит через RVWAP)
signs = [1 if close >= rvwap else -1 for ...]
crossings = sum(1 for i in range(1, 48) if signs[i] != signs[i-1])
```

---

### 4.7 Структура возвращаемого словаря

```python
{
    "stdev_mult":    1.0,           # использованный множитель σ
    "gravity_pct":   0.729,         # доля свечей НИЖЕ RVWAP (0.0–1.0)
    "candles_used":  48,            # размер аналитического окна
    "last_price":    0.01061,       # последняя цена закрытия
    "std_pct":       1.68,          # средняя ширина полосы в % от RVWAP
    "avg_swing_pct": 1.52,          # средний размах свечи в %
    "crossings":     10,            # количество пересечений RVWAP
    "chart_closes":  [...],         # 48 значений close для графика
    "chart_rvwap":   [...],         # 48 значений RVWAP для графика
    "chart_upper":   [...],         # 48 значений верхней полосы (RVWAP + M*σ)
}
```

---

## 5. Логика для свечей ВЫШЕ VWAP (Long-сетап)

### Назначение

Зеркальная логика к шорт-скринеру. Находит инструменты, у которых цена большую часть времени торгуется **выше RVWAP** — признак силы и доминирования покупателей (лонг-сетап).

### Место реализации

Добавить в `short_screener.py` новую функцию `analyse_candles_long` рядом с `analyse_candles`.

### Полная реализация

```python
def analyse_candles_long(
    raw_candles: list,
    stdev_mult: float,
    analysis_window: int = 48
) -> Optional[dict]:
    """
    Зеркальная логика к analyse_candles, но для лонг-сетапов.
    Ищет инструменты, где цена торгуется ВЫШЕ RVWAP — признак силы покупателей.

    Фильтры:
      1. Гравитация ВВЕРХ: >= 70% свечей закрываются ВЫШЕ RVWAP за 48 часов.
      2. Триггер вниз: хотя бы одна из последних 6 свечей касалась нижней полосы
         (RVWAP - M*σ), что означает откат в зону покупки.
    """
    W = 24  # 24-часовое скользящее VWAP-окно
    if len(raw_candles) < W + 1:
        return None

    try:
        times  = [int(c[0])   for c in raw_candles]
        opens  = [float(c[1]) for c in raw_candles]
        highs  = [float(c[2]) for c in raw_candles]
        lows   = [float(c[3]) for c in raw_candles]
        closes = [float(c[4]) for c in raw_candles]
        vols   = [float(c[5]) for c in raw_candles]
    except (IndexError, ValueError):
        return None

    if any(p <= 0 for p in closes):
        return None

    N = len(raw_candles)

    # --- Шаг 1: RVWAP и StDev (идентично analyse_candles) ---
    rvwap_series = []
    stdev_series = []

    for i in range(N):
        if i < W - 1:
            rvwap_series.append(None)
            stdev_series.append(None)
            continue

        window_highs  = highs[i-W+1 : i+1]
        window_lows   = lows[i-W+1 : i+1]
        window_closes = closes[i-W+1 : i+1]
        window_vols   = vols[i-W+1 : i+1]

        sum_src_vol     = 0.0
        sum_vol         = 0.0
        sum_src_src_vol = 0.0

        for k in range(W):
            tp = (window_highs[k] + window_lows[k] + window_closes[k]) / 3.0
            v  = window_vols[k]
            sum_src_vol     += tp * v
            sum_vol         += v
            sum_src_src_vol += v * (tp ** 2)

        if sum_vol == 0:
            rvwap_series.append(None)
            stdev_series.append(None)
            continue

        rvwap    = sum_src_vol / sum_vol
        variance = (sum_src_src_vol / sum_vol) - (rvwap ** 2)
        variance = max(0.0, variance)
        stdev    = math.sqrt(variance)

        rvwap_series.append(rvwap)
        stdev_series.append(stdev)

    # --- Шаг 2: Выделение аналитического окна ---
    if N - W < analysis_window:
        analysis_window = N - W

    start_idx = N - analysis_window

    an_closes = closes[start_idx:]
    an_highs  = highs[start_idx:]
    an_lows   = lows[start_idx:]
    an_rvwap  = rvwap_series[start_idx:]
    an_stdev  = stdev_series[start_idx:]

    if any(r is None for r in an_rvwap):
        return None

    # --- Шаг 3: Фильтр «Гравитация ВВЕРХ» ---
    # Считаем свечи, закрывшиеся ВЫШЕ RVWAP (зеркально к шорт-логике)
    above_count = sum(
        1 for i in range(analysis_window)
        if an_closes[i] > an_rvwap[i]   # ← ВЫШЕ, а не ниже
    )
    buoyancy_pct = above_count / analysis_window

    if buoyancy_pct < 0.70:   # тот же порог 70%
        return None

    # --- Шаг 4: Триггер — касание НИЖНЕЙ полосы в последних 6 свечах ---
    # В шорт-логике искали касание ВЕРХНЕЙ полосы (выброс вверх в зону продажи).
    # Здесь ищем касание НИЖНЕЙ полосы (откат вниз в зону покупки).
    trigger_found = False
    for i in range(max(0, analysis_window - 6), analysis_window):
        lower_band = an_rvwap[i] - an_stdev[i] * stdev_mult
        if an_lows[i] <= lower_band:   # ← lows и <=, а не highs и >=
            trigger_found = True
            break

    if not trigger_found:
        return None

    # --- Шаг 5: Вспомогательные метрики (идентично шорт-версии) ---
    last_price    = an_closes[-1]
    avg_std_pct   = sum(s / r for s, r in zip(an_stdev, an_rvwap)) / analysis_window * 100

    swings        = [(h - l) / c * 100 for h, l, c in zip(an_highs, an_lows, an_closes) if c > 0]
    avg_swing_pct = sum(swings) / len(swings) if swings else 0.0

    signs     = [1 if an_closes[i] >= an_rvwap[i] else -1 for i in range(analysis_window)]
    crossings = sum(1 for i in range(1, analysis_window) if signs[i] != signs[i - 1])

    return {
        "stdev_mult":    stdev_mult,
        "buoyancy_pct":  buoyancy_pct,   # ← новое поле (доля свечей ВЫШЕ RVWAP)
        "candles_used":  analysis_window,
        "last_price":    last_price,
        "std_pct":       round(avg_std_pct, 3),
        "avg_swing_pct": round(avg_swing_pct, 3),
        "crossings":     crossings,
        "chart_closes":  an_closes,
        "chart_rvwap":   an_rvwap,
        "chart_lower":   [r - s * stdev_mult for r, s in zip(an_rvwap, an_stdev)],  # ← нижняя полоса
    }
```

### Ключевые отличия от шорт-версии

| Аспект | Шорт (`analyse_candles`) | Лонг (`analyse_candles_long`) |
|---|---|---|
| Фильтр гравитации | `close < rvwap` → `gravity_pct` | `close > rvwap` → `buoyancy_pct` |
| Триггер | `high >= rvwap + M*σ` (верхняя полоса) | `low <= rvwap - M*σ` (нижняя полоса) |
| Полоса в графике | `chart_upper` = RVWAP + M*σ | `chart_lower` = RVWAP − M*σ |
| Поле метрики | `"gravity_pct"` | `"buoyancy_pct"` |

---

## 6. Правила вызова `analyse_candles_long`

В функции `_scan_one` в `run_scan` текущий вызов:

```python
metrics = analyse_candles(raw, cfg["stdev_mult"], analysis_window=cfg["candles"])
```

Для добавления лонг-режима можно передать параметр `mode` в `cfg`:

```python
if cfg.get("mode") == "long":
    metrics = analyse_candles_long(raw, cfg["stdev_mult"], analysis_window=cfg["candles"])
else:
    metrics = analyse_candles(raw, cfg["stdev_mult"], analysis_window=cfg["candles"])
```

---

## 7. Правила для AI-бота при редактировании кода

### Что НЕЛЬЗЯ менять без явного запроса пользователя

- Значение `W = 24` — это ширина скользящего VWAP-окна в часах. Менять только если пользователь явно просит.
- Порог `0.70` (70%) в фильтре гравитации/буйности — ключевой параметр отбора.
- Формулу Typical Price: `(high + low + close) / 3` — стандарт TradingView.
- Количество запрашиваемых свечей: всегда `candles + 24` (лишние нужны для прогрева RVWAP).

### Что МОЖНО менять по запросу

- Порог `0.70` — сделать параметром `cfg["gravity_threshold"]`.
- Ширину триггерного окна `6` — сделать параметром `cfg["trigger_window"]`.
- `W = 24` — сделать параметром `cfg["vwap_window"]`.
- Добавить фильтр по `crossings` (количеству пересечений RVWAP).
- Добавить фильтр по `avg_swing_pct` (минимальная волатильность свечей).

### Порядок добавления новой метрики

1. Добавить расчёт внутри `analyse_candles` или `analyse_candles_long` после Шага 2.
2. Добавить поле в возвращаемый словарь.
3. Если это фильтр — добавить `if metric < threshold: return None` до вычисления вспомогательных метрик (Шаг 5).
4. Обновить `index.html` (фронтенд) чтобы отображать новое поле.

### Инварианты которые всегда должны выполняться

- `len(an_closes) == len(an_rvwap) == analysis_window` — массивы должны быть одинаковой длины.
- `an_rvwap` не должен содержать `None` (проверка на строке 470).
- `sum_vol > 0` перед делением (проверка на строке 445).
- `c > 0` при расчёте `avg_swing_pct` (защита от деления на ноль).

---

## 8. Связь с фронтендом (`index.html`)

Поля `chart_closes`, `chart_rvwap`, `chart_upper` (шорт) / `chart_lower` (лонг) используются для отрисовки мини-графика на карточке инструмента.

- `chart_rvwap` → синяя линия VWAP
- `chart_upper` → красная верхняя полоса (шорт)
- `chart_lower` → зелёная нижняя полоса (лонг)
- `chart_closes` → линия цены закрытия

`gravity_pct` / `buoyancy_pct` отображается как процентный индикатор слабости/силы.

---

## 9. Формула расчёта (краткая шпаргалка)

```
Для каждой свечи i (i >= 23):

  Окно:   свечи [i-23 .. i]  (24 штуки)

  TP[k]   = (High[k] + Low[k] + Close[k]) / 3
  RVWAP   = Σ(TP[k] × Vol[k]) / Σ(Vol[k])
  Var     = Σ(Vol[k] × TP[k]²) / Σ(Vol[k])  −  RVWAP²
  StDev   = sqrt(max(0, Var))

  Верхняя полоса = RVWAP + stdev_mult × StDev
  Нижняя полоса = RVWAP − stdev_mult × StDev

Фильтр ШОРТ:
  below_count / 48 >= 0.70
  И any(High[i] >= Upper[i]) для i в последних 6 свечах

Фильтр ЛОНГ:
  above_count / 48 >= 0.70
  И any(Low[i] <= Lower[i]) для i в последних 6 свечах
```

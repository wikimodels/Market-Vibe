# Интеграция Streaming HTTP Response в Angular

Этот документ описывает, как правильно обращаться к потоковым API-эндпоинтам (с `Transfer-Encoding: chunked`), реализованным на Deno Deploy, и как использовать периодические "пинги" (точки `.`) для создания индикатора прогресса в Angular-приложениях.

## Проблема со стандартным `HttpClient`

Стандартный `HttpClient` из `@angular/common/http` не подходит для чтения потоковых данных (чанков) "на лету" из тела ответа, если размер ответа (`Content-Length`) неизвестен.

* `HttpClient` ожидает полного завершения HTTP-запроса, прежде чем отдать распарсенный JSON.
* Встроенная функция `reportProgress: true` (для отслеживания загрузки/скачивания) опирается на заголовок `Content-Length`. При потоковой передаче (`Transfer-Encoding: chunked`) этого заголовка нет, поэтому `HttpEventType.DownloadProgress` будет возвращать только количество скачанных байт, но не позволит прочитать сами "чанки" текста.

## Решение: Нативный `fetch` + RxJS `Observable`

Самый правильный "Angular-way" подход — обернуть нативный `fetch` (и его `ReadableStream`) в RxJS `Observable`. Это позволит:
1. Читать данные по мере их поступления (`reader.read()`).
2. Реактивно обновлять UI в Angular через подписку (`subscribe`).
3. Корректно отменять долгий HTTP-запрос при уничтожении компонента (отписке) с помощью `AbortController`.

---

## 1. Создание сервиса (JobService)

Создайте сервис, который будет выполнять потоковый запрос и возвращать `Observable`.

```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface JobProgress {
  status: 'connecting' | 'running' | 'completed' | 'error';
  ticks: number; // Количество полученных точек (каждая точка = 10 секунд работы сервера)
  result?: any;  // Финальный JSON ответа при успешном завершении
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobService {
  
  /**
   * Запускает задачу на сервере и возвращает поток прогресса.
   * @param jobName Имя задачи (например, '1h', '4h')
   * @param token Токен авторизации (SECRET_TOKEN)
   */
  runJobStream(jobName: string, token: string): Observable<JobProgress> {
    return new Observable<JobProgress>((subscriber) => {
      // Изначальное состояние
      subscriber.next({ status: 'connecting', ticks: 0 });

      // Флаг для возможности отмены запроса (например, если компонент уничтожается)
      const controller = new AbortController();

      // Замените URL на ваш рабочий домен Deno Deploy
      fetch(`https://your-deno-deploy-url.com/api/jobs/run/${jobName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      })
      .then(async (response) => {
        if (!response.body) {
          throw new Error('ReadableStream не поддерживается вашим браузером');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        
        let ticksCount = 0;
        let completeResponseStr = '';

        // Читаем поток бесконечным циклом, пока он не закроется
        while (true) {
          // Ждем очередной "чанк" данных от Deno
          const { done, value } = await reader.read();
          
          if (done) {
            break; // Поток закрылся (Deno вызвал res.end())
          }

          // Декодируем байты в строку
          const chunk = decoder.decode(value, { stream: true });
          completeResponseStr += chunk;

          // Ищем точки в пришедшем куске текста
          // (Deno отправляет одну точку примерно каждые 10 секунд)
          const newDots = (chunk.match(/\./g) || []).length;
          
          if (newDots > 0) {
            ticksCount += newDots;
            
            // Уведомляем компонент о том, что процесс идет
            subscriber.next({ status: 'running', ticks: ticksCount });
          }
        }

        // --- ПОТОК ЗАКРЫТ ---
        // Пытаемся распарсить накопленную строку как JSON
        try {
          // На сервере мы начинали с '{"status":"running","progress":"...'
          // затем шли точки '.......', затем '","success":true}'
          // В сумме это валидный JSON.
          const finalData = JSON.parse(completeResponseStr);
          
          if (finalData.success) {
            subscriber.next({ status: 'completed', ticks: ticksCount, result: finalData });
            subscriber.complete();
          } else {
            // Если сервер передал success: false внутри JSON
            subscriber.error(finalData.error || 'Server returned logical error');
          }
        } catch (e) {
          throw new Error('Не удалось разобрать финальный ответ. Возможно, сервер упал с ошибкой.');
        }

      })
      .catch((error) => {
        // Игнорируем ошибку 'AbortError', так как она возникает при намеренной отписке
        if (error.name !== 'AbortError') {
          subscriber.error(error);
        }
      });

      // Логика очистки, которая срабатывает при sub.unsubscribe()
      return () => {
        controller.abort();
      };
    });
  }
}
```

---

## 2. Использование сервиса в компоненте

В компоненте мы подписываемся на созданный `Observable` и реактивно обновляем состояние интерфейса пользователя по мере поступления "тиков".

```typescript
import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { JobService, JobProgress } from './job.service';

@Component({
  selector: 'app-job-runner',
  template: `
    <div class="job-card">
      <h2>Сбор исторических данных (Klines + OI)</h2>
      
      <button 
        (click)="startJob()" 
        [disabled]="progressInfo?.status === 'connecting' || progressInfo?.status === 'running'">
        Запустить задачу (1h)
      </button>

      <!-- Индикатор прогресса -->
      <div *ngIf="progressInfo?.status === 'connecting'" class="status-msg">
        Установка соединения с сервером...
      </div>

      <div *ngIf="progressInfo?.status === 'running'" class="progress-container">
        <!-- Каждая точка означает 10 секунд работы сервера -->
        <p>Идет загрузка... (Времени прошло: ~{{ progressInfo.ticks * 10 }} сек)</p>
        
        <div class="spinner">
           Обработано активностей (точек): {{ progressInfo.ticks }}
        </div>
      </div>

      <!-- Сообщение об успешном завершении -->
      <div *ngIf="progressInfo?.status === 'completed'" class="success">
        Данные успешно загружены! Времени затрачено: {{ progressInfo.result?.executionTime / 1000 }} сек.
      </div>

      <!-- Сообщение об ошибке -->
      <div *ngIf="progressInfo?.status === 'error'" class="error">
        Ошибка запуска задачи: {{ progressInfo.error }}
      </div>
    </div>
  `,
  styles: [`
    .progress-container { margin-top: 20px; color: #007bff; }
    .success { margin-top: 20px; color: #28a745; font-weight: bold; }
    .error { margin-top: 20px; color: #dc3545; }
    .status-msg { margin-top: 20px; color: #6c757d; }
  `]
})
export class JobComponent implements OnDestroy {
  progressInfo: JobProgress | null = null;
  private sub: Subscription | null = null;

  constructor(private jobService: JobService) {}

  startJob() {
    const token = 'ВАШ_SECRET_TOKEN'; // Получите этот токен из AuthService или окружения

    // Очищаем предыдущее состояние
    this.progressInfo = null;

    this.sub = this.jobService.runJobStream('1h', token).subscribe({
      next: (update) => {
        this.progressInfo = update;
        console.log(`[Job Stream] Статус: ${update.status}, Тиков: ${update.ticks}`);
      },
      error: (err) => {
        console.error('Ошибка во время работы фоновой задачи:', err);
        this.progressInfo = { status: 'error', ticks: 0, error: err.message || String(err) };
      },
      complete: () => {
        console.log('Поток успешно завершён!');
      }
    });
  }

  ngOnDestroy() {
    // ВАЖНО: Если компонент удаляется со страницы (например, переход на другой роут),
    // мы отписываемся от потока. Это автоматически вызовет \`controller.abort()\`
    // в нашем сервисе и прервёт висящий HTTP-запрос к Deno.
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
```

## Дополнительные преимущества

1. **Мгновенная обратная связь**: Интерфейс приложения перестает быть "мертвым". Пользователь видит реальную активность.
2. **Экономия ресурсов клиента**: Подход с `ReadableStream` очень легковесный по памяти (в отличие от буферизации огромных строк).
3. **Безопасное прерывание**: В отличие от обычного Angular `HttpClient` (без подмешивания кастомного AbortController), отписка от самодельного `Observable` гарантированно оборвет физическое TCP-соединение, если пользователь закроет вкладку с дашбордом.

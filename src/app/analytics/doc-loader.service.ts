import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DocLoaderService {
  private http = inject(HttpClient);

  // Базовый путь к файлам
  private readonly BASE_PATH = 'assets/data/analytics';

  loadDoc(filename: string): Observable<string> {
    // Добавляем .html если не передан
    const safeName = filename.endsWith('.html') ? filename : `${filename}.html`;

    return this.http.get(`${this.BASE_PATH}/${safeName}`, { responseType: 'text' }).pipe(
      catchError((err) => {
        console.error(`Failed to load doc: ${safeName}`, err);
        return of(
          `<div class="doc-card accent-red"><h2>Error</h2><p>Document not found: ${safeName}</p></div>`
        );
      })
    );
  }
}

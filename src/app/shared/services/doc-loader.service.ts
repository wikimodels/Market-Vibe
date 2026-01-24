import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DocLoaderService {
  private http = inject(HttpClient);

  /**
   * Загружает HTML файл по указанному пути.
   * @param path Полный путь (например, 'assets/html/z-velocity.html')
   */
  loadDoc(path: string): Observable<string> {
    return this.http.get(path, { responseType: 'text' }).pipe(
      catchError((err) => {
        console.error(`Failed to load doc: ${path}`, err);
        return of(
          `<div class="doc-error">
             <p>Unable to load document: ${path}</p>
           </div>`
        );
      })
    );
  }
}

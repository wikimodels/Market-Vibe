import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';

/**
 * Service that provides HTML content explanations for analytics widgets
 * Loads content from external HTML files in assets/data/html/
 */
@Injectable({
  providedIn: 'root',
})
export class WidgetInfoContentService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'assets/data/html';

  /**
   * Get HTML content for a specific widget
   * @param widgetId - Unique identifier for the widget
   * @returns Observable resolving to HTML string
   */
  public getContent(widgetId: string): Observable<string> {
    const url = `${this.baseUrl}/${widgetId}.html`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      catchError((err) => {
        console.warn(`[WidgetInfo] Failed to load content for ${widgetId}`, err);
        return of(`
          <h2>Widget Information</h2>
          <p>No information available for this widget yet.</p>
          <p><em>File not found: ${widgetId}.html</em></p>
        `);
      })
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class IconsRegisterService {
  private iconRegistry = inject(MatIconRegistry);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);

  // Возвращаем Promise, чтобы APP_INITIALIZER ждал окончания загрузки
  public registerIcons(): Promise<void> {
    // Загружаем сгенерированный JSON
    const request$ = this.http.get<string[]>('assets/icons-list.json').pipe(
      tap((icons) => {
        if (!icons || icons.length === 0) {
          console.warn('⚠️ No icons found in assets/icons-list.json');
          return;
        }

        icons.forEach((iconName) => {
          this.iconRegistry.addSvgIcon(
            iconName,
            this.sanitizer.bypassSecurityTrustResourceUrl(`assets/icons/${iconName}.svg`)
          );
        });

        console.log(`✅ Registered ${icons.length} icons successfully.`);
      })
    );

    // Превращаем Observable в Promise (современный подход)
    return lastValueFrom(request$).then(() => void 0);
  }
}

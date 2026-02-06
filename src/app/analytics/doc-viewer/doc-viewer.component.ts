import { Component, Input, ViewEncapsulation, inject, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { Observable, map } from 'rxjs';
import { DocLoaderService } from '../doc-loader.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-doc-viewer',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  templateUrl: './doc-viewer.component.html',
  // ВАЖНО: None позволяет стилям проникать внутрь innerHTML
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/analytics.scss'],
})
export class DocViewerComponent {
  private loader = inject(DocLoaderService);
  private sanitizer = inject(DomSanitizer);

  docContent$!: Observable<SafeHtml>;

  @Input()
  set filename(val: string) {
    if (val) {
      this.docContent$ = this.loader
        .loadDoc(val)
        .pipe(map((html) => this.sanitizer.bypassSecurityTrustHtml(html)));
    }
  }
}

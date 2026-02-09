import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AsyncPipe } from '@angular/common';
import { getGravatarUrl } from '../shared/utils/gravatar-url';
import { KlineCacheService } from '../shared/services/cache/kline-cache.service';

@Component({
  selector: 'app-navbar',
  imports: [
    AsyncPipe,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
    MatTooltipModule,
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  standalone: true,
})
export class Navbar {
  private authService = inject(AuthService);
  private klineCacheService = inject(KlineCacheService);

  user$ = this.authService.user$;

  getGravatarUrl(email: string | null | undefined): string {
    return getGravatarUrl(email, 100);
  }

  clearIndexDbCache() {
    this.klineCacheService.clearAllData();
  }

  login() {
    this.authService.loginWithGoogle();
  }

  logout() {
    this.authService.logout();
  }
}

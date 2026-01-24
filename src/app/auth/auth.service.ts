import { inject, Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user, User } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationService } from '../shared/services/notification.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  private router = inject(Router);

  user$: Observable<User | null> = user(this.auth);

  async loginWithGoogle(): Promise<void> {
    try {
      const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
      const email = credential.user.email;

      if (!email) {
        throw new Error('Email not provided by Google provider.');
      }

      const isAllowed = await this.checkEmailOnBackend(email);
      console.log('Is Allowed:', isAllowed, email);
      if (!isAllowed) {
        await signOut(this.auth);
        this.notification.error('Access Denied: Your email is not in the allowed list.');
        throw new Error('Access Denied: Your email is not in the allowed list.');
      }

      // ✅ Успех обрабатываем здесь
      this.router.navigate(['/triggered-line-alerts']);
    } catch (error: any) {
      console.error('Auth Service Login Error:', error);
      // ✅ Ошибку обрабатываем здесь
      //this.notification.error(error.message || 'Login failed');
      throw error; // Пробрасываем ошибку дальше, если компоненту нужно остановить спиннер
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  private async checkEmailOnBackend(email: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ exists: boolean }>(environment.authCheckUrl, { email })
      );
      return response.exists;
    } catch (error) {
      console.error('API Email Check Failed:', error);
      return false;
    }
  }
}

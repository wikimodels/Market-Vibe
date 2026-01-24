import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { AuthService } from './auth.service';
import { MatRippleModule } from '@angular/material/core';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [MatRippleModule], // Убрали лишние модули, используем нативный HTML/CSS
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent {
  private auth = inject(Auth);
  private router = inject(Router);
  private authService = inject(AuthService);

  login() {
    this.authService.loginWithGoogle();
  }
}

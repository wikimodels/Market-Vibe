import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CacheManagerComponent } from './cache-manager/cache-manager.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, CacheManagerComponent],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings {}

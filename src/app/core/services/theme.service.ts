import { Injectable, Renderer2, RendererFactory2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'dark' | 'light';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private renderer: Renderer2;
    private currentTheme$ = new BehaviorSubject<Theme>('dark');
    private prefersDarkQuery: MediaQueryList;

    constructor(
        rendererFactory: RendererFactory2,
        @Inject(DOCUMENT) private document: Document
    ) {
        this.renderer = rendererFactory.createRenderer(null, null);

        // Detect system color scheme preference
        this.prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Listen for system preference changes
        this.prefersDarkQuery.addEventListener('change', (e) => {
            const savedTheme = this.getSavedTheme();
            if (!savedTheme) {
                // If no saved preference, follow system
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Initialize theme from localStorage or system preference
        const savedTheme = this.getSavedTheme();
        const initialTheme = savedTheme || (this.prefersDarkQuery.matches ? 'dark' : 'light');
        this.setTheme(initialTheme);
    }

    /**
     * Get current theme as Observable
     */
    get theme$(): Observable<Theme> {
        return this.currentTheme$.asObservable();
    }

    /**
     * Get current theme value
     */
    get currentTheme(): Theme {
        return this.currentTheme$.value;
    }

    /**
     * Set theme (dark or light)
     */
    setTheme(theme: Theme): void {
        this.currentTheme$.next(theme);
        this.saveTheme(theme);
        this.applyTheme(theme);
    }

    /**
     * Toggle between dark and light themes
     */
    toggleTheme(): void {
        const newTheme: Theme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Apply theme to DOM
     */
    private applyTheme(theme: Theme): void {
        const root = this.document.documentElement;

        // Remove existing theme classes
        this.renderer.removeClass(root, 'theme-dark');
        this.renderer.removeClass(root, 'theme-light');

        // Apply new theme class
        this.renderer.addClass(root, `theme-${theme}`);

        // Update color-scheme meta tag
        this.updateColorSchemeMeta(theme);
    }

    /**
     * Update color-scheme meta tag for browser UI
     */
    private updateColorSchemeMeta(theme: Theme): void {
        let metaColorScheme = this.document.querySelector('meta[name="color-scheme"]');

        if (!metaColorScheme) {
            metaColorScheme = this.document.createElement('meta');
            metaColorScheme.setAttribute('name', 'color-scheme');
            this.document.head.appendChild(metaColorScheme);
        }

        metaColorScheme.setAttribute('content', theme);
    }

    /**
     * Save theme to localStorage
     */
    private saveTheme(theme: Theme): void {
        try {
            localStorage.setItem('app-theme', theme);
        } catch (error) {
            console.warn('Failed to save theme to localStorage:', error);
        }
    }

    /**
     * Get saved theme from localStorage
     */
    private getSavedTheme(): Theme | null {
        try {
            const saved = localStorage.getItem('app-theme');
            return saved === 'dark' || saved === 'light' ? saved : null;
        } catch (error) {
            console.warn('Failed to read theme from localStorage:', error);
            return null;
        }
    }

    /**
     * Check if system prefers dark mode
     */
    get systemPrefersDark(): boolean {
        return this.prefersDarkQuery.matches;
    }
}

import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class MobileDetectionService {
    // Signal to track mobile state reactively
    public isMobile = signal<boolean>(false);

    constructor() {
        this.checkDevice();
        // Listen for resize to re-check if user resizes browser (optional but good for testing)
        window.addEventListener('resize', () => this.checkDevice());
    }

    private checkDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

        // Regex for phones (excluding tablets involves ensuring no 'iPad' or 'Tablet' strings usually, 
        // but identifying phones directly is often safer).
        // Common phone keywords: Android (mobile), iPhone, etc.
        // We want to EXCLUDE tablets (iPad, Android tablets which often lack 'Mobile' string).

        const isAndroid = /android/i.test(userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isMobileString = /mobile/i.test(userAgent); // Android phones usually have "Mobile"

        // Rudimentary check:
        // 1. iPhone/iPod are phones.
        // 2. Android + Mobile are phones. Android without Mobile are often tablets.
        // 3. Screen width check < 768px (typical tablet breakpoint is 768).

        const isSmallScreen = window.innerWidth < 768;

        const isPhone = (isIOS && !/iPad/i.test(userAgent)) || (isAndroid && isMobileString);

        // We combine UA check with screen size to be robust. 
        // If it's a small screen, it's likely a phone or a very narrow browser window (which we can treat as mobile layout).
        this.isMobile.set(isPhone || (isSmallScreen && /Mobi|Android/i.test(userAgent)));

        // Or strictly rely on screen width for "responsive" behavior:
        // this.isMobile.set(window.innerWidth < 768); 

        // User requested "specifically mobile device, not tablet". 
        // Combining explicit UA "Mobile" flags with size is best.
    }
}

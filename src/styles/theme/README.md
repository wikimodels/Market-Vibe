# Dark Theme Architecture - Usage Guide

## Overview

Professional dark theme system for Market Vibe with SCSS design tokens, CSS Custom Properties, and runtime theme switching.

## Architecture

```
src/styles/theme/
├── _variables.scss  # Design tokens (colors, spacing, typography)
├── _mixins.scss     # Utilities (responsive, focus, transitions)
└── _themes.scss     # Theme maps (dark/light)
```

## Quick Start

### 1. Using Design Tokens in Components

```scss
@use 'styles/theme/variables' as vars;
@use 'styles/theme/mixins' as mix;

.my-component {
  // Use spacing tokens
  padding: map.get(vars.$spacing, 4);  // 16px
  
  // Use color tokens
  background: map.get(vars.$colors, neutral-700);
  
  // Use mixins
  @include mix.surface-card;
  @include mix.transition(background-color, border-color);
  
  // Responsive
  @include mix.mobile {
    padding: map.get(vars.$spacing, 2);  // 8px on mobile
  }
}
```

### 2. Using CSS Custom Properties

```scss
.my-element {
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}
```

### 3. Theme Switching in Angular

```typescript
import { ThemeService } from '@app/core/services/theme.service';

export class MyComponent {
  constructor(private themeService: ThemeService) {}
  
  toggleTheme() {
    this.themeService.toggleTheme();
  }
  
  setDarkTheme() {
    this.themeService.setTheme('dark');
  }
  
  setLightTheme() {
    this.themeService.setTheme('light');
  }
}
```

## Available Design Tokens

### Colors

```scss
// Primary palette
primary-900, primary-800, primary-700, primary-600, primary-500, primary-400

// Neutral palette
neutral-950, neutral-900, neutral-800, neutral-700, neutral-600, neutral-500,
neutral-400, neutral-300, neutral-200, neutral-100, neutral-50

// Semantic
success, warning, error, info

// Chart
chart-bullish, chart-bearish, chart-neutral
```

### Spacing (8px base)

```scss
0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px),
8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px)
```

### Typography

```scss
font-size-xs (12px), font-size-sm (14px), font-size-base (16px),
font-size-lg (18px), font-size-xl (20px), font-size-2xl (24px)

font-weight-normal (400), font-weight-medium (500),
font-weight-semibold (600), font-weight-bold (700)
```

## Available Mixins

### Responsive

```scss
@include mix.mobile { ... }    // max-width: 768px
@include mix.tablet { ... }    // 769px - 1024px
@include mix.desktop { ... }   // min-width: 1025px
```

### Surfaces

```scss
@include mix.surface-bg;       // Main background
@include mix.surface-card;     // Card background
@include mix.surface-elevated; // Elevated surface
@include mix.elevation(md);    // Surface + shadow
```

### Focus & Accessibility

```scss
@include mix.focus-ring;       // Accessible focus outline
@include mix.focus-visible;    // Focus on :focus-visible
```

### Transitions

```scss
@include mix.transition(background-color, color);
@include mix.transition-fast(opacity);
```

### Utilities

```scss
@include mix.flex-center;      // Flexbox center
@include mix.flex-between;     // Flexbox space-between
@include mix.truncate;         // Text ellipsis
@include mix.custom-scrollbar; // Styled scrollbar
```

## CSS Custom Properties (Runtime)

### Theme Variables

```css
/* Surfaces */
--surface-bg
--surface-card
--surface-elevated

/* Text */
--text-primary
--text-secondary
--text-muted
--text-disabled

/* Borders */
--border-subtle
--border-default
--border-strong

/* Interactive */
--hover-bg
--active-bg
--focus-ring

/* Semantic */
--success, --warning, --error, --info

/* Toolbar */
--toolbar-bg
--toolbar-text
```

## Examples

### Example 1: Card Component

```scss
@use 'styles/theme/variables' as vars;
@use 'styles/theme/mixins' as mix;

.card {
  @include mix.elevation(md);
  padding: map.get(vars.$spacing, 6);
  border-radius: map.get(vars.$border-radius, lg);
  
  @include mix.mobile {
    padding: map.get(vars.$spacing, 4);
  }
  
  &:hover {
    background: var(--hover-bg);
  }
}
```

### Example 2: Button with Focus

```scss
.button {
  padding: map.get(vars.$spacing, 2) map.get(vars.$spacing, 4);
  background: map.get(vars.$colors, primary-600);
  color: var(--text-primary);
  border-radius: map.get(vars.$border-radius, md);
  
  @include mix.transition(background-color, transform);
  @include mix.focus-visible;
  
  &:hover {
    background: map.get(vars.$colors, primary-500);
  }
}
```

### Example 3: Responsive Layout

```scss
.container {
  padding: map.get(vars.$spacing, 8);
  
  @include mix.mobile {
    padding: map.get(vars.$spacing, 4);
  }
  
  @include mix.tablet {
    padding: map.get(vars.$spacing, 6);
  }
}
```

## Best Practices

### ✅ DO

- Use design tokens for all colors, spacing, and typography
- Use mixins for common patterns (responsive, focus, transitions)
- Use CSS Custom Properties for runtime theming
- Respect `prefers-reduced-motion` (mixins handle this automatically)
- Use semantic color names (`success`, `error`) not specific colors

### ❌ DON'T

- Don't use hardcoded colors (`#1e1e1e`) - use tokens
- Don't use hardcoded spacing (`16px`) - use spacing scale
- Don't use `@import` - use `@use` and `@forward`
- Don't create custom transitions without `prefers-reduced-motion` check

## Migration Guide

### Before (Old Style)

```scss
.component {
  background: #1e1e1e;
  padding: 16px;
  color: #ffffff;
}
```

### After (New Style)

```scss
@use 'styles/theme/variables' as vars;
@use 'styles/theme/mixins' as mix;

.component {
  @include mix.surface-card;
  padding: map.get(vars.$spacing, 4);
  @include mix.text-primary;
}
```

## Troubleshooting

### SCSS Compilation Errors

If you see `Undefined variable` or `Undefined mixin`:

```scss
// Add at top of file
@use 'styles/theme/variables' as vars;
@use 'styles/theme/mixins' as mix;
```

### Theme Not Switching

1. Check ThemeService is injected in component
2. Verify `theme-dark` or `theme-light` class on `<html>`
3. Check browser console for errors

### Colors Not Updating

1. Ensure using CSS Custom Properties (`var(--surface-bg)`)
2. Check `_themes.scss` has correct color mappings
3. Clear browser cache and rebuild

## Performance

- **SCSS Compilation**: Design tokens are compiled at build time (no runtime cost)
- **CSS Custom Properties**: Minimal runtime cost, instant theme switching
- **File Size**: ~2KB additional CSS (minified + gzipped)

## Browser Support

- ✅ Chrome 49+
- ✅ Firefox 31+
- ✅ Safari 9.1+
- ✅ Edge 15+

## Future Enhancements

- [ ] Add more color palettes (blue, green, red themes)
- [ ] Add high contrast mode
- [ ] Add theme preview component
- [ ] Add CSS-in-JS support for dynamic theming

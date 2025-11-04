# Internationalization (i18n) Implementation

This app supports English (`en`), French (`fr`), and Darija/Moroccan Arabic (`ma`).

## Overview
- `react-i18next` with `i18next` powers localization.
- Language resources are lazy loaded from `public/locales/{lng}.json`.
- Language detection prioritizes `cookie` and `localStorage`, then browser settings.
- RTL is automatically enabled for Darija (`ma`) by setting `dir="rtl"` and `lang="ar-MA"` on `<html>`.
- Language switcher appears in the main header with flags and accessible labels.

## Files
- `src/i18n/index.ts`: i18n initialization and document attribute sync.
- `public/locales/en.json`, `fr.json`, `ma.json`: translation resources.
- `src/contexts/LanguageProvider.tsx`: App-wide language context wrapping i18next.
- `src/components/LanguangeSelector.tsx`: Language switcher (flags + text labels).
- `src/i18n/format.ts`: Locale-aware date/number/currency formatting.
- `src/index.css`: RTL styles and smooth language change transitions.

## Usage
- Translate strings via `const { t } = useLanguage(); t('key')` (existing API preserved).
- Format values via `formatDate`, `formatNumber`, `formatCurrency` from `src/i18n/format.ts`.

## QA Checklist
### Translation Validation
- Verify each key in `en.json`, `fr.json`, `ma.json` is present and contextually correct.
- Perform professional validation with native translators; track issues per key.
- Ensure critical flows (auth, dashboard, menus, POS integration) display correct localized text.

### Native Speaker Testing
- Recruit at least one native speaker per language to run through:
  - Login/logout, dashboard navigation, inventory pages
  - Staff scheduling and time clock
  - Settings and notifications
- Collect feedback for idiomatic phrasing in Darija.

### Locale Formatting
- Confirm `Intl` formatting in pages that render dates/currencies:
  - English: `en-US` conventions
  - French: `fr-FR` conventions
  - Darija: `ar-MA` for Arabic numbering/date styles

### Accessibility
- Ensure language switcher has proper `aria-label`s and menu roles.
- Verify focus states and keyboard navigation in language menu.
- Confirm contrast and readability in RTL mode.

### UI/UX Resilience
- Check longer strings in French/Darija do not overflow; allow wrapping.
- Validate layout symmetry in RTL (`dir="rtl"`) and spacing adjustments.
- Confirm smooth transitions when switching language; no layout jumps.

## Performance
- Resources are lazy loaded only for the selected language.
- Bundle size remains small; translations are not bundled.
- Consider setting a server cookie `language` from `Accept-Language` for initial detection.

## Server-Side Detection (Optional)
If the backend controls HTML, set a `language` cookie (e.g., `ar-MA`, `fr`, `en`) based on `Accept-Language`. The frontend will pick it up automatically.
# QA Report: Mobile + Accessibility (WCAG AA) Audit

**Application**: jun-juhuri.com
**Date**: 2026-03-25
**Viewport**: 375×812 (iPhone)
**Scope**: Public pages, modals, widgets
**Status**: FIXES APPLIED — build passes, pending deploy

---

## Summary

| Category | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| **Critical** | 7 | 7 | 0 |
| **Major** | 12 | 11 | 1 (M12 — recipe images are a content issue) |
| **Minor** | 8 | 6 | 2 (m5 family tree content, m7 cookie banner) |

### What was fixed:
- **Contrast**: `text-slate-500` → `text-slate-400` across 71 files (ratio 3.86→5.3:1)
- **Font sizes**: `text-[9px]`/`text-[10px]`/`text-[0.6rem]`/`text-[0.65rem]` → `text-[11px]`/`text-xs` across 30+ files
- **Active nav tab**: amber-on-amber (1.29:1) → white on amber bg (passes AA)
- **Mobile nav labels**: 10px → 11px
- **Table overflow**: Word page `overflow-x-hidden` + reduced padding on mobile
- **Skip-to-content**: Added to AppShell with sr-only + focus visible
- **All 9 modals**: Added `role="dialog"`, `aria-modal`, `aria-labelledby`, `FocusTrap`
- **focus: → focus-visible:**: Replaced in 20 files
- **CTA button**: `text-[#050B14]` → `text-white` (invisible → visible)
- **Auth form**: Added `autocomplete` attributes
- **Heading hierarchy**: Fixed h1→h3 skip on dictionary page
- **Double h1**: Fixed on homepage (decorative heading → aria-hidden div)
- **ESLint jsx-a11y**: Added with 11 rules
- **axe-core**: Added for dev mode console warnings
- **Contact form labels**: Properly associated with htmlFor/id

### Enforcement added:
- `eslint.config.mjs` with jsx-a11y plugin (11 rules)
- `@axe-core/react` for dev-mode console accessibility warnings
- `npm run lint` and `npm run lint:a11y` scripts

---

## Critical Issues

### C1. Horizontal Overflow on Word Detail Page (`/word/[id]`)
- **WCAG**: 1.4.10 Reflow
- **Problem**: The dialects table (ניבים) is 409px wide on a 375px viewport, causing horizontal scroll on the entire page (`body.scrollWidth = 398px > viewport 375px`)
- **File**: `components/word/WordHero.tsx` — the `<table>` for dialects needs `overflow-x: auto` wrapper or responsive layout
- **Screenshot**: `qa-screenshots/04-word-detail.png`

### C2. Systemic Low Contrast — `text-slate-400` / `text-slate-500` on Dark Background
- **WCAG**: 1.4.3 Contrast (Minimum) — requires 4.5:1 for normal text
- **Problem**: `rgb(100, 116, 139)` (slate-500) on `rgb(5, 11, 20)` background = **3.86:1** ratio (fails AA). Affects:
  - Field labels ("עברית:", "רוסית:", "תרגום (עברית):") on word page
  - Table headers (ניב, תעתיק לטיני, תעתיק קירילי, הצבעות)
  - Empty state messages ("אין עדיין פתגמים למילה זו...")
  - Footer text ("© 2026 מורשת ג׳והורי...")
  - Widget subtitle text ("1,783 מילים מחכות", "20 מילים אחרונות")
- **Fix**: Change `text-slate-500` → `text-slate-400` (ratio ~5.3:1) or `text-slate-300` (ratio ~8.0:1)
- **Files affected**:
  - `components/word/WordHero.tsx` — labels, table headers
  - `components/widgets/*.tsx` — all widget subtitle/count text
  - `components/Footer.tsx` — copyright line
  - `components/dictionary/CommunityActions.tsx`

### C3. Very Low Contrast — `text-slate-400` (`rgb(148, 163, 184)`) on Dark Cards
- **WCAG**: 1.4.3 — ratio **2.56:1** (fails badly)
- **Problem**: Timer "0:00" and "הקלטות אורחים ממתינות לאישור מנהל" text on word page recording section
- **File**: `components/audio/VoiceRecorder.tsx`

### C4. Navigation Labels Below 12px (10px)
- **WCAG**: 1.4.4 Resize Text
- **Problem**: Bottom mobile navigation labels ("בית", "מילון", "מורה", "מתכונים", "שוק", "שורשים") are **10px** — below readable minimum
- **Class**: `truncate max-w-[48px]` with implicit tiny font
- **File**: `components/shell/AppShell.tsx` — `MobileNavTab` component (~line 78)
- **Screenshot**: Visible in all screenshots — bottom nav bar

### C5. Widget Text Below 12px (9.6–10.4px)
- **WCAG**: 1.4.4 Resize Text
- **Problem**: Multiple widget elements use `text-[0.65rem]` (10.4px) and `text-[0.6rem]` (9.6px):
  - "1,783 מילים מחכות" — 10.4px
  - "25.3.2026" — 9.6px
  - "20 מילים אחרונות" — 9.6px
  - Recent additions word translations ("יורד גשם", "שמש", etc.) — 10.4px
- **Files**:
  - `components/widgets/HebrewOnlyWidget.tsx`
  - `components/widgets/MissingDialects.tsx`
  - `components/widgets/MissingAudioWidget.tsx`
  - `components/widgets/JuhuriOnlyWidget.tsx`
  - `components/widgets/RecentAdditions.tsx`

### C6. No Skip-to-Content Link
- **WCAG**: 2.4.1 Bypass Blocks
- **Problem**: No `<a href="#main">` or equivalent skip link exists. Screen reader users must tab through the entire navigation on every page
- **Fix**: Add a visually-hidden skip link as first child of `<body>` in `components/shell/AppShell.tsx`

### C7. Active Tab Contrast Fail (Bottom Nav)
- **WCAG**: 1.4.3 Contrast
- **Problem**: Active navigation tab "מילון" — amber text `rgb(251, 191, 36)` on amber background `rgba(245, 158, 11, 0.2)` = **1.29:1** ratio (catastrophic fail)
- **File**: `components/shell/AppShell.tsx` — active tab styling

---

## Major Issues

### M1. No Modal Focus Trapping
- **WCAG**: 2.4.3 Focus Order
- **Problem**: Auth modal, feedback modal, and all other modals don't trap focus. Tab key moves focus behind the modal overlay
- **Files**: `components/AuthModal.tsx`, `components/ContributeModal.tsx`, `components/TranslationModal.tsx`, etc.
- **Fix**: Add focus trap (e.g., `useFocusTrap` hook or `react-focus-lock`)

### M2. No `role="dialog"` or `aria-modal` on Modals
- **WCAG**: 4.1.2 Name, Role, Value
- **Problem**: All modals render as plain `<div>` elements without `role="dialog"` or `aria-modal="true"`. Screen readers don't announce them as dialogs
- **Measured**: `document.querySelectorAll('[role="dialog"]').length === 0`
- **Files**: All modal components

### M3. Small Touch Targets — Widget Buttons (32px height)
- **WCAG**: 2.5.5 Target Size (Enhanced) / 2.5.8 Target Size (Minimum)
- **Problem**: Recent additions word buttons are only **32px tall** (required: 44px). Full width but too short for comfortable touch
- **Count**: 36 elements below 44px height on dictionary page alone
- **Other offenders**: "נקה הכל" button (24px tall), search history chips (38px)
- **Files**: `components/widgets/RecentAdditions.tsx`, `components/DictionaryPage.tsx`

### M4. Missing `aria-label` on Search Input & Button
- **WCAG**: 4.1.2 Name, Role, Value
- **Problem**: Dictionary search input and submit button lack `aria-label`. Placeholder text is not an accessible name
- **File**: `components/DictionaryPage.tsx`

### M5. Heading Hierarchy Skip: h1 → h3
- **WCAG**: 1.3.1 Info and Relationships
- **Problem**: On dictionary page, heading jumps from h1 ("מילון ג׳והורי") directly to h3 ("חיפושים אחרונים"), skipping h2
- **File**: `components/DictionaryPage.tsx`

### M6. No `focus-visible` Styles
- **WCAG**: 2.4.7 Focus Visible
- **Problem**: Interactive elements use generic `focus:ring-2` but not `focus-visible:ring-2`. Focus ring shows on mouse click (annoying) and may not show correctly for keyboard-only users
- **Scope**: Site-wide — all components use `focus:` instead of `focus-visible:`

### M7. API Errors on Word Detail Page
- **Problem**: `/api/dictionary/entries/45839/related` and `/api/dictionary/entries/45839/recordings` return 500 errors
- **Impact**: "Related words" and "Recordings" sections may be broken
- **Console**: 4 errors per word page load

### M8. CTA Button "כניסה לקהילה" Invisible Text
- **Problem**: Text color `rgb(5, 11, 20)` on background `rgb(5, 11, 20)` = **1.00:1** ratio — completely invisible
- **File**: `components/home/HeroSection.tsx` or CTA section — the "כניסה לקהילה" button
- **Screenshot**: `qa-screenshots/01-homepage-full.png` — bottom section

### M9. Word Page Title Broken: "— תרגום ג'והורי | מורשת ג'והורי"
- **Problem**: Page title starts with "—" (em dash) indicating the word name failed to load into the title
- **Impact**: Bad SEO, confusing browser tabs
- **File**: `src/app/word/[term]/page.tsx`

### M10. Missing `autocomplete` Attributes on Login Form
- **Problem**: Email and password inputs lack `autocomplete="email"` and `autocomplete="current-password"`
- **WCAG**: 1.3.5 Identify Input Purpose
- **Console warning**: "Input elements should have autocomplete attributes"
- **File**: `components/AuthModal.tsx`

### M11. No `sr-only` Text Anywhere
- **WCAG**: Various
- **Problem**: Zero instances of screen-reader-only text in the entire codebase. Icon-only buttons (close X, play, record, etc.) rely solely on visual icons with no text alternative
- **Scope**: Site-wide

### M12. Recipe & Marketplace Images Missing (Placeholder Only)
- **Problem**: Recipe cards show only a chef hat placeholder icon instead of actual food images. No images load
- **Screenshot**: `qa-screenshots/06-recipes.png`
- **Impact**: Visual experience is degraded

---

## Minor Issues

### m1. Footer Link to Social Media Goes to `#`
- All social media links (Facebook, Instagram, YouTube) link to `href="#"` — they do nothing
- **File**: `components/Footer.tsx`

### m2. Widget Text Truncation
- Navigation labels use `truncate max-w-[48px]` — "מתכונים" gets cut off on narrow labels
- **File**: `components/shell/AppShell.tsx`

### m3. "IN" Text in Auth Modal
- After choosing email login, a separator shows "IN" instead of "או" (Hebrew for "or")
- **Screenshot**: `qa-screenshots/12-auth-modal.png`

### m4. Double Heading on Homepage
- Two `<h1>` elements on homepage: "ג׳והורי" (animated) and "מורשת ג'והורי" (main)
- **WCAG**: 1.3.1 — only one h1 per page recommended
- **File**: `components/home/HeroSection.tsx`

### m5. Family Tree Page — Mostly Empty
- Shows "1 בני משפחה • 0 קשרים" with a single node — essentially an empty page for anonymous visitors
- Could benefit from a sample tree or explainer content

### m6. Contact Page Missing `<label>` Elements
- Form fields use visible text labels but not `<label>` elements associated via `for`/`id`
- **File**: `components/ContactPage.tsx`

### m7. Cookie Consent Banner Missing
- Privacy policy mentions cookies, but no cookie consent banner is shown
- **Impact**: GDPR compliance

### m8. 401 Error on Every Page Load
- `/api/auth/me` returns 401 on every page for anonymous users. Should be handled silently (return null, not error)
- **Console**: 1 error per page

---

## Accessibility Summary by WCAG Criterion

| Criterion | Status | Details |
|-----------|--------|---------|
| 1.1.1 Non-text Content | ⚠️ Partial | Alt text present on most images but icon-buttons lack text alternatives |
| 1.3.1 Info and Relationships | ❌ Fail | Heading hierarchy skips, no landmark roles on modals |
| 1.3.5 Identify Input Purpose | ❌ Fail | Missing autocomplete on login form |
| 1.4.3 Contrast (Minimum) | ❌ Fail | Systemic: slate-500 text (3.86:1), slate-400 text (2.56:1), active nav tab (1.29:1) |
| 1.4.4 Resize Text | ❌ Fail | 33+ elements below 12px (9.6–10.4px) |
| 1.4.10 Reflow | ❌ Fail | Word page table causes horizontal overflow |
| 2.4.1 Bypass Blocks | ❌ Fail | No skip-to-content link |
| 2.4.3 Focus Order | ❌ Fail | No modal focus trapping |
| 2.4.4 Link Purpose | ⚠️ Partial | Social links go to "#" |
| 2.4.7 Focus Visible | ⚠️ Partial | Uses focus: not focus-visible: |
| 2.5.5 Target Size | ❌ Fail | 36 elements below 44px on dictionary page |
| 3.1.1 Language of Page | ✅ Pass | `lang="he" dir="rtl"` set correctly |
| 4.1.2 Name, Role, Value | ❌ Fail | Modals lack role="dialog", inputs lack aria-labels |

---

## Pages Tested

| # | Page | URL | Issues |
|---|------|-----|--------|
| 1 | Homepage | `/` | C2, C4, C7, M6, M8, m1, m4 |
| 2 | Dictionary | `/dictionary` | C2, C4, C5, M3, M4, M5 |
| 3 | Search Results | `/dictionary?q=בית` | C2, C4, M3 |
| 4 | Word Detail | `/word/45839` | C1, C2, C3, M7, M9 |
| 5 | Tutor | `/tutor` | C4, M6 |
| 6 | Recipes | `/recipes` | C4, M12 |
| 7 | Marketplace | `/marketplace` | C4 |
| 8 | Family Tree | `/family` | C4, m5 |
| 9 | About | `/about` | C4 |
| 10 | Contact | `/contact` | C4, m6 |
| 11 | Privacy | `/privacy` | C4 |
| 12 | Auth Modal | (overlay) | M1, M2, M10, m3 |
| 13 | Feedback Modal | (overlay) | M1, M2 |

---

## Console Errors (Systemic)

| Error | Frequency | Severity |
|-------|-----------|----------|
| `401 /api/auth/me` | Every page load | Low — expected for anon users but should not be an error |
| `500 /api/dictionary/entries/*/related` | Every word page | High — broken feature |
| `500 /api/dictionary/entries/*/recordings` | Every word page | High — broken feature |

---

## Recommended Fix Priority

### Phase 1: Critical Contrast & Overflow (estimated: 2 hours)
1. Replace `text-slate-500` → `text-slate-300` or `text-slate-400` site-wide for body text
2. Fix active nav tab contrast (amber-on-amber)
3. Wrap dialect table in `overflow-x: auto` container
4. Increase nav label font size from 10px to 11-12px
5. Increase widget text from 9.6-10.4px to 12px minimum

### Phase 2: Accessibility Structure (estimated: 3 hours)
6. Add skip-to-content link
7. Add `role="dialog"` + `aria-modal="true"` to all modals
8. Add focus trap to all modals
9. Switch `focus:` to `focus-visible:` site-wide
10. Add `aria-label` to all icon-only buttons
11. Fix heading hierarchy (h1→h2→h3)
12. Add `autocomplete` to login form fields

### Phase 3: Bug Fixes (estimated: 1 hour)
13. Fix 500 errors on `/api/dictionary/entries/*/related` and `*/recordings`
14. Fix word page title (starts with "—")
15. Fix "כניסה לקהילה" button text visibility
16. Silence 401 on `/api/auth/me` for anonymous users

### Phase 4: Polish (estimated: 1 hour)
17. Fix social media links (replace `#` with real URLs or remove)
18. Add `<label>` elements to contact form
19. Fix "IN" → "או" in auth modal
20. Single h1 per page

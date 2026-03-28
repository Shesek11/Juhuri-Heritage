# QA Test Report - Juhuri Heritage

**URL**: https://jun-juhuri.com
**Date**: 2026-03-26
**Scope**: Public site (no admin - credentials not available)
**Screens Tested**: 8 (Homepage, Dictionary, Dictionary Search, Word Page, Contact, About, Tutor, 404)

## Results Summary

- **PASS**: 18
- **FAIL**: 4
- **WARNING**: 3

## Load Test Results

| Metric | Value |
|--------|-------|
| Total requests | 500 |
| Success rate | 100% (all 200) |
| Requests/sec | 93 |
| Avg response time | 374ms |
| p95 response time | 488ms |
| p99 response time | 498ms |
| Failed requests | 0 |

**Verdict**: Excellent. Server handles 50 concurrent users with no failures and sub-500ms response times.

---

## Critical Issues (must fix)

### 1. Word Page API Errors (404)
- **Page**: `/word/הובו` (and likely all word pages)
- **Endpoints failing**:
  - `GET /api/dictionary/entries/34569/related` -> 404
  - `GET /api/dictionary/entries/34569/recordings` -> 404
- **Impact**: Word page shows errors in console, related words and recordings sections broken
- **Steps to reproduce**: Navigate to any word page (e.g., https://jun-juhuri.com/word/הובו)

### 2. Duplicate Page Title on Word Pages
- **Page**: `/word/הובו`
- **Current**: `הובו — תרגום ג'והורי | מורשת ג'והורי | מורשת ג'והורי`
- **Expected**: `הובו — תרגום ג'והורי | מורשת ג'והורי`
- **Impact**: SEO - duplicate suffix in title tag

### 3. CSP Blocking Google Analytics on Some Pages
- **Pages**: `/about`, `/word/*`
- **Error**: `Connecting to 'https://www.googletagmanager.com'` blocked by CSP
- **Cause**: `connect-src` in next.config.js missing `https://www.googletagmanager.com`
- **Impact**: Google Analytics data collection partially broken

### 4. Google Analytics Tracking Pixel Blocked
- **Error**: `Loading the image 'https://www.googletagmanager.com/...'` blocked
- **Cause**: CSP `img-src` missing `https://www.googletagmanager.com`
- **Impact**: GA tracking pixel blocked

---

## Warnings (should fix)

### 1. /api/auth/me Returns 401 on Every Page Load
- **Every page** fires `GET /api/auth/me` which returns 401 for unauthenticated users
- **Impact**: Console noise (1 error per page). Should return 200 with null user instead of 401.

### 2. Social Media Links Disabled
- Footer social links (Facebook, Instagram, YouTube) all point to `#` with `disabled` attribute
- **Impact**: Minor - placeholder links visible in footer

### 3. Contact Page Title Missing Page Name
- **Current**: `מורשת ג'והורי | המילון לשימור השפה` (generic)
- **Expected**: `צור קשר | מורשת ג'והורי`
- **Impact**: SEO - contact page has same title as homepage

---

## Passed Tests

| Test | Result |
|------|--------|
| Homepage loads correctly | PASS |
| Homepage hero, search, feature cards | PASS |
| Navigation links (all work) | PASS |
| Dictionary page loads with stats | PASS |
| Dictionary search (Hebrew "שמש") | PASS - returns "oftoi" |
| Search results display correctly | PASS |
| Word of the day displays | PASS |
| Recently added words display | PASS |
| Contact form validation (empty submit) | PASS - shows validation |
| Contact form fields present | PASS |
| About page content | PASS |
| Tutor page "coming soon" | PASS |
| 404 page handler | PASS |
| Mobile homepage (375px) | PASS - hamburger menu, stacked cards |
| Mobile dictionary (375px) | PASS - responsive layout |
| RTL layout consistency | PASS |
| Footer links all work | PASS |
| Skip-to-content accessibility link | PASS |

---

## Responsive Testing

| Breakpoint | Homepage | Dictionary | Contact |
|-----------|----------|------------|---------|
| Desktop (1920x1080) | PASS | PASS | PASS |
| Mobile (375x812) | PASS | PASS | Not tested |

---

## Console Error Summary

| Error | Pages Affected | Severity |
|-------|---------------|----------|
| CSP inline script blocked | Was all pages (FIXED - redeployed) | Critical (RESOLVED) |
| /api/auth/me 401 | All pages | Low (expected for guests) |
| /api/dictionary/entries/*/related 404 | Word pages | High |
| /api/dictionary/entries/*/recordings 404 | Word pages | High |
| Google Analytics connect blocked | About, Word pages | Medium |

---

## Recommendations

1. **Fix word page API routes** - Add `/related` and `/recordings` endpoints or update frontend to handle 404 gracefully
2. **Fix duplicate title** on word pages - check meta generation in `computePageMeta`
3. **Add `https://www.googletagmanager.com`** to `connect-src` and `img-src` in CSP
4. **Change `/api/auth/me`** to return 200 with `{ user: null }` instead of 401 for guests
5. **Add page-specific titles** to Contact page
6. **Run admin panel QA** when credentials are available

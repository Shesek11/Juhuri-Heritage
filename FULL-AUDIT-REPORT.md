# Full SEO + Security + Code Audit Report
## jun-juhuri.com — Post Next.js Migration
**Date:** 2026-03-13 | **Auditor:** Claude Code

---

## Executive Summary

### SEO Health Score: **62/100**

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical SEO | 55/100 | 25% | 13.75 |
| Content Quality | 80/100 | 25% | 20.00 |
| On-Page SEO | 55/100 | 20% | 11.00 |
| Schema / Structured Data | 45/100 | 10% | 4.50 |
| Performance (CWV) | 75/100 | 10% | 7.50 |
| Images | 60/100 | 5% | 3.00 |
| AI Search Readiness | 50/100 | 5% | 2.50 |

### Top 5 Critical Issues
1. **robots.txt returns wrong content** — Nginx serves static `public/robots.txt` instead of Next.js dynamic route
2. **No canonical tag on homepage, dictionary, tutor, about, family** — duplicate content risk
3. **OG URLs all point to homepage** — all pages share `og:url: https://jun-juhuri.com`
4. **No JSON-LD on homepage, dictionary, recipes listing, marketplace listing** — only detail pages have structured data
5. **No Content-Security-Policy header** — XSS protection gap

### Top 5 Quick Wins
1. Add `canonical` to all pages via layout metadata or per-page `generateMetadata`
2. Fix `og:url` to use page-specific URLs (change `url: '/'` in layout)
3. Delete `public/robots.txt` so Next.js dynamic route serves correctly
4. Add JSON-LD WebSite + Organization schema to root layout
5. Add `Content-Security-Policy` header to `next.config.js`

---

## 1. Technical SEO

### Crawlability

| Check | Status | Details |
|-------|--------|---------|
| robots.txt | CRITICAL | Returns old static file via Nginx, not dynamic Next.js route |
| sitemap.xml | OK | Dynamic sitemap works, 600+ URLs with lastmod + priority |
| HTTP to HTTPS redirect | OK | 301 redirect properly configured |
| Trailing slash redirect | OK | 308 redirect `/path/` to `/path` |
| 404 handling | OK | Returns proper 404 status code |
| HTML lang/dir | OK | `<html lang="he" dir="rtl">` |

### Indexability — Canonical Tags

| Page | Status | Details |
|------|--------|---------|
| Homepage | CRITICAL | Missing `<link rel="canonical">` |
| Dictionary | CRITICAL | Missing |
| Tutor | CRITICAL | Missing |
| About | CRITICAL | Missing |
| Family | CRITICAL | Missing |
| Privacy | HIGH | Missing |
| Recipes listing | OK | `https://jun-juhuri.com/recipes` |
| Marketplace listing | OK | `https://jun-juhuri.com/marketplace` |
| Recipe detail | OK | Per-page canonical |
| Vendor detail | OK | Per-page canonical |
| Word detail | OK | Per-page canonical |

### Security Headers

| Header | Status | Value |
|--------|--------|-------|
| X-Content-Type-Options | Present | nosniff |
| X-Frame-Options | Present | SAMEORIGIN |
| X-XSS-Protection | Present | 1; mode=block |
| Referrer-Policy | Present | strict-origin-when-cross-origin |
| Permissions-Policy | Present | geolocation=(self), camera=(), microphone=(self), payment=() |
| Strict-Transport-Security | Present | max-age=31536000; includeSubDomains; preload |
| Content-Security-Policy | MISSING | No CSP header at all |

---

## 2. On-Page SEO

### Title Tags — All Good

| Page | Title |
|------|-------|
| Homepage | מורשת ג'והורי - המילון לשימור השפה |
| Dictionary | מילון ג'והורי-עברי - מורשת ג'והורי |
| Tutor | מורה פרטי AI לג'והורית - מורשת ג'והורי |
| Recipes | מתכונים ג'והוריים - מורשת ג'והורי |
| Marketplace | שוק קהילתי - מורשת ג'והורי |
| Word detail | (dynamic per word) |
| Recipe detail | (dynamic per recipe) |
| About | ISSUE: Uses homepage default title, not page-specific |

### Open Graph Issues

| Issue | Severity | Details |
|-------|----------|---------|
| og:url identical everywhere | HIGH | All pages return `og:url: https://jun-juhuri.com`. Only pages with `generateMetadata()` override correctly. |
| og:image static everywhere | MEDIUM | All pages use `/images/og-default.png`. Recipe detail pages should use recipe photo. |

### Heading Structure

| Page | H1 | Issue |
|------|-----|-------|
| Homepage | Two H1 tags | Should have single H1 |
| Dictionary | Single H1 | OK |
| Tutor | Single H1 | OK |
| Recipes listing | H1 loaded client-side | Not in SSR HTML |
| Marketplace listing | H1 loaded client-side | Not in SSR HTML |
| About | No clear H1 | Only H3s and H4s |

---

## 3. Schema / Structured Data

| Page | JSON-LD Present | Schema Types |
|------|----------------|-------------|
| Homepage | NO | Needs: WebSite + Organization |
| Dictionary | NO | Needs: WebSite with SearchAction |
| Word detail | YES | DefinedTerm + WebSite + Organization + BreadcrumbList |
| Recipes listing | NO | Needs: ItemList |
| Recipe detail | YES (2 blocks) | Recipe + BreadcrumbList |
| Marketplace listing | NO | Needs: ItemList |
| Vendor detail | YES (2 blocks) | LocalBusiness + BreadcrumbList |
| Tutor | NO | Could add: Course / EducationalOrganization |

---

## 4. Content Quality and E-E-A-T

| Signal | Status | Details |
|--------|--------|---------|
| About page | Good | Detailed mission, team, methodology |
| Contact page | Good | Available |
| Privacy policy | Good | Complete |
| Accessibility statement | Good | Complete |
| Content depth | Good | Dictionary has 5000+ entries |
| Expertise signals | Good | Academic sources referenced |
| Authorship | Missing | No author markup on recipes/content |
| Freshness | Good | lastmod dates in sitemap |

---

## 5. Security Audit

### Authentication and Authorization
- All state-changing routes use `requireAuth` — OK
- Admin routes use `requireAdmin` — OK
- JWT stored in httpOnly cookies — OK
- Password hashing with bcrypt — OK

### SQL Injection
- All routes use parameterized queries (`?` placeholders) — OK
- `ensureSchema()` uses template literals but only with hardcoded constants — Acceptable

### File Upload Security
- File type validation — OK
- Size limits configured — OK
- Controlled filename generation (no path traversal) — OK
- Upload dir inside public/ — LOW risk (intended for public files)

### Rate Limiting
- Auth endpoints — Protected
- Gemini AI endpoints — Protected
- Upload endpoints — Protected
- General API — No global rate limit (MEDIUM risk)

### Information Disclosure
- Error responses use Hebrew messages, no stack traces — OK
- X-Powered-By reveals "Next.js" — LOW risk
- .env not accessible — OK

---

## 6. Performance

| Metric | Status | Details |
|--------|--------|---------|
| TTFB | Excellent | ~200ms (x-nextjs-cache: HIT) |
| SSR Coverage | Partial | Homepage, word detail, recipe detail, vendor detail are SSR |
| Client-only | Expected | Dictionary UI, tutor, family tree (interactive) |
| Cache Strategy | Good | s-maxage=31536000 for static pages |
| JS Bundle | Good | Code splitting with async chunks |

---

## 7. AI Search Readiness

| Signal | Status |
|--------|--------|
| llms.txt | Present and accessible |
| Structured data | Partial — only detail pages |
| Machine-readable definitions | Good on word pages via DefinedTerm schema |
| FAQ schema | Missing |

---

## Priority Action Plan

### CRITICAL (fix immediately)
1. Delete `public/robots.txt` — it shadows the dynamic Next.js `robots.ts` route
2. Add canonical tags to homepage, dictionary, tutor, about, family, privacy pages

### HIGH (fix within 1 week)
3. Fix og:url — change layout metadata `url: '/'` or add per-page overrides
4. Add JSON-LD to homepage (WebSite + Organization schemas)
5. Add Content-Security-Policy header to next.config.js
6. Add canonical to about page and fix its title/description

### MEDIUM (fix within 1 month)
7. Add JSON-LD to dictionary page (WebSite SearchAction)
8. Add ItemList JSON-LD to recipes and marketplace listing pages
9. Add BreadcrumbList to all pages
10. Fix homepage to have single H1
11. Improve word detail meta descriptions (currently too short)
12. Add global API rate limiting
13. Add page-specific OG images for recipe/vendor detail pages

### LOW (backlog)
14. Remove X-Powered-By header
15. Add author markup to recipes
16. Add preconnect hints for external resources (Google Analytics)
17. Add FAQ schema to about page
18. Add Course schema to tutor page

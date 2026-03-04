# Changelog

All notable changes to this project will be documented in this file.

## [3.1.0] - 2026-03-04

### 📖 Dictionary V2
- **New Schema**: Complete dictionary restructuring with per-field source tracking.
- **27K Entries**: Massive import from multiple sources (Bukvar, Naftalijev, Phrasebook, Juhuri-RU).
- **Unified Dictionary**: Merged and deduplicated entries across all sources.
- **Dashboard Widgets**: Improved dictionary statistics and recent additions display.

### 🔍 SEO
- **Full SEO Implementation**: React Router integration, dynamic meta tags, JSON-LD structured data, XML sitemap.
- **Admin SEO Panel**: Meta templates, robots.txt editor, redirect management.
- **Branding Assets**: Upload and manage favicon, OG images, and branding from admin panel.
- **llms.txt Editor**: AI-friendly site description management.
- **Critical Fixes**: Googlebot user-agent handling, sitemap entry limits, robots.txt improvements.

### 🏪 Marketplace Improvements
- **Community Marketplace**: Full vendor system with map, ratings, and demo data for Hadera/Pardes Hana area.
- **Map Fixes**: Fixed initial tile loading, FitBounds, and auto-fit for all vendors.
- **Rating System**: Fixed null/undefined avg_rating handling in API and client.

### 👨‍👩‍👧‍👦 Family Tree
- **Russian Localization**: Full Russian language support for member profiles.
- **City Fields**: Birth city and current city fields with autocomplete.
- **Date Picker**: Modern date selection for birth/death dates.
- **Admin Management**: Merge suggestions and connection request handling interface.

### 🎨 Design
- **New Visual Theme**: Gold/burgundy palette with Noto fonts for elegant heritage feel.

### 🍲 Recipes & Tags
- **Tag Management**: Full admin panel for recipe tags with categories, editing modal, and enrichment.
- **Admin Redesign**: Sidebar navigation with improved icon previews.

### 🔒 Security
- **Security Hardening**: Comprehensive v3.0.1 security improvements.
- **Encrypted API Keys**: Gemini API key encrypted storage in admin panel.

### 🛠️ Admin & Technical
- **Server-side Pagination**: Handles 26K+ entries efficiently in admin panel.
- **Migration System**: JavaScript-based migration runner with .env support and DELIMITER handling.
- **DB Alignment**: Unified environment variable naming (DB_USERNAME, DB_DATABASE).

---

## [2.5.0] - 2026-01-21

### ✨ UI/UX Overhaul
- **Header Redesign**: Complete modern redesign with gradient logo, centered navigation tabs, admin dropdown hover menu.
- **Responsive Mobile Nav**: Compact, scalable navigation bar with icon-based tabs for small screens.
- **Floating CTA**: "הוסף מילה" button moved to a prominent floating position in dictionary area.

### 🔧 Feature Flags System
- **4-State Control**: Features can now be `disabled`, `admin_only`, `coming_soon`, or `active`.
- **"Coming Soon" Badges**: Visual indicator for features in development.
- **Admin Preview**: Administrators can access `coming_soon` features before public release.

### 🛠️ Admin Improvements
- **Translation Suggestions Panel**: New section in AdminDashboard for managing community translation contributions.
- **Audio Playback**: Listen to audio recordings attached to translation suggestions.
- **Correction Badges**: Visual indicator distinguishing corrections vs new translations.
- **Approve/Reject Actions**: Quick moderation buttons for each suggestion.

### 📝 Enhanced Contribution Modal
- **Full Translation Fields**: Hebrew, Latin, and Cyrillic spelling options.
- **Audio Recording**: Built-in microphone recording with playback, timer, and re-record.
- **Improved Validation**: Better feedback and error handling.
- **Modern UI**: Gradient header, responsive design, max-height scroll.

### 🐛 Bug Fixes
- Fixed async `getDialects()` call causing modal crash.
- Fixed email notification system routing.

---

## [2.0.1] - 2026-01-16

### 🐛 Fixes & Improvements
- **UI Fixes**: Fixed non-functional "Add Recipe" and "Create Family Tree" buttons in empty states.
- **Authentication**: Replaced Auth0 legacy email/password login with native implementation (Passport.js Google Auth + Native Email).
- **Deployment**: Improved deployment stability and environment variable handling.

## [2.0.0] - 2026-01-15

### 🍲 Community & Culture Expansion
Complete transformation into a heritage platform.

### ✨ New Features
- **Recipes Module**: Community cookbook with ingredients, instructions, and social features (likes, comments).
- **Marketplace**: "Find near me" map for Juhuri food vendors and restaurants.
- **Family Tree**: Interactive genealogy builder to map community roots (`reactflow`).
- **User Profiles**: Enhanced profiles with avatars and activity tracking.

### 🛠️ Technical Improvements
- **Database**: Added migrations system, user avatars, and robust seed data.
- **Performance**: Optimized rendering for large family trees.
- **Visuals**: Premium Dark Mode UI adjustments and improved RTL support.

## [1.0.0] - 2026-01-12

### ⭐ Stable Release
First complete stable release of the Juhuri Heritage Dictionary.

### 🚀 Features
- **Smart Dictionary**: Full AI integration with Gemini 3 Flash.
- **Tutor Mode**: Interactive learning with "Saba Mordechai".
- **Admin Dashboard**: Complete management system for users, dialects, and entries.
- **Dialect Support**: Quba, Derbent, Vartashen (Oghuz).
- **Audio**: Speech-to-text search capabilities.

### 🐛 Fixes
- Fixed async/await issues in Admin Dashboard filtering.
- Fixed Gemini API model names and timeouts.
- Enforced Hebrew-only output for definitions.

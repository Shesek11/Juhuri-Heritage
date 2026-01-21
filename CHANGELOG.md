# Changelog

All notable changes to this project will be documented in this file.

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

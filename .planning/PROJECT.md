# Juhuri Heritage

## What This Is

A web platform for preserving and teaching the endangered Juhuri (Judeo-Tat) language. Features a community dictionary, recipe book, marketplace, family tree builder, and an AI-powered private tutor. Built with Next.js 16, React 19, Tailwind CSS, MariaDB, and Gemini AI. Deployed at jun-juhuri.com.

## Core Value

Preserve the Juhuri language by making it accessible, learnable, and engaging for the diaspora community — especially younger generations who may not have grown up speaking it.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- Dictionary with multi-dialect search (Hebrew/Latin/Cyrillic), community voting, TTS audio
- Recipe book with photos, tags, community comments
- Marketplace with vendor profiles and map
- Family tree builder with GEDCOM import
- Auth system (email/password, Google OAuth, RBAC roles)
- Admin dashboard (entries, users, SEO, feature flags)
- Basic tutor with 6 units, AI-generated exercises, free chat with "Saba Mordechai"
- Gamification basics (XP, levels, streaks, badges)
- SEO: prerender, meta, sitemap, JSON-LD

### Active

<!-- Current scope. Building toward these. -->

- [ ] Dictionary-powered exercise engine (template-based, not AI-generated)
- [ ] Structured curriculum: 15 units across 4 sections with progression
- [ ] 12 exercise types (recognition, production, listening, speed/game)
- [ ] Leitner 5-box spaced repetition system (SRS)
- [ ] Per-word mastery tracking
- [ ] 5-level unit mastery (crown system)
- [ ] Daily goal system with visual progress ring
- [ ] Review mode (SRS-powered practice sessions)
- [ ] Cultural integration (notes linking to recipes, proverbs, traditions)
- [ ] Celebration animations and milestone notifications
- [ ] Gentle feedback (no hearts/lives — corrections with explanations)

### Out of Scope

<!-- Explicit boundaries. -->

- Leaderboards — community too small for meaningful competition
- Hearts/lives system — punitive mechanics inappropriate for endangered language learners
- Speech recognition — no training data for Juhuri pronunciation scoring
- Offline mode — deferred to future (PWA would be a separate milestone)
- AI-generated exercises — replaced by dictionary-data-driven templates (Gemini stays for chat only)

## Current Milestone: v1.0 Private Tutor Overhaul

**Goal:** Transform the basic AI-powered tutor prototype into a Duolingo-inspired, dictionary-data-driven, gamified learning platform with SRS, 12 exercise types, structured curriculum, mastery levels, and cultural integration.

**Target features:**
- Data-driven exercise engine using real dictionary entries
- 15-unit curriculum across 4 thematic sections
- 12 exercise types (up from 4)
- Leitner spaced repetition for word-level mastery
- 5-level crown system per unit
- Daily goals, review mode, celebrations
- Cultural integration with existing content

## Context

- ~500+ dictionary entries exist in MariaDB, multi-dialect with translations
- Existing TTS via Gemini (generateSpeech) works for audio exercises
- Current tutor generates all exercises via Gemini API (slow, costly, inconsistent)
- Users table already has xp, level, streak, completedUnits fields
- user_progress table tracks unit completion but not word-level mastery
- Existing gamification API routes: award-xp, badges, stats, check-login-streak
- Feature flags system can gate new features during rollout

## Constraints

- **Database**: MariaDB on xCloud managed hosting, no sudo access
- **AI costs**: Minimize Gemini API calls — dictionary-template exercises don't need AI
- **Content volume**: ~500 dictionary entries available; curriculum must work with this
- **Auth**: JWT-based, existing system — no changes needed
- **Deployment**: PM2 on xCloud, deploy.sh script, Next.js standalone build
- **RTL**: Hebrew is primary UI language, RTL layout throughout

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dictionary-powered exercises over AI-generated | Faster (instant), cheaper (no API), consistent quality | — Pending |
| Leitner SRS over SM-2/FSRS | Simpler to implement, sufficient for vocabulary learning, can upgrade later | — Pending |
| No hearts/lives | Endangered language learners need encouragement, not punishment | — Pending |
| 15 units / 4 sections | Matches available dictionary content (~500 words), expandable | — Pending |
| 12 exercise types | Covers recognition → production → speed progression, inspired by Duolingo/Drops | — Pending |

---
*Last updated: 2026-03-15 after milestone v1.0 initialization*

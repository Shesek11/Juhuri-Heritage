# Roadmap: Juhuri Heritage — v1.0 Private Tutor Overhaul

## Overview

Transform the basic AI-powered tutor prototype into a Duolingo-inspired, dictionary-data-driven learning platform. Six phases move from data foundation through SRS engine, 12 exercise types, curriculum UI, gamification polish, and finally content population — delivering a complete learning system rooted in real Juhuri dictionary data.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Data Foundation** - DB schema, curriculum service, exercise generator, TypeScript types
- [ ] **Phase 2: SRS Engine** - Leitner 5-box service, SRS API routes, review mode integration
- [ ] **Phase 3: Exercise Components** - All 12 exercise types, lesson engine, audio integration, feedback system
- [ ] **Phase 4: Learning Path UI** - Section/unit map, mastery levels, daily goal ring, cultural notes
- [ ] **Phase 5: Gamification & Polish** - Weekly summary, milestone celebrations, animations, sounds
- [ ] **Phase 6: Integration & Content** - Populate unit_words, link cultural notes, mobile QA, full regression

## Phase Details

### Phase 1: Data Foundation
**Goal**: The data layer that powers the entire tutor exists — schemas, services, types, and generator logic are in place and testable
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, ENGN-01, ENGN-02, CURR-07
**Success Criteria** (what must be TRUE):
  1. All five DB tables (unit_words, word_mastery, unit_mastery, daily_progress, user_daily_goals) exist with correct schema and can be queried
  2. The curriculum service returns 4 sections and 15 units with words drawn from the dictionary database
  3. The exercise generator produces a valid exercise (with correct answer and plausible distractors) for every supported exercise type given a word
  4. Admin can assign dictionary words to units via a migration script or admin panel action
  5. All API routes for curriculum data, progress tracking, and SRS operations respond with correct shape (testable via curl or test suite)
**Plans**: TBD

### Phase 2: SRS Engine
**Goal**: The Leitner 5-box spaced repetition system is fully functional — words move through boxes based on correctness, review sessions surface due words, and progress is persisted per user
**Depends on**: Phase 1
**Requirements**: ENGN-05, ENGN-06, ENGN-07, ENGN-08
**Success Criteria** (what must be TRUE):
  1. After answering a word correctly, the word advances to the next Leitner box and its next-review date is updated to the correct interval (1/3/7/14 days)
  2. After answering incorrectly, the word is returned to box 1 regardless of its current box
  3. Entering review mode shows only words whose next-review date is today or earlier
  4. A user with no due words sees a "nothing due today" state rather than an empty broken view
**Plans**: TBD

### Phase 3: Exercise Components
**Goal**: All 12 exercise types are implemented as React components, driven by dictionary data, with audio on every Juhuri word and gentle feedback on wrong answers
**Depends on**: Phase 1
**Requirements**: EXER-01, EXER-02, EXER-03, EXER-04, EXER-05, EXER-06, EXER-07, EXER-08, EXER-09, EXER-10, EXER-11, EXER-12, ENGN-03, ENGN-04, ENGN-09, ENGN-10
**Success Criteria** (what must be TRUE):
  1. A user can complete a full lesson of ~12 exercises mixing new word introductions, recognition, and production types without hitting a blank screen or error
  2. Every exercise that displays or plays a Juhuri word has a working audio button that triggers TTS playback
  3. On a wrong answer, the correct answer and an explanation are shown — no hearts, lives, or score penalty icons
  4. All 12 named exercise types (multiple-choice, matching pairs, audio recognition, context association, word-bank Juhuri→Hebrew, word-bank Hebrew→Juhuri, fill-in-the-blank, spelling challenge, listen-and-select, dictation, speed-match, true/false flash) are reachable during a lesson
**Plans**: TBD

### Phase 4: Learning Path UI
**Goal**: Users can navigate a structured, visual learning map with 4 sections and 15 units, see their mastery level per unit, and discover cultural notes as they progress
**Depends on**: Phase 3
**Requirements**: CURR-01, CURR-02, CURR-03, CURR-04, CURR-05, CURR-06, CULT-01, CULT-02, CULT-03, GAME-01, GAME-02, GAME-04
**Success Criteria** (what must be TRUE):
  1. User sees the 4 sections and 15 units laid out as a visual map; locked units show a lock icon and completed units show the correct mastery crown level
  2. User cannot tap a locked unit — the next unit unlocks only after the preceding unit is completed
  3. A checkpoint test appears between sections and must be passed before the first unit of the next section becomes available
  4. User sees a circular progress ring on their home/tutor screen showing daily XP earned vs. their chosen goal, and can change their daily XP goal from 5/10/15/20 options
  5. A "Did you know?" cultural note is visible on at least one unit from each content category (food units link to recipe pages; proverbs unit shows real dictionary proverbs)
**Plans**: TBD

### Phase 5: Gamification & Polish
**Goal**: Lesson completions feel rewarding — celebration screens, word-count milestones, a weekly summary, and subtle audio/visual feedback make progress tangible
**Depends on**: Phase 4
**Requirements**: GAME-03, GAME-05, GAME-06
**Success Criteria** (what must be TRUE):
  1. Completing a lesson shows an animated celebration screen displaying exact XP gained before returning to the learning map
  2. Reaching 25, 50, 100, and 200 words learned each triggers a distinct celebration animation/notification
  3. User can view a weekly summary showing words learned, words reviewed, lessons completed, and current streak for the past 7 days
**Plans**: TBD

### Phase 6: Integration & Content
**Goal**: The tutor ships with real Juhuri content — unit_words populated from the dictionary, cultural notes linked, mobile layout verified, and no blocking bugs remaining
**Depends on**: Phase 5
**Requirements**: CURR-02 (content population), DATA-07 (migration execution)
**Success Criteria** (what must be TRUE):
  1. Every unit shows 12–15 real Juhuri words sourced from the dictionary database (no placeholder/seed-only content)
  2. The full learning flow (sign in → pick unit → complete lesson → see celebration → return to map) works on a 375px mobile viewport without layout breaks or scroll overflow
  3. Food-related units link to actual recipe pages that exist on the site; the proverbs unit exercises use real proverbs from the dictionary
  4. No console errors and no 500 responses during a full lesson session on production

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 0/? | Not started | - |
| 2. SRS Engine | 0/? | Not started | - |
| 3. Exercise Components | 0/? | Not started | - |
| 4. Learning Path UI | 0/? | Not started | - |
| 5. Gamification & Polish | 0/? | Not started | - |
| 6. Integration & Content | 0/? | Not started | - |

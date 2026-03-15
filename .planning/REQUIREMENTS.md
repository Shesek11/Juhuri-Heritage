# Requirements: Juhuri Heritage — Private Tutor Overhaul

**Defined:** 2026-03-15
**Core Value:** Preserve the Juhuri language by making it accessible, learnable, and engaging

## v1.0 Requirements

Requirements for the Private Tutor overhaul. Each maps to roadmap phases.

### Curriculum

- [ ] **CURR-01**: User sees a structured learning path with 4 sections and 15 units
- [ ] **CURR-02**: Each unit displays 12-15 words pulled from the dictionary database
- [ ] **CURR-03**: Units unlock sequentially within a section (linear progression)
- [ ] **CURR-04**: User must pass a checkpoint test to advance to the next section
- [ ] **CURR-05**: Each unit has 5 mastery levels (Bronze → Silver → Gold → Platinum → Diamond)
- [ ] **CURR-06**: Replaying a unit at higher mastery introduces harder exercise types and higher accuracy thresholds
- [ ] **CURR-07**: Admin can assign dictionary words to curriculum units via admin panel or migration script

### Exercises

- [ ] **EXER-01**: User can complete multiple-choice translation exercises (Juhuri → Hebrew)
- [ ] **EXER-02**: User can complete matching pairs exercises (tap 5 Juhuri-Hebrew pairs)
- [ ] **EXER-03**: User can complete audio recognition exercises (hear word, select written form)
- [ ] **EXER-04**: User can complete context/picture association exercises (word + hint, pick meaning)
- [ ] **EXER-05**: User can complete word-bank translation exercises (Hebrew → Juhuri, arrange tiles)
- [ ] **EXER-06**: User can complete word-bank translation exercises (Juhuri → Hebrew)
- [ ] **EXER-07**: User can complete fill-in-the-blank exercises (sentence with missing word)
- [ ] **EXER-08**: User can complete spelling challenge exercises (arrange jumbled letters)
- [ ] **EXER-09**: User can complete listen-and-select exercises (hear audio, pick translation)
- [ ] **EXER-10**: User can complete dictation exercises (hear word, type it)
- [ ] **EXER-11**: User can complete speed-match exercises (timed matching pairs)
- [ ] **EXER-12**: User can complete true/false flash exercises (quick translation judgments)

### Learning Engine

- [ ] **ENGN-01**: Exercises are generated from dictionary data via templates (no AI API calls)
- [ ] **ENGN-02**: Exercise generator produces valid distractors from same-unit or same-category words
- [ ] **ENGN-03**: Each lesson contains ~12 exercises completable in ~5 minutes
- [ ] **ENGN-04**: Lessons mix new word introductions, recognition, production, and review exercises
- [ ] **ENGN-05**: Leitner 5-box SRS tracks per-word mastery (box 1-5, next review date)
- [ ] **ENGN-06**: Correct answer moves word up one box; incorrect sends word back to box 1
- [ ] **ENGN-07**: Review schedule: Box 1 = every session, Box 2 = 1 day, Box 3 = 3 days, Box 4 = 7 days, Box 5 = 14 days
- [ ] **ENGN-08**: User can enter review mode to practice words due for SRS review
- [ ] **ENGN-09**: Feedback shows correct answer and explanation — no hearts/lives penalty
- [ ] **ENGN-10**: Audio (TTS) is available on every exercise that involves a Juhuri word

### Gamification

- [ ] **GAME-01**: User can set a daily XP goal (5, 10, 15, or 20 XP)
- [ ] **GAME-02**: User sees a circular progress ring showing daily XP progress toward goal
- [ ] **GAME-03**: User sees word count milestones with celebration animations (25, 50, 100, 200 words)
- [ ] **GAME-04**: User earns XP for lesson completion (based on accuracy)
- [ ] **GAME-05**: Lesson completion shows animated celebration screen with XP gained
- [ ] **GAME-06**: User sees a weekly summary (words learned, reviewed, lessons completed, streak)

### Cultural Integration

- [ ] **CULT-01**: Each unit has a "Did you know?" cultural note linking to relevant site content
- [ ] **CULT-02**: Food-related units link to recipe pages
- [ ] **CULT-03**: Proverbs unit uses real proverbs from the dictionary

### Data & Infrastructure

- [ ] **DATA-01**: DB table `unit_words` maps dictionary entries to curriculum units
- [ ] **DATA-02**: DB table `word_mastery` tracks per-user, per-word SRS state
- [ ] **DATA-03**: DB table `unit_mastery` tracks per-user, per-unit mastery level (0-5)
- [ ] **DATA-04**: DB table `daily_progress` logs daily XP, words learned/reviewed, lessons completed
- [ ] **DATA-05**: DB table `user_daily_goals` stores user's chosen daily XP target
- [ ] **DATA-06**: API routes for curriculum data, progress tracking, SRS operations
- [ ] **DATA-07**: Migration script to populate `unit_words` with real dictionary entries

## v2 Requirements

Deferred to future milestones.

### Advanced Learning

- **ADV-01**: Offline/PWA support for learning without connectivity
- **ADV-02**: Speech recognition for pronunciation practice
- **ADV-03**: AI-generated example sentences for words lacking examples
- **ADV-04**: Placement test to skip ahead for advanced learners

### Social

- **SOCL-01**: Leaderboards for XP comparison
- **SOCL-02**: Share learning milestones to social media
- **SOCL-03**: Study groups or partner learning

## Out of Scope

| Feature | Reason |
|---------|--------|
| Leaderboards | Community too small for meaningful competition |
| Hearts/lives system | Punitive for endangered language learners |
| Speech recognition scoring | No Juhuri pronunciation training data |
| Offline/PWA | Separate infrastructure milestone |
| AI-generated exercises | Replaced by dictionary-template engine (faster, cheaper, consistent) |
| Grammar lessons | Juhuri lacks standardized grammar documentation; focus on vocabulary |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| DATA-06 | Phase 1 | Pending |
| DATA-07 | Phase 1 | Pending |
| ENGN-01 | Phase 1 | Pending |
| ENGN-02 | Phase 1 | Pending |
| CURR-07 | Phase 1 | Pending |
| ENGN-05 | Phase 2 | Pending |
| ENGN-06 | Phase 2 | Pending |
| ENGN-07 | Phase 2 | Pending |
| ENGN-08 | Phase 2 | Pending |
| EXER-01 | Phase 3 | Pending |
| EXER-02 | Phase 3 | Pending |
| EXER-03 | Phase 3 | Pending |
| EXER-04 | Phase 3 | Pending |
| EXER-05 | Phase 3 | Pending |
| EXER-06 | Phase 3 | Pending |
| EXER-07 | Phase 3 | Pending |
| EXER-08 | Phase 3 | Pending |
| EXER-09 | Phase 3 | Pending |
| EXER-10 | Phase 3 | Pending |
| EXER-11 | Phase 3 | Pending |
| EXER-12 | Phase 3 | Pending |
| ENGN-03 | Phase 3 | Pending |
| ENGN-04 | Phase 3 | Pending |
| ENGN-09 | Phase 3 | Pending |
| ENGN-10 | Phase 3 | Pending |
| CURR-01 | Phase 4 | Pending |
| CURR-02 | Phase 4 | Pending |
| CURR-03 | Phase 4 | Pending |
| CURR-04 | Phase 4 | Pending |
| CURR-05 | Phase 4 | Pending |
| CURR-06 | Phase 4 | Pending |
| CULT-01 | Phase 4 | Pending |
| CULT-02 | Phase 4 | Pending |
| CULT-03 | Phase 4 | Pending |
| GAME-01 | Phase 4 | Pending |
| GAME-02 | Phase 4 | Pending |
| GAME-04 | Phase 4 | Pending |
| GAME-03 | Phase 5 | Pending |
| GAME-05 | Phase 5 | Pending |
| GAME-06 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

Note: CURR-02 and DATA-07 appear in both Phase 1 (infrastructure) and Phase 6 (content population execution). Phase 6 covers the execution/QA aspect; Phase 1 covers the schema/service/script creation. Each requirement is counted once at its primary delivery phase.

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation*

# Enrich Plan - Batch AI Enrichment for Dictionary

## Status: ON HOLD
Waiting for potential dictionary restructure before executing.

## Goal
Run Gemini AI enrichment on all ~26,000 dictionary entries to pre-fill missing fields:
- latin (Latin transliteration)
- cyrillic (Cyrillic script)
- examples (2-3 usage examples)
- pronunciationGuide

## Current State
- Enrich endpoint exists: `POST /api/gemini/enrich` (server/routes/gemini.js:262)
- Frontend calls enrich fire-and-forget but results are discarded (services/geminiService.ts:24)
- Results are NOT saved to DB - only returned to caller

## Cost Estimate
- Model: gemini-2.5-flash (temperature: 0, maxOutputTokens: 2048)
- Input: ~200 tokens/entry, Output: ~300 tokens/entry
- Total: ~5.2M input + ~7.8M output tokens
- Cost: ~$5.50 USD for all 26K entries
- Time: ~13 minutes at 2,000 RPM (paid tier)

## Implementation Plan
1. Create batch script (e.g., scripts/batch-enrich.js)
2. Query DB for entries with missing fields (latin, cyrillic, examples, pronunciationGuide)
3. Call Gemini enrich for each entry (10 concurrent requests)
4. Save results directly to DB (translations table for latin/cyrillic, examples table, dictionary_entries for pronunciationGuide)
5. Log progress and errors
6. Remove fire-and-forget call from frontend after batch completes

## Notes
- Consider disabling thinking tokens: `thinkingConfig: { thinkingBudget: 0 }` to reduce cost
- Not all entries will need all fields - actual cost likely lower
- Need to decide on DB schema changes before running (user considering restructure)

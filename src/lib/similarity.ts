/**
 * Jaro-Winkler similarity for short Hebrew strings.
 * Returns 0.0-1.0 (1 = identical). Gives prefix bonus up to 4 chars.
 * Better than Levenshtein for 3-4 character words.
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0, transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) prefix++; else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Weighted Levenshtein distance with per-character substitution costs.
 * Juhuri-specific: ז→ג costs 0.15, צ→ג costs 0.5, ט↔ת costs 0.1, etc.
 */
const SUBST_COST: Record<string, Record<string, number>> = {
  'ז': { 'ג': 0.15, 'צ': 0.6 },
  'ג': { 'ז': 0.15, 'צ': 0.5 },
  'צ': { 'ג': 0.5,  'ז': 0.6 },
  'ת': { 'ט': 0.1 },
  'ט': { 'ת': 0.1 },
  'ש': { 'ס': 0.1 },
  'ס': { 'ש': 0.1 },
  'כ': { 'ק': 0.1,  'ח': 0.1 },
  'ק': { 'כ': 0.1,  'ח': 0.15 },
  'ח': { 'כ': 0.1,  'ק': 0.15 },
  'א': { 'ע': 0.1,  'ה': 0.2 },
  'ע': { 'א': 0.1,  'ה': 0.2 },
  'ה': { 'א': 0.2,  'ע': 0.2 },
};

function substCost(a: string, b: string): number {
  if (a === b) return 0;
  return SUBST_COST[a]?.[b] ?? SUBST_COST[b]?.[a] ?? 1.0;
}

export function weightedLevenshtein(s: string, t: string): number {
  const m = s.length, n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = substCost(s[i - 1], t[j - 1]);
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }

  return d[m][n];
}

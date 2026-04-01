/**
 * Shared OG image utilities — fonts, logo, and the base layout component.
 * Used by opengraph-image.tsx across different routes.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

// Load once at module level (cached across requests)
export const rubikRegular = readFileSync(
  join(process.cwd(), 'src/assets/fonts/Rubik-Regular.ttf')
);
export const rubikBold = readFileSync(
  join(process.cwd(), 'src/assets/fonts/Rubik-Bold.ttf')
);

const logoPng = readFileSync(
  join(process.cwd(), 'src/assets/logo-og.png')
);
export const logoBase64 = `data:image/png;base64,${logoPng.toString('base64')}`;

export const ogFonts = [
  { name: 'Rubik', data: rubikRegular, weight: 400 as const, style: 'normal' as const },
  { name: 'Rubik', data: rubikBold, weight: 700 as const, style: 'normal' as const },
];

/** Reverse Hebrew string for Satori (no native bidi) */
export function bidi(s: string): string {
  return [...s].reverse().join('');
}

/** Truncate text with ellipsis at word boundary */
export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.lastIndexOf(' ', max - 1);
  return s.slice(0, cut > 0 ? cut : max) + '…';
}

/** Compute font size based on text length */
export function autoFontSize(text: string): number {
  const len = text.length;
  if (len > 25) return 48;
  if (len > 12) return 60;
  return 72;
}

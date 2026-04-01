/**
 * Generate multiple OG image samples to test edge cases.
 * Run: node scripts/generate-og-samples.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const logoPng = readFileSync(join(projectRoot, 'public/images/logo-trimmed.png'));
const logoBase64 = `data:image/png;base64,${logoPng.toString('base64')}`;

async function fetchFont(url) {
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

const reverseHebrew = (s) => [...s].reverse().join('');

function buildOgJsx({ latin, hebrew, english, russian }) {
  // Auto-size: shrink font for long text
  const mainLen = latin.length;
  const mainFontSize = mainLen > 30 ? 36 : mainLen > 20 ? 48 : mainLen > 12 ? 60 : 72;

  const transLen = Math.max(hebrew.length, english.length, russian.length);
  const transFontSize = transLen > 40 ? 18 : transLen > 25 ? 22 : 28;

  const hebrewReversed = reverseHebrew(hebrew);
  const siteNameReversed = reverseHebrew("מורשת ג'והורי");

  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #050B14 0%, #0a1628 50%, #050B14 100%)',
        fontFamily: 'Rubik',
        position: 'relative',
        overflow: 'hidden',
        padding: '0 60px',
      },
      children: [
        // Border
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '16px', left: '16px', right: '16px', bottom: '16px',
              border: '1px solid rgba(217, 119, 6, 0.15)',
              borderRadius: '12px',
            },
          },
        },
        // Logo
        {
          type: 'img',
          props: {
            src: logoBase64,
            width: 64,
            height: 64,
            style: { marginBottom: '20px', opacity: 0.9 },
          },
        },
        // Latin transliteration (auto-sized)
        {
          type: 'div',
          props: {
            style: {
              fontSize: `${mainFontSize}px`,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-1px',
              lineHeight: 1.2,
              textAlign: 'center',
              maxWidth: '1000px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            },
            children: latin,
          },
        },
        // Divider dot
        {
          type: 'div',
          props: {
            style: {
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: '#d97706',
              margin: '16px 0',
            },
          },
        },
        // Three translations
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: `${transFontSize}px`,
              color: '#d97706',
              fontWeight: 400,
              maxWidth: '1000px',
              textAlign: 'center',
              flexWrap: 'wrap',
              justifyContent: 'center',
            },
            children: [
              { type: 'span', props: { style: { direction: 'rtl', unicodeBidi: 'bidi-override' }, children: hebrewReversed } },
              { type: 'span', props: { style: { color: 'rgba(217, 119, 6, 0.4)', fontSize: '14px' }, children: '|' } },
              { type: 'span', props: { children: english } },
              { type: 'span', props: { style: { color: 'rgba(217, 119, 6, 0.4)', fontSize: '14px' }, children: '|' } },
              { type: 'span', props: { children: russian } },
            ],
          },
        },
        // Bottom bar
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px',
              color: 'rgba(255,255,255,0.4)',
            },
            children: [
              { type: 'span', props: { style: { direction: 'rtl', unicodeBidi: 'bidi-override' }, children: siteNameReversed } },
              { type: 'span', props: { style: { color: 'rgba(255,255,255,0.2)' }, children: '·' } },
              { type: 'span', props: { children: 'jun-juhuri.com' } },
            ],
          },
        },
      ],
    },
  };
}

const samples = [
  {
    name: 'short-word',
    latin: 'Sholem',
    hebrew: 'שלום',
    english: 'Peace',
    russian: 'Мир',
  },
  {
    name: 'medium-word',
    latin: 'Bedbehdigho',
    hebrew: 'אומלל, מסכן',
    english: 'Unfortunate, miserable',
    russian: 'Несчастный, жалкий',
  },
  {
    name: 'long-phrase',
    latin: 'Ey koghozi ge seney deshde miyod?',
    hebrew: 'איזה נייר צריך לשים על השולחן?',
    english: 'Which paper should be placed on the table?',
    russian: 'Какую бумагу нужно положить на стол?',
  },
  {
    name: 'very-long',
    latin: 'Ombiruz donishgoh ge peresigho besiyori seftehoy ovurden',
    hebrew: 'המורה של בית הספר שילמד את התלמידים את השירים החדשים',
    english: 'The school teacher who will teach the students the new songs',
    russian: 'Школьный учитель, который научит учеников новым песням',
  },
  {
    name: 'page-title',
    latin: 'Dictionary',
    hebrew: 'מילון',
    english: 'Interactive Juhuri-Hebrew Dictionary',
    russian: 'Интерактивный джуури-ивритский словарь',
  },
];

async function main() {
  const satori = (await import('satori')).default;
  const sharp = (await import('sharp')).default;

  console.log('Fetching Rubik font...');
  const rubikRegular = await fetchFont('https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1UA.ttf');
  const rubikBold = await fetchFont('https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1UE80V4bVkA.ttf');

  const fonts = [
    { name: 'Rubik', data: rubikRegular, weight: 400, style: 'normal' },
    { name: 'Rubik', data: rubikBold, weight: 700, style: 'normal' },
  ];

  for (const sample of samples) {
    console.log(`Generating: ${sample.name}...`);
    const jsx = buildOgJsx(sample);
    const svg = await satori(jsx, { width: 1200, height: 630, fonts });
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    const pngPath = join(projectRoot, `public/images/og-sample-${sample.name}.png`);
    writeFileSync(pngPath, pngBuffer);
    console.log(`  → ${pngPath} (${(pngBuffer.length / 1024).toFixed(0)} KB)`);
  }
}

main().catch(console.error);

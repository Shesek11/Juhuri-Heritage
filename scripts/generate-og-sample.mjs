/**
 * Generate a sample OG image to preview the design.
 * Run: node scripts/generate-og-sample.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Read logo and convert to base64 data URI
const logoPng = readFileSync(join(projectRoot, 'public/images/logo-trimmed.png'));
const logoBase64 = `data:image/png;base64,${logoPng.toString('base64')}`;

// Download Rubik font for Satori
const fontUrl = 'https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1UE80V4bVkA.ttf';
const fontBoldUrl = 'https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1UE80V4bVkA.ttf';

async function fetchFont(url) {
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  // Dynamic import of satori (bundled with next)
  const satori = (await import('satori')).default;

  // Fetch Rubik font
  console.log('Fetching Rubik font...');
  const rubikRegular = await fetchFont('https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1UA.ttf');
  const rubikBold = await fetchFont('https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1UE80V4bVkA.ttf');

  // Sample word data
  // Reverse Hebrew strings for Satori (no bidi support)
  const reverseHebrew = (s) => [...s].reverse().join('');
  const word = {
    latin: 'Sholem',
    hebrew: reverseHebrew('שלום'),
    russian: 'Мир',
    english: 'Peace',
    siteName: reverseHebrew("מורשת ג'והורי"),
  };

  const jsx = {
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
      },
      children: [
        // Subtle decorative border
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              bottom: '16px',
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
            width: 72,
            height: 72,
            style: { marginBottom: '24px', opacity: 0.9 },
          },
        },
        // Latin transliteration (main/large)
        {
          type: 'div',
          props: {
            style: {
              fontSize: '72px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-1px',
              lineHeight: 1.1,
            },
            children: word.latin,
          },
        },
        // Divider dot
        {
          type: 'div',
          props: {
            style: {
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#d97706',
              margin: '20px 0',
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
              gap: '20px',
              fontSize: '28px',
              color: '#d97706',
              fontWeight: 400,
            },
            children: [
              { type: 'span', props: { style: { direction: 'rtl', unicodeBidi: 'bidi-override' }, children: word.hebrew } },
              { type: 'span', props: { style: { color: 'rgba(217, 119, 6, 0.4)', fontSize: '16px' }, children: '|' } },
              { type: 'span', props: { children: word.english } },
              { type: 'span', props: { style: { color: 'rgba(217, 119, 6, 0.4)', fontSize: '16px' }, children: '|' } },
              { type: 'span', props: { children: word.russian } },
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
              { type: 'span', props: { style: { direction: 'rtl', unicodeBidi: 'bidi-override' }, children: word.siteName } },
              { type: 'span', props: { style: { color: 'rgba(255,255,255,0.2)' }, children: '·' } },
              { type: 'span', props: { children: 'jun-juhuri.com' } },
            ],
          },
        },
      ],
    },
  };

  console.log('Rendering SVG with Satori...');
  const svg = await satori(jsx, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Rubik', data: rubikRegular, weight: 400, style: 'normal' },
      { name: 'Rubik', data: rubikBold, weight: 700, style: 'normal' },
    ],
  });

  // Save SVG
  const svgPath = join(projectRoot, 'public/images/og-sample.svg');
  writeFileSync(svgPath, svg);
  console.log(`SVG saved to ${svgPath}`);

  // Convert to PNG using sharp
  const sharp = (await import('sharp')).default;
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const pngPath = join(projectRoot, 'public/images/og-sample.png');
  writeFileSync(pngPath, pngBuffer);
  console.log(`PNG saved to ${pngPath} (${(pngBuffer.length / 1024).toFixed(0)} KB)`);
}

main().catch(console.error);

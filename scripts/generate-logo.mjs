import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Logo generation ---
const logoPrompt = `Design a professional logo for "Juhuri Heritage" — a web platform preserving the Juhuri language of Mountain Jews from the Caucasus.

Requirements:
- Clean, modern logo that works at any size (512px down to 16px favicon)
- Incorporate a subtle Caucasian geometric motif inspired by traditional carpet/rug patterns (stepped medallion, diamond shapes)
- Color palette: warm amber/gold (#f59e0b) as primary, with dark brown/charcoal (#1c1917) background or accents
- The geometric symbol should be simple enough to serve as a standalone favicon/icon
- DO NOT include any text in the logo — symbol/icon only
- Style: modern minimalist with traditional geometric roots
- The shape should be compact and work well in a circle or square crop
- Think of it as a cultural heritage emblem — dignified, timeless, geometric`;

console.log("Generating logo...");

const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: logoPrompt,
  config: {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: "1:1",
      imageSize: "2K",
    },
  },
});

let imageCount = 0;
for (const part of response.candidates[0].content.parts) {
  if (part.thought) {
    if (part.text) console.log("Thinking:", part.text.slice(0, 200));
  } else if (part.text) {
    console.log("Response:", part.text);
  } else if (part.inlineData) {
    imageCount++;
    const buffer = Buffer.from(part.inlineData.data, "base64");
    const filename = `public/images/logo-concept-${imageCount}.png`;
    fs.writeFileSync(filename, buffer);
    console.log(`Saved: ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
  }
}

if (imageCount === 0) {
  console.log("No image was generated. Full response:");
  console.log(JSON.stringify(response.candidates[0].content.parts.map(p => p.text || '[image]'), null, 2));
}

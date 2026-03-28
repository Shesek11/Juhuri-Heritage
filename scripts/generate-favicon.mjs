import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Generate a second variation
const prompt2 = `Design a professional icon/emblem for "Juhuri Heritage" — a cultural preservation platform for Mountain Jews of the Caucasus.

Requirements:
- Symbol only, NO text at all
- Must be extremely clear and recognizable at 32x32 pixels (favicon size)
- Use a single Caucasian geometric carpet motif — a stepped diamond/medallion
- Color: amber gold (#f59e0b) on transparent or very dark (#18181b) background
- Flat design, no gradients, no shadows — just clean geometric lines
- The motif should feel like a traditional Caucasian rug pattern distilled to its simplest form
- Think: one central diamond with stepped edges, minimal detail
- Should work as a favicon, app icon, and watermark`;

console.log("Generating variation 2...");

const response2 = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: prompt2,
  config: {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: "1:1",
      imageSize: "1K",
    },
  },
});

for (const part of response2.candidates[0].content.parts) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("public/images/logo-concept-2.png", buffer);
    console.log(`Saved: logo-concept-2.png (${(buffer.length / 1024).toFixed(0)} KB)`);
  } else if (part.text && !part.thought) {
    console.log("Response:", part.text);
  }
}

// Generate variation 3 — incorporating Hebrew letter or book motif
const prompt3 = `Design a professional emblem for a Juhuri (Mountain Jewish) language preservation project.

Requirements:
- Symbol only, NO text
- Combine a geometric Caucasian stepped-diamond pattern with a subtle open book or scroll motif (representing language/dictionary)
- Color: amber/gold (#f59e0b) lines on dark charcoal (#1c1917) background
- Clean vector-style, minimal, modern
- Must read well at small sizes (favicon)
- Elegant and dignified — this is about preserving an endangered language
- The book/scroll element should be subtle, integrated into the geometric pattern`;

console.log("Generating variation 3...");

const response3 = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: prompt3,
  config: {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: "1:1",
      imageSize: "1K",
    },
  },
});

for (const part of response3.candidates[0].content.parts) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("public/images/logo-concept-3.png", buffer);
    console.log(`Saved: logo-concept-3.png (${(buffer.length / 1024).toFixed(0)} KB)`);
  } else if (part.text && !part.thought) {
    console.log("Response:", part.text);
  }
}

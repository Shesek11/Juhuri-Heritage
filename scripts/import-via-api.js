#!/usr/bin/env node

/**
 * Import dictionary entries via the existing batch API endpoint.
 * Works remotely — no direct DB access needed.
 */

const fs = require('fs');
const https = require('https');
const http = require('http');

const API_BASE = process.argv[3] || 'https://jun-juhuri.com';
const BATCH_SIZE = 50;

async function login(base) {
  const email = process.env.ADMIN_EMAIL || 'shimonsv@gmail.com';
  const password = process.env.ADMIN_PASSWORD || '';

  if (!password) {
    console.error('Set ADMIN_PASSWORD env var');
    process.exit(1);
  }

  return post(base + '/api/auth/login', { email, password });
}

function post(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;

    const req = mod.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
      },
    }, (res) => {
      let result = '';
      res.on('data', c => result += c);
      res.on('end', () => {
        try { resolve(JSON.parse(result)); }
        catch (e) { reject(new Error('Response: ' + result.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: ADMIN_PASSWORD=xxx node import-via-api.js <json-file> [api-base-url]');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const entries = data.entries;
  console.log('File: ' + inputPath);
  console.log('Source: ' + (data.sourceName || 'unknown'));
  console.log('Entries: ' + entries.length);
  console.log('API: ' + API_BASE + '\n');

  // Login
  console.log('Authenticating...');
  const authResult = await login(API_BASE);
  if (!authResult.token) {
    console.error('Auth failed:', JSON.stringify(authResult));
    process.exit(1);
  }
  const token = authResult.token;
  console.log('Authenticated.\n');

  // Convert entries to API format
  const apiEntries = entries.map(e => {
    const term = e.term || e.latin || e.cyrillic || '';
    return {
      term,
      detectedLanguage: 'Juhuri',
      pronunciationGuide: e.pronunciationGuide || null,
      source: e.source || data.source || 'מאגר',
      sourceName: e.sourceName || data.sourceName || null,
      translations: [{
        dialect: e.dialect || '',
        hebrew: e.hebrew || '',
        latin: e.latin || '',
        cyrillic: e.cyrillic || '',
      }],
      definitions: e.definition ? [e.definition] : [],
    };
  });

  // Send in batches
  let totalImported = 0;
  const batches = [];
  for (let i = 0; i < apiEntries.length; i += BATCH_SIZE) {
    batches.push(apiEntries.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    try {
      const result = await post(
        API_BASE + '/api/dictionary/entries/batch',
        { entries: batches[i] },
        token
      );
      const added = result.addedCount || 0;
      totalImported += added;
      console.log('[' + (i + 1) + '/' + batches.length + '] +' + added + ' (total: ' + totalImported + ')');
    } catch (err) {
      console.error('[' + (i + 1) + '] Error: ' + err.message);
    }
  }

  console.log('\nDone! Imported: ' + totalImported);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

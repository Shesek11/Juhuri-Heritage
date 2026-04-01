import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';
import fs from 'fs/promises';
import path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const LOCALES = ['he', 'en', 'ru'] as const;

// GET: Return all translations as { namespace.key: { he, en, ru } }
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const messages: Record<string, Record<string, any>> = {};
    for (const locale of LOCALES) {
      const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      messages[locale] = JSON.parse(content);
    }

    // Flatten all keys from all locales into a unified structure
    const allKeys = new Set<string>();
    for (const locale of LOCALES) {
      flattenKeys(messages[locale], '', allKeys);
    }

    const translations: Record<string, Record<string, string>> = {};
    for (const key of Array.from(allKeys).sort()) {
      translations[key] = {};
      for (const locale of LOCALES) {
        translations[key][locale] = getNestedValue(messages[locale], key) || '';
      }
    }

    return NextResponse.json({ translations });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error loading translations:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT: Update a single translation key for a specific locale
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { key, locale, value } = await request.json();

    if (!key || !locale || typeof value !== 'string') {
      return NextResponse.json({ error: 'Missing key, locale, or value' }, { status: 400 });
    }

    if (!LOCALES.includes(locale as any)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const messages = JSON.parse(content);

    setNestedValue(messages, key, value);

    await fs.writeFile(filePath, JSON.stringify(messages, null, 2) + '\n', 'utf-8');

    await logEvent('TRANSLATION_UPDATED', `תרגום עודכן: ${key} (${locale})`, user, { key, locale, value }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating translation:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper: flatten nested object keys with dot notation
function flattenKeys(obj: any, prefix: string, keys: Set<string>) {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flattenKeys(v, fullKey, keys);
    } else {
      keys.add(fullKey);
    }
  }
}

// Helper: get value from nested object by dot-notation key
function getNestedValue(obj: any, key: string): string {
  const parts = key.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return '';
    current = current[part];
  }
  return typeof current === 'string' ? current : '';
}

// Helper: set value in nested object by dot-notation key
function setNestedValue(obj: any, key: string, value: string) {
  const parts = key.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

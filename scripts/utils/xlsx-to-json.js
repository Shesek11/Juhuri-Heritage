#!/usr/bin/env node

/**
 * Simple Excel-to-JSON converter for Claude Code skill.
 * Reads an Excel file and outputs raw row data as JSON to stdout.
 *
 * Usage: node scripts/utils/xlsx-to-json.js <filepath>
 */

const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node xlsx-to-json.js <filepath>');
  process.exit(1);
}

try {
  const workbook = XLSX.readFile(path.resolve(filePath));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Output as array of objects (header row becomes keys)
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  console.log(JSON.stringify(jsonData, null, 2));
} catch (err) {
  console.error(`Error reading ${filePath}: ${err.message}`);
  process.exit(1);
}

#!/usr/bin/env tsx
/**
 * CLI Tool: update-richtlinien.ts
 *
 * Re-usable utility to update, inspect, normalize, and validate `richtlinien.json`
 * starting from future revised PDF text/OCR or JSON inputs.
 *
 * Usage:
 *   npx tsx scripts/update-richtlinien.ts --validate
 *   npx tsx scripts/update-richtlinien.ts --stats
 *   npx tsx scripts/update-richtlinien.ts --normalize "Förderpläne für Schülerinnen und Schüler"
 *   npx tsx scripts/update-richtlinien.ts --input ./new_version.json --output ./richtlinien.json
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeGermanText,
  deepNormalize,
  findRemainingUmlauts,
  validateGuidelinesSchema,
  parseRawGuidelineText,
} from '../src/utils/richtlinienTools.ts';

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
=== RICHTLINIEN UPDATE & MAINTENANCE TOOL ===
Official Guideline Normalizer & Schema Verifier for Grundschule Förderpläne

Options:
  --help, -h               Show this documentation
  --validate, -v           Validate current richtlinien.json against schema and zero-umlaut constraint
  --stats, -s              Display content statistics (Schwerpunkte, categories, IST/SOLL/LERNWEG pairs, checklist items)
  --normalize <text>       Test German umlaut normalization on a string (ä->ae, ö->oe, ü->ue, ß->ss)
  --input <path>           Path to new revised text or JSON file to process
  --output <path>          Destination path (default: ./richtlinien.json and ./src/data/richtlinien.json)
  --parse-text <path>      Parse raw OCR text file into IST/SOLL/LERNWEG entries
  --generate-backup        Create a timestamped backup of current richtlinien.json

Example:
  npx tsx scripts/update-richtlinien.ts --validate
  npx tsx scripts/update-richtlinien.ts --input /path/to/revised.json
`);
}

async function main() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const projectRoot = process.cwd();
  const rootJsonPath = path.resolve(projectRoot, 'richtlinien.json');
  const srcJsonPath = path.resolve(projectRoot, 'src/data/richtlinien.json');

  if (args.includes('--normalize')) {
    const idx = args.indexOf('--normalize');
    const input = args[idx + 1] || '';
    const res = normalizeGermanText(input);
    console.log('\n--- Input Text ---');
    console.log(input);
    console.log('--- Normalized Text (Base letters for small local LLMs) ---');
    console.log(res);
    return;
  }

  if (args.includes('--validate') || args.includes('-v')) {
    console.log(`\nValidating: ${rootJsonPath}`);
    if (!fs.existsSync(rootJsonPath)) {
      console.error(`Error: File not found at ${rootJsonPath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(rootJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const result = validateGuidelinesSchema(parsed);

    if (result.valid) {
      console.log('✅ VALIDATION PASSED: 100% schema compliant, zero un-normalized umlauts.');
      console.log('Stats:', JSON.stringify(result.stats, null, 2));
    } else {
      console.error('❌ VALIDATION FAILED:');
      for (const err of result.errors) {
        console.error('  - ' + err);
      }
      process.exit(1);
    }
    return;
  }

  if (args.includes('--stats') || args.includes('-s')) {
    if (!fs.existsSync(rootJsonPath)) {
      console.error(`Error: File not found at ${rootJsonPath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(rootJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const result = validateGuidelinesSchema(parsed);
    console.log('\n--- Richtlinien Content Statistics ---');
    console.log(`Dokument: ${result.stats.documentTitle}`);
    console.log(`Version: ${result.stats.version} (Gueltig ab: ${result.stats.gueltigAb})`);
    console.log(`Foerderschwerpunkte: ${result.stats.foerderschwerpunkteCount}`);
    console.log(`Kategorien: ${result.stats.categoriesCount}`);
    console.log(`IST/SOLL/LERNWEG Paare: ${result.stats.istSollLernwegPairsCount}`);
    console.log(`Checklisten-Kriterien: ${result.stats.checklistCriteriaCount}`);
    return;
  }

  if (args.includes('--generate-backup')) {
    if (fs.existsSync(rootJsonPath)) {
      const backupPath = path.resolve(projectRoot, `richtlinien_backup_${Date.now()}.json`);
      fs.copyFileSync(rootJsonPath, backupPath);
      console.log(`Backup created at: ${backupPath}`);
    } else {
      console.log('No existing richtlinien.json found to backup.');
    }
    return;
  }

  if (args.includes('--parse-text')) {
    const idx = args.indexOf('--parse-text');
    const textPath = args[idx + 1];
    if (!textPath || !fs.existsSync(textPath)) {
      console.error(`File not found: ${textPath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(textPath, 'utf-8');
    const entries = parseRawGuidelineText(raw);
    console.log(`Parsed ${entries.length} entries from ${textPath}`);
    console.log(JSON.stringify(entries.slice(0, 3), null, 2));
    return;
  }

  if (args.includes('--input')) {
    const idx = args.indexOf('--input');
    const inputPath = args[idx + 1];
    if (!inputPath || !fs.existsSync(inputPath)) {
      console.error(`Input file not found: ${inputPath}`);
      process.exit(1);
    }
    console.log(`Reading input from: ${inputPath}`);
    const rawContent = fs.readFileSync(inputPath, 'utf-8');
    let dataToProcess: any;

    try {
      dataToProcess = JSON.parse(rawContent);
    } catch {
      console.log('Input is not JSON. Parsing as raw text blocks...');
      const entries = parseRawGuidelineText(rawContent);
      console.log(`Extracted ${entries.length} IST/SOLL/LERNWEG entries.`);
      return;
    }

    console.log('Normalizing German umlauts across all fields...');
    const normalizedData = deepNormalize(dataToProcess);

    const validation = validateGuidelinesSchema(normalizedData);
    if (!validation.valid) {
      console.warn('⚠️ Warning: Validation found potential issues:');
      for (const err of validation.errors) {
        console.warn('  - ' + err);
      }
    } else {
      console.log('✅ Normalized data passed schema validation!');
    }

    const outIdx = args.indexOf('--output');
    const outTarget = outIdx !== -1 && args[outIdx + 1] ? path.resolve(projectRoot, args[outIdx + 1]) : rootJsonPath;

    fs.writeFileSync(outTarget, JSON.stringify(normalizedData, null, 2), 'utf-8');
    console.log(`Saved updated guidelines to: ${outTarget}`);

    // If writing to root, also synchronize to /src/data
    if (outTarget === rootJsonPath) {
      fs.mkdirSync(path.dirname(srcJsonPath), { recursive: true });
      fs.writeFileSync(srcJsonPath, JSON.stringify(normalizedData, null, 2), 'utf-8');
      console.log(`Synchronized copy to: ${srcJsonPath}`);
    }
  }
}

main().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});

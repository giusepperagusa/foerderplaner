/**
 * Utility functions for guideline normalization, schema validation,
 * parsing of revised PDF texts, and data synchronization.
 */

export interface ChecklistCriterion {
  id: string;
  unterbereich?: string;
  label: string;
  gewichtung: 'leicht' | 'mittel' | 'schwer' | string;
}

export interface GuidelineEntry {
  ist: string;
  soll: string;
  lernweg: string[];
}

export interface GuidelineCategory {
  kategorie: string;
  beschreibung: string;
  eintraege: GuidelineEntry[];
  tipps_sekundarstufe?: string[];
}

export interface FoerderschwerpunktData {
  kuerzel: string;
  definition: string;
  bewertungskriterien: string[];
  foerderschwerpunkte_innerhalb: string[];
  empfohlene_foerdermassnahmen: string[];
  kategorien?: GuidelineCategory[];
}

export interface RichtlinienSchema {
  dokument: string;
  version: string;
  gueltigAb: string;
  herausgeber: string;
  hinweis: string;
  foerderschwerpunkte: Record<string, FoerderschwerpunktData>;
  checklisten: {
    kognitiv: {
      bereich: string;
      beschreibung?: string;
      kriterien: ChecklistCriterion[];
    };
    verhalten: {
      bereich: string;
      beschreibung?: string;
      kriterien: ChecklistCriterion[];
    };
    sprache: {
      bereich: string;
      beschreibung?: string;
      kriterien: ChecklistCriterion[];
    };
  };
  dokumentstruktur: {
    abschnitte: string[];
    foerderplan_raster_spalten?: string[];
  };
}

/**
 * Normalizes German text by replacing all umlauts and sharp s with their base letter equivalents.
 * ä -> ae, ö -> oe, ü -> ue, Ä -> Ae, Ö -> Oe, Ü -> Ue, ß -> ss
 * This is crucial for matching on small mobile LLMs and offline rule engines.
 */
export function normalizeGermanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[„“"]/g, '"')
    .replace(/[’']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\u00a0/g, ' ');
}

/**
 * Recursively normalizes all string values and object keys in any data structure.
 */
export function deepNormalize<T>(obj: T): T {
  if (typeof obj === 'string') {
    return normalizeGermanText(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepNormalize(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      res[normalizeGermanText(key)] = deepNormalize(value);
    }
    return res as unknown as T;
  }
  return obj;
}

/**
 * Checks if a string or JSON object contains any un-normalized umlauts or sharp s.
 */
export function findRemainingUmlauts(textOrObj: any): string[] {
  const serialized = typeof textOrObj === 'string' ? textOrObj : JSON.stringify(textOrObj);
  const forbidden = ['ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü', 'ß'];
  return forbidden.filter((char) => serialized.includes(char));
}

/**
 * Validates whether an object strictly adheres to the required richtlinien.json schema.
 */
export function validateGuidelinesSchema(data: any): { valid: boolean; errors: string[]; stats: any } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Root is not a valid JSON object.'], stats: null };
  }

  // Required top-level keys
  const requiredTop = ['dokument', 'version', 'gueltigAb', 'herausgeber', 'hinweis', 'foerderschwerpunkte', 'checklisten', 'dokumentstruktur'];
  for (const k of requiredTop) {
    if (!(k in data)) {
      errors.push(`Missing required top-level property: "${k}"`);
    }
  }

  // Umlaut verification
  const umlautsFound = findRemainingUmlauts(data);
  if (umlautsFound.length > 0) {
    errors.push(`Un-normalized German characters found: ${umlautsFound.join(', ')}. All umlauts must be converted to ae, oe, ue, ss.`);
  }

  // Check foerderschwerpunkte
  const schwerpunkte = data.foerderschwerpunkte || {};
  const expectedSchwerpunkte = ['Lernen', 'Sprache', 'Emotionale-soziale Entwicklung'];
  let totalCategories = 0;
  let totalEntries = 0;

  for (const sp of expectedSchwerpunkte) {
    if (!schwerpunkte[sp]) {
      errors.push(`Missing essential Foerderschwerpunkt: "${sp}"`);
    } else {
      const spObj = schwerpunkte[sp];
      if (!spObj.kuerzel) errors.push(`Foerderschwerpunkt "${sp}" is missing "kuerzel".`);
      if (!spObj.definition) errors.push(`Foerderschwerpunkt "${sp}" is missing "definition".`);
      if (!Array.isArray(spObj.bewertungskriterien)) errors.push(`Foerderschwerpunkt "${sp}" must have "bewertungskriterien" array.`);
      if (!Array.isArray(spObj.empfohlene_foerdermassnahmen)) errors.push(`Foerderschwerpunkt "${sp}" must have "empfohlene_foerdermassnahmen" array.`);
      
      if (Array.isArray(spObj.kategorien)) {
        totalCategories += spObj.kategorien.length;
        for (const cat of spObj.kategorien) {
          if (Array.isArray(cat.eintraege)) {
            totalEntries += cat.eintraege.length;
          }
        }
      }
    }
  }

  // Check checklisten
  const checklisten = data.checklisten || {};
  const requiredLists = ['kognitiv', 'verhalten', 'sprache'];
  let totalCriteria = 0;

  for (const cl of requiredLists) {
    if (!checklisten[cl]) {
      errors.push(`Missing checklist: "${cl}"`);
    } else {
      const clObj = checklisten[cl];
      if (!clObj.bereich) errors.push(`Checklist "${cl}" is missing "bereich".`);
      if (!Array.isArray(clObj.kriterien) || clObj.kriterien.length === 0) {
        errors.push(`Checklist "${cl}" must contain a non-empty "kriterien" array.`);
      } else {
        totalCriteria += clObj.kriterien.length;
        for (const [idx, item] of clObj.kriterien.entries()) {
          if (!item.id || !item.label) {
            errors.push(`Checklist "${cl}" item at index ${idx} is missing "id" or "label".`);
          }
        }
      }
    }
  }

  // Check dokumentstruktur
  if (data.dokumentstruktur && !Array.isArray(data.dokumentstruktur.abschnitte)) {
    errors.push('dokumentstruktur.abschnitte must be an array of section names.');
  }

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      foerderschwerpunkteCount: Object.keys(schwerpunkte).length,
      categoriesCount: totalCategories,
      istSollLernwegPairsCount: totalEntries,
      checklistCriteriaCount: totalCriteria,
      documentTitle: data.dokument || '',
      version: data.version || '',
      gueltigAb: data.gueltigAb || '',
    },
  };
}

/**
 * Heuristic parser to extract IST/SOLL/LERNWEG triplets from raw OCR or copied text blocks.
 * Supports updating guidelines from revised edition PDFs.
 */
export function parseRawGuidelineText(rawText: string, defaultKategorie = 'Allgemein'): GuidelineEntry[] {
  const normalized = normalizeGermanText(rawText);
  const entries: GuidelineEntry[] = [];

  // Match pattern: IST ... SOLL ... LERNWEG ...
  const blocks = normalized.split(/(?:IST|Beobachtung\/Bedarf)/i);

  for (const block of blocks) {
    if (!block.trim() || !block.includes('SOLL') && !block.includes('LERNWEG')) continue;

    let istPart = '';
    let sollPart = '';
    let lernwegPart = '';

    const sollSplit = block.split(/(?:SOLL|Ziele)/i);
    istPart = sollSplit[0].replace(/[-–]\s*Die Schuelerin\/der Schueler\s*…/g, '').trim();

    if (sollSplit.length > 1) {
      const lernwegSplit = sollSplit[1].split(/(?:LERNWEG|Paedagogische Angebote)/i);
      sollPart = lernwegSplit[0].replace(/[-–]\s*Die Schuelerin\/der Schueler\s*…/g, '').trim();

      if (lernwegSplit.length > 1) {
        lernwegPart = lernwegSplit[1].trim();
      }
    }

    if (istPart && sollPart) {
      // Split lernweg into bullet points
      const bullets = lernwegPart
        .split(/[•\n-]\s+/)
        .map((b) => b.trim())
        .filter((b) => b.length > 3);

      entries.push({
        ist: istPart.replace(/^\.\.\.\s*/, '').trim(),
        soll: sollPart.replace(/^\.\.\.\s*/, '').trim(),
        lernweg: bullets.length > 0 ? bullets : [lernwegPart || 'Individuelle Förderung gemäß Richtlinie.'],
      });
    }
  }

  return entries;
}

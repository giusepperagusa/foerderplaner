import { FoerderplanDocument, PlanStatus } from '../types/foerderplan';

export const PLANS_STORAGE_KEY = 'foerderplaene_bibliothek_v2';
export const ACTIVE_PLAN_ID_KEY = 'foerderplan_active_id_v2';

/**
 * Creates a brand new, completely blank Förderplan.
 * STRICTLY NO default names, initials, or mock personal details.
 */
export function createBlankPlan(customId?: string): FoerderplanDocument {
  const now = new Date().toISOString().split('T')[0];
  const newId = customId || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: newId,
    status: 'entwurf',
    erstelltAm: now,
    aktualisiertAm: now,
    profil: {
      name: '',
      isAnonymized: false,
      geburtsdatum: '',
      klasse: '',
      schule: '',
      lehrkraft: '',
      erziehungsberechtigte: '',
      zeitraumVon: '',
      zeitraumBis: '',
      hauptschwerpunkt: 'Lernen',
      ausgangslageNotiz: '',
    },
    checklistenBewertungen: {},
    checklistenFoerderbedarf: {},
    planEintraege: [],
    weitereVereinbarungen: '',
    gespraechsDatum: '',
    anwesendePersonen: '',
    informationElternErfolgt: false,
  };
}

/**
 * Retrieves all plans stored in LocalStorage.
 * If none exist or only legacy placeholder data exists, returns a single blank plan.
 */
export function getStoredPlans(): FoerderplanDocument[] {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => ({
          ...p,
          status: p.status || 'entwurf',
          profil: {
            ...p.profil,
            name: p.profil?.name || '',
          },
        }));
      }
    }

    // Clean up any legacy single-plan placeholder key if it was "Leon Hoffmann"
    const legacyRaw = localStorage.getItem('foerderplan_grundschule_v1');
    if (legacyRaw) {
      try {
        const legacyDoc = JSON.parse(legacyRaw);
        // Only keep if the teacher actually entered custom non-placeholder data
        if (legacyDoc?.profil?.name && legacyDoc.profil.name !== 'Leon Hoffmann') {
          const migrated: FoerderplanDocument = {
            ...legacyDoc,
            id: legacyDoc.id || `plan_${Date.now()}`,
            status: legacyDoc.status || 'entwurf',
          };
          saveStoredPlans([migrated]);
          return [migrated];
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.error('Error reading plans from localStorage:', e);
  }

  // Initial fresh blank plan
  const initialBlank = createBlankPlan();
  saveStoredPlans([initialBlank]);
  setActivePlanId(initialBlank.id);
  return [initialBlank];
}

/**
 * Persists the entire list of plans to LocalStorage.
 */
export function saveStoredPlans(plans: FoerderplanDocument[]): void {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch (e) {
    console.error('Error saving plans to localStorage:', e);
  }
}

/**
 * Returns the currently active plan ID from LocalStorage.
 */
export function getActivePlanId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PLAN_ID_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Sets the active plan ID in LocalStorage.
 */
export function setActivePlanId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PLAN_ID_KEY, id);
  } catch (e) {
    console.error('Error saving active plan ID:', e);
  }
}

/**
 * Duplicates an existing plan (e.g., for creating a follow-up plan or template).
 */
export function duplicatePlan(source: FoerderplanDocument): FoerderplanDocument {
  const now = new Date().toISOString().split('T')[0];
  const newId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const identifier = source.profil.name ? `${source.profil.name} (Folgeplan)` : 'Neuer Foerderplan';

  return {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
    status: 'entwurf',
    erstelltAm: now,
    aktualisiertAm: now,
    profil: {
      ...source.profil,
      name: identifier,
      zeitraumVon: '',
      zeitraumBis: '',
    },
  };
}

/**
 * Generates an anonymous pupil identifier (e.g., "ID-2024-01").
 */
export function generateAnonymousIdentifier(): string {
  const year = new Date().getFullYear();
  const randNum = Math.floor(100 + Math.random() * 900);
  return `ID-${year}-${randNum}`;
}

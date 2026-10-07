/**
 * Förderplan-Assistent Berlin
 * Copyright (C) 2024-2026 Giuseppe Ragusa
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import richtlinienData from '../data/richtlinien.json';
import { normalizeGermanText } from './richtlinienTools';
import { StudentProfile, RatingValue, PlanRow } from '../types/foerderplan';

export interface RecommendationProposal {
  id: string;
  schwerpunkt: string;
  kategorie: string;
  ist: string;
  soll: string;
  lernweg: string[];
  relevanceScore: number;
  triggerCriterionId?: string;
  triggerLabel?: string;
}

/**
 * Searches the normalized Richtlinien database for recommendations
 * based on marked checklist items and student profile.
 */
export function getRecommendationsFromChecklist(
  evaluations: Record<string, RatingValue>,
  flaggedForSupport: Record<string, boolean>,
  profile: StudentProfile
): RecommendationProposal[] {
  const proposals: RecommendationProposal[] = [];
  const normalizedNotes = normalizeGermanText(profile.ausgangslageNotiz).toLowerCase();

  // Find all criteria that need attention
  const checklisten = (richtlinienData as any).checklisten;
  const foerderschwerpunkte = (richtlinienData as any).foerderschwerpunkte;

  const relevantCriteria: Array<{ id: string; label: string; unterbereich?: string; bereichKey: string }> = [];

  for (const [bereichKey, clObj] of Object.entries<any>(checklisten)) {
    for (const crit of clObj.kriterien) {
      const rating = evaluations[crit.id];
      const isFlagged = flaggedForSupport[crit.id];
      
      // Deficit if rated as negative ("trifft eher nicht zu" / "trifft nicht zu") or specifically flagged
      if (isFlagged || rating === 'trifft_eher_nicht_zu' || rating === 'trifft_nicht_zu') {
        relevantCriteria.push({
          id: crit.id,
          label: crit.label,
          unterbereich: crit.unterbereich,
          bereichKey,
        });
      }
    }
  }

  // Iterate over all foerderschwerpunkte and categories
  for (const [spName, spObj] of Object.entries<any>(foerderschwerpunkte)) {
    if (!spObj.kategorien) continue;

    for (const cat of spObj.kategorien) {
      for (const entry of cat.eintraege) {
        let score = 0;
        let matchedCrit: { id: string; label: string } | undefined;

        // Check against relevant criteria
        for (const crit of relevantCriteria) {
          const critNorm = normalizeGermanText(crit.label).toLowerCase();
          const critRaw = crit.label.toLowerCase();
          const entryIstNorm = normalizeGermanText(entry.ist).toLowerCase();
          const entrySollNorm = normalizeGermanText(entry.soll).toLowerCase();
          const entryIstRaw = entry.ist.toLowerCase();
          const entrySollRaw = entry.soll.toLowerCase();

          // Category match boost
          if (crit.unterbereich && (
            cat.kategorie.toLowerCase().includes(crit.unterbereich.toLowerCase()) ||
            normalizeGermanText(cat.kategorie).toLowerCase().includes(normalizeGermanText(crit.unterbereich).toLowerCase())
          )) {
            score += 4;
            matchedCrit = crit;
          }

          // Keyword matches (Unicode word boundary matching for authentic German ä, ö, ü, ß)
          const critWords = critRaw.split(/[^\p{L}\p{N}]+/gu).filter((w: string) => w.length > 3);
          for (const w of critWords) {
            const wNorm = normalizeGermanText(w).toLowerCase();
            if (entryIstRaw.includes(w) || entryIstNorm.includes(wNorm)) score += 3;
            if (entrySollRaw.includes(w) || entrySollNorm.includes(wNorm)) score += 2;
          }
        }

        // Boost if matches student profile notes
        if (profile.ausgangslageNotiz) {
          const rawNotes = profile.ausgangslageNotiz.toLowerCase();
          const noteWords = rawNotes.split(/[^\p{L}\p{N}]+/gu).filter((w: string) => w.length > 4);
          for (const w of noteWords) {
            const wNorm = normalizeGermanText(w).toLowerCase();
            if (entry.ist.toLowerCase().includes(w) || normalizeGermanText(entry.ist).toLowerCase().includes(wNorm)) score += 2;
            if (cat.kategorie.toLowerCase().includes(w) || normalizeGermanText(cat.kategorie).toLowerCase().includes(wNorm)) score += 3;
          }
        }

        // Boost matching student's primary Förderschwerpunkt
        if (spName.toLowerCase().includes(profile.hauptschwerpunkt.toLowerCase()) ||
            normalizeGermanText(spName).toLowerCase().includes(normalizeGermanText(profile.hauptschwerpunkt).toLowerCase())) {
          score += 2;
        }

        if (score > 3 || (relevantCriteria.length === 0 && proposals.length < 5)) {
          proposals.push({
            id: `rec_${spName}_${cat.kategorie}_${proposals.length}`,
            schwerpunkt: spName,
            kategorie: cat.kategorie,
            ist: entry.ist,
            soll: entry.soll,
            lernweg: entry.lernweg,
            relevanceScore: score,
            triggerCriterionId: matchedCrit?.id,
            triggerLabel: matchedCrit?.label,
          });
        }
      }
    }
  }

  // Sort by highest relevance
  proposals.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return proposals;
}

/**
 * Creates an authentic German prompt (with standard German orthography ä, ö, ü, ß)
 * tailored for modern local models (Qwen2.5 1.5B/3B, Llama 3.2 1B/3B).
 * Supports optional legacy normalization if requested.
 */
export function buildLocalModelPrompt(
  profile: StudentProfile,
  selectedCriteria: Array<{ label: string; unterbereich?: string }>,
  proposals: RecommendationProposal[],
  normalizeForLegacyLLM = false
): string {
  const name = profile.name || 'Das Kind';
  const klasse = profile.klasse || 'Grundschule';
  const schwerpunkt = profile.hauptschwerpunkt || 'Lern- und Arbeitsverhalten';
  const notes = (profile.ausgangslageNotiz || 'Unterstützungsbedarf im Unterricht').trim();

  const criteriaList = selectedCriteria.slice(0, 3).map((c) => c.label);
  const criteriaStr = criteriaList.length > 0 ? criteriaList.join(', ') : 'Arbeitsorganisation und Ausdauer stärken';

  // Extract concrete recommendation proposals from the official guidelines if available
  const ref = proposals[0];
  const refMethod1 = ref?.lernweg?.[0] || 'Strukturierte Checkliste für Teilschritte einsetzen';
  const refMethod2 = ref?.lernweg?.[1] || 'Feste visualisierte Zeitfenster und Arbeitsrituale nutzen';

  const prompt = `Erstelle genau EINEN konkreten Förderplan-Baustein für ${name} (${klasse}, Förderschwerpunkt: ${schwerpunkt}).

Ausgangslage:
- Beobachtete Schwierigkeit: ${notes}
- Angestrebtes Zielgebiet: ${criteriaStr}

Formatiere die Antwort EXAKT nach diesem Schema mit 5 unterschiedlichen Abschnitten:

IST: [1 präziser Satz zur aktuellen Beobachtung des Kindes im Unterricht]
SOLL: [1 präziser Satz zum erreichbaren, konkreten Ziel]
LERNWEG:
* ${refMethod1}
* ${refMethod2}
ABSPRACHEN: Klassenlehrkraft, 2-3x pro Woche im Fachunterricht
REFLEXION: Überprüfung der Zielerreichung nach 6 Wochen

REGELN:
- Jeder Abschnitt muss einen eigenständigen Inhalt haben. Kopiere niemals den gleichen Text zwischen IST, SOLL und LERNWEG!
- Beende die Antwort direkt nach REFLEXION mit einem Punkt.
- Schreibe keine Erklärungen, keine Grüße und keine Zusatzüberschriften.`;

  return normalizeForLegacyLLM ? normalizeGermanText(prompt) : prompt;
}

/**
 * Converts a proposal into a PlanRow for immediate inclusion into the plan.
 */
export function convertProposalToPlanRow(proposal: RecommendationProposal, defaultTeacher = 'Klassenlehrkraft'): PlanRow {
  return {
    id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    proposalId: proposal.id,
    bereich: proposal.schwerpunkt,
    kategorie: proposal.kategorie,
    ist: proposal.ist,
    soll: proposal.soll,
    lernweg: proposal.lernweg.join('\n• '),
    absprachen: `Verantwortlich: ${defaultTeacher}, 2x wöchentlich in Kleingruppe und Stillarbeit, Evaluation zum Schulhalbjahr`,
    reflexion: 'Wird im Rahmen des nächsten Beratungsgesprächs anhand des Beobachtungsbogens überprüft.',
  };
}

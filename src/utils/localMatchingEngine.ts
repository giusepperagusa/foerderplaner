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
          const critNorm = crit.label.toLowerCase();
          const entryIstNorm = entry.ist.toLowerCase();
          const entrySollNorm = entry.soll.toLowerCase();

          // Category match boost
          if (crit.unterbereich && cat.kategorie.toLowerCase().includes(crit.unterbereich.toLowerCase())) {
            score += 4;
            matchedCrit = crit;
          }

          // Keyword matches
          const critWords = critNorm.split(/[^a-z0-9aeoeuess]+/).filter((w: string) => w.length > 3);
          for (const w of critWords) {
            if (entryIstNorm.includes(w)) score += 3;
            if (entrySollNorm.includes(w)) score += 2;
          }
        }

        // Boost if matches student profile notes
        if (normalizedNotes) {
          const noteWords = normalizedNotes.split(/[^a-z0-9aeoeuess]+/).filter((w: string) => w.length > 4);
          for (const w of noteWords) {
            if (entry.ist.toLowerCase().includes(w)) score += 2;
            if (cat.kategorie.toLowerCase().includes(w)) score += 3;
          }
        }

        // Boost matching student's primary Förderschwerpunkt
        if (spName.toLowerCase().includes(profile.hauptschwerpunkt.toLowerCase())) {
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
 * Creates an optimized prompt in normalized German (base letters)
 * suited for resource-constrained offline LLMs on mobile or low-spec hardware.
 */
export function buildLocalModelPrompt(
  profile: StudentProfile,
  selectedCriteria: Array<{ label: string; unterbereich?: string }>,
  proposals: RecommendationProposal[]
): string {
  const normName = normalizeGermanText(profile.name || 'Schueler');
  const normKlasse = normalizeGermanText(profile.klasse || 'Grundschule');
  const normSchwerpunkt = normalizeGermanText(profile.hauptschwerpunkt);
  const normNotes = normalizeGermanText(profile.ausgangslageNotiz || 'Keine zusaetzlichen Notizen');

  const criteriaText = selectedCriteria
    .slice(0, 5)
    .map((c) => `- ${c.label}`)
    .join('\n');

  const ref = proposals[0] || {
    kategorie: 'Lern- und Arbeitsverhalten',
    ist: 'Benoetigt klare Strukturierung und Anschauung bei mehrschrittigen Aufgaben.',
    soll: 'Bearbeitet Arbeitsauftraege in Teilschritten selbststaendig nach Checkliste.',
    lernweg: ['Visualisierung der Arbeitsschritte mit Piktogrammen', 'Reflexion nach jedem Arbeitsschritt mit der Lehrkraft'],
  };

  return `Schuelerdaten:
- Name: ${normName} (${normKlasse})
- Foerderschwerpunkt: ${normSchwerpunkt}
- Beobachtung: ${normNotes}

Ermittelte Foerderbedarfe:
${criteriaText || '- Allgemeine sprachliche und kognitive Foerderung'}

Muster-Aufbau (gemaess Berliner Handreichung "Foerdermassnahmen konkret!"):
IST: ${ref.ist}
SOLL: ${ref.soll}
LERNWEG:
* ${ref.lernweg[0] || 'Gezielte Uebungsformate mit Anschauung'}
* ${ref.lernweg[1] || 'Regelmaessige Wiederholung im Wochenplan'}
ABSPRACHEN: Klassenlehrkraft, 2-3x pro Woche im Unterricht
REFLEXION: Ueberpruefung in 6 Wochen

AUFGABE:
Formuliere fuer ${normName} 1 bis 2 praezise Foerderplan-Bausteine exakt im obigen Muster-Aufbau (IST, SOLL, LERNWEG, ABSPRACHEN, REFLEXION). Schreibe sachlich und ermutigend ohne Textwiederholungen.`;
}

/**
 * Converts a proposal into a PlanRow for immediate inclusion into the plan.
 */
export function convertProposalToPlanRow(proposal: RecommendationProposal, defaultTeacher = 'Klassenlehrkraft'): PlanRow {
  return {
    id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    bereich: proposal.schwerpunkt,
    kategorie: proposal.kategorie,
    ist: proposal.ist,
    soll: proposal.soll,
    lernweg: proposal.lernweg.join('\n• '),
    absprachen: `Verantwortlich: ${defaultTeacher}, 2x wöchentlich in Kleingruppe und Stillarbeit, Evaluation zum Schulhalbjahr`,
    reflexion: 'Wird im Rahmen des nächsten Beratungsgesprächs anhand des Beobachtungsbogens überprüft.',
  };
}

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

export type FoerderschwerpunktType = 
  | 'Lernen'
  | 'Sprache'
  | 'Emotionale-soziale Entwicklung'
  | 'Geistige Entwicklung'
  | 'Körperliche und motorische Entwicklung'
  | 'Koerperliche-motorische Entwicklung';

export type RatingValue = 'trifft_zu' | 'trifft_eher_zu' | 'trifft_eher_nicht_zu' | 'trifft_nicht_zu' | 'nicht_beurteilt';

export type PlanStatus = 'entwurf' | 'abgeschlossen';

export interface StudentProfile {
  name: string; // Kann Klarname, Initialen (z.B. 'M. S.') oder ein Pseudonym/ID (z.B. 'ID-4B-01') sein
  isAnonymized?: boolean;
  geburtsdatum: string;
  klasse: string;
  schule: string;
  lehrkraft: string;
  erziehungsberechtigte: string;
  zeitraumVon: string;
  zeitraumBis: string;
  hauptschwerpunkt: FoerderschwerpunktType;
  weitererSchwerpunkt?: string;
  ausgangslageNotiz: string;
}

export interface PlanRow {
  id: string;
  bereich: string;
  kategorie: string;
  ist: string;
  soll: string;
  lernweg: string;
  absprachen: string;
  reflexion: string;
}

export interface FoerderplanDocument {
  id: string;
  status: PlanStatus; // 'entwurf' | 'abgeschlossen'
  erstelltAm: string;
  aktualisiertAm: string;
  profil: StudentProfile;
  checklistenBewertungen: Record<string, RatingValue>;
  checklistenFoerderbedarf: Record<string, boolean>;
  planEintraege: PlanRow[];
  weitereVereinbarungen: string;
  gespraechsDatum: string;
  anwesendePersonen: string;
  informationElternErfolgt: boolean;
}


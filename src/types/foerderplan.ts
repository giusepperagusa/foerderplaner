export type FoerderschwerpunktType = 
  | 'Lernen'
  | 'Sprache'
  | 'Emotionale-soziale Entwicklung'
  | 'Geistige Entwicklung'
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


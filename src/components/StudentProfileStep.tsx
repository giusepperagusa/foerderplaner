import React from 'react';
import { User, Calendar, School, Award, ArrowRight, Info, ShieldCheck, Key, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { StudentProfile, FoerderschwerpunktType } from '../types/foerderplan';
import { generateAnonymousIdentifier, formatTimestamp } from '../utils/planStorage';
import richtlinienRaw from '../data/richtlinien.json';

interface Props {
  profile: StudentProfile;
  onChange: (updated: StudentProfile) => void;
  onNext: () => void;
  createdAt?: string;
  updatedAt?: string;
}

export const StudentProfileStep: React.FC<Props> = ({ profile, onChange, onNext, createdAt, updatedAt }) => {
  const schwerpunkte = (richtlinienRaw as any).foerderschwerpunkte;
  const currentDetails = schwerpunkte[profile.hauptschwerpunkt] || {};

  const handleFieldChange = (field: keyof StudentProfile, val: any) => {
    onChange({
      ...profile,
      [field]: val,
    });
  };

  const handleSetAnonymousId = () => {
    const generated = generateAnonymousIdentifier();
    onChange({
      ...profile,
      name: generated,
      isAnonymized: true,
    });
  };

  const handleConvertToInitials = () => {
    const trimmed = (profile.name || '').trim();
    if (!trimmed) {
      // If empty, generate random initials
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const first = letters[Math.floor(Math.random() * letters.length)];
      const last = letters[Math.floor(Math.random() * letters.length)];
      handleFieldChange('name', `${first}. ${last}.`);
      return;
    }

    // Convert full name into initials (e.g., "Klaus Schmidt" -> "K. S.")
    const words = trimmed.split(/[\s-]+/).filter(Boolean);
    if (words.length >= 2) {
      const initials = words.map(w => `${w[0].toUpperCase()}.`).join(' ');
      handleFieldChange('name', initials);
    } else if (words.length === 1 && words[0].length > 1 && !words[0].includes('.')) {
      handleFieldChange('name', `${words[0][0].toUpperCase()}.`);
    } else {
      // Keep existing initials with period
      handleFieldChange('name', trimmed.endsWith('.') ? trimmed : `${trimmed}.`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Privacy Notice Box */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-emerald-950">
                100% Offline & Datenschutzkonform
              </h2>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                DSGVO-konform
              </span>
            </div>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              Alle Angaben werden ausschließlich lokal im Speicher Ihres Browsers abgelegt und verlassen zu keinem Zeitpunkt Ihr Gerät. 
              Sie können für die Schülerin / den Schüler <strong>Initialen</strong> (z. B. <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono">M. K.</code>) oder eine <strong>pseudonymisierte Kennung / ID</strong> (z. B. <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono">ID-2024-04</code>) verwenden. Ein Klarname ist nicht erforderlich.
            </p>
          </div>
        </div>
      </div>

      {/* Stammdaten Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Schüleridentifikation & Basisangaben
          </h3>
          <span className="text-xs text-slate-400">
            * Pflichtfeld für die Zuordnung
          </span>
        </div>

        {/* Name / Identifier Field with Anonymize helpers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="student-name-input" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <span>Schüler-Kennung / Initialen / Name *</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetAnonymousId}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition cursor-pointer"
              >
                <Key className="w-3 h-3 text-emerald-700" />
                <span>Zufalls-ID generieren</span>
              </button>
              <button
                type="button"
                onClick={handleConvertToInitials}
                className="text-[11px] font-medium text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border border-slate-300 transition cursor-pointer"
                title={profile.name?.trim() ? 'Eingegebenen Namen in Initialen umwandeln' : 'Zufällige Initialen generieren'}
              >
                {profile.name?.trim() ? 'In Initialen umwandeln' : 'Initialen (z. B. K. S.)'}
              </button>
            </div>
          </div>

          <input
            id="student-name-input"
            type="text"
            value={profile.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="z. B. L. H. oder ID-24-03 oder Vorname"
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-medium text-slate-900"
          />
          <p className="text-[11px] text-slate-600">
            Verwenden Sie Kürzel oder eine Ziffernkennung, um personenbezogene Klarnamen vollständig zu vermeiden.
          </p>
        </div>

        {/* Other profile fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label htmlFor="student-klasse-input" className="text-xs font-semibold text-slate-800 block mb-1">
              Klasse / Lerngruppe
            </label>
            <input
              id="student-klasse-input"
              type="text"
              value={profile.klasse}
              onChange={(e) => handleFieldChange('klasse', e.target.value)}
              placeholder="z.B. 2a / SAPH / JÜL 1-3"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="student-geburtsdatum-input" className="text-xs font-semibold text-slate-800 block mb-1">
              Geburtsdatum (optional)
            </label>
            <input
              id="student-geburtsdatum-input"
              type="date"
              value={profile.geburtsdatum}
              onChange={(e) => handleFieldChange('geburtsdatum', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="student-schule-input" className="text-xs font-semibold text-slate-800 block mb-1">
              Schule / Schulnummer (optional)
            </label>
            <input
              id="student-schule-input"
              type="text"
              value={profile.schule}
              onChange={(e) => handleFieldChange('schule', e.target.value)}
              placeholder="z.B. Grundschule am Park"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="student-lehrkraft-input" className="text-xs font-semibold text-slate-800 block mb-1">
              Verantwortliche Lehrkraft / Kürzel
            </label>
            <input
              id="student-lehrkraft-input"
              type="text"
              value={profile.lehrkraft}
              onChange={(e) => handleFieldChange('lehrkraft', e.target.value)}
              placeholder="z. B. Klassenleitung / Fr. W."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="student-eltern-input" className="text-xs font-semibold text-slate-800 block mb-1">
              Erziehungsberechtigte (optional)
            </label>
            <input
              id="student-eltern-input"
              type="text"
              value={profile.erziehungsberechtigte}
              onChange={(e) => handleFieldChange('erziehungsberechtigte', e.target.value)}
              placeholder="z. B. Eltern / Mutter / Vater"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="student-zeitraum-von" className="text-xs font-semibold text-slate-800 block mb-1">
                Förderzeitraum von
              </label>
              <input
                id="student-zeitraum-von"
                type="date"
                value={profile.zeitraumVon}
                onChange={(e) => handleFieldChange('zeitraumVon', e.target.value)}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="student-zeitraum-bis" className="text-xs font-semibold text-slate-800 block mb-1">
                Bis (Evaluation)
              </label>
              <input
                id="student-zeitraum-bis"
                type="date"
                value={profile.zeitraumBis}
                onChange={(e) => handleFieldChange('zeitraumBis', e.target.value)}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Uneditable Automatic Timestamps Record */}
        <div className="pt-3 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Erstellt am:
                  </span>
                  <span className={`font-semibold select-all font-mono text-[11px] ${createdAt ? 'text-slate-900' : 'text-slate-500 italic'}`}>
                    {createdAt ? formatTimestamp(createdAt) : 'Noch nicht bearbeitet'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Zuletzt geändert:
                  </span>
                  <span className={`font-semibold select-all font-mono text-[11px] ${updatedAt ? 'text-slate-900' : 'text-slate-500 italic'}`}>
                    {updatedAt ? formatTimestamp(updatedAt) : 'Noch nicht bearbeitet'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-center">
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-200/70 border border-slate-300/60 px-2 py-0.5 rounded font-medium">
                <ShieldCheck className="w-3 h-3 text-slate-500" />
                {createdAt ? 'Automatisch erfasst (nicht editierbar)' : 'Wird bei erster Änderung erfasst'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Förderschwerpunkt Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            Sonderpädagogischer Förderschwerpunkt
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            5 offizielle Berliner Förderschwerpunkte gemäß SopädVO
          </span>
        </div>

        <div role="radiogroup" aria-label="Sonderpädagogischer Förderschwerpunkt" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              id: 'Lernen' as FoerderschwerpunktType,
              label: 'Lernen',
              kuerzel: 'LE',
              badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
            },
            {
              id: 'Sprache' as FoerderschwerpunktType,
              label: 'Sprache',
              kuerzel: 'SP',
              badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
            },
            {
              id: 'Emotionale-soziale Entwicklung' as FoerderschwerpunktType,
              label: 'Emotionale und soziale Entwicklung',
              kuerzel: 'ES',
              badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
            },
            {
              id: 'Geistige Entwicklung' as FoerderschwerpunktType,
              label: 'Geistige Entwicklung',
              kuerzel: 'GE',
              badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            },
            {
              id: 'Koerperliche-motorische Entwicklung' as FoerderschwerpunktType,
              label: 'Körperliche und motorische Entwicklung',
              kuerzel: 'KME',
              badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
            },
          ].map((item) => {
            const isSelected = profile.hauptschwerpunkt === item.id || 
              (item.id === 'Koerperliche-motorische Entwicklung' && profile.hauptschwerpunkt === 'Körperliche und motorische Entwicklung');
            const data = schwerpunkte[item.id] || (item.id.includes('motorisch') ? schwerpunkte['Koerperliche-motorische Entwicklung'] : {}) || {};
            
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleFieldChange('hauptschwerpunkt', item.id)}
                className={`p-4 rounded-xl text-left border-2 transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 leading-snug">
                      {item.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${item.badgeBg}`}>
                      {data.kuerzel || item.kuerzel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 line-clamp-3 leading-relaxed mb-3">
                    {data.definition}
                  </p>
                </div>

                {data.foerderschwerpunkte_innerhalb && (
                  <div className="pt-2 border-t border-slate-100 mt-auto">
                    <span className="text-[10px] text-slate-600 block font-semibold mb-1">Kernbereiche:</span>
                    <div className="flex flex-wrap gap-1">
                      {data.foerderschwerpunkte_innerhalb.slice(0, 3).map((sub: string, sIdx: number) => (
                        <span key={sIdx} className="text-[9px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded truncate max-w-[140px] font-medium">
                          {sub}
                        </span>
                      ))}
                      {data.foerderschwerpunkte_innerhalb.length > 3 && (
                        <span className="text-[9px] text-slate-600 px-1 py-0.5">
                          +{data.foerderschwerpunkte_innerhalb.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Schwerpunkt Detailed Info from Reference PDF */}
        {currentDetails.bewertungskriterien && (
          <div className="mt-4 p-4.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Amtliche Bewertungskriterien ({profile.hauptschwerpunkt === 'Koerperliche-motorische Entwicklung' ? 'Körperliche und motorische Entwicklung' : profile.hauptschwerpunkt}):</span>
              </h4>
              <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                {currentDetails.bewertungskriterien.map((crit: string, idx: number) => (
                  <li key={idx} className="leading-relaxed">{crit}</li>
                ))}
              </ul>
            </div>

            {currentDetails.foerderschwerpunkte_innerhalb && (
              <div>
                <h5 className="text-[11px] font-bold text-slate-800 mb-1.5">
                  Gegenstandsbereiche & Entwicklungsfelder:
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {currentDetails.foerderschwerpunkte_innerhalb.map((sub: string, idx: number) => (
                    <span key={idx} className="text-[10px] font-medium bg-white text-slate-800 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {currentDetails.empfohlene_foerdermassnahmen && (
              <div>
                <h5 className="text-[11px] font-bold text-slate-800 mb-1.5">
                  Empfohlene Fördermethoden (Berliner Handreichung „Fördermaßnahmen konkret!“):
                </h5>
                <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                  {currentDetails.empfohlene_foerdermassnahmen.map((m: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ausgangslage & Pädagogische Notizen */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <label htmlFor="student-ausgangslage" className="text-sm font-bold text-slate-900 block">
          Ausgangslage & Pädagogische Beobachtung (Freitext)
        </label>
        <p className="text-xs text-slate-600">
          Beschreiben Sie kurz den aktuellen Lernstand, besondere Stärken sowie vorrangige Förderbedarfe. Diese Notiz unterstützt später die Zuordnung passgenauer Maßnahmen.
        </p>
        <textarea
          id="student-ausgangslage"
          rows={3}
          value={profile.ausgangslageNotiz}
          onChange={(e) => handleFieldChange('ausgangslageNotiz', e.target.value)}
          placeholder="z. B. Zeigt Unsicherheiten bei der Laut-Synthese im Silbenlesen. In Gruppenphasen aufmerksam, bei längeren Stillarbeiten schnell abgelenkt..."
          className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900"
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <span>Weiter zum Einschätzungsbogen</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

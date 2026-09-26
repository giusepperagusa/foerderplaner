import React from 'react';
import { User, Calendar, School, Award, ArrowRight, Info, ShieldCheck, Key, RefreshCw } from 'lucide-react';
import { StudentProfile, FoerderschwerpunktType } from '../types/foerderplan';
import { generateAnonymousIdentifier } from '../utils/planStorage';
import richtlinienRaw from '../data/richtlinien.json';

interface Props {
  profile: StudentProfile;
  onChange: (updated: StudentProfile) => void;
  onNext: () => void;
}

export const StudentProfileStep: React.FC<Props> = ({ profile, onChange, onNext }) => {
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
              Alle Angaben werden ausschliesslich lokal im Speicher Ihres Browsers abgelegt und verlassen zu keinem Zeitpunkt Ihr Geraet. 
              Sie koennen fuer die Schuelerin / den Schueler <strong>Initialen</strong> (z.B. <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono">M. K.</code>) oder eine <strong>pseudonymisierte Kennung / ID</strong> (z.B. <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono">ID-2024-04</code>) verwenden. Ein Klarname ist nicht erforderlich.
            </p>
          </div>
        </div>
      </div>

      {/* Stammdaten Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Schueleridentifikation & Basisangaben
          </h3>
          <span className="text-xs text-slate-400">
            * Pflichtfeld fuer die Zuordnung
          </span>
        </div>

        {/* Name / Identifier Field with Anonymize helpers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Schueler-Kennung / Initialen / Name *</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetAnonymousId}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
              >
                <Key className="w-3 h-3 text-emerald-600" />
                <span>Zufalls-ID generieren</span>
              </button>
              <button
                type="button"
                onClick={handleConvertToInitials}
                className="text-[11px] font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border border-slate-200 transition"
                title={profile.name?.trim() ? 'Eingegebenen Namen in Initialen umwandeln' : 'Zufällige Initialen generieren'}
              >
                {profile.name?.trim() ? 'In Initialen umwandeln' : 'Initialen (z.B. K. S.)'}
              </button>
            </div>
          </div>

          <input
            type="text"
            value={profile.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="z.B. L. H. oder ID-24-03 oder Vorname"
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
          />
          <p className="text-[11px] text-slate-500">
            Verwenden Sie Kuerzel oder eine Ziffernkennung, um personenbezogene Klarnamen vollstaendig zu vermeiden.
          </p>
        </div>

        {/* Other profile fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Klasse / Lerngruppe
            </label>
            <input
              type="text"
              value={profile.klasse}
              onChange={(e) => handleFieldChange('klasse', e.target.value)}
              placeholder="z.B. 2a / SAPH / JÜL 1-3"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Geburtsdatum (optional)
            </label>
            <input
              type="date"
              value={profile.geburtsdatum}
              onChange={(e) => handleFieldChange('geburtsdatum', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Schule / Schulnummer (optional)
            </label>
            <input
              type="text"
              value={profile.schule}
              onChange={(e) => handleFieldChange('schule', e.target.value)}
              placeholder="z.B. Grundschule am Park"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Verantwortliche Lehrkraft / Kuerzel
            </label>
            <input
              type="text"
              value={profile.lehrkraft}
              onChange={(e) => handleFieldChange('lehrkraft', e.target.value)}
              placeholder="z.B. Klassenleitung / Fr. W."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Erziehungsberechtigte (optional)
            </label>
            <input
              type="text"
              value={profile.erziehungsberechtigte}
              onChange={(e) => handleFieldChange('erziehungsberechtigte', e.target.value)}
              placeholder="z.B. Eltern / Mutter / Vater"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Foerderzeitraum von
              </label>
              <input
                type="date"
                value={profile.zeitraumVon}
                onChange={(e) => handleFieldChange('zeitraumVon', e.target.value)}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Bis (Evaluation)
              </label>
              <input
                type="date"
                value={profile.zeitraumBis}
                onChange={(e) => handleFieldChange('zeitraumBis', e.target.value)}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Förderschwerpunkt Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Award className="w-4 h-4 text-blue-600" />
          Sonderpaedagogischer Foerderschwerpunkt
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['Lernen', 'Sprache', 'Emotionale-soziale Entwicklung'] as FoerderschwerpunktType[]).map((sp) => {
            const isSelected = profile.hauptschwerpunkt === sp;
            const data = schwerpunkte[sp] || {};
            return (
              <button
                key={sp}
                type="button"
                onClick={() => handleFieldChange('hauptschwerpunkt', sp)}
                className={`p-4 rounded-xl text-left border-2 transition ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{sp}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    {data.kuerzel || sp.substring(0, 2)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">
                  {data.definition}
                </p>
              </button>
            );
          })}
        </div>

        {/* Selected Schwerpunkt Info */}
        {currentDetails.bewertungskriterien && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-700">
              Amtliche Bewertungskriterien ({profile.hauptschwerpunkt}):
            </h4>
            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
              {currentDetails.bewertungskriterien.map((crit: string, idx: number) => (
                <li key={idx}>{crit}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Ausgangslage & Pädagogische Notizen */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <label className="text-sm font-bold text-slate-900 block">
          Ausgangslage & Paedagogische Beobachtung (Freitext)
        </label>
        <p className="text-xs text-slate-500">
          Beschreiben Sie kurz den aktuellen Lernstand, besondere Staerken sowie vorrangige Foerderbedarfe. Diese Notiz unterstuetzt spaeter die Zuordnung passgenauer Massnahmen.
        </p>
        <textarea
          rows={3}
          value={profile.ausgangslageNotiz}
          onChange={(e) => handleFieldChange('ausgangslageNotiz', e.target.value)}
          placeholder="z.B. Zeigt Unsicherheiten bei der Laut-Synthese im Silbenlesen. In Gruppenphasen aufmerksam, bei laengeren Stillarbeiten schnell abgelenkt..."
          className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <span>Weiter zum Einschaetzungsbogen</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

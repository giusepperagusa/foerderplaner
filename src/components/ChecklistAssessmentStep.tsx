import React, { useState } from 'react';
import {
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { RatingValue } from '../types/foerderplan';
import richtlinienRaw from '../data/richtlinien.json';

interface Props {
  ratings: Record<string, RatingValue>;
  flaggedForSupport: Record<string, boolean>;
  onRatingChange: (id: string, value: RatingValue) => void;
  onFlagToggle: (id: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const ChecklistAssessmentStep: React.FC<Props> = ({
  ratings,
  flaggedForSupport,
  onRatingChange,
  onFlagToggle,
  onNext,
  onPrev,
}) => {
  const [activeChecklist, setActiveChecklist] = useState<'sprache' | 'kognitiv' | 'verhalten'>('kognitiv');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('Alle');
  const [onlyDeficits, setOnlyDeficits] = useState<boolean>(false);

  const checklisten = (richtlinienRaw as any).checklisten;
  const currentListObj = checklisten[activeChecklist] || { kriterien: [] };
  const allCriteria = currentListObj.kriterien || [];

  // Unique subcategories
  const subcategories: string[] = Array.from(
    new Set(allCriteria.map((c: any) => c.unterbereich).filter(Boolean))
  );

  // Count items qualifying as Förderbedarf (either rating deficit or flagged)
  const deficitCriteriaCount = allCriteria.filter((crit: any) => {
    if (filterSubcategory !== 'Alle' && crit.unterbereich !== filterSubcategory) {
      return false;
    }
    const r = ratings[crit.id];
    const flagged = flaggedForSupport[crit.id];
    return flagged || r === 'trifft_eher_nicht_zu' || r === 'trifft_nicht_zu';
  }).length;

  // Filter items
  const filteredCriteria = allCriteria.filter((crit: any) => {
    if (filterSubcategory !== 'Alle' && crit.unterbereich !== filterSubcategory) {
      return false;
    }
    if (onlyDeficits) {
      const r = ratings[crit.id];
      const flagged = flaggedForSupport[crit.id];
      return flagged || r === 'trifft_eher_nicht_zu' || r === 'trifft_nicht_zu';
    }
    return true;
  });

  // Calculate stats
  const totalAssessed = Object.keys(ratings).length;
  const totalFlagged = Object.values(flaggedForSupport).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Step Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            Schritt 2: Amtliche Einschätzungsbögen (Diagnostik)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gemäß den amtlichen Beobachtungsbögen (Berlin SenBJF). Beurteilen Sie das Auftreten der Fähigkeiten.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg font-medium border border-blue-100">
            {totalAssessed} beurteilt
          </div>
          <div className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg font-medium border border-amber-200">
            {totalFlagged} im Förderfokus
          </div>
        </div>
      </div>

      {/* Domain Switcher */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'kognitiv', label: 'Kognition & Lernen', desc: 'Merkfähigkeit, Arbeitsverhalten, Lesen, Rechnen' },
          { key: 'sprache', label: 'Sprache & Kommunikation', desc: 'Artikulation, Wortschatz, Grammatik' },
          { key: 'verhalten', label: 'Verhalten & Emotion', desc: 'Selbstvertrauen, Impulskontrolle, Regeln' },
        ].map((tab) => {
          const isActive = activeChecklist === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveChecklist(tab.key as any);
                setFilterSubcategory('Alle');
              }}
              className={`p-3 rounded-xl text-left border-2 transition cursor-pointer ${
                isActive
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <span className={`text-xs font-bold block ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                {tab.label}
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:block truncate mt-0.5">
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Legend Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700">Teilbereich:</span>
              <select
                value={filterSubcategory}
                onChange={(e) => setFilterSubcategory(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden"
              >
                <option value="Alle">Alle Unterbereiche</option>
                {subcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear, interactive filter toggle with live count */}
            <button
              type="button"
              onClick={() => setOnlyDeficits(!onlyDeficits)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                onlyDeficits
                  ? 'bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Filtert die Ansicht: Zeigt ausschließlich Kriterien mit Unterstützungsbedarf oder gesetztem Förderfokus"
            >
              <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition ${
                onlyDeficits ? 'bg-amber-600 border-amber-600' : 'border-slate-400 bg-white'
              }`}>
                {onlyDeficits && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span>Nur Förderbedarf filtern</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                onlyDeficits ? 'bg-amber-200 text-amber-950' : 'bg-slate-200 text-slate-700'
              }`}>
                {deficitCriteriaCount} / {allCriteria.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Stärke / trifft zu
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Förderbedarf / trifft nicht zu
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm border border-amber-500 bg-amber-100"></span> Förderfokus markiert
            </span>
          </div>
        </div>

        {/* Informative Explanation of the filter's effect */}
        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <span>
            <strong>Funktion des Filters:</strong> Blendet unauffällige Kompetenzen aus und konzentriert die Ansicht auf Kriterien, die entweder mit <strong className="text-amber-800">„eher nicht zu“</strong> / <strong className="text-rose-700">„trifft nicht zu“</strong> bewertet wurden oder bei denen die Checkbox <strong className="text-amber-800">„Förderfokus?“</strong> gesetzt ist.
          </span>
        </div>
      </div>

      {/* Active Filter Notice Banner if active and items found */}
      {onlyDeficits && filteredCriteria.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Filter aktiv: Es werden <strong>{filteredCriteria.length} Kriterien</strong> mit Unterstützungsbedarf oder Förderfokus angezeigt.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOnlyDeficits(false)}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer shrink-0 ml-2"
          >
            Alle {allCriteria.length} anzeigen
          </button>
        </div>
      )}

      {/* Checklist Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-4 w-1/2">Kompetenz / Verhaltenskriterium</th>
                <th className="py-3 px-2 text-center w-48">Häufigkeit des Verhaltens</th>
                <th className="py-3 px-3 text-center w-36 bg-amber-50/60 border-l border-amber-100" title="Kriterium vorrangig für die Maßnahmenableitung im Förderplan vormerken">
                  Förderfokus?
                  <span className="block text-[9px] font-normal text-amber-800">(in Plan aufnehmen)</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCriteria.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8">
                    {onlyDeficits ? (
                      <div className="max-w-md mx-auto text-center space-y-2.5">
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-bold text-amber-950">
                          Kein Förderbedarf im Bereich „{currentListObj.bereich || activeChecklist}“ gefunden
                        </h4>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          Der Filter ist aktiv, aber bisher wurden noch keine Kriterien mit <strong>„eher nicht / trifft nicht zu“</strong> bewertet und kein Häkchen bei <strong>„Förderfokus?“</strong> gesetzt.
                        </p>
                        <button
                          type="button"
                          onClick={() => setOnlyDeficits(false)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                        >
                          <span>Filter ausschalten (alle {allCriteria.length} Kriterien anzeigen)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-4">
                        Keine Kriterien entsprechen dem aktuellen Filter.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCriteria.map((crit: any) => {
                  const rating = ratings[crit.id] || 'nicht_beurteilt';
                  const isFlagged = flaggedForSupport[crit.id] || false;

                  return (
                    <tr
                      key={crit.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isFlagged ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        {crit.unterbereich && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-0.5">
                            {crit.unterbereich}
                          </span>
                        )}
                        <span className="text-slate-800 font-medium">{crit.label}</span>
                      </td>

                      {/* 4-point rating buttons */}
                      <td className="py-3 px-2">
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { val: 'trifft_zu', label: 'trifft zu', color: 'hover:bg-emerald-50 text-emerald-700 active-emerald' },
                            { val: 'trifft_eher_zu', label: 'eher zu', color: 'hover:bg-teal-50 text-teal-700' },
                            { val: 'trifft_eher_nicht_zu', label: 'eher nicht', color: 'hover:bg-amber-50 text-amber-700' },
                            { val: 'trifft_nicht_zu', label: 'trifft nicht', color: 'hover:bg-rose-50 text-rose-700' },
                          ].map((opt) => {
                            const isChosen = rating === opt.val;
                            return (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => onRatingChange(crit.id, opt.val as RatingValue)}
                                className={`py-1 px-1 text-[10px] rounded font-medium border transition text-center truncate ${
                                  isChosen
                                    ? opt.val === 'trifft_zu'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                      : opt.val === 'trifft_eher_zu'
                                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                      : opt.val === 'trifft_eher_nicht_zu'
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                      : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                                title={opt.label}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Förderfokus checkbox */}
                      <td className="py-3 px-3 text-center bg-amber-50/40 border-l border-amber-100">
                        <input
                          type="checkbox"
                          checked={isFlagged}
                          onChange={() => onFlagToggle(crit.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="Als Förderbereich für diesen Förderplan auswählen"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zu Stammdaten</span>
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          <span>Weiter zu Förderempfehlungen</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import {
  Table,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle,
  FileEdit,
} from 'lucide-react';
import { PlanRow } from '../types/foerderplan';

interface Props {
  rows: PlanRow[];
  weitereVereinbarungen: string;
  gespraechsDatum: string;
  anwesendePersonen: string;
  informationElternErfolgt: boolean;
  onUpdateRows: (rows: PlanRow[]) => void;
  onUpdateField: (field: string, val: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const PlanEditorStep: React.FC<Props> = ({
  rows,
  weitereVereinbarungen,
  gespraechsDatum,
  anwesendePersonen,
  informationElternErfolgt,
  onUpdateRows,
  onUpdateField,
  onNext,
  onPrev,
}) => {
  const handleRowChange = (id: string, field: keyof PlanRow, value: string) => {
    onUpdateRows(
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddBlankRow = () => {
    const newRow: PlanRow = {
      id: `row_${Date.now()}`,
      bereich: 'Lernen',
      kategorie: 'Individuelle Maßnahme',
      ist: 'Beobachtung des Verhaltens / Lernstands...',
      soll: 'Konkretisiertes Förderziel...',
      lernweg: 'Methodische Schritte, Fördermaterialien und Differenzierung...',
      absprachen: 'Wer? Wie oft? Bis wann?',
      reflexion: 'Überprüfung im Halbjahresgespräch.',
    };
    onUpdateRows([...rows, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    onUpdateRows(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Table className="w-4 h-4 text-blue-600" />
            Schritt 4: Amtliche 5-Spalten Förderplan-Tabelle
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gemäß amtlichem Raster: IST &bull; SOLL &bull; LERNWEG &bull; Absprachen &bull; Reflexion/Evaluation.
          </p>
        </div>

        <button
          onClick={handleAddBlankRow}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs border border-blue-200 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Eigene Maßnahme hinzufügen</span>
        </button>
      </div>

      {/* Table Area */}
      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <FileEdit className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">Noch keine Maßnahmen im Förderplan</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Gehen Sie zurück zu Schritt 3, um empfohlene Bausteine aus den Berliner Richtlinien zu übernehmen, oder fügen Sie eine freie Zeile hinzu.
            </p>
            <button
              onClick={handleAddBlankRow}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              <span>Freie Maßnahme anlegen</span>
            </button>
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={row.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Row title bar */}
              <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">#{index + 1}</span>
                  <input
                    type="text"
                    value={row.kategorie}
                    onChange={(e) => handleRowChange(row.id, 'kategorie', e.target.value)}
                    className="font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-400 focus:outline-hidden px-1"
                    placeholder="Bereich / Thema"
                  />
                  <span className="text-[10px] text-slate-400">({row.bereich})</span>
                </div>
                <button
                  onClick={() => handleDeleteRow(row.id)}
                  className="text-slate-400 hover:text-rose-600 transition p-1"
                  title="Maßnahme löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 5 Columns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs">
                {/* 1. IST */}
                <div className="p-3 bg-rose-50/30 space-y-1">
                  <label className="font-bold text-rose-900 block text-[10px] uppercase tracking-wider">
                    1. IST (Bedarf/Stellungnahme)
                  </label>
                  <textarea
                    rows={4}
                    value={row.ist}
                    onChange={(e) => handleRowChange(row.id, 'ist', e.target.value)}
                    className="w-full p-2 bg-white border border-rose-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-rose-400"
                  />
                </div>

                {/* 2. SOLL */}
                <div className="p-3 bg-emerald-50/30 space-y-1">
                  <label className="font-bold text-emerald-900 block text-[10px] uppercase tracking-wider">
                    2. SOLL (Ziele)
                  </label>
                  <textarea
                    rows={4}
                    value={row.soll}
                    onChange={(e) => handleRowChange(row.id, 'soll', e.target.value)}
                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-400"
                  />
                </div>

                {/* 3. LERNWEG */}
                <div className="p-3 bg-blue-50/30 space-y-1">
                  <label className="font-bold text-blue-900 block text-[10px] uppercase tracking-wider">
                    3. LERNWEG (Maßnahmen)
                  </label>
                  <textarea
                    rows={4}
                    value={row.lernweg}
                    onChange={(e) => handleRowChange(row.id, 'lernweg', e.target.value)}
                    className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-400"
                  />
                </div>

                {/* 4. ABSPRACHEN */}
                <div className="p-3 bg-amber-50/30 space-y-1">
                  <label className="font-bold text-amber-900 block text-[10px] uppercase tracking-wider">
                    4. Absprachen (Wer? Wie? Wann?)
                  </label>
                  <textarea
                    rows={4}
                    value={row.absprachen}
                    onChange={(e) => handleRowChange(row.id, 'absprachen', e.target.value)}
                    className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                {/* 5. REFLEXION */}
                <div className="p-3 bg-purple-50/30 space-y-1">
                  <label className="font-bold text-purple-900 block text-[10px] uppercase tracking-wider">
                    5. Reflexion / Evaluation
                  </label>
                  <textarea
                    rows={4}
                    value={row.reflexion}
                    onChange={(e) => handleRowChange(row.id, 'reflexion', e.target.value)}
                    className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-400"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Meta & Meeting Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          Abschließende Vereinbarungen & Dokumentation
        </h3>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Weitere Vereinbarungen (z. B. Kooperation Ganztag, Sonderpädagoge, Nachteilsausgleich)
          </label>
          <textarea
            rows={3}
            value={weitereVereinbarungen}
            onChange={(e) => onUpdateField('weitereVereinbarungen', e.target.value)}
            placeholder="z. B. Nachteilsausgleich: Zeitzugabe bei schriftlichen Klassenarbeiten; wöchentlicher Austausch mit dem Erzieherteam..."
            className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Gespräch wurde durchgeführt am
            </label>
            <input
              type="date"
              value={gespraechsDatum}
              onChange={(e) => onUpdateField('gespraechsDatum', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Anwesende Personen / Beteiligte
            </label>
            <input
              type="text"
              value={anwesendePersonen}
              onChange={(e) => onUpdateField('anwesendePersonen', e.target.value)}
              placeholder="z. B. Fr. Müller (Klassenleitung), Hr. Dr. Klein (Sonderpädagoge), Fr. Meyer (Mutter)"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={informationElternErfolgt}
              onChange={(e) => onUpdateField('informationElternErfolgt', e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span>
              Information der Erziehungsberechtigten ist erfolgt (wenn nicht anwesend, Kopie übergeben).
            </span>
          </label>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zu Empfehlungen</span>
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          <span>Weiter zu Druck & Export</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

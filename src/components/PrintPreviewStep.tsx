import React, { useState } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  ArrowLeft,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { FoerderplanDocument } from '../types/foerderplan';

interface Props {
  planDoc: FoerderplanDocument;
  onPrev: () => void;
}

export const PrintPreviewStep: React.FC<Props> = ({ planDoc, onPrev }) => {
  const [copiedText, setCopiedText] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(planDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `Foerderplan_${planDoc.profil.name.replace(/\s+/g, '_') || 'Schueler'}_${planDoc.profil.zeitraumVon || 'aktuell'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    let out = `FÖRDERPLAN\n`;
    out += `Schüler: ${planDoc.profil.name} (Klasse: ${planDoc.profil.klasse})\n`;
    out += `Schule: ${planDoc.profil.schule}\n`;
    out += `Förderschwerpunkt: ${planDoc.profil.hauptschwerpunkt}\n`;
    out += `Förderzeitraum: von ${planDoc.profil.zeitraumVon || '---'} bis ${planDoc.profil.zeitraumBis || '---'}\n\n`;
    out += `--------------------------------------------------\n`;
    out += `MASSNAHMEN-ÜBERSICHT:\n\n`;

    planDoc.planEintraege.forEach((entry, idx) => {
      out += `[${idx + 1}] ${entry.kategorie} (${entry.bereich})\n`;
      out += `IST: ${entry.ist}\n`;
      out += `SOLL: ${entry.soll}\n`;
      out += `LERNWEG:\n${entry.lernweg}\n`;
      out += `Absprachen: ${entry.absprachen}\n`;
      out += `Reflexion: ${entry.reflexion}\n\n`;
    });

    if (planDoc.weitereVereinbarungen) {
      out += `Weitere Vereinbarungen: ${planDoc.weitereVereinbarungen}\n\n`;
    }

    out += `Gespräch geführt am: ${planDoc.gespraechsDatum || '---'}\n`;
    out += `Anwesende: ${planDoc.anwesendePersonen || '---'}\n`;

    navigator.clipboard.writeText(out);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Action Toolbar (Hidden during print) */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            Schritt 5: Förderplan drucken & exportieren
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Das Dokument ist im offiziellen Berliner DIN-A4-Raster formatiert und kann direkt ausgedruckt oder digital gesichert werden.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText ? 'Kopiert!' : 'Text kopieren'}</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>JSON sichern</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Drucken / Als PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet (DIN A4 representation) */}
      <div className="bg-white rounded-2xl border border-slate-300 p-8 shadow-md text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 space-y-6">
        
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold block">
                Offizielles Formular &bull; Grundschule
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                FÖRDERPLAN
              </h1>
            </div>
            <div className="text-right text-xs text-slate-600">
              <span className="font-semibold block">{planDoc.profil.schule || 'Grundschule'}</span>
              <span>Klasse: {planDoc.profil.klasse || '---'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs bg-slate-50 print:bg-transparent p-3 rounded-xl border border-slate-200 print:border-slate-300">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Schueler-Kennung / Initialen / Name</span>
              <span className="font-bold text-slate-900 text-sm">{planDoc.profil.name || '---'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Geburtsdatum / Alter</span>
              <span className="font-semibold text-slate-800">{planDoc.profil.geburtsdatum || '---'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Foerderschwerpunkt</span>
              <span className="font-bold text-blue-800 print:text-black">{planDoc.profil.hauptschwerpunkt}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Foerderzeitraum & Status</span>
              <span className="font-semibold text-slate-800 block">
                {planDoc.profil.zeitraumVon || '---'} bis {planDoc.profil.zeitraumBis || '---'}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Status: {planDoc.status === 'abgeschlossen' ? 'Abgeschlossen' : 'Entwurf'}
              </span>
            </div>
          </div>
        </div>

        {/* 5-Column Grid */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Pädagogische Maßnahmen & Lernarrangements
          </h2>

          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                <th className="border border-slate-400 p-2 w-[20%] text-left">
                  IST<br />
                  <span className="text-[10px] font-normal text-slate-600">
                    Beobachtung/Bedarf (=Stellungnahme)
                  </span>
                </th>
                <th className="border border-slate-400 p-2 w-[20%] text-left">
                  SOLL<br />
                  <span className="text-[10px] font-normal text-slate-600">Ziele</span>
                </th>
                <th className="border border-slate-400 p-2 w-[26%] text-left">
                  LERNWEG<br />
                  <span className="text-[10px] font-normal text-slate-600">
                    Päd. Angebote / Maßnahmen
                  </span>
                </th>
                <th className="border border-slate-400 p-2 w-[17%] text-left">
                  Absprachen<br />
                  <span className="text-[10px] font-normal text-slate-600">
                    (Wer? Wie? Mit wem? Bis wann?)
                  </span>
                </th>
                <th className="border border-slate-400 p-2 w-[17%] text-left">
                  Reflexion<br />
                  <span className="text-[10px] font-normal text-slate-600">
                    Evaluation / Modifikation
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {planDoc.planEintraege.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-slate-400 p-6 text-center text-slate-500">
                    Keine Einträge vorhanden.
                  </td>
                </tr>
              ) : (
                planDoc.planEintraege.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="border border-slate-400 p-2 text-slate-800">
                      <strong className="block text-[11px] text-blue-900 print:text-black mb-1">
                        {row.kategorie}
                      </strong>
                      <div className="whitespace-pre-line leading-relaxed">{row.ist}</div>
                    </td>
                    <td className="border border-slate-400 p-2 text-slate-800 whitespace-pre-line leading-relaxed">
                      {row.soll}
                    </td>
                    <td className="border border-slate-400 p-2 text-slate-800 whitespace-pre-line leading-relaxed">
                      {row.lernweg}
                    </td>
                    <td className="border border-slate-400 p-2 text-slate-800 whitespace-pre-line leading-relaxed">
                      {row.absprachen}
                    </td>
                    <td className="border border-slate-400 p-2 text-slate-800 whitespace-pre-line leading-relaxed">
                      {row.reflexion}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Additional agreements */}
        {planDoc.weitereVereinbarungen && (
          <div className="border border-slate-400 p-3 rounded-lg text-xs space-y-1">
            <span className="font-bold uppercase tracking-wider text-[11px] block">
              Weitere Vereinbarungen / Kooperationen:
            </span>
            <p className="whitespace-pre-line text-slate-800">{planDoc.weitereVereinbarungen}</p>
          </div>
        )}

        {/* Meeting & Signatures */}
        <div className="border-t border-slate-300 pt-4 text-xs space-y-4">
          <div className="flex flex-wrap justify-between gap-4 text-slate-700">
            <div>
              <span className="font-semibold">Gespräch durchgeführt am:</span>{' '}
              {planDoc.gespraechsDatum || '____________________'}
            </div>
            <div>
              <span className="font-semibold">Anwesende:</span>{' '}
              {planDoc.anwesendePersonen || 'Klassenlehrkraft, Erziehungsberechtigte'}
            </div>
            <div>
              <span className="font-semibold">Information Erziehungsberechtigte:</span>{' '}
              {planDoc.informationElternErfolgt ? 'Ja, erfolgt' : 'Ausstehend'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8 text-center text-[11px] text-slate-600">
            <div className="border-t border-slate-400 pt-1">
              Unterschrift Klassenlehrkraft
            </div>
            <div className="border-t border-slate-400 pt-1">
              Unterschrift Sonderpädagogik / Schulleitung
            </div>
            <div className="border-t border-slate-400 pt-1">
              Kenntnisnahme Erziehungsberechtigte
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Buttons (Hidden during print) */}
      <div className="print:hidden flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zum Editor</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          <Printer className="w-4 h-4" />
          <span>Druckansicht öffnen</span>
        </button>
      </div>

    </div>
  );
};

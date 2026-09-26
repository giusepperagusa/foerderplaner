import React, { useState } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  ArrowLeft,
  FileCheck,
  Building,
  Calendar,
  User,
  Users,
  CheckCircle2,
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
    let out = `FÖRDERPLAN (Senatsverwaltung für Bildung, Jugend und Familie Berlin)\n`;
    out += `Handreichung „Fördermaßnahmen konkret!“ (S. 82-83)\n\n`;
    out += `1. SCHÜLERDATEN & RAHMENBEDINGUNGEN\n`;
    out += `Name/Kennung: ${planDoc.profil.name || '---'}\n`;
    out += `Klasse/Lerngruppe: ${planDoc.profil.klasse || '---'}\n`;
    out += `Geburtsdatum: ${planDoc.profil.geburtsdatum || '---'}\n`;
    out += `Schule/Schul-Nr.: ${planDoc.profil.schule || '---'}\n`;
    out += `Verantwortliche Lehrkraft: ${planDoc.profil.lehrkraft || '---'}\n`;
    out += `Erziehungsberechtigte: ${planDoc.profil.erziehungsberechtigte || '---'}\n`;
    out += `Förderschwerpunkt: ${planDoc.profil.hauptschwerpunkt}\n`;
    out += `Förderzeitraum: von ${planDoc.profil.zeitraumVon || '---'} bis ${planDoc.profil.zeitraumBis || '---'}\n\n`;
    
    if (planDoc.profil.ausgangslageNotiz) {
      out += `Ausgangslage & Ressourcen:\n${planDoc.profil.ausgangslageNotiz}\n\n`;
    }

    out += `2. MASSNAHMEN-RASTER (5-SPALTIG)\n`;
    planDoc.planEintraege.forEach((entry, idx) => {
      out += `--------------------------------------------------\n`;
      out += `[${idx + 1}] Thema: ${entry.kategorie} (${entry.bereich})\n`;
      out += `IST (Bedarf/Stellungnahme): ${entry.ist}\n`;
      out += `SOLL (Ziele): ${entry.soll}\n`;
      out += `LERNWEG (Pädagogische Maßnahmen/Angebote): ${entry.lernweg}\n`;
      out += `ABSPRACHEN (Wer? Wie? Mit wem? Bis wann?): ${entry.absprachen}\n`;
      out += `REFLEXION (Evaluation/Modifikation): ${entry.reflexion}\n`;
    });
    out += `--------------------------------------------------\n\n`;

    if (planDoc.weitereVereinbarungen) {
      out += `3. WEITERE VEREINBARUNGEN:\n${planDoc.weitereVereinbarungen}\n\n`;
    }

    out += `4. GESPRÄCH & KENNTNISNAHME\n`;
    out += `Gespräch geführt am: ${planDoc.gespraechsDatum || '---'}\n`;
    out += `Beteiligte/Anwesende: ${planDoc.anwesendePersonen || '---'}\n`;
    out += `Information Erziehungsberechtigte: ${planDoc.informationElternErfolgt ? 'Erfolgt' : 'Ausstehend'}\n`;

    navigator.clipboard.writeText(out);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Action Toolbar (Screen only - hidden during print) */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Schritt 5: Förderplan drucken & exportieren
            </h2>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              Formular S. 82/83
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Offizielles Formular der Senatsverwaltung Berlin („Fördermaßnahmen konkret!“, Anhang S. 82 & 83).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText ? 'Kopiert!' : 'Text kopieren'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>JSON sichern</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Formular Drucken / PDF</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          OFFICIAL FORMULAR: HANDREICHUNG „FÖRDERMASSNAHMEN KONKRET!“ (S. 82-83)
          Strictly formatted for DIN-A4 print reproduction
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-300 p-8 sm:p-10 shadow-md text-black print:border-none print:shadow-none print:p-0 print:m-0 space-y-6 font-serif">
        
        {/* =====================================================================
            SEITE 1 (Vorderseite / S. 82):
            KOPFZEILE, STAMMDATEN-BLOCK, BESCHREIBUNG DER AUSGANGSLAGE & RAHMEN
            ===================================================================== */}
        <div className="space-y-4">
          
          {/* Official Berlin Header Bar */}
          <div className="border-b-2 border-black pb-3">
            <div className="flex justify-between items-start text-[11px] leading-tight text-neutral-800">
              <div>
                <span className="font-bold tracking-wide uppercase block text-[10px]">
                  Senatsverwaltung für Bildung, Jugend und Familie Berlin
                </span>
                <span className="italic text-[10px] text-neutral-600">
                  Handreichung „Fördermaßnahmen konkret!“ &bull; Anlage Förderplan (S. 82/83)
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold block">{planDoc.profil.schule || 'Grundschule (Schule)'}</span>
                <span className="text-[10px] text-neutral-600">Schuljahr {new Date().getFullYear()}/{new Date().getFullYear() + 1}</span>
              </div>
            </div>

            <div className="mt-2 text-center">
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-black font-sans">
                F Ö R D E R P L A N
              </h1>
              <p className="text-xs text-neutral-700 italic mt-0.5">
                gemäß § 19 Sonderpädagogische Förderverordnung (SopädVO) Berlin
              </p>
            </div>
          </div>

          {/* Formular-Abschnitt 1: Schülerdaten und Rahmenbedingungen (Page 82 Formularblock) */}
          <div className="border border-black text-xs font-sans">
            <div className="bg-neutral-100 font-bold px-3 py-1 border-b border-black text-[11px] uppercase tracking-wide">
              1. Angaben zur Schülerin / zum Schüler und Rahmenbedingungen
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black">
              {/* Left Column */}
              <div className="p-2.5 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[130px] text-neutral-700">Name / Kennung:</span>
                  <span className="font-bold text-sm text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5">
                    {planDoc.profil.name || '_______________________________'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[130px] text-neutral-700">Geburtsdatum:</span>
                  <span className="text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5">
                    {planDoc.profil.geburtsdatum || '_______________________________'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[130px] text-neutral-700">Klasse / Lerngruppe:</span>
                  <span className="text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5">
                    {planDoc.profil.klasse || '_______________________________'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[130px] text-neutral-700">Erziehungsberechtigte:</span>
                  <span className="text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5">
                    {planDoc.profil.erziehungsberechtigte || '_______________________________'}
                  </span>
                </div>
              </div>

              {/* Right Column */}
              <div className="p-2.5 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[150px] text-neutral-700">Förderschwerpunkt:</span>
                  <span className="font-bold text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5">
                    {planDoc.profil.hauptschwerpunkt}
                    {planDoc.profil.weitererSchwerpunkt && ` / ${planDoc.profil.weitererSchwerpunkt}`}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[150px] text-neutral-700">Förderzeitraum:</span>
                  <span className="text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5">
                    {planDoc.profil.zeitraumVon || '______'} bis {planDoc.profil.zeitraumBis || '______'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[150px] text-neutral-700">Klassenlehrkraft:</span>
                  <span className="text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5">
                    {planDoc.profil.lehrkraft || '_______________________________'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[150px] text-neutral-700">Status der Planung:</span>
                  <span className="text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5 uppercase font-semibold text-[11px]">
                    {planDoc.status === 'abgeschlossen' ? '[X] Abgeschlossen & Genehmigt' : '[X] Laufender Förderplan-Entwurf'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ausgangslage & Ressourcen (Page 82 narrative block) */}
            <div className="border-t border-black p-3 bg-neutral-50/50">
              <span className="font-bold text-neutral-800 block mb-1 text-[11px]">
                Ausgangslage, Ressourcen & bisherige Förderergebnisse (IST-Stand):
              </span>
              <p className="text-xs text-neutral-900 whitespace-pre-line leading-relaxed min-h-[40px]">
                {planDoc.profil.ausgangslageNotiz || 
                  'Das Kind verfügt über positive Motivation in handlungsorientierten Lernsituationen. Die Förderplanung zielt auf eine gezielte Stabilisierung der Kulturtechniken und des Arbeitsverhaltens.'}
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================================
            SEITE 2 / FORMULAR-RASTER:
            DAS AMTLICHE 5-SPALTEN-RASTER („FÖRDERMASSNAHMEN KONKRET!“, S. 83)
            IST | SOLL | LERNWEG | ABSPRACHEN | REFLEXION / EVALUATION
            ===================================================================== */}
        <div className="space-y-2 pt-2">
          <div className="flex items-baseline justify-between border-b border-black pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-black font-sans">
              2. Amtliches Förderplan-Raster: Pädagogische Fördermaßnahmen & Lernwege
            </h2>
            <span className="text-[10px] text-neutral-600 italic font-sans">
              Handreichung S. 83 (Spalten 1–5)
            </span>
          </div>

          <table className="w-full border-collapse border border-black text-xs font-sans official-form-table">
            <thead>
              <tr className="bg-neutral-100 text-black font-bold border-b border-black text-[11px]">
                <th className="border border-black p-2 w-[18%] text-left align-top">
                  <div>1. IST</div>
                  <div className="text-[9px] font-normal text-neutral-700 leading-tight mt-0.5">
                    Beobachtung / Bedarf<br />(= Stellungnahme)
                  </div>
                </th>
                <th className="border border-black p-2 w-[18%] text-left align-top">
                  <div>2. SOLL</div>
                  <div className="text-[9px] font-normal text-neutral-700 leading-tight mt-0.5">
                    Ziele / Kompetenzerwerb<br />(SMART formuliert)
                  </div>
                </th>
                <th className="border border-black p-2 w-[30%] text-left align-top">
                  <div>3. LERNWEG</div>
                  <div className="text-[9px] font-normal text-neutral-700 leading-tight mt-0.5">
                    Pädagogische Angebote & Maßnahmen<br />(Differenzierung, Anschauungsmaterial)
                  </div>
                </th>
                <th className="border border-black p-2 w-[17%] text-left align-top">
                  <div>4. Absprachen</div>
                  <div className="text-[9px] font-normal text-neutral-700 leading-tight mt-0.5">
                    Wer? Wie? Mit wem?<br />Bis wann?
                  </div>
                </th>
                <th className="border border-black p-2 w-[17%] text-left align-top">
                  <div>5. Reflexion</div>
                  <div className="text-[9px] font-normal text-neutral-700 leading-tight mt-0.5">
                    Evaluation &<br />Modifikation
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {planDoc.planEintraege.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-black p-6 text-center text-neutral-500 italic">
                    Keine individuellen Maßnahmen im Förderplan erfasst. Fügen Sie in Schritt 3 oder 4 Maßnahmen hinzu.
                  </td>
                </tr>
              ) : (
                planDoc.planEintraege.map((row, idx) => (
                  <tr key={row.id} className="align-top border-b border-black page-break-inside-avoid">
                    <td className="border border-black p-2 text-neutral-900">
                      <div className="font-bold text-[11px] text-black border-b border-neutral-300 pb-0.5 mb-1">
                        #{idx + 1} {row.kategorie}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono mb-1">Bereich: {row.bereich}</div>
                      <div className="whitespace-pre-line text-xs leading-relaxed">{row.ist}</div>
                    </td>
                    <td className="border border-black p-2 text-neutral-900 whitespace-pre-line text-xs leading-relaxed">
                      {row.soll}
                    </td>
                    <td className="border border-black p-2 text-neutral-900 whitespace-pre-line text-xs leading-relaxed">
                      {row.lernweg}
                    </td>
                    <td className="border border-black p-2 text-neutral-900 whitespace-pre-line text-xs leading-relaxed">
                      {row.absprachen}
                    </td>
                    <td className="border border-black p-2 text-neutral-900 whitespace-pre-line text-xs leading-relaxed">
                      {row.reflexion}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================================================
            SEITE 2 UNTEN:
            WEITERE VEREINBARUNGEN, KOOPERATIONEN, NACHTEILSAUSGLEICH (S. 83)
            ===================================================================== */}
        <div className="border border-black p-3 text-xs font-sans space-y-1.5 page-break-inside-avoid">
          <span className="font-bold uppercase tracking-wider text-[11px] block text-black">
            3. Weitere Vereinbarungen / Kooperationen & Nachteilsausgleich:
          </span>
          <p className="whitespace-pre-line text-neutral-900 leading-relaxed min-h-[35px]">
            {planDoc.weitereVereinbarungen || 
              'Kooperation mit Sonderpädagogik, Erzieherteam und Elternhaus im wöchentlichen/halbjährlichen Turnus. Nachteilsausgleich gemäß Schulanfangsphase / Grundschulverordnung (z.B. angepasste Aufgabenstellung, Zeitzugabe bei Leistungsüberprüfungen).'}
          </p>
        </div>

        {/* =====================================================================
            SEITE 2 ABSCHLUSS:
            GESPRÄCHSDOKUMENTATION & RECHTSVERBINDLICHE UNTERSCHRIFTEN (S. 83)
            ===================================================================== */}
        <div className="border border-black p-3 text-xs font-sans space-y-4 page-break-inside-avoid">
          <div className="font-bold uppercase tracking-wider text-[11px] text-black border-b border-black pb-1">
            4. Durchführung des Förderplangesprächs & Kenntnisnahme
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-neutral-800">
            <div>
              <span className="font-bold block text-[10px] text-neutral-600">Gespräch geführt am:</span>
              <span className="text-black font-semibold">
                {planDoc.gespraechsDatum || '_____._____.20___'}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="font-bold block text-[10px] text-neutral-600">Beteiligte Personen / Anwesende:</span>
              <span className="text-black">
                {planDoc.anwesendePersonen || 'Klassenlehrkraft, Sonderpädagogin/Sonderpädagoge, Erziehungsberechtigte'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px]">
            <span className="font-bold">Information der Erziehungsberechtigten:</span>
            <span>
              {planDoc.informationElternErfolgt 
                ? '[X] Ist erfolgt (Gespräch geführt / Förderplan in Kopie ausgehändigt)' 
                : '[ ] Ausstehend / Termin vereinbart'}
            </span>
          </div>

          {/* Three Signatures as depicted in the Berlin Template */}
          <div className="grid grid-cols-3 gap-4 pt-10 text-center text-[10px] text-neutral-700">
            <div className="border-t border-black pt-1">
              <span className="block font-semibold">Datum, Unterschrift</span>
              <span>Klassenlehrkraft</span>
            </div>
            <div className="border-t border-black pt-1">
              <span className="block font-semibold">Datum, Unterschrift</span>
              <span>Sonderpädagogin / Schulleitung</span>
            </div>
            <div className="border-t border-black pt-1">
              <span className="block font-semibold">Datum, Kenntnisnahme</span>
              <span>Erziehungsberechtigte</span>
            </div>
          </div>
        </div>

        {/* Footer print meta */}
        <div className="text-[9px] text-neutral-500 flex justify-between border-t border-neutral-300 pt-1 font-sans">
          <span>Förderplan-Assistent Berlin &bull; Dokumentengrundlage: „Fördermaßnahmen konkret!“ Stand 11/2018</span>
          <span>Erstellt am: {planDoc.erstelltAm} &bull; Letzte Änderung: {planDoc.aktualisiertAm}</span>
        </div>

      </div>

      {/* Navigation Buttons (Screen only) */}
      <div className="print:hidden flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zum Editor</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Amtliches Formular drucken</span>
        </button>
      </div>

    </div>
  );
};

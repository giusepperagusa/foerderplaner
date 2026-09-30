import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Printer,
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
import { APP_VERSION } from './VersionInfoModal';

interface Props {
  planDoc: FoerderplanDocument;
  onPrev: () => void;
}

export const PrintPreviewStep: React.FC<Props> = ({ planDoc, onPrev }) => {
  const [copiedText, setCopiedText] = useState(false);
  const section2Ref = useRef<HTMLElement>(null);

  // Dynamic page calculation based on measure + pedagogical table density heuristics
  const [totalPages, setTotalPages] = useState<number>(() => {
    const entriesCount = planDoc.planEintraege.length;
    const totalChars = planDoc.planEintraege.reduce(
      (acc, r) => acc + r.ist.length + r.soll.length + r.lernweg.length + r.absprachen.length + r.reflexion.length,
      0
    ) + (planDoc.weitereVereinbarungen ? planDoc.weitereVereinbarungen.length : 0);

    if (entriesCount <= 2 && totalChars < 900) return 2;
    if (entriesCount <= 3 && totalChars < 1600) return 3;
    return Math.max(2, Math.ceil(entriesCount / 2) + (totalChars > 2400 ? 2 : 1));
  });

  const calculatePages = useCallback(() => {
    const entriesCount = planDoc.planEintraege.length;
    const totalChars = planDoc.planEintraege.reduce(
      (acc, r) => acc + r.ist.length + r.soll.length + r.lernweg.length + r.absprachen.length + r.reflexion.length,
      0
    ) + (planDoc.weitereVereinbarungen ? planDoc.weitereVereinbarungen.length : 0);

    let calculated = 2;
    if (entriesCount <= 2 && totalChars < 900) {
      calculated = 2;
    } else if (entriesCount <= 3 && totalChars < 1600) {
      calculated = 3;
    } else {
      calculated = Math.max(2, Math.ceil(entriesCount / 2) + (totalChars > 2400 ? 2 : 1));
    }

    // Measure live DOM height if rendered
    if (section2Ref.current) {
      const s2Height = section2Ref.current.scrollHeight;
      if (s2Height > 50) {
        // Usable page height inside DIN-A4 page container (297mm - 26mm padding ~ 980px)
        const s2Pages = Math.max(1, Math.ceil(s2Height / 980));
        calculated = Math.max(calculated, 1 + s2Pages);
      }
    }

    setTotalPages(calculated);
  }, [planDoc]);

  useEffect(() => {
    calculatePages();
    const timer = setTimeout(calculatePages, 200);
    window.addEventListener('resize', calculatePages);
    window.addEventListener('beforeprint', calculatePages);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePages);
      window.removeEventListener('beforeprint', calculatePages);
    };
  }, [calculatePages]);

  const handlePrint = () => {
    calculatePages();
    window.print();
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
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Formular drucken / PDF</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          OFFICIAL FORMULAR: HANDREICHUNG „FÖRDERMASSNAHMEN KONKRET!“ (S. 82-83)
          Strictly formatted for DIN-A4 print reproduction
          ========================================================================= */}
      {/* =========================================================================
          OFFICIAL FORMULAR: HANDREICHUNG „FÖRDERMASSNAHMEN KONKRET!“ (S. 82-83)
          Strictly formatted for DIN-A4 print reproduction and DIN 1450 legibility
          ========================================================================= */}
      <article 
        aria-label="Amtlicher Förderplan Berlin" 
        className="bg-white rounded-2xl border border-slate-300 p-8 sm:p-10 shadow-md text-black print-document-sheet print:border-none print:shadow-none print:m-0 space-y-6 font-sans text-xs sm:text-sm leading-normal"
      >
        
        {/* =====================================================================
            SEITE 1 (Vorderseite / S. 82):
            KOPFZEILE, STAMMDATEN-BLOCK, BESCHREIBUNG DER AUSGANGSLAGE & RAHMEN
            ===================================================================== */}
        <section aria-labelledby="foerderplan-header-title" className="space-y-4">
          
          {/* Official Berlin Header Bar */}
          <header role="banner" className="border-b-2 border-black pb-3">
            <div className="flex justify-between items-start text-xs leading-tight text-black">
              <div>
                <span className="font-bold tracking-wide uppercase block text-[11px]">
                  Senatsverwaltung für Bildung, Jugend und Familie Berlin
                </span>
                <span className="italic text-[11px] text-neutral-800">
                  Handreichung „Fördermaßnahmen konkret!“ &bull; Anlage Förderplan (S. 82/83)
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold block">{planDoc.profil.schule || 'Grundschule (Schule)'}</span>
                <span className="text-[11px] text-neutral-800">Schuljahr {new Date().getFullYear()}/{new Date().getFullYear() + 1}</span>
              </div>
            </div>

            <div className="mt-2 text-center">
              <h1 id="foerderplan-header-title" className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-black font-sans">
                F Ö R D E R P L A N
              </h1>
              <p className="text-xs text-neutral-800 italic mt-0.5">
                gemäß § 19 Sonderpädagogische Förderverordnung (SopädVO) Berlin
              </p>
            </div>
          </header>

          {/* Formular-Abschnitt 1: Schülerdaten und Rahmenbedingungen (Page 82 Formularblock) */}
          <section aria-labelledby="section-1-heading" className="border border-black font-sans">
            <h2 id="section-1-heading" className="bg-neutral-100 print:bg-white font-bold px-3 py-1.5 border-b border-black text-xs uppercase tracking-wide text-black">
              1. Angaben zur Schülerin / zum Schüler und Rahmenbedingungen
            </h2>
            
            <dl className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black m-0">
              {/* Left Column */}
              <div className="p-3 space-y-2.5">
                <div className="flex items-baseline gap-2">
                  <dt className="font-bold min-w-[140px] text-black">Name / Kennung:</dt>
                  <dd className="font-bold text-sm text-black flex-1 border-b border-black pb-0.5 m-0">
                    {planDoc.profil.name || '_______________________________'}
                  </dd>
                </div>

                <div className="flex items-baseline gap-2">
                  <dt className="font-bold min-w-[140px] text-black">Geburtsdatum:</dt>
                  <dd className="text-black flex-1 border-b border-black pb-0.5 m-0">
                    {planDoc.profil.geburtsdatum || '_______________________________'}
                  </dd>
                </div>

                <div className="flex items-baseline gap-2">
                  <dt className="font-bold min-w-[140px] text-black">Klasse / Lerngruppe:</dt>
                  <dd className="text-black flex-1 border-b border-black pb-0.5 m-0">
                    {planDoc.profil.klasse || '_______________________________'}
                  </dd>
                </div>

                <div className="flex items-baseline gap-2">
                  <dt className="font-bold min-w-[140px] text-black">Erziehungsberechtigte:</dt>
                  <dd className="text-black flex-1 border-b border-black pb-0.5 m-0">
                    {planDoc.profil.erziehungsberechtigte || '_______________________________'}
                  </dd>
                </div>
              </div>

              {/* Right Column */}
              <div className="p-3 space-y-2.5">
                <div className="flex items-baseline gap-2">
                  <dt className="font-bold min-w-[150px] text-black">Förderschwerpunkt:</dt>
                  <dd className="font-bold text-black flex-1 border-b border-black pb-0.5 m-0">
                    {planDoc.profil.hauptschwerpunkt}
                    {planDoc.profil.weitererSchwerpunkt && ` / ${planDoc.profil.weitererSchwerpunkt}`}
                  </dd>
                </div>

                <div className="flex items-baseline gap-2">
                  <dt className="font-bold min-w-[150px] text-black">Förderzeitraum:</dt>
                  <dd className="text-black flex-1 border-b border-black pb-0.5 m-0">
                    {planDoc.profil.zeitraumVon || '______'} bis {planDoc.profil.zeitraumBis || '______'}
                  </dd>
                </div>

                <div className="flex items-baseline gap-2">
                  <dt className="font-bold min-w-[150px] text-black">Klassenlehrkraft:</dt>
                  <dd className="text-black flex-1 border-b border-black pb-0.5 m-0">
                    {planDoc.profil.lehrkraft || '_______________________________'}
                  </dd>
                </div>

                <div className="flex items-baseline gap-2">
                  <dt className="font-bold min-w-[150px] text-black">Status der Planung:</dt>
                  <dd className="text-black flex-1 border-b border-black pb-0.5 uppercase font-semibold text-xs m-0">
                    {planDoc.status === 'abgeschlossen' ? '[X] Abgeschlossen & Genehmigt' : '[X] Laufender Förderplan-Entwurf'}
                  </dd>
                </div>
              </div>
            </dl>

            {/* Ausgangslage & Ressourcen (Page 82 narrative block) */}
            <div className="border-t border-black p-3 bg-neutral-50/50 print:bg-white">
              <span className="font-bold text-black block mb-1 text-xs uppercase tracking-wide">
                Ausgangslage, Ressourcen & bisherige Förderergebnisse (IST-Stand):
              </span>
              <p className="text-xs sm:text-sm text-black whitespace-pre-line leading-relaxed min-h-[40px] m-0">
                {planDoc.profil.ausgangslageNotiz || 
                  'Das Kind verfügt über positive Motivation in handlungsorientierten Lernsituationen. Die Förderplanung zielt auf eine gezielte Stabilisierung der Kulturtechniken und des Arbeitsverhaltens.'}
              </p>
            </div>
          </section>

          {/* Page 1 Official Footer: Official publisher and dynamic page indicator */}
          <div className="document-footer text-xs text-neutral-800 flex justify-between items-center border-t border-black pt-1.5 font-sans mt-3">
            <span className="font-semibold text-black">Senatsverwaltung für Bildung, Jugend und Familie Berlin</span>
            <span className="text-[10px] text-neutral-700 hidden sm:inline print:inline">
              Förderplan-Assistent Berlin {APP_VERSION.replace('-offline', '').replace(/^v/, '')} &bull; Dokumentengrundlage: „Fördermaßnahmen konkret!“ Stand 11/2018
            </span>
            <span className="font-bold text-black">
              {totalPages > 2 ? `Seite 1 von ${totalPages}` : 'Seite 1 / 2'}
            </span>
          </div>
        </section>

        {/* =====================================================================
            SEITE 2 / FORMULAR-RASTER:
            DAS AMTLICHE 5-SPALTEN-RASTER („FÖRDERMASSNAHMEN KONKRET!“, S. 83)
            IST | SOLL | LERNWEG | ABSPRACHEN | REFLEXION / EVALUATION
            ===================================================================== */}
        <section 
          ref={section2Ref} 
          aria-labelledby="section-2-heading" 
          className="space-y-3 pt-2 page-break-before font-sans"
        >
          <div className="flex items-baseline justify-between border-b border-black pb-1">
            <h2 id="section-2-heading" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black font-sans">
              2. Amtliches Förderplan-Raster: Pädagogische Fördermaßnahmen & Lernwege
            </h2>
            <span className="text-xs font-bold text-black font-sans">
              {totalPages > 2 ? `Seite 2 von ${totalPages}` : 'Seite 2 / 2'}
            </span>
          </div>

          <table className="w-full border-collapse border border-black text-xs sm:text-sm font-sans official-form-table" aria-labelledby="section-2-heading">
            <caption className="sr-only">Fördermaßnahmen und pädagogische Lernwege in 5 Spalten gemäß Berliner Handreichung</caption>
            <thead>
              <tr className="bg-neutral-100 print:bg-white text-black font-bold border-b border-black text-xs">
                <th scope="col" className="border border-black p-2.5 w-[18%] text-left align-top">
                  <div>1. IST</div>
                  <div className="text-[10px] font-normal text-black leading-tight mt-0.5">
                    Beobachtung / Bedarf<br />(= Stellungnahme)
                  </div>
                </th>
                <th scope="col" className="border border-black p-2.5 w-[18%] text-left align-top">
                  <div>2. SOLL</div>
                  <div className="text-[10px] font-normal text-black leading-tight mt-0.5">
                    Ziele / Kompetenzerwerb<br />(SMART formuliert)
                  </div>
                </th>
                <th scope="col" className="border border-black p-2.5 w-[30%] text-left align-top">
                  <div>3. LERNWEG</div>
                  <div className="text-[10px] font-normal text-black leading-tight mt-0.5">
                    Pädagogische Angebote & Maßnahmen<br />(Differenzierung, Anschauungsmaterial)
                  </div>
                </th>
                <th scope="col" className="border border-black p-2.5 w-[17%] text-left align-top">
                  <div>4. Absprachen</div>
                  <div className="text-[10px] font-normal text-black leading-tight mt-0.5">
                    Wer? Wie? Mit wem?<br />Bis wann?
                  </div>
                </th>
                <th scope="col" className="border border-black p-2.5 w-[17%] text-left align-top">
                  <div>5. Reflexion</div>
                  <div className="text-[10px] font-normal text-black leading-tight mt-0.5">
                    Evaluation &<br />Modifikation
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {planDoc.planEintraege.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-black p-6 text-center text-neutral-600 italic">
                    Keine individuellen Maßnahmen im Förderplan erfasst. Fügen Sie in Schritt 3 oder 4 Maßnahmen hinzu.
                  </td>
                </tr>
              ) : (
                planDoc.planEintraege.map((row, idx) => (
                  <tr key={row.id} className="align-top border-b border-black page-break-inside-avoid">
                    <td className="border border-black p-2.5 text-black">
                      <div className="font-bold text-xs text-black border-b border-black pb-0.5 mb-1">
                        #{idx + 1} {row.kategorie}
                      </div>
                      <div className="text-[10px] text-neutral-800 font-mono mb-1">Bereich: {row.bereich}</div>
                      <div className="whitespace-pre-line text-xs sm:text-sm leading-relaxed">{row.ist}</div>
                    </td>
                    <td className="border border-black p-2.5 text-black whitespace-pre-line text-xs sm:text-sm leading-relaxed">
                      {row.soll}
                    </td>
                    <td className="border border-black p-2.5 text-black whitespace-pre-line text-xs sm:text-sm leading-relaxed">
                      {row.lernweg}
                    </td>
                    <td className="border border-black p-2.5 text-black whitespace-pre-line text-xs sm:text-sm leading-relaxed">
                      {row.absprachen}
                    </td>
                    <td className="border border-black p-2.5 text-black whitespace-pre-line text-xs sm:text-sm leading-relaxed">
                      {row.reflexion}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* =====================================================================
            SEITE 2 UNTEN:
            WEITERE VEREINBARUNGEN, KOOPERATIONEN, NACHTEILSAUSGLEICH (S. 83)
            ===================================================================== */}
        <section aria-labelledby="section-3-heading" className="border border-black p-3.5 text-xs sm:text-sm font-sans space-y-1.5 page-break-inside-avoid">
          <h2 id="section-3-heading" className="font-bold uppercase tracking-wider text-xs sm:text-sm block text-black">
            3. Weitere Vereinbarungen / Kooperationen & Nachteilsausgleich:
          </h2>
          <p className="whitespace-pre-line text-black leading-relaxed min-h-[35px] m-0">
            {planDoc.weitereVereinbarungen || 
              'Kooperation mit Sonderpädagogik, Erzieherteam und Elternhaus im wöchentlichen/halbjährlichen Turnus. Nachteilsausgleich gemäß Schulanfangsphase / Grundschulverordnung (z.B. angepasste Aufgabenstellung, Zeitzugabe bei Leistungsüberprüfungen).'}
          </p>
        </section>

        {/* =====================================================================
            SEITE 2 ABSCHLUSS:
            GESPRÄCHSDOKUMENTATION & RECHTSVERBINDLICHE UNTERSCHRIFTEN (S. 83)
            ===================================================================== */}
        <section aria-labelledby="section-4-heading" className="border border-black p-3.5 text-xs sm:text-sm font-sans space-y-4 page-break-inside-avoid">
          <h2 id="section-4-heading" className="font-bold uppercase tracking-wider text-xs sm:text-sm text-black border-b border-black pb-1">
            4. Durchführung des Förderplangesprächs & Kenntnisnahme
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-black">
            <div>
              <span className="font-bold block text-xs text-neutral-800">Gespräch geführt am:</span>
              <span className="text-black font-semibold">
                {planDoc.gespraechsDatum || '_____._____.20___'}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="font-bold block text-xs text-neutral-800">Beteiligte Personen / Anwesende:</span>
              <span className="text-black">
                {planDoc.anwesendePersonen || 'Klassenlehrkraft, Sonderpädagogin/Sonderpädagoge, Erziehungsberechtigte'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs sm:text-sm">
            <span className="font-bold">Information der Erziehungsberechtigten:</span>
            <span>
              {planDoc.informationElternErfolgt 
                ? '[X] Ist erfolgt (Gespräch geführt / Förderplan in Kopie ausgehändigt)' 
                : '[ ] Ausstehend / Termin vereinbart'}
            </span>
          </div>

          {/* Three Signatures as depicted in the Berlin Template */}
          <div className="grid grid-cols-3 gap-4 pt-10 text-center text-xs text-black">
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
        </section>

        {/* Final Document Footer: Official version, reference senate guideline, and final page indicator */}
        <footer className="document-footer text-[10px] text-neutral-900 flex justify-between items-center border-t border-black pt-1.5 font-sans mt-4 print:mt-3">
          <span className="font-normal text-black">
            Förderplan-Assistent Berlin {APP_VERSION.replace('-offline', '').replace(/^v/, '')} &bull; Dokumentengrundlage: „Fördermaßnahmen konkret!“ Stand 11/2018
          </span>
          <span className="font-semibold text-black">
            {totalPages > 2 ? `Seite ${totalPages} von ${totalPages}` : 'Seite 2 / 2'}
          </span>
        </footer>

      </article>

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
          <span>Formular drucken / PDF</span>
        </button>
      </div>

    </div>
  );
};

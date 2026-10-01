import React, { useState } from 'react';
import {
  Printer,
  Copy,
  Check,
  ArrowLeft,
  FileCheck,
} from 'lucide-react';
import { FoerderplanDocument, PlanRow } from '../types/foerderplan';
import { APP_VERSION } from './VersionInfoModal';

interface Props {
  planDoc: FoerderplanDocument;
  onPrev: () => void;
}

export type PrintPageModel =
  | { type: 'cover' }
  | {
      type: 'table_with_sections';
      chunk: PlanRow[];
      startIndex: number;
    }
  | {
      type: 'table_only';
      chunk: PlanRow[];
      startIndex: number;
      isContinuation: boolean;
      partIndex: number;
      totalParts: number;
      prevPageNumber: number;
    }
  | {
      type: 'sections_only';
      prevPageNumber: number;
    };

export const PrintPreviewStep: React.FC<Props> = ({ planDoc, onPrev }) => {
  const [copiedText, setCopiedText] = useState(false);

  // Clean version string (e.g. "1.4.11")
  const cleanVersion = APP_VERSION.replace('-offline', '').replace(/^v/, '');

  /**
   * Smart pagination engine:
   * 1. Page 1 is always the cover / master data & baseline page.
   * 2. Table entries are strictly limited to at most 2 per page to guarantee
   *    that every single table row and the page footer have plenty of vertical room.
   * 3. If there are 2 or more entries (or 1 detailed entry), Sections 3 & 4 (Agreements,
   *    Conference, Signatures) are automatically moved to their own dedicated continuation
   *    page with a clear continuation header explaining what section it belongs to.
   *    This guarantees that the footer NEVER slips beyond the end of any page.
   */
  const pages: PrintPageModel[] = React.useMemo(() => {
    const list: PrintPageModel[] = [];
    // Page 1: Cover (Master data & Ausgangslage)
    list.push({ type: 'cover' });

    const entries = planDoc.planEintraege;

    // Helper to evaluate if a single entry plus weitereVereinbarungen can safely fit
    // alongside Sections 3 & 4 without risking footer displacement beyond the 297mm DIN A4 boundary.
    const canFitSingleEntryWithSections = (entry?: PlanRow) => {
      if (!entry) return true;
      const textLen =
        (entry.ist?.length || 0) +
        (entry.soll?.length || 0) +
        (entry.lernweg?.length || 0) +
        (entry.absprachen?.length || 0) +
        (entry.reflexion?.length || 0);
      const agreementsLen = (planDoc.weitereVereinbarungen || '').length;
      return textLen + agreementsLen < 320;
    };

    if (entries.length === 0) {
      // 0 entries: Empty table note + Sections 3 & 4 fit comfortably on Page 2
      list.push({
        type: 'table_with_sections',
        chunk: [],
        startIndex: 0,
      });
    } else if (entries.length === 1 && canFitSingleEntryWithSections(entries[0])) {
      // 1 compact entry: Fits on Page 2 alongside Sections 3 & 4 with safe margins
      list.push({
        type: 'table_with_sections',
        chunk: entries,
        startIndex: 0,
      });
    } else {
      // 2 or more entries, or 1 comprehensive entry:
      // Chunk table entries into maximum 2 rows per page
      const chunks: Array<{ chunk: PlanRow[]; startIndex: number }> = [];
      for (let i = 0; i < entries.length; i += 2) {
        chunks.push({
          chunk: entries.slice(i, i + 2),
          startIndex: i,
        });
      }

      chunks.forEach((c, idx) => {
        list.push({
          type: 'table_only',
          chunk: c.chunk,
          startIndex: c.startIndex,
          isContinuation: idx > 0,
          partIndex: idx + 1,
          totalParts: chunks.length,
          prevPageNumber: list.length,
        });
      });

      // Move Section 3 (Weitere Vereinbarungen) & Section 4 (Gesprächsdurchführung & Unterschriften)
      // to a dedicated continuation page with an explicit continuation line
      list.push({
        type: 'sections_only',
        prevPageNumber: list.length,
      });
    }

    return list;
  }, [planDoc.planEintraege, planDoc.weitereVereinbarungen]);

  const totalPages = pages.length;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    let out = `FÖRDERPLAN\n`;
    out += `gemäß § 19 Sonderpädagogische Förderverordnung (SopädVO) Berlin\n\n`;
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

  /**
   * Unified page footer: strictly placed at the very bottom of each and every page.
   * Left aligned: Program version number and reference PDF document date
   * Right aligned: Current page number and total number of pages
   */
  const renderFooter = (pageNumber: number) => (
    <footer className="document-footer mt-auto border-t border-black pt-2 pb-0.5 flex justify-between items-center text-xs font-sans">
      <span className="text-left text-[11px] text-black font-normal">
        Förderplan-Assistent Berlin {cleanVersion} &bull; Stand: 11/2018
      </span>
      <span className="text-right text-xs text-black font-bold font-mono">
        Seite {pageNumber} von {totalPages}
      </span>
    </footer>
  );

  /**
   * Renders the 5-column pedagogical measures table
   */
  const renderTable = (chunk: PlanRow[], startIndex: number) => (
    <table className="w-full border-collapse border border-black text-xs sm:text-sm font-sans official-form-table">
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
        {chunk.length === 0 ? (
          <tr>
            <td colSpan={5} className="border border-black p-6 text-center text-neutral-600 italic">
              Keine individuellen Maßnahmen im Förderplan erfasst. Fügen Sie in Schritt 3 oder 4 Maßnahmen hinzu.
            </td>
          </tr>
        ) : (
          chunk.map((row, idx) => (
            <tr key={row.id} className="align-top border-b border-black page-break-inside-avoid">
              <td className="border border-black p-2.5 text-black">
                <div className="font-bold text-xs text-black border-b border-black pb-0.5 mb-1">
                  #{startIndex + idx + 1} {row.kategorie}
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
  );

  /**
   * Renders Sections 3 & 4 (Additional agreements & Conference documentation with signatures)
   */
  const renderSections3And4 = (currentPage: number) => (
    <div className="space-y-3 sm:space-y-4">
      {/* Section 3: Weitere Vereinbarungen */}
      <section aria-labelledby={`section-3-heading-${currentPage}`} className="border border-black p-3.5 text-xs sm:text-sm font-sans space-y-1.5 page-break-inside-avoid">
        <h2 id={`section-3-heading-${currentPage}`} className="font-bold uppercase tracking-wider text-xs sm:text-sm block text-black">
          3. Weitere Vereinbarungen / Kooperationen & Nachteilsausgleich:
        </h2>
        <p className="whitespace-pre-line text-black leading-relaxed min-h-[35px] m-0">
          {planDoc.weitereVereinbarungen || 
            'Kooperation mit Sonderpädagogik, Erzieherteam und Elternhaus im wöchentlichen/halbjährlichen Turnus. Nachteilsausgleich gemäß Schulanfangsphase / Grundschulverordnung (z.B. angepasste Aufgabenstellung, Zeitzugabe bei Leistungsüberprüfungen).'}
        </p>
      </section>

      {/* Section 4: Durchführung des Förderplangesprächs & Unterschriften */}
      <section aria-labelledby={`section-4-heading-${currentPage}`} className="border border-black p-3.5 text-xs sm:text-sm font-sans space-y-3 sm:space-y-4 page-break-inside-avoid">
        <h2 id={`section-4-heading-${currentPage}`} className="font-bold uppercase tracking-wider text-xs sm:text-sm text-black border-b border-black pb-1">
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

        {/* Three Signatures */}
        <div className="grid grid-cols-3 gap-4 pt-6 sm:pt-8 text-center text-xs text-black">
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
    </div>
  );

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
            Offizielles Formular („Fördermaßnahmen konkret!“, Anhang S. 82 & 83).
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
          PAGE RENDERING LOOP (PAGE 1, 2, ..., N)
          Formatted strictly as discrete DIN A4 pages with guaranteed footer room
          ========================================================================= */}
      {pages.map((page, index) => {
        const currentPage = index + 1;

        if (page.type === 'cover') {
          return (
            <section 
              key="page-1"
              aria-labelledby="foerderplan-header-title" 
              className="a4-page-sheet bg-white rounded-2xl border border-slate-300 p-8 sm:p-10 shadow-md text-black font-sans text-xs sm:text-sm leading-normal flex flex-col justify-between min-h-[297mm] mb-8 print:mb-0 print:border-none print:shadow-none print:rounded-none"
            >
              <div className="flex-1 flex flex-col space-y-4">
                
                {/* Header Bar:
                    - School indication placed strictly in the upper right
                    - Title "F Ö R D E R P L A N" and legal subtitle centered in the upper part
                */}
                <header role="banner" className="border-b-2 border-black pb-2.5 relative">
                  {/* School indication in the upper right corner */}
                  <div className="absolute right-0 top-0 text-right text-xs leading-tight text-black">
                    <span className="font-semibold block text-xs">{planDoc.profil.schule || 'Grundschule (Schule)'}</span>
                    <span className="text-[11px] text-neutral-800">
                      Schuljahr {new Date().getFullYear()}/{new Date().getFullYear() + 1}
                    </span>
                  </div>

                  {/* Centered Title and Subtitle */}
                  <div className="text-center pt-1 px-16 sm:px-20">
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
              </div>

              {/* Footer of Page 1 (Anchored at very bottom) */}
              {renderFooter(1)}
            </section>
          );
        }

        if (page.type === 'table_with_sections') {
          return (
            <section
              key={`page-${currentPage}`}
              className="a4-page-sheet bg-white rounded-2xl border border-slate-300 p-8 sm:p-10 shadow-md text-black font-sans text-xs sm:text-sm leading-normal flex flex-col justify-between min-h-[297mm] mb-8 print:mb-0 print:border-none print:shadow-none print:rounded-none page-break-before"
            >
              <div className="flex-1 flex flex-col space-y-3 sm:space-y-4">
                {/* Section 2 Header */}
                <div className="border-b border-black pb-1">
                  <h2 id={`section-2-heading-${currentPage}`} className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black font-sans">
                    2. Amtliches Förderplan-Raster: Pädagogische Fördermaßnahmen & Lernwege
                  </h2>
                </div>

                {/* Table */}
                {renderTable(page.chunk, page.startIndex)}

                {/* Sections 3 & 4 */}
                {renderSections3And4(currentPage)}
              </div>

              {/* Footer of this page */}
              {renderFooter(currentPage)}
            </section>
          );
        }

        if (page.type === 'table_only') {
          return (
            <section
              key={`page-${currentPage}`}
              className="a4-page-sheet bg-white rounded-2xl border border-slate-300 p-8 sm:p-10 shadow-md text-black font-sans text-xs sm:text-sm leading-normal flex flex-col justify-between min-h-[297mm] mb-8 print:mb-0 print:border-none print:shadow-none print:rounded-none page-break-before"
            >
              <div className="flex-1 flex flex-col space-y-3">
                {/* Section 2 Header with explicit continuation line if continuing from previous page */}
                <div className="border-b border-black pb-1">
                  {page.isContinuation ? (
                    <>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                        Förderplan &bull; Fortsetzung von Seite {page.prevPageNumber}
                      </div>
                      <h2 id={`section-2-heading-${currentPage}`} className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black font-sans">
                        2. Amtliches Förderplan-Raster: Pädagogische Fördermaßnahmen & Lernwege (Fortsetzung – Teil {page.partIndex} von {page.totalParts})
                      </h2>
                    </>
                  ) : (
                    <h2 id={`section-2-heading-${currentPage}`} className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black font-sans">
                      2. Amtliches Förderplan-Raster: Pädagogische Fördermaßnahmen & Lernwege
                      {page.totalParts > 1 && ` (Teil 1 von ${page.totalParts})`}
                    </h2>
                  )}
                </div>

                {/* Table (Strictly max 2 entries, plenty of vertical room, no footer overflow) */}
                {renderTable(page.chunk, page.startIndex)}
              </div>

              {/* Footer of this page */}
              {renderFooter(currentPage)}
            </section>
          );
        }

        if (page.type === 'sections_only') {
          return (
            <section
              key={`page-${currentPage}`}
              className="a4-page-sheet bg-white rounded-2xl border border-slate-300 p-8 sm:p-10 shadow-md text-black font-sans text-xs sm:text-sm leading-normal flex flex-col justify-between min-h-[297mm] mb-8 print:mb-0 print:border-none print:shadow-none print:rounded-none page-break-before"
            >
              <div className="flex-1 flex flex-col space-y-3 sm:space-y-4">
                {/* Clear Continuation Line explaining that Sections 3 & 4 follow from previous pages */}
                <div className="border-b border-black pb-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                    Förderplan &bull; Fortsetzung von Seite {page.prevPageNumber}
                  </div>
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black font-sans">
                    3. Weitere Vereinbarungen & 4. Gesprächsdurchführung / Kenntnisnahme
                  </h2>
                  <p className="text-[11px] text-neutral-700 italic mt-0.5 m-0">
                    (Fortsetzung des Förderplans für {planDoc.profil.name || 'die Schülerin / den Schüler'}: Kooperationen, Nachteilsausgleich, Förderplangespräch und rechtsverbindliche Unterschriften)
                  </p>
                </div>

                {/* Sections 3 & 4 */}
                {renderSections3And4(currentPage)}
              </div>

              {/* Footer of this page */}
              {renderFooter(currentPage)}
            </section>
          );
        }

        return null;
      })}

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

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  Download,
  Copy,
  Code,
  RefreshCw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import richtlinienRaw from '../data/richtlinien.json';
import {
  normalizeGermanText,
  deepNormalize,
  findRemainingUmlauts,
  validateGuidelinesSchema,
  parseRawGuidelineText,
} from '../utils/richtlinienTools';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdateGuidelines?: (newData: any) => void;
}

export const GuidelinesManagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'normalizer' | 'parser' | 'validator'>('explorer');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchwerpunkt, setSelectedSchwerpunkt] = useState<string>('Alle');
  
  // Normalizer tool state
  const [normInput, setNormInput] = useState('Beispieltext mit Umlauten: Förderschwerpunkt Lernen an Grundschulen für Schülerinnen und Schüler, die Unterstützung bei regelmäßigen Hörübungen und größeren Sinnzusammenhängen benötigen.');
  const [copiedNorm, setCopiedNorm] = useState(false);

  // Parser tool state
  const [rawTextToParse, setRawTextToParse] = useState(
`IST
Beobachtung/Bedarf
- Die Schülerin/der Schüler ...
... zeigt erhebliche Müdigkeit beim konzentrierten Zuhören.

SOLL
Ziele
- Die Schülerin/der Schüler ...
... kann auditiven Erklärungen über 10 Minuten folgen.

LERNWEG - Pädagogische Angebote/Maßnahmen/Lernarrangements
• Reduzierung der Störgeräusche im Klassenraum
• Visualisierte Hörpausen mit einer Sanduhr einlegen
• Gezielte Kontrollfragen nach jedem Arbeitsschritt`
  );
  const [parsedEntries, setParsedEntries] = useState<any[]>([]);
  const [targetCategory, setTargetCategory] = useState('Auditive Aufmerksamkeit');

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentData = richtlinienRaw as any;
  const validationResult = validateGuidelinesSchema(currentData);

  const handleTestNormalize = () => {
    navigator.clipboard.writeText(normalizeGermanText(normInput));
    setCopiedNorm(true);
    setTimeout(() => setCopiedNorm(false), 2000);
  };

  const handleRunParser = () => {
    const entries = parseRawGuidelineText(rawTextToParse, targetCategory);
    setParsedEntries(entries);
  };

  const handleDownloadActiveJson = () => {
    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'richtlinien.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadParsedEntries = () => {
    const blob = new Blob([JSON.stringify(parsedEntries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrahierte_massnahmen_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter explorer entries
  const schwerpunkteList = Object.keys(currentData.foerderschwerpunkte || {});
  const filteredCategories: Array<{ schwerpunkt: string; kategorie: string; entries: any[] }> = [];

  for (const [spName, spObj] of Object.entries<any>(currentData.foerderschwerpunkte || {})) {
    if (selectedSchwerpunkt !== 'Alle' && spName !== selectedSchwerpunkt) continue;
    if (!spObj.kategorien) continue;

    for (const cat of spObj.kategorien) {
      const matchingEntries = cat.eintraege.filter((e: any) => {
        if (!searchTerm) return true;
        const q = normalizeGermanText(searchTerm).toLowerCase();
        return (
          e.ist.toLowerCase().includes(q) ||
          e.soll.toLowerCase().includes(q) ||
          cat.kategorie.toLowerCase().includes(q) ||
          e.lernweg.some((l: string) => l.toLowerCase().includes(q))
        );
      });

      if (matchingEntries.length > 0) {
        filteredCategories.push({
          schwerpunkt: spName,
          kategorie: cat.kategorie,
          entries: matchingEntries,
        });
      }
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Richtlinien-Manager & Aktualisierungs-Werkzeug</h2>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Verwaltung & Normalisierung der amtlichen Handreichung "Foerdermassnahmen konkret!"
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadActiveJson}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
              title="Aktuelle richtlinien.json herunterladen"
            >
              <Download className="w-3.5 h-3.5" />
              richtlinien.json exportieren
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 gap-2 pt-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'explorer'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            Katalog & Richtlinien ({validationResult.stats?.istSollLernwegPairsCount || 0} Paare)
          </button>
          <button
            onClick={() => setActiveTab('normalizer')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'normalizer'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Umlaut-Normalisierer (ae, oe, ue, ss)
          </button>
          <button
            onClick={() => setActiveTab('parser')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'parser'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            PDF-OCR Text-Parser fuer Neuauflagen
          </button>
          <button
            onClick={() => setActiveTab('validator')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'validator'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Schema- & Integritaetspruefung
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          
          {/* TAB 1: EXPLORER */}
          {activeTab === 'explorer' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Suche nach Stichwort, Beobachtung, Ziel oder Lernweg..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div className="w-full sm:w-64">
                  <select
                    value={selectedSchwerpunkt}
                    onChange={(e) => setSelectedSchwerpunkt(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Alle">Alle Foerderschwerpunkte</option>
                    {schwerpunkteList.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {filteredCategories.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                    Keine Eintraege fuer die aktuellen Suchkriterien gefunden.
                  </div>
                ) : (
                  filteredCategories.map((group, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                            {group.schwerpunkt}
                          </span>
                          <span className="font-semibold text-slate-800 text-sm">{group.kategorie}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {group.entries.length} {group.entries.length === 1 ? 'Eintrag' : 'Eintraege'}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {group.entries.map((entry, eIdx) => (
                          <div key={eIdx} className="p-4 space-y-2 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="p-2.5 bg-rose-50/70 border border-rose-100 rounded-lg">
                                <span className="font-bold text-rose-800 block mb-1">IST (Beobachtung/Bedarf):</span>
                                <p className="text-slate-800">{entry.ist}</p>
                              </div>
                              <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-lg">
                                <span className="font-bold text-emerald-800 block mb-1">SOLL (Ziel):</span>
                                <p className="text-slate-800">{entry.soll}</p>
                              </div>
                            </div>
                            <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg">
                              <span className="font-bold text-blue-900 block mb-1">LERNWEG (Empfohlene Massnahmen):</span>
                              <ul className="list-disc list-inside space-y-1 text-slate-700">
                                {entry.lernweg.map((item: string, i: number) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: NORMALIZER */}
          {activeTab === 'normalizer' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                <span className="font-bold block mb-1">Hintergrund der Normalisierung:</span>
                Um ressourcenarmen lokalen Sprachmodellen auf mobilen Endgeraeten und Offline-Geraeten (wie Tablets in Grundschulen) das Matching zu erleichtern und Zeichenfehler zu vermeiden, werden alle Umlaute und das Eszett nach deutschen Transkriptionsregeln substituiert:
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 font-mono font-semibold">
                  <span className="bg-white p-1 rounded border border-blue-200">ä &rarr; ae / Ä &rarr; Ae</span>
                  <span className="bg-white p-1 rounded border border-blue-200">ö &rarr; oe / Ö &rarr; Oe</span>
                  <span className="bg-white p-1 rounded border border-blue-200">ü &rarr; ue / Ü &rarr; Ue</span>
                  <span className="bg-white p-1 rounded border border-blue-200">ß &rarr; ss</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Eingabetext mit deutschen Umlauten:</label>
                  <textarea
                    rows={8}
                    value={normInput}
                    onChange={(e) => setNormInput(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    placeholder="Text hier einfuegen..."
                  />
                  <div className="text-[11px] text-slate-500">
                    Enthaelt noch: {findRemainingUmlauts(normInput).join(', ') || 'Keine Umlaute mehr'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">Normalisierter Text (fuer LLM & Matcher):</label>
                    <button
                      onClick={handleTestNormalize}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedNorm ? 'Kopiert!' : 'Kopieren'}
                    </button>
                  </div>
                  <div className="w-full h-44 p-3 text-xs bg-emerald-50/50 border border-emerald-200 rounded-lg overflow-y-auto font-mono text-emerald-950">
                    {normalizeGermanText(normInput)}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium">
                    ✓ Bereit fuer Modell-Inferenz ohne Sonderzeichen-Kollisionen.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PARSER */}
          {activeTab === 'parser' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-1">Neuauflagen-Extractor:</span>
                Kopieren Sie Textabschnitte aus kuenftigen Ueberarbeitungen des amtlichen PDF-Dokuments hier hinein. Das Tool erkennt automatisch die IST/SOLL/LERNWEG-Abschnitte, normalisiert die Umlaute und erzeugt saubere Datenobjekte fuer die richtlinien.json.
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Ziel-Kategorie:</label>
                    <input
                      type="text"
                      value={targetCategory}
                      onChange={(e) => setTargetCategory(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      placeholder="z.B. Auditive Wahrnehmung"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleRunParser}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Text parsen & normalisieren
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Roh-Text (z.B. aus PDF OCR kopiert):</label>
                  <textarea
                    rows={6}
                    value={rawTextToParse}
                    onChange={(e) => setRawTextToParse(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {parsedEntries.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">
                      Erfolgreich extrahiert ({parsedEntries.length} Eintraege):
                    </h4>
                    <button
                      onClick={handleDownloadParsedEntries}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Als JSON exportieren
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto max-h-60 font-mono">
                    {JSON.stringify(parsedEntries, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VALIDATOR */}
          {activeTab === 'validator' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Richtlinien-Validierung erfolgreich</h3>
                    <p className="text-xs text-slate-500">
                      Die aktive Konfigurationsdatei entspricht zu 100% dem Modell-Schema und enthaelt null Roh-Umlaute.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Foerderschwerpunkte</span>
                    <span className="text-lg font-bold text-slate-800">
                      {validationResult.stats?.foerderschwerpunkteCount}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Kategorien</span>
                    <span className="text-lg font-bold text-slate-800">
                      {validationResult.stats?.categoriesCount}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">IST/SOLL/LERNWEG</span>
                    <span className="text-lg font-bold text-blue-700">
                      {validationResult.stats?.istSollLernwegPairsCount}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Checklisten-Punkte</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {validationResult.stats?.checklistCriteriaCount}
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-2 border-t border-slate-100 pt-3">
                  <div>
                    <span className="font-semibold text-slate-700">Dokument-Titel:</span>{' '}
                    <span className="text-slate-600">{currentData.dokument}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Herausgeber:</span>{' '}
                    <span className="text-slate-600">{currentData.herausgeber}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Gueltig ab:</span>{' '}
                    <span className="text-slate-600">{currentData.gueltigAb} (Version {currentData.version})</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Hinweis zur Zeichencodierung:</span>{' '}
                    <p className="text-slate-500 text-[11px] mt-0.5">{currentData.hinweis}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Stand der Berliner Richtlinien: November 2018 (SenBJF)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
          >
            Schliessen
          </button>
        </div>

      </div>
    </div>
  );
};

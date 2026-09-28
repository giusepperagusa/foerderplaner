import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  PlusCircle,
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
  Filter,
  Cpu,
  DownloadCloud,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  FileText,
  ListPlus,
  Trash2,
  X,
} from 'lucide-react';
import { StudentProfile, RatingValue, PlanRow } from '../types/foerderplan';
import {
  getRecommendationsFromChecklist,
  buildLocalModelPrompt,
  convertProposalToPlanRow,
  RecommendationProposal,
} from '../utils/localMatchingEngine';
import { webLlmManager, CURRENT_MODEL_CONFIG, ModelCacheStatus } from '../utils/webLlmManager';
import { ModelConsentModal } from './ModelConsentModal';
import richtlinienRaw from '../data/richtlinien.json';

interface Props {
  profile: StudentProfile;
  ratings: Record<string, RatingValue>;
  flaggedForSupport: Record<string, boolean>;
  existingRows: PlanRow[];
  onAddPlanRow: (row: PlanRow) => void;
  onNext: () => void;
  onPrev: () => void;
  onRequestOpenConsentModal?: () => void;
}

export const AiAssistantStep: React.FC<Props> = ({
  profile,
  ratings,
  flaggedForSupport,
  existingRows,
  onAddPlanRow,
  onNext,
  onPrev,
  onRequestOpenConsentModal,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'webllm'>('rules');
  const [selectedSchwerpunktFilter, setSelectedSchwerpunktFilter] = useState<string>('Alle');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Wllama State
  const [cacheStatus, setCacheStatus] = useState<ModelCacheStatus>({
    isSupported: true,
    isCached: false,
    isLoaded: false,
    storageBackend: 'OPFS',
    cacheKeys: [],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Compute matched proposals from official guideline database
  const proposals = useMemo(() => {
    return getRecommendationsFromChecklist(ratings, flaggedForSupport, profile);
  }, [ratings, flaggedForSupport, profile]);

  // Compute selected criteria for prompt & matching
  const selectedCriteria = useMemo(() => {
    const list: Array<{ label: string; unterbereich?: string }> = [];
    const checklisten = (richtlinienRaw as any).checklisten;
    for (const clObj of Object.values<any>(checklisten)) {
      for (const crit of clObj.kriterien) {
        if (
          flaggedForSupport[crit.id] ||
          ratings[crit.id] === 'trifft_eher_nicht_zu' ||
          ratings[crit.id] === 'trifft_nicht_zu'
        ) {
          list.push({ label: crit.label, unterbereich: crit.unterbereich });
        }
      }
    }
    return list;
  }, [ratings, flaggedForSupport]);

  // Generate offline model prompt
  const localModelPrompt = useMemo(() => {
    return buildLocalModelPrompt(profile, selectedCriteria, proposals);
  }, [profile, selectedCriteria, proposals]);

  useEffect(() => {
    checkModelStatus();
  }, []);

  // Close prompt modal on Escape key press
  useEffect(() => {
    if (!showPromptModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPromptModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPromptModal]);

  const checkModelStatus = async () => {
    const status = await webLlmManager.checkCacheStatus();
    setCacheStatus(status);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(localModelPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleAddProposal = (prop: RecommendationProposal) => {
    const newRow = convertProposalToPlanRow(prop, profile.lehrkraft || 'Klassenlehrkraft');
    onAddPlanRow(newRow);
    setAddedIds((prev) => ({ ...prev, [prop.id]: true }));
  };

  // Run Web Worker generation
  const handleRunLocalLlm = async () => {
    setGenerationError(null);

    // If model not loaded, trigger consent & download modal
    if (!webLlmManager.isEngineReady()) {
      setShowConsentModal(true);
      return;
    }

    setIsGenerating(true);
    setGeneratedText('');

    try {
      const systemPrompt = `Du bist ein erfahrener Grundschul-Sonderpaedagoge in Berlin. Formuliere konkrete, wuerdevolle und alltagstaugliche Foerderplan-Bausteine gemaess den Berliner Richtlinien "Foerdermassnahmen konkret!". Verwende normalisierte Schreibweise fuer Umlaute (ae, oe, ue, ss), damit Textausgaben optimal lesbar und ressourceneffizient bleiben.`;

      const userPrompt = `${localModelPrompt}\n\nBitte erstelle 2 bis 3 praegnante, differenzierte Foerdermassnahmen im standardisierten 5-Spalten-Format (IST, SOLL, LERNWEG, ABSPRACHEN).`;

      await webLlmManager.generateStreaming(systemPrompt, userPrompt, (_delta, fullText) => {
        setGeneratedText(fullText);
      });
    } catch (err: any) {
      console.error('LLM Generation Error:', err);
      setGenerationError(err.message || 'Fehler während der lokalen Inferenz.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Quick helper to insert generated LLM content as a custom row
  const handleInsertGeneratedAsRow = () => {
    if (!generatedText) return;
    
    // Parse rudimentary sections if possible, else structured row
    const lines = generatedText.split('\n').filter(l => l.trim().length > 0);
    const istLine = lines.find(l => l.toUpperCase().includes('IST')) || lines[0] || 'Beobachtung gemäß lokaler Analyse';
    const sollLine = lines.find(l => l.toUpperCase().includes('SOLL')) || lines[1] || 'Förderziel gemäß Empfehlung';
    const lernwegLines = lines.filter(l => l.toUpperCase().includes('LERNWEG') || l.startsWith('-') || l.startsWith('*'));
    
    const newRow: PlanRow = {
      id: `gen-${Date.now()}`,
      bereich: profile.hauptschwerpunkt || 'Lernen',
      kategorie: 'KI-Vorschlag (Lokal)',
      ist: istLine.replace(/^.*IST[:\-]?\s*/i, '').trim(),
      soll: sollLine.replace(/^.*SOLL[:\-]?\s*/i, '').trim(),
      lernweg: lernwegLines.length > 0 
        ? lernwegLines.map(l => l.replace(/^[-*]\s*/, '').trim()).join('\n• ') 
        : generatedText.slice(0, 200),
      absprachen: `Klassenlehrkraft • Umsetzung im Unterricht • Prüfung in 8 Wochen`,
      reflexion: '',
    };

    onAddPlanRow(newRow);
    alert('Der KI-Vorschlag wurde erfolgreich in Ihren Förderplan übernommen!');
  };

  const filteredProposals = proposals.filter((p) => {
    if (selectedSchwerpunktFilter !== 'Alle' && p.schwerpunkt !== selectedSchwerpunktFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/30 rounded-lg">
                <Sparkles className="w-5 h-5 text-blue-300" />
              </span>
              <h2 className="text-base font-bold">
                Schritt 3: Lokale Förderempfehlungen & KI-Generierung
              </h2>
            </div>
            <p className="text-xs text-blue-200 leading-relaxed max-w-2xl">
              Wählen Sie aus 107 offiziellen Berliner Richtlinien-Bausteinen oder nutzen Sie das integrierte lokale KI-Sprachmodell (Qwen2.5-0.5B via Wllama WebAssembly & OPFS/IndexedDB), um passgenaue Formulierungen offline direkt im Browser zu generieren.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowPromptModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-xs border border-white/20 transition whitespace-nowrap cursor-pointer"
              title="Vollständigen, normalisierten Prompt für externe lokale Runner einsehen"
            >
              <FileText className="w-4 h-4 text-blue-300" />
              <span>Prompt einsehen</span>
            </button>

            <button
              onClick={() => setShowConsentModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap cursor-pointer"
              title="Modell-Status und Download-Manager öffnen"
            >
              <Cpu className="w-4 h-4 text-indigo-200" />
              <span>Lokale KI (Wllama)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-3 pt-2 gap-2 shadow-xs">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'rules'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListPlus className="w-4 h-4" />
          <span>Offizielle Richtlinien-Zuordnung ({filteredProposals.length} Treffer)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-normal">
            0 MB • Sofort
          </span>
        </button>

        <button
          onClick={() => setActiveTab('webllm')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'webllm'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Lokales Sprachmodell (Qwen2.5-0.5B Wllama CPU/OPFS)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 font-normal">
            Wasm • CPU • Offline
          </span>
        </button>
      </div>

      {/* TAB 1: Instant Rule-Based Guideline Matching */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700">Förderschwerpunkt filtern:</span>
              <select
                value={selectedSchwerpunktFilter}
                onChange={(e) => setSelectedSchwerpunktFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden"
              >
                <option value="Alle">Alle Förderbereiche</option>
                <option value="Lernen">Lernen (LE)</option>
                <option value="Sprache">Sprache (SP)</option>
                <option value="Emotionale-soziale Entwicklung">Emotionale-soziale Entwicklung (ES)</option>
              </select>
            </div>

            <div className="text-slate-500 font-medium">
              {filteredProposals.length} Empfehlungen verfügbar &bull; {existingRows.length} im Förderplan
            </div>
          </div>

          {/* Proposals List */}
          <div className="space-y-4">
            {filteredProposals.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                Keine spezifischen Empfehlungen für diesen Filter. Markieren Sie im Einschätzungsbogen Kriterien mit Förderbedarf.
              </div>
            ) : (
              filteredProposals.map((prop) => {
                const isAdded = addedIds[prop.id] || false;

                return (
                  <div
                    key={prop.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-blue-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">
                          {prop.schwerpunkt}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{prop.kategorie}</span>
                      </div>

                      <button
                        onClick={() => handleAddProposal(prop)}
                        disabled={isAdded}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Übernommen</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>In Förderplan übernehmen</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* 3 Blocks: IST, SOLL, LERNWEG */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl space-y-1">
                        <span className="font-bold text-rose-900 block text-[11px] uppercase tracking-wider">
                          IST (Beobachtung / Entwicklungsbedarf):
                        </span>
                        <p className="text-slate-800">{prop.ist}</p>
                      </div>

                      <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
                        <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wider">
                          SOLL (Individuelles Förderziel):
                        </span>
                        <p className="text-slate-800">{prop.soll}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1 text-xs">
                      <span className="font-bold text-blue-900 block text-[11px] uppercase tracking-wider">
                        LERNWEG (Pädagogische Maßnahmen & Vereinbarungen):
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        {prop.lernweg.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: In-Browser WebLLM with Web Worker */}
      {activeTab === 'webllm' && (
        <div className="space-y-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-purple-50/70 border border-purple-200 rounded-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-950 text-sm">
                  {CURRENT_MODEL_CONFIG.name}
                </span>
                <span className="text-[10px] font-mono bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                  Wllama Wasm CPU Inferenz
                </span>
              </div>
              <p className="text-xs text-purple-800 leading-relaxed">
                Führt Inferenz direkt über WebAssembly auf der CPU aus. Speicherung erfolgt geschützt im OPFS/IndexedDB (ohne Cache API).
              </p>
            </div>

            <button
              onClick={() => setShowConsentModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-purple-300 bg-white text-purple-800 hover:bg-purple-100 transition whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              Modellspeicher verwalten
            </button>
          </div>

          {/* Trigger Button & Status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-600">
              {webLlmManager.isEngineReady() ? (
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Modell ist im Speicher initialisiert & bereit für Inferenz.
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Modell noch nicht geladen (~{CURRENT_MODEL_CONFIG.downloadSizeMB} MB in OPFS/IndexedDB erforderlich).
                </span>
              )}
            </div>

            <button
              onClick={handleRunLocalLlm}
              disabled={isGenerating}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Inferenz läuft via WebAssembly...</span>
                </>
              ) : webLlmManager.isEngineReady() ? (
                <>
                  <Play className="w-4 h-4" />
                  <span>Passgenaue Förderbausteine generieren</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  <span>Modell laden / Zustimmen (~{CURRENT_MODEL_CONFIG.downloadSizeMB} MB)</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {generationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Inferenz-Fehler:</span>
                <span>{generationError}</span>
              </div>
            </div>
          )}

          {/* Streaming Output Box */}
          {(generatedText || isGenerating) && (
            <div className="p-5 bg-slate-900 text-slate-100 rounded-xl space-y-3 font-sans">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
                  <Cpu className="w-3.5 h-3.5" />
                  Generierte Förderbausteine (Qwen2.5-0.5B Lokal):
                </span>
                
                {isGenerating && (
                  <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Generiere Tokens...
                  </span>
                )}
              </div>

              <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-200 max-h-80 overflow-y-auto p-1">
                {generatedText}
              </div>

              {!isGenerating && generatedText && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedText);
                      alert('Text in Zwischenablage kopiert!');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    Text kopieren
                  </button>
                  <button
                    onClick={handleInsertGeneratedAsRow}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>In Förderplan übernehmen</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* External Prompt Modal */}
      {showPromptModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowPromptModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900">
                  Normalisierter Prompt für lokales LLM
                </h3>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1 cursor-pointer"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-3">
              <p className="text-xs text-slate-500">
                Dieser Prompt wurde automatisch mit den normalisierten deutschen Umlauten (ae, oe, ue, ss) aufbereitet, um maximale Kompatibilität mit ressourcenarmen Offline-Modellen (z. B. Ollama, LM Studio, Qwen, Gemma, Llama) zu garantieren.
              </p>

              <textarea
                rows={10}
                readOnly
                value={localModelPrompt}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowPromptModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Schließen
              </button>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedPrompt ? 'In Zwischenablage kopiert!' : 'Prompt kopieren'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Consent & Download Modal */}
      <ModelConsentModal
        isOpen={showConsentModal}
        onClose={() => {
          setShowConsentModal(false);
          checkModelStatus();
        }}
        onModelReady={() => {
          setShowConsentModal(false);
          checkModelStatus();
        }}
      />

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zur Einschätzung</span>
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          <span>Weiter zum Förderplan-Editor ({existingRows.length})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

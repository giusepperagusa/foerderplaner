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
  Square,
  CheckCircle2,
  AlertCircle,
  FileText,
  ListPlus,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { StudentProfile, RatingValue, PlanRow } from '../types/foerderplan';
import {
  getRecommendationsFromChecklist,
  buildLocalModelPrompt,
  convertProposalToPlanRow,
  RecommendationProposal,
} from '../utils/localMatchingEngine';
import {
  webLlmManager,
  CURRENT_MODEL_CONFIG,
  AVAILABLE_MODELS,
  ModelCacheStatus,
  GenerationStats,
  ModelOption,
} from '../utils/webLlmManager';
import { detectDeviceHardware } from '../utils/hardwareDetection';
import { ModelConsentModal } from './ModelConsentModal';
import { useFocusTrap } from '../hooks/useFocusTrap';
import richtlinienRaw from '../data/richtlinien.json';

interface Props {
  profile: StudentProfile;
  ratings: Record<string, RatingValue>;
  flaggedForSupport: Record<string, boolean>;
  existingRows: PlanRow[];
  onAddPlanRow: (row: PlanRow) => void;
  onRemovePlanRow?: (rowId: string) => void;
  generatedText?: string;
  onSaveGeneratedText?: (text: string) => void;
  activeTab?: 'rules' | 'webllm';
  onTabChange?: (tab: 'rules' | 'webllm') => void;
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
  onRemovePlanRow,
  generatedText: initialGeneratedText = '',
  onSaveGeneratedText,
  activeTab: controlledActiveTab,
  onTabChange,
  onNext,
  onPrev,
  onRequestOpenConsentModal,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'rules' | 'webllm'>('rules');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = (t: 'rules' | 'webllm') => {
    if (onTabChange) onTabChange(t);
    setInternalActiveTab(t);
  };

  const [selectedSchwerpunktFilter, setSelectedSchwerpunktFilter] = useState<string>('Alle');
  const [onlyAddedFilter, setOnlyAddedFilter] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Focus trap for prompt modal
  const promptModalRef = useFocusTrap<HTMLDivElement>({
    isOpen: showPromptModal,
    onClose: () => setShowPromptModal(false),
  });

  // Active model state & display tag
  const [activeModel, setActiveModel] = useState<ModelOption>(() => webLlmManager.getModelConfig());
  const modelDisplayTag = activeModel.shortName.split(' ')[0];
  const hardwareProfile = useMemo(() => detectDeviceHardware(), []);

  // Wllama State with immediate localStorage verification to avoid momentary false un-cached state on reload
  const [cacheStatus, setCacheStatus] = useState<ModelCacheStatus>(() => {
    const currentConfig = webLlmManager.getModelConfig();
    const hasLocalFlag =
      typeof window !== 'undefined' &&
      localStorage.getItem(`foerderplaner_model_cached_${currentConfig.id}`) === 'true';
    return {
      isSupported: true,
      isCached: hasLocalFlag,
      isLoaded: webLlmManager.isEngineReady(),
      storageBackend: 'OPFS',
      cacheKeys: [],
    };
  });

  const handleSelectModel = async (key: string) => {
    if (isGenerating) return;
    webLlmManager.setSelectedModelKey(key);
    setActiveModel(webLlmManager.getModelConfig());
    const status = await webLlmManager.checkCacheStatus();
    setCacheStatus(status);
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitializingEngine, setIsInitializingEngine] = useState(false);
  const [tokenStats, setTokenStats] = useState<GenerationStats>({
    tokenCount: 0,
    tokensPerSec: 0,
    elapsedSec: 0,
  });
  const [generationStage, setGenerationStage] = useState<
    'idle' | 'initializing' | 'prefill' | 'generating' | 'stopped'
  >('idle');
  const [generatedText, setGeneratedText] = useState<string>(initialGeneratedText);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [insertSuccess, setInsertSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Keep generatedText synchronized with incoming prop when not generating
  useEffect(() => {
    if (!isGenerating && initialGeneratedText !== undefined) {
      setGeneratedText(initialGeneratedText);
    }
  }, [initialGeneratedText, isGenerating]);

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

  const checkModelStatus = async () => {
    setActiveModel(webLlmManager.getModelConfig());
    const status = await webLlmManager.checkCacheStatus();
    setCacheStatus(status);
  };

  useEffect(() => {
    checkModelStatus();
  }, [activeTab]);

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

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(localModelPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Check if a proposal is already present in existing plan rows
  const getMatchingRow = (prop: RecommendationProposal): PlanRow | undefined => {
    return existingRows.find(
      (r) =>
        (r.proposalId && r.proposalId === prop.id) ||
        (r.bereich === prop.schwerpunkt && r.kategorie === prop.kategorie && r.ist === prop.ist)
    );
  };

  const handleToggleProposal = (prop: RecommendationProposal) => {
    const matching = getMatchingRow(prop);
    if (matching) {
      if (onRemovePlanRow) {
        onRemovePlanRow(matching.id);
      }
    } else {
      const newRow = convertProposalToPlanRow(prop, profile.lehrkraft || 'Klassenlehrkraft');
      onAddPlanRow(newRow);
    }
  };

  const handleClearGeneratedText = () => {
    setGeneratedText('');
    onSaveGeneratedText?.('');
  };

  // Immediately stop/cancel local LLM generation
  const handleStopGeneration = () => {
    webLlmManager.abortGeneration();
    setIsGenerating(false);
    setGenerationStage('stopped');
  };

  // Run Web Worker generation with seamless offline memory loading
  const handleRunLocalLlm = async () => {
    setGenerationError(null);

    // If model is not yet cached in OPFS/IndexedDB, open consent & download dialog
    if (!cacheStatus.isCached) {
      setShowConsentModal(true);
      return;
    }

    setIsGenerating(true);
    setGenerationStage('prefill');
    setTokenStats({ tokenCount: 0, tokensPerSec: 0, elapsedSec: 0 });
    setGeneratedText('');
    setInsertSuccess(false);

    try {
      const systemPrompt = `Du bist ein erfahrener Berliner Sonderpädagoge für Grundschul-Förderpläne („Fördermaßnahmen konkret!“). Formuliere präzise, alltagstaugliche Förderplan-Bausteine mit getrennten Abschnitten (IST, SOLL, LERNWEG, ABSPRACHEN, REFLEXION). Schreibe keine Vorbemerkungen, keine Wiederholungen und keine Schlusskommentare.`;

      const userPrompt = localModelPrompt;

      let finalFullText = '';
      await webLlmManager.generateStreaming(
        systemPrompt,
        userPrompt,
        (_delta, fullText, stats) => {
          finalFullText = fullText;
          setGenerationStage('generating');
          setTokenStats(stats);
          setGeneratedText(fullText);
        },
        (progress) => {
          if (progress.progress < 1) {
            setGenerationStage('initializing');
          }
        }
      );
      if (finalFullText) {
        onSaveGeneratedText?.(finalFullText);
      }
    } catch (err: any) {
      console.error('LLM Generation Error:', err);
      setGenerationError(err.message || 'Fehler während der lokalen Inferenz.');
    } finally {
      setIsGenerating(false);
      setGenerationStage('idle');
      checkModelStatus();
    }
  };

  // Quick helper to insert generated LLM content as a custom row
  const handleInsertGeneratedAsRow = () => {
    if (!generatedText) return;
    
    // Parse the 5 sections from generated text
    const lines = generatedText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const istLine = lines.find((l) => l.toUpperCase().includes('IST')) || 'Schwierigkeiten bei Konzentration und Aufgabenorganisation.';
    const sollLine = lines.find((l) => l.toUpperCase().includes('SOLL')) || 'Steigert Ausdauer und Konzentration bei Arbeitsaufträgen.';
    const absprachenLine = lines.find((l) => l.toUpperCase().includes('ABSPRACHEN'));
    const reflexionLine = lines.find((l) => l.toUpperCase().includes('REFLEXION'));
    const lernwegLines = lines.filter((l) => l.startsWith('*') || l.startsWith('-') || l.startsWith('•'));
    
    const newRow: PlanRow = {
      id: `gen-${Date.now()}`,
      bereich: profile.hauptschwerpunkt || 'Lernen',
      kategorie: 'KI-Vorschlag (Lokal)',
      ist: istLine.replace(/^.*IST[:\-]?\s*/i, '').replace(/^[#*\s]+/, '').trim(),
      soll: sollLine.replace(/^.*SOLL[:\-]?\s*/i, '').replace(/^[#*\s]+/, '').trim(),
      lernweg: lernwegLines.length > 0 
        ? lernwegLines.map((l) => l.replace(/^[-*•]\s*/, '').trim()).join('\n• ') 
        : 'Visuelle Strukturierungshilfen und schrittweise Aufgabenbearbeitung',
      absprachen: absprachenLine 
        ? absprachenLine.replace(/^.*ABSPRACHEN[:\-]?\s*/i, '').trim() 
        : 'Klassenlehrkraft, 2-3x pro Woche im Unterricht',
      reflexion: reflexionLine 
        ? reflexionLine.replace(/^.*REFLEXION[:\-]?\s*/i, '').trim() 
        : 'Gemeinsame Reflexion und Auswertung nach 6 Wochen',
    };

    onAddPlanRow(newRow);
    setInsertSuccess(true);
    setTimeout(() => setInsertSuccess(false), 3500);
  };

  const addedCount = useMemo(() => {
    return proposals.filter((p) => Boolean(getMatchingRow(p))).length;
  }, [proposals, existingRows]);

  const filteredProposals = proposals.filter((p) => {
    if (selectedSchwerpunktFilter !== 'Alle' && p.schwerpunkt !== selectedSchwerpunktFilter) {
      return false;
    }
    if (onlyAddedFilter && !getMatchingRow(p)) {
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
                Schritt 3: Förderempfehlungen &amp; Maßnahmen
              </h2>
            </div>
            <p className="text-xs text-blue-200 leading-relaxed max-w-2xl">
              Wählen Sie bewährte pädagogische Fördermaßnahmen aus den 107 amtlichen Berliner Richtlinien-Bausteinen (Standard-Modus ohne KI) oder nutzen Sie das lokale Sprachmodell ({modelDisplayTag}) als optionale, experimentelle Formulierungshilfe.
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
              type="button"
              onClick={() => setShowConsentModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap cursor-pointer"
              title="Lokale KI (Wllama, optional & experimentell) verwalten & Modell-Status prüfen"
              aria-label="Lokale KI (Wllama, optional)"
            >
              <Cpu className="w-4 h-4 text-indigo-200" />
              <span>Lokale KI (Optional)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div role="tablist" aria-label="Modus für Förderempfehlungen" className="flex border-b border-slate-200 bg-white rounded-t-2xl px-3 pt-2 gap-2 shadow-xs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'rules'}
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'rules'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-700 hover:text-slate-950'
          }`}
        >
          <ListPlus className="w-4 h-4" />
          <span>Amtliche Richtlinien-Bausteine ({filteredProposals.length} Treffer)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
            Standard (Ohne KI) • Sofort
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'webllm'}
          onClick={() => setActiveTab('webllm')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'webllm'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-700 hover:text-slate-950'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Optionale KI-Formulierungshilfe ({modelDisplayTag})</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-medium">
            Experimentell &amp; Optional
          </span>
          <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 font-normal">
            Wasm • Offline
          </span>
        </button>
      </div>

      {/* TAB 1: Instant Rule-Based Guideline Matching */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                <label htmlFor="select-schwerpunkt-filter" className="font-semibold text-slate-800">
                  Förderschwerpunkt:
                </label>
                <select
                  id="select-schwerpunkt-filter"
                  value={selectedSchwerpunktFilter}
                  onChange={(e) => setSelectedSchwerpunktFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900"
                >
                  <option value="Alle">Alle Förderbereiche</option>
                  <option value="Lernen">Lernen (LE)</option>
                  <option value="Sprache">Sprache (SP)</option>
                  <option value="Emotionale-soziale Entwicklung">Emotionale-soziale Entwicklung (ES)</option>
                </select>
              </div>

              {/* Quick toggle to show only selected/added proposals */}
              <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md transition select-none">
                <input
                  type="checkbox"
                  checked={onlyAddedFilter}
                  onChange={(e) => setOnlyAddedFilter(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="font-medium text-slate-700">
                  Nur übernommene Bausteine anzeigen ({addedCount})
                </span>
              </label>
            </div>

            <div className="text-slate-600 font-medium flex items-center gap-2">
              <span>{filteredProposals.length} Empfehlungen</span>
              <span className="text-slate-300">&bull;</span>
              <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                {addedCount} im Förderplan übernommen
              </span>
            </div>
          </div>

          {/* Proposals List */}
          <div className="space-y-4">
            {filteredProposals.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
                <p>
                  {onlyAddedFilter
                    ? 'Bisher wurden noch keine Empfehlungen aus dieser Liste in den Förderplan übernommen.'
                    : 'Keine spezifischen Empfehlungen für diesen Filter. Markieren Sie im Einschätzungsbogen Kriterien mit Förderbedarf.'}
                </p>
                {onlyAddedFilter && (
                  <button
                    type="button"
                    onClick={() => setOnlyAddedFilter(false)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Alle Empfehlungen anzeigen
                  </button>
                )}
              </div>
            ) : (
              filteredProposals.map((prop) => {
                const matchingRow = getMatchingRow(prop);
                const isAdded = Boolean(matchingRow);

                return (
                  <div
                    key={prop.id}
                    className={`rounded-2xl p-5 shadow-xs space-y-3 transition ${
                      isAdded
                        ? 'bg-emerald-50/40 border-2 border-emerald-500 ring-2 ring-emerald-200/70 shadow-sm'
                        : 'bg-white border border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Visual Banner if added to the plan */}
                    {isAdded && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-emerald-100 border border-emerald-300 text-emerald-950 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                          <span>Ausgewählt: Dieser Baustein ist im Förderplan enthalten</span>
                        </div>
                        <span className="text-[11px] font-medium text-emerald-800">
                          (Maßnahme #{existingRows.findIndex((r) => r.id === matchingRow?.id) + 1} von {existingRows.length} im Plan-Raster)
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">
                          {prop.schwerpunkt}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{prop.kategorie}</span>
                        {isAdded && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                            <Check className="w-3 h-3" />
                            Aktiv im Plan
                          </span>
                        )}
                      </div>

                      {/* Action buttons: easily understandable & easily reversible */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {isAdded ? (
                          <button
                            type="button"
                            onClick={() => handleToggleProposal(prop)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 hover:border-rose-300 transition cursor-pointer shadow-xs"
                            title="Diesen Baustein wieder aus dem Förderplan entfernen"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Aus Förderplan entfernen</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleProposal(prop)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>In Förderplan übernehmen</span>
                          </button>
                        )}
                      </div>
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
          
          {/* Prominent Experimental & Optional Notice */}
          <div className="p-4 bg-amber-50/90 border border-amber-300/80 rounded-xl flex items-start gap-3 text-xs text-amber-950 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-amber-900">
                  Experimentelle &amp; vollständig optionale Zusatzfunktion
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-200/80 text-amber-900 font-semibold border border-amber-400/50">
                  App ohne KI uneingeschränkt nutzbar
                </span>
              </div>
              <p className="text-amber-900 leading-relaxed">
                Die Nutzung des lokalen Sprachmodells ist zu 100% freiwillig und optional. Sie können Ihren Förderplan jederzeit vollständig und ohne jegliche KI erstellen: Alle 107 offiziellen Berliner Förderrichtlinien-Bausteine stehen Ihnen in <button type="button" onClick={() => setActiveTab('rules')} className="underline font-bold text-amber-950 hover:text-blue-800 cursor-pointer">Tab 1 (Offizielle Richtlinien-Zuordnung)</button> sofort zur Verfügung, und alle Felder können in Schritt 4 frei manuell formuliert werden. Es werden keinerlei Daten an externe Server übertragen.
              </p>
            </div>
          </div>

          {/* Model Selection & Management Card */}
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Auswahl des lokalen Sprachmodells (CPU WebAssembly • 100% On-Device):
              </span>
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border border-purple-300 bg-white text-purple-800 hover:bg-purple-100 transition whitespace-nowrap self-start sm:self-auto cursor-pointer shadow-2xs"
                title="Modell-Speicher & Hardware-Profile verwalten"
                aria-label="Lokale KI verwalten"
              >
                <Cpu className="w-3.5 h-3.5 text-purple-700" />
                <span>Modell verwalten / Speicher leeren</span>
              </button>
            </div>

            {/* 3 Model Selection Cards in order of preference */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {Object.entries(AVAILABLE_MODELS).map(([key, model]) => {
                const isSelected = activeModel.id === model.id;
                const isHwRecommended = key === hardwareProfile.recommendedModelKey;
                const isCachedLocally =
                  typeof window !== 'undefined' &&
                  localStorage.getItem(`foerderplaner_model_cached_${model.id}`) === 'true';

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectModel(key)}
                    disabled={isGenerating}
                    className={`p-3 rounded-xl border text-left transition relative cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-white shadow-xs ring-2 ring-purple-500/20'
                        : 'border-purple-200/80 bg-white/70 hover:bg-white hover:border-purple-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-purple-950">
                          {model.shortName}
                        </span>
                        {isHwRecommended ? (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded"
                            title="Empfohlen für Ihre Hardware-Ausstattung"
                          >
                            Empfohlen für Ihr Gerät
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {model.quantization}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div className="text-[10px] text-slate-500 font-medium">{model.parameters}</div>
                        {isCachedLocally ? (
                          <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Offline bereit
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500">
                            Download: <strong className="text-slate-800">~{model.downloadSizeMB} MB</strong>
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-1 border-t border-purple-200 text-[10px] font-semibold text-purple-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-purple-600" />
                        Aktiv ausgewählt
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-purple-800/90 leading-relaxed pt-0.5">
              Führt Inferenz direkt über WebAssembly auf der CPU aus ({hardwareProfile.hardwareSummary}). Speicherung erfolgt geschützt im OPFS/IndexedDB.
            </p>
          </div>

          {/* Trigger Button & Status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="text-xs">
              {webLlmManager.isEngineReady() ? (
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Modell ist im Arbeitsspeicher geladen & sofort einsatzbereit.
                </span>
              ) : cacheStatus.isCached ? (
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Modell ist lokal gespeichert ({cacheStatus.storageBackend}, 100% offline einsatzbereit).
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Modell noch nicht heruntergeladen (~{activeModel.downloadSizeMB} MB in OPFS/IndexedDB erforderlich).
                </span>
              )}
            </div>

            {isGenerating ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                title="Laufende Inferenz abbrechen"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Inferenz abbrechen ({tokenStats.tokenCount} Tokens)</span>
              </button>
            ) : isInitializingEngine ? (
              <button
                disabled
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-wait opacity-85"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Initialisiere Modell aus lokalem Speicher...</span>
              </button>
            ) : (cacheStatus.isCached || webLlmManager.isEngineReady()) ? (
              <button
                type="button"
                onClick={handleRunLocalLlm}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Passgenaue Förderbausteine generieren</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRunLocalLlm}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Modell laden / Zustimmen (~{webLlmManager.getModelConfig().downloadSizeMB} MB)</span>
              </button>
            )}
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Generierte Förderbausteine ({webLlmManager.getModelConfig().shortName}):
                </span>

                <div className="flex items-center gap-2">
                  {isGenerating && generationStage === 'prefill' && (
                    <span className="flex items-center gap-1.5 text-[11px] text-amber-300 font-mono animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Prompt-Verarbeitung & Kontext laden...
                    </span>
                  )}

                  {isGenerating && generationStage === 'generating' && (
                    <div className="flex items-center gap-2 text-[11px] font-mono text-amber-300">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>Generiere Tokens:</span>
                      <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-emerald-400 font-bold">
                        {tokenStats.tokenCount} Tokens
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        ({tokenStats.tokensPerSec} Tok/s • {tokenStats.elapsedSec.toFixed(1)}s)
                      </span>
                    </div>
                  )}

                  {generationStage === 'stopped' && (
                    <span className="text-[11px] font-mono text-rose-300 bg-rose-950/70 border border-rose-800/80 px-2 py-0.5 rounded">
                      Inferenz gestoppt ({tokenStats.tokenCount} Tokens)
                    </span>
                  )}

                  {isGenerating && (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-950/80 border border-rose-700 hover:bg-rose-900 rounded-lg transition-colors cursor-pointer"
                      title="Generierung sofort stoppen"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Abbrechen</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-200 max-h-80 overflow-y-auto p-1">
                {generatedText}
                {isGenerating && (
                  <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse align-middle ml-1" title="Inferenz aktiv" />
                )}
              </div>

              {!isGenerating && generatedText && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    {insertSuccess && (
                      <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        In Förderplan übernommen!
                      </span>
                    )}
                    {copySuccess && (
                      <span className="text-blue-300 text-xs font-semibold flex items-center gap-1 bg-blue-950/60 border border-blue-800/80 px-2.5 py-1 rounded-lg">
                        <Check className="w-3.5 h-3.5 text-blue-400" />
                        In Zwischenablage kopiert!
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearGeneratedText}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700/60 rounded-lg text-xs font-medium transition cursor-pointer"
                      title="Generierten Text verwerfen / leeren"
                    >
                      Text leeren
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedText);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2500);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      Text kopieren
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertGeneratedAsRow}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>In Förderplan übernehmen</span>
                    </button>
                  </div>
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
            ref={promptModalRef}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-modal-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-600 shrink-0" aria-hidden="true" />
                <h3 id="prompt-modal-title" className="text-sm font-bold text-slate-900">
                  Normalisierter Prompt für lokales LLM
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold p-1 cursor-pointer"
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
          <span>Zurück zum Einschätzungsbogen</span>
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

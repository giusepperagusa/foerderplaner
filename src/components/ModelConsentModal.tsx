/**
 * Förderplan-Assistent Berlin
 * Copyright (C) 2024-2026 Giuseppe Ragusa
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Interactive Consent & Download Manager for Local Wllama GGUF Models
 * Supports three instruction models (in order of preference):
 * 1. Llama-3.2-3B-Instruct-Q4_K_S (Preferred, highest quality)
 * 2. Qwen2.5-1.5b-Instruct-Q8_0 (Balanced, high precision)
 * 3. Llama-3.2-1B-Instruct-Q8_0 (Compact & fast for mobile/constrained hardware)
 *
 * Automatically detects device hardware (CPU cores, RAM) to recommend the best model,
 * makes it the pre-selected default until explicitly overridden by user,
 * and manages on-demand WebAssembly lifecycle and persistent OPFS/IndexedDB storage.
 */
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  DownloadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  HardDrive, 
  Wifi, 
  ShieldCheck, 
  Clock, 
  RefreshCw,
  Database,
  Sparkles,
  Laptop
} from 'lucide-react';
import { 
  webLlmManager, 
  AVAILABLE_MODELS,
  ModelOption,
  ModelCacheStatus,
  InitProgressReport,
  getHardwareProfile
} from '../utils/webLlmManager';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onModelReady?: () => void;
}

export const ModelConsentModal: React.FC<Props> = ({ isOpen, onClose, onModelReady }) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });
  const [hardwareProfile] = useState(() => getHardwareProfile());
  const [selectedKey, setSelectedKey] = useState<string>(() => webLlmManager.getSelectedModelKey());
  const activeModel: ModelOption = AVAILABLE_MODELS[selectedKey] || AVAILABLE_MODELS['llama-3.2-3b-q4_k_s'];

  const [cacheStatus, setCacheStatus] = useState<ModelCacheStatus>(() => {
    const hasLocalFlag =
      typeof window !== 'undefined' &&
      localStorage.getItem(`foerderplaner_model_cached_${activeModel.id}`) === 'true';
    return {
      isSupported: true,
      isCached: hasLocalFlag,
      isLoaded: webLlmManager.isEngineReady(),
      storageBackend: 'OPFS',
      cacheKeys: []
    };
  });
  const [isChecking, setIsChecking] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressReport, setProgressReport] = useState<InitProgressReport | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen, selectedKey]);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const status = await webLlmManager.checkCacheStatus();
      setCacheStatus(status);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSelectModel = (key: string) => {
    if (isDownloading) return;
    setSelectedKey(key);
    webLlmManager.setSelectedModelKey(key);
    setStatusMessage(null);
    setDownloadError(null);
    const targetModel = AVAILABLE_MODELS[key];
    if (targetModel && typeof window !== 'undefined') {
      const isCachedFlag = localStorage.getItem(`foerderplaner_model_cached_${targetModel.id}`) === 'true';
      setCacheStatus(prev => ({ ...prev, isCached: isCachedFlag }));
    }
  };

  const handleStartDownload = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    setProgressReport({ progress: 0.01, text: `Verbindung zu Hugging Face (${activeModel.hfRepo}) wird hergestellt...`, timeElapsed: 0 });

    try {
      await webLlmManager.initModel((report) => {
        setProgressReport(report);
      });
      // Immediately unload model from RAM so idle memory remains 0 MB while cached in OPFS
      await webLlmManager.unloadModel();
      setStatusMessage(`Modell (${activeModel.shortName}) erfolgreich heruntergeladen und im privaten Speicher (${cacheStatus.storageBackend}) gesichert! Es startet bei Generierung bedarfsgerecht.`);
      await checkStatus();
      if (onModelReady) {
        onModelReady();
      }
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(err.message || 'Fehler beim Herunterladen oder Initialisieren des Wllama-Modells.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePurgeCache = async () => {
    if (!window.confirm(`Möchten Sie den lokalen Speicher für ${activeModel.shortName} wirklich leeren? Das Modell muss bei erneuter Nutzung wieder heruntergeladen werden.`)) {
      return;
    }
    const success = await webLlmManager.purgeModelCache();
    if (success) {
      setStatusMessage('Lokaler Modellspeicher (OPFS & IndexedDB) wurde vollständig geleert.');
      await checkStatus();
    } else {
      setStatusMessage('Der Speicher konnte nicht gelöscht werden oder war bereits leer.');
    }
  };

  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDownloading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDownloading, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={() => {
        if (!isDownloading) onClose();
      }}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-consent-title"
      >
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-white/10 rounded-xl" aria-hidden="true">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-200" />
            </div>
            <div>
              <h2 id="model-consent-title" className="text-base sm:text-lg font-bold">
                Lokales Sprachmodell (Wllama On-Device)
              </h2>
              <p className="text-xs text-indigo-100 mt-0.5">
                100% datenschutzkonforme On-Demand KI-Ausführung direkt im Browser (CPU WebAssembly)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          {/* Hardware Detection Badge & Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">
                  Erkannte Geräte-Hardware:
                </span>
                <span className="text-xs font-mono font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {hardwareProfile.hardwareSummary}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                Automatische Hardware-Optimierung
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {hardwareProfile.recommendationReason}
            </p>
          </div>

          {/* WebAssembly Support Status */}
          {!cacheStatus.isSupported && !isChecking && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block text-sm mb-1">WebAssembly nicht verfügbar</span>
                Ihr Browser unterstützt WebAssembly derzeit nicht.
                Die App verwendet automatisch die <strong>Regel-basierte Richtlinien-Zuordnung</strong>, die sofort einsatzbereit ist.
              </div>
            </div>
          )}

          {/* Model Selection Selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Verfügbare Modelle (Auswahl wird gespeichert):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {Object.entries(AVAILABLE_MODELS).map(([key, model]) => {
                const isSelected = selectedKey === key;
                const isHwRecommended = key === hardwareProfile.recommendedModelKey;
                const isCachedLocally =
                  typeof window !== 'undefined' &&
                  localStorage.getItem(`foerderplaner_model_cached_${model.id}`) === 'true';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectModel(key)}
                    disabled={isDownloading}
                    className={`p-3 rounded-xl border text-left transition relative cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-slate-900">
                          {model.shortName}
                        </span>
                        {isHwRecommended ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded" title="Empfohlen für Ihre Hardware-Ausstattung">
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
                            Offline gespeichert
                          </div>
                        ) : (
                          <div>Download: <strong className="text-slate-800">~{model.downloadSizeMB} MB</strong></div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-1 border-t border-indigo-200 text-[10px] font-semibold text-indigo-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                        Aktiv ausgewählt
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Specification Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {selectedKey === hardwareProfile.recommendedModelKey ? 'Hardware-Empfehlung für Ihr Gerät' : 'Alternative Modelloption'}
                </span>
                <h3 className="font-bold text-slate-800 text-base mt-1">
                  {activeModel.name}
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 font-semibold rounded-full bg-slate-200 text-slate-700 font-mono">
                {activeModel.quantization}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {activeModel.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Download-Größe:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                  ~{activeModel.downloadSizeMB} MB
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Benötigter RAM:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  ~{activeModel.ramRequiredMB} MB
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Kontext (dynamisch):</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  Bedarfsgerecht
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Ausführung:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  On-Demand (RAM frei)
                </span>
              </div>
            </div>
            <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Geschätzte Downloadzeit:</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {activeModel.estimatedTimeFast}
              </span>
            </div>
          </div>

          {/* Architecture & On-Demand Lifecycle Notice */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Wifi className="w-4 h-4 text-amber-700" />
              Automatische Wllama-Optimierungen & On-Demand Lifecycle
            </div>
            <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
              <li>
                <strong>On-Demand Ausführung:</strong> Das Modell wird nur bei der aktiven Generierung geladen und <u>sofort danach vollständig aus dem Arbeitsspeicher entladen</u>. Ihr Browser-RAM bleibt im Ruhebetrieb frei.
              </li>
              <li>
                <strong>Embeddings deaktiviert:</strong> Unnötige Einbettungsvektoren werden abgeschaltet (<code>embeddings: false</code>), um Rechenzeit und Speicher zu minimieren.
              </li>
              <li>
                <strong>Adaptive CPU-Threads:</strong> Die Thread-Anzahl wird automatisch an die physischen Kerne Ihres Prozessors ({hardwareProfile.physicalCores} Threads) angepasst.
              </li>
              <li>
                <strong>Dynamisches Kontextfenster:</strong> Der KV-Cache wird für jeden Lauf exakt auf die tatsächlich benötigten Prompt- und Antworttokens skaliert, was den Speicherbedarf drastisch reduziert.
              </li>
              <li>
                <strong>Optimale Sampling-Parameter:</strong> Konfiguriert mit <code>temp: 0.3</code>, <code>top_p: 0.85</code>, <code>top_k: 40</code>, <code>repeat_penalty: 1.15</code> und <code>repeat_last_n: 64</code> für deterministische, wiederholungsfreie Förderplan-Bausteine.
              </li>
              <li>
                <strong>Permanente Offline-Speicherung:</strong> Modellgewichte werden geschützt im <strong>OPFS (Origin Private File System)</strong> abgelegt und arbeiten nach dem ersten Download 100% offline.
              </li>
            </ul>
          </div>

          {/* Live Progress Bar during download */}
          {isDownloading && progressReport && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  Lade Modell in OPFS / IndexedDB...
                </span>
                <span className="font-mono font-bold text-indigo-700">
                  {Math.round((progressReport.progress || 0) * 100)}%
                </span>
              </div>
              <div className="w-full bg-indigo-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(3, Math.min(100, Math.round((progressReport.progress || 0) * 100)))}%` }}
                />
              </div>
              <p className="text-[11px] text-indigo-700 font-mono truncate">
                {progressReport.text || 'Ladevorgang aktiv...'}
              </p>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {downloadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Fehler beim Laden:</span>
                <span>{downloadError}</span>
              </div>
            </div>
          )}

          {/* Storage Status & Retention Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-slate-600">
                Speicherort: <strong className="text-slate-800">{cacheStatus.storageBackend}</strong>
                {cacheStatus.isCached ? (
                  <span className="text-emerald-700 font-medium ml-2">
                    (Modell liegt lokal im OPFS vor)
                  </span>
                ) : (
                  <span className="text-slate-500 ml-2">
                    (Noch nicht heruntergeladen)
                  </span>
                )}
              </span>
            </div>

            {cacheStatus.isCached && (
              <button
                type="button"
                onClick={handlePurgeCache}
                disabled={isDownloading}
                className="px-3 py-1.5 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Modellspeicher leeren (~{activeModel.downloadSizeMB} MB frei)
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Ohne KI fortfahren (Regelmodus)
          </button>

          <button
            type="button"
            onClick={handleStartDownload}
            disabled={isDownloading || !cacheStatus.isSupported}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isDownloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Wird heruntergeladen...
              </>
            ) : cacheStatus.isCached ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                Lokal gespeichert (Neu herunterladen)
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4" />
                Zustimmen & Download starten (~{activeModel.downloadSizeMB} MB)
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

/**
 * Interactive Consent & Download Manager for Local Wllama GGUF Model
 * Warns about data volume (~397MB), estimated duration, mobile data costs,
 * manages local OPFS/IndexedDB storage (no Cache API), and displays live download progress.
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
  Database
} from 'lucide-react';
import { 
  webLlmManager, 
  CURRENT_MODEL_CONFIG, 
  ModelCacheStatus,
  InitProgressReport 
} from '../utils/webLlmManager';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onModelReady?: () => void;
}

export const ModelConsentModal: React.FC<Props> = ({ isOpen, onClose, onModelReady }) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });
  const [cacheStatus, setCacheStatus] = useState<ModelCacheStatus>({
    isSupported: true,
    isCached: false,
    isLoaded: false,
    storageBackend: 'OPFS',
    cacheKeys: []
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
  }, [isOpen]);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const status = await webLlmManager.checkCacheStatus();
      setCacheStatus(status);
    } finally {
      setIsChecking(false);
    }
  };

  const handleStartDownload = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    setProgressReport({ progress: 0.01, text: 'Verbindung zu Hugging Face / Modell-Quelle wird hergestellt...', timeElapsed: 0 });

    try {
      await webLlmManager.initModel((report) => {
        setProgressReport(report);
      });
      setStatusMessage('Modell erfolgreich geladen und im privaten Speicher (OPFS/IndexedDB) abgelegt!');
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
    if (!window.confirm('Möchten Sie das lokale Modell wirklich aus dem Browser-Speicher löschen? Beim nächsten Mal muss es erneut heruntergeladen werden.')) {
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
              <h2 id="model-consent-title" className="text-xl font-bold">Lokales Sprachmodell (Wllama Wasm)</h2>
              <p className="text-xs text-indigo-200">
                On-Device KI via CPU WebAssembly & OPFS/IndexedDB • 100% DSGVO-konform ohne Cloud & Cache API
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            aria-label="Schließen"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">

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

          {/* Model Specification Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Empfohlenes Offline-Modell (CPU-kompatibel)
                </span>
                <h3 className="font-bold text-slate-800 text-base mt-1">
                  {CURRENT_MODEL_CONFIG.name}
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 font-semibold rounded-full bg-slate-200 text-slate-700">
                GGUF
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {CURRENT_MODEL_CONFIG.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Download-Größe:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                  ~{CURRENT_MODEL_CONFIG.downloadSizeMB} MB
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Benötigter RAM:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  ~{CURRENT_MODEL_CONFIG.ramRequiredMB} MB
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Kontextfenster:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  {CURRENT_MODEL_CONFIG.contextWindow.toLocaleString('de-DE')} Tokens
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">KV-Cache:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {CURRENT_MODEL_CONFIG.kvCacheQuantization || '8-Bit (q8_0)'}
                </span>
              </div>
            </div>
            <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Geschätzte Downloadzeit:</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {CURRENT_MODEL_CONFIG.estimatedTimeFast}
              </span>
            </div>
          </div>

          {/* Storage & Volume Notice */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Wifi className="w-4 h-4 text-amber-700" />
              Hinweis zu Speicher & Datenvolumen
            </div>
            <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Einmaliger Download:</strong> Es werden einmalig ca. <strong>{CURRENT_MODEL_CONFIG.downloadSizeMB} Megabyte (MB)</strong> Daten geladen.
              </li>
              <li>
                <strong>Speichertechnologie:</strong> Die Speicherung erfolgt geschützt im <strong>OPFS (Origin Private File System)</strong> bzw. in <strong>IndexedDB</strong> – die instabile Cache API wird bewusst nicht verwendet.
              </li>
              <li>
                <strong>Quantisierter KV-Cache & 4.096 Tokens Kontext:</strong> Der Key-Value-Cache wird mit 8-Bit (q8_0) quantisiert. Dies spart ca. 50% Arbeitsspeicher und verhindert Token-Limit-Abbrüche auch bei umfangreichen Schülerprofilen.
              </li>
              <li>
                <strong>CPU-Ausführung:</strong> Funktioniert zuverlässig auf jedem Rechner ohne WebGPU-Voraussetzung.
              </li>
              <li>
                <strong>Permanente Offline-Nutzung:</strong> Nach dem Download arbeitet die KI komplett autark offline ohne Internetkontakt.
              </li>
            </ul>
          </div>

          {/* Live Progress Bar during download */}
          {isDownloading && progressReport && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  Lade Modell in Hintergrund-Worker...
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
                    (Modell liegt lokal vor)
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
                Modell löschen (~{CURRENT_MODEL_CONFIG.downloadSizeMB} MB frei)
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
            Abbrechen / Sofort-Regelmodus nutzen
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
                Wird geladen...
              </>
            ) : cacheStatus.isLoaded ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                Modell ist aktiv (Neu initialisieren)
              </>
            ) : cacheStatus.isCached ? (
              <>
                <Cpu className="w-4 h-4" />
                Aus OPFS/IndexedDB initialisieren
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4" />
                Zustimmen & Download starten (~{CURRENT_MODEL_CONFIG.downloadSizeMB} MB)
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

/**
 * Unobtrusive Version Information & Update Check Dialog
 * Responsive on mobile, landscape, and limited-height screens.
 * Includes interactive PWA update checker, semantic version tracking,
 * and direct one-click download of the complete website deployment package / source code.
 */
import React, { useEffect, useState } from 'react';
import {
  X,
  Tag,
  FileText,
  Cpu,
  History,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowUpCircle,
  Download,
  Globe,
  FileCode2,
  Scale,
  ExternalLink,
} from 'lucide-react';
import richtlinienData from '../data/richtlinien.json';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCheckForUpdates?: () => Promise<void>;
  isCheckingUpdates?: boolean;
  lastCheckResult?: string | null;
  needRefresh?: boolean;
  onApplyUpdate?: () => void;
  onOpenLicense?: () => void;
}

export const APP_VERSION = 'v1.4.11-offline';
export const GUIDELINE_VERSION = `${richtlinienData.version} (${richtlinienData.gueltigAb})`;
export const GITHUB_REPO_URL = 'https://github.com/giusepperagusa/foerderplaner';

export const VersionInfoModal: React.FC<Props> = ({ 
  isOpen, 
  onClose,
  onCheckForUpdates,
  isCheckingUpdates = false,
  lastCheckResult,
  needRefresh = false,
  onApplyUpdate,
  onOpenLicense,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  const cleanVersion = APP_VERSION.replace('-offline', '');
  const webDistFilename = `foerderplaner-${cleanVersion}-web-dist.tar.gz`;
  const sourceCodeFilename = `foerderplaner-${cleanVersion}-source-code.tar.gz`;

  const [downloadingWeb, setDownloadingWeb] = useState(false);
  const [downloadingSrc, setDownloadingSrc] = useState(false);

  const handleDownloadArchive = async (url: string, filename: string, isSrc: boolean) => {
    if (isSrc) setDownloadingSrc(true);
    else setDownloadingWeb(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      // Explicitly set the MIME type to application/gzip so browser triggers a save file dialog
      const gzipBlob = new Blob([blob], { type: 'application/gzip' });
      const blobUrl = window.URL.createObjectURL(gzipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    } catch {
      // Fallback: direct window navigation to prompt download
      const fallbackLink = document.createElement('a');
      fallbackLink.href = url;
      fallbackLink.download = filename;
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    } finally {
      if (isSrc) setDownloadingSrc(false);
      else setDownloadingWeb(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col my-auto border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="version-info-title"
      >
        {/* Header - Fixed & Pinned */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-4 sm:px-6 py-3.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30" aria-hidden="true">
              <Tag className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 id="version-info-title" className="text-base font-bold tracking-tight">Versionsinfo & Bereitstellung</h2>
              <p className="text-indigo-200 text-xs">Offline-Status, Aktualisierungen & Web-Export</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto text-slate-700">
          
          {/* Version Badges Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-600 block font-medium">Anwendungs-Version</span>
              <span className="text-sm font-bold text-slate-950 font-mono mt-0.5 block">{APP_VERSION}</span>
              <span className="text-[10px] text-emerald-800 font-semibold">Aktuelle PWA-Build</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-600 block font-medium">Offizielle Richtlinien</span>
              <span className="text-sm font-bold text-slate-950 font-mono mt-0.5 block">Version {GUIDELINE_VERSION}</span>
              <span className="text-[10px] text-indigo-800 font-semibold">{richtlinienData.herausgeber}</span>
            </div>
          </div>

          {/* GitHub Repository Card */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-bold text-xs text-white">Quellcode & Entwicklung auf GitHub</span>
              </div>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                title="GitHub-Repository in neuem Tab öffnen"
              >
                <span>Repository öffnen</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Die Entwicklung des Förderplan-Assistenten erfolgt quelloffen unter der GNU GPLv3 auf GitHub. Sie können dort den Code einsehen, Fehler melden oder Verbesserungen beitragen:
            </p>
            <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono text-indigo-300 select-all truncate">
              <a 
                href={GITHUB_REPO_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:underline flex items-center gap-1"
              >
                <span>{GITHUB_REPO_URL}</span>
              </a>
            </div>
          </div>

          {/* Download Entire Project for Self-Hosting */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-bold text-indigo-950 text-xs">Eigenes Webhosting / Selbst hosten</span>
            </div>
            <p className="text-[11px] text-indigo-900/80 leading-relaxed">
              Sie können die fertige Web-App oder den vollständigen Quellcode als Archiv herunterladen und direkt in ein beliebiges Verzeichnis auf Ihrem eigenen Webserver (Apache, Nginx, cPanel etc.) hochladen.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const baseUrl = import.meta.env.BASE_URL || './';
                  const prefix = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
                  handleDownloadArchive(`${prefix}${webDistFilename}`, webDistFilename, false);
                }}
                disabled={downloadingWeb}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                {downloadingWeb ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{downloadingWeb ? 'Wird geladen...' : `Web-Build (${cleanVersion})`}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const baseUrl = import.meta.env.BASE_URL || './';
                  const prefix = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
                  handleDownloadArchive(`${prefix}${sourceCodeFilename}`, sourceCodeFilename, true);
                }}
                disabled={downloadingSrc}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 disabled:opacity-75 text-indigo-950 border border-indigo-300 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                {downloadingSrc ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <FileCode2 className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>{downloadingSrc ? 'Wird geladen...' : `Quellcode (${cleanVersion})`}</span>
              </button>
            </div>
            <div className="flex flex-col gap-1 text-[10px] text-slate-500 pt-0.5">
              <span>
                • Dateinamen: <code className="text-indigo-800 font-semibold">{webDistFilename}</code> (~4.3 MB) und <code className="text-indigo-800 font-semibold">{sourceCodeFilename}</code> (~200 KB)
              </span>
              <span>
                • Tipp für Ihren Webserver: Entpacken Sie das Web-Build-Archiv direkt im Zielordner. Keine Datenbank oder Node.js auf dem Server erforderlich!
              </span>
            </div>
          </div>

          {/* Interactive PWA Update Checker */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-xs block">PWA & Offline-Cache Update-Prüfung</span>
                <span className="text-[11px] text-slate-500">Prüft, ob eine neue Version auf dem Server verfügbar ist</span>
              </div>
              {onCheckForUpdates && (
                <button
                  type="button"
                  onClick={onCheckForUpdates}
                  disabled={isCheckingUpdates}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdates ? 'Prüfe...' : 'Jetzt prüfen'}</span>
                </button>
              )}
            </div>

            {/* Check Results or Pending Updates */}
            {needRefresh && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <ArrowUpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Neues Update verfügbar!</span>
                </div>
                {onApplyUpdate && (
                  <button
                    type="button"
                    onClick={onApplyUpdate}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-bold transition"
                  >
                    Neu laden
                  </button>
                )}
              </div>
            )}

            {lastCheckResult && !needRefresh && (
              <div className="p-2 bg-slate-100 rounded-lg text-[11px] text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{lastCheckResult}</span>
              </div>
            )}
          </div>

          {/* Model & Architecture Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              Datenschutz & Lokale Engine (Wllama CPU + OPFS/IndexedDB)
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Die App verarbeitet Schülerdaten ausschließlich lokal im Browser (LocalStorage & On-Device WebAssembly). Das KI-Modell (Qwen2.5-0.5B) läuft direkt auf der CPU ohne WebGPU-Zwang. Die Speicherung erfolgt geschützt im OPFS (Origin Private File System) oder IndexedDB – die instabile Cache API wird nicht genutzt.
            </p>
          </div>

          {/* License & Copyright Info Card */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                Lizenz: GNU General Public License v3.0 (GPLv3)
              </span>
              <p className="text-[11px] text-indigo-900 mt-0.5">
                Freie Software. Ausdrücklicher Ausschluss separat geladener KI-Modellgewichte.
              </p>
            </div>
            {onOpenLicense && (
              <button
                type="button"
                onClick={onOpenLicense}
                className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-[11px] border border-indigo-300 transition shadow-2xs cursor-pointer shrink-0"
                title="Software-Lizenz (GPLv3) anzeigen"
              >
                Software-Lizenz (GPLv3)
              </button>
            )}
          </div>

          {/* Changelog section */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              Änderungshistorie (Changelog)
            </span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.11:</span>
                <span>Optimierung Formularkopf & überlaufgeschützte Paginierung: Schulangabe strikt oben rechts auf Seite 1 platziert; Titel „F Ö R D E R P L A N“ und SopädVO-Untertitel zentriert im oberen Seitenbereich verankert; intelligenter Paginierungs-Algorithmus stellt sicher, dass die Fußzeile auf jeder Seite immer garantiert Platz hat und niemals über den unteren Blattrand rutscht (bei Überlauf werden Abschnitte mit explizitem Fortsetzungsbanner wie <i>„Fortsetzung von Seite X: 3. Weitere Vereinbarungen & 4. Gesprächsnachweis“</i> auf die Folgeseite umbrochen).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.10:</span>
                <span>Druck-/PDF-Layoutbereinigung, Subpfad-Veröffentlichung & Download-Referenz: Entfernung sämtlicher Senats-Attributionen aus Formularkopf und -fußzeilen; versions- und dokumentdatierte Seitennummerierung („Seite X von Y“) strikt am unteren Seitenende jeder Seite verankert; vollständige Unterstützung für beliebige Subpfad-/Unterordner-Veröffentlichungen (z. B. GitHub Pages Projektseiten oder Schulportale) via <code>base: './'</code> und <code>VITE_BASE_PATH</code> samt relativer PWA-Manifest- und Wasm-Pfadauflösung; direkter Link zum amtlichen Berliner PDF-Originaldokument (<code>foerdermassnahmen_konkret.pdf</code>) im Richtlinien-Manager und der Dokumentation hinzugefügt.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.9:</span>
                <span>PWA Sofort-Aktualisierung, 1.5B Modell-Option & Anti-Schleifen-Sampling: Aktivierung von <code>autoUpdate</code> und <code>skipWaiting: true</code> im Service Worker zur zuverlässigen Verhinderung veralteter Caches; Bereitstellung des leistungsstarken Qwen 2.5 1.5B-Modells (~940 MB) für fehlerfreie deutsche Sprachlogik und Differenzierung zwischen IST, SOLL und LERNWEG; Prompt-Restrukturierung mit trennscharfer Abschnittsdefinition gegen Token-Wiederholungen; Konfiguration nativer Sampling-Parameter (<code>temp: 0.6</code>, <code>penalty_repeat: 1.35</code>, <code>penalty_freq: 0.5</code>, <code>penalty_present: 0.4</code>, <code>stop</code>-Token) und intelligenter Stream-Abschluss-Erkennung zur Beseitigung abgeschnittener Schlusssätze.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.8:</span>
                <span>Wllama bartowski Q8_0 Modell-Option, Anti-Repetitions-Sampling & 4.096 Tokens KV-Cache: Korrektur der Versionsanzeige auf v1.4.8; Bereitstellung des hochpräzisen 8-Bit-GGUF-Modells (bartowski Q8_0, ~506 MB) zur Vermeidung von Sprachverflachung und Wiederholungsschleifen bei 0.5B-Parametern; Konfiguration von Repetition-Penalty (<code>penalty_repeat: 1.18</code>, <code>penalty_freq: 0.3</code>, <code>penalty_present: 0.3</code>, <code>temperature: 0.6</code>, <code>max_tokens: 450</code>) und automatischem Repetition-Guard im Stream gegen Endlosschleifen; Konfiguration des 4.096-Tokens-Kontexts (<code>n_ctx: 4096</code>) mit 8-Bit quantisiertem KV-Cache (<code>cache_type_k: 'q8_0'</code>, <code>cache_type_v: 'q8_0'</code>); Unterdrückung von WebGPU-Adapter-Warnungen via <code>n_gpu_layers: 0</code>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.7:</span>
                <span>Harmonisierung der Dialog-Schaltflächen & PDF-Druckoptimierung: Vollständige Vereinheitlichung aller Dialog-Aufrufer auf einheitliche Beschriftungen („Lokale KI (Wllama)“, „Richtlinien-Katalog“, „Software-Lizenz (GPLv3)“, „Förderplan-Manager“, „Versionsinfo“); Behebung der im Druck unterdrückten amtlichen Fußzeile mit App-Version und Senats-Referenz durch Entkopplung der CSS-Druckregeln; dynamische mehrseitige Seitennummerierung („Seite X von Y“) bei Plänen mit mehr als 2 Seiten.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.6:</span>
                <span>Barrierefreiheit und DIN 1450 Typografie: Vollständige Konformität mit EN 301 549 / WCAG 2.2 AA in der App-UI (Tastaturnavigation mit Sharp-Outline-Fokusindikator, Skip-to-Content-Link, striktes Focus-Trapping in allen Dialogen via useFocusTrap, semantische HTML-Elemente und ARIA-Rollen, mindestens 4,5:1 Farbkontraste) sowie Überarbeitung des Förderplan-Drucks nach DIN 1450 (serifenlose Arial/Helvetica-Schriftart, mindestens 11pt Grundschriftgröße, 1,4–1,5 Zeilenabstand, Schwarz-Weiß-Druckkontrast und semantische PDF/UA-Dokumentenstruktur).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.5:</span>
                <span>Bereinigung Druck- & Export-Toolbar & Druck-Schaltflächen: Entfernung der redundanten Schaltfläche „JSON sichern“ aus Schritt 5 (die vollständige Einzel- und Gesamtexport-/Importsicherung erfolgt zentral im Förderplan-Manager); Vereinheitlichung der beiden Druck-Buttons oben und unten auf die identische, standardisierte Beschriftung „Formular drucken / PDF“.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.4:</span>
                <span>GitHub-Repository-Verlinkung, orthografische Korrektur & bereinigter Druck: Sichtbare GitHub-Repository-Verlinkung (https://github.com/giusepperagusa/foerderplaner) in der UI; vollständige Überprüfung aller UI-Texte auf standardkonforme deutsche Umlaute (ä, ö, ü) und Eszett (ß) gemäß Rechtschreibung; Entfernung des App-Footers und der Client-Erklärung aus dem finalen Druckausdruck (nur amtliche Zeile mit fortlaufender Seitenzahl verbleibt).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.3:</span>
                <span>Einzelplan-Export & Kollisionsauflösung beim Import: Direkter Export individueller Förderpläne (.json) je Schüler/in aus der Planverwaltung. Intelligente Duplikats- & Kollisionserkennung beim Import mit interaktiver Auswahl (bestehenden Plan aktualisieren vs. separate Kopie anlegen). Präzisierung der Dokumentation zur Speichersicherheit und zu OS-/Geräte-Verschlüsselung nach DSGVO.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.2:</span>
                <span>GPLv3 Lizenzierung & KI-Gewichte-Ausschluss: Vollständige Umstellung der Anwendungssoftware auf die GNU General Public License v3.0 (GPLv3). Dedizierter Lizenzdialog mit Kompatibilitätsprüfung aller statisch einkompilierten Komponenten (MIT, ISC, BSD-2, Apache-2.0) sowie expliziter Klarstellung zum Ausschluss separat heruntergeladener Modellgewichte (Apache-2.0 / Qwen Team).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.1:</span>
                <span>Förderschwerpunkte GE & KME & Diagnostik-Filter: Ergänzung der amtlichen Förderschwerpunkte „Geistige Entwicklung“ (GE) und „Körperliche und motorische Entwicklung“ (KME) in Schritt 1 mit Kriterien, Gegenstandsbereichen und Richtlinien-Maßnahmen. Vollständige Überarbeitung und transparente Erklärung des Filters „Nur Förderbedarf filtern“ in Schritt 2 mit Live-Zähler, Erläuterungs-Banner und interaktivem Leerzustand.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.4.0:</span>
                <span>Wllama WebAssembly CPU-Engine: Ersatz von WebLLM durch Wllama zur Ausführung von Qwen2.5-0.5B-Instruct auf allen Geräten (ohne WebGPU-Zwang). Vollständige Umstellung der Modell-Speicherung auf OPFS und IndexedDB (vollständiger Verzicht auf die Cache API). Sofort-Regelmodus als eleganter Fallback.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.3.1:</span>
                <span>Optimierter amtlicher Formulardruck: Unterdrückung von Browser-Kopf-/Fußzeilen (URL, Datum, Webseiten-Titel) via CSS `@page`, Beibehaltung von Seitenzahlen, präzise Versionsangabe („Förderplan-Assistent Berlin 1.3.1“) im Dokument-Kleingedruckten unter Beibehaltung der amtlichen Angaben.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.3.0:</span>
                <span>Offizielles Berliner Formular nach S. 82-83 („Fördermaßnahmen konkret!“), automatischer Flow-Reset auf Schritt 1 bei Neuerstellung/Wechsel, dynamische Namens-zu-Initialen-Konvertierung, DIN-A4 Druck-Stylesheets.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.2.1:</span>
                <span>PWA-Offline-Unterstützung (Service Worker Caching), Viewport-Fixes für alle Dialoge (Höhenanpassung & Dismissal), Webserver-Export (.tar.gz), aktiver Update-Prüfer.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.2.0:</span>
                <span>WebLLM Web Worker-Integration (Qwen2.5-0.5B), interaktiver Zustimmungs- & Datenvolumen-Manager.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.1.0:</span>
                <span>LocalStorage Mehrfach-Planverwaltung (Entwurf/Abgeschlossen), Pseudonym-/Initialen-Unterstützung.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-indigo-600 font-semibold shrink-0">v1.0.0:</span>
                <span>Vollständige Extraktion aus „Fördermaßnahmen konkret!“, 5-Spalten-Editor.</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer - Always visible and pinned to bottom */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">Build: {APP_VERSION}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};

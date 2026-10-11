import React, { useState } from 'react';
import { X, Scale, FileText, Cpu, BookOpen, Layers, CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { GPL_V3_FULL_TEXT } from '../data/gplv3Text';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });
  const [activeTab, setActiveTab] = useState<'overview' | 'model-exclusion' | 'dependencies' | 'full-text'>('overview');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyGPL = () => {
    navigator.clipboard.writeText(GPL_V3_FULL_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-modal-title"
    >
      <div 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs" aria-hidden="true">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 id="license-modal-title" className="text-base font-bold text-slate-900">
                Lizenz- & Urheberrechtsinformationen
              </h2>
              <p className="text-xs text-slate-600">
                GNU General Public License v3.0 (GPLv3) & Klarstellungen zu Drittkomponenten
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div role="tablist" aria-label="Lizenzinformationen Abschnitte" className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto text-xs font-semibold">
          {[
            { id: 'overview', label: 'Hauptlizenz (GPLv3)', icon: Scale },
            { id: 'model-exclusion', label: 'Ausschluss KI-Modelle', icon: Cpu },
            { id: 'dependencies', label: 'Eingebundene Komponenten', icon: Layers },
            { id: 'full-text', label: 'Volltext LICENSE', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 font-bold'
                    : 'border-transparent text-slate-700 hover:text-slate-950'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed flex-1">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
                <span className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  Software-Lizenzierung unter GNU GPLv3
                </span>
                <p className="text-indigo-900 leading-relaxed">
                  Dieser <strong>Förderplan-Assistent Berlin</strong> ist Freie Software und steht unter den Bedingungen der <strong>GNU General Public License Version 3 (GPLv3)</strong> oder (nach Ihrer Wahl) jeder späteren Version.
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="bg-white text-indigo-900 px-2.5 py-1 rounded-md border border-indigo-200 font-medium">
                    ✓ Freiheit zum Ausführen & Untersuchen
                  </span>
                  <span className="bg-white text-indigo-900 px-2.5 py-1 rounded-md border border-indigo-200 font-medium">
                    ✓ Freiheit zum Weitergeben & Modifizieren
                  </span>
                  <span className="bg-white text-indigo-900 px-2.5 py-1 rounded-md border border-indigo-200 font-medium">
                    ✓ Copyleft: Modifikationen bleiben quelloffen
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Amtliche Richtlinien & Pädagogische Vorgaben
                </h3>
                <p className="text-slate-600">
                  Die in dieser Software strukturierten Beobachtungsbögen, Kriterien und Formulierungsbausteine basieren auf der amtlichen Handreichung:
                </p>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700">
                  „Fördermaßnahmen konkret! Eine Handreichung für pädagogische Fachkräfte zur Entwicklung von Fördermaßnahmen“<br />
                  Herausgeber: Senatsverwaltung für Bildung, Jugend und Familie Berlin (Stand: Nov. 2018).
                </div>
                <p className="text-[11px] text-slate-500">
                  Amtliche Richtlinien und pädagogische Empfehlungen von Schulbehörden dienen als offizielle Bildungsgrundlage und werden im Rahmen des Bildungsauftrags für Schulen bereitgestellt.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <h3 className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Kompatibilität aller Softwarekomponenten
                </h3>
                <p className="text-emerald-900">
                  Alle statisch im Anwendungs-Bundle enthaltenen Bibliotheken (React, Tailwind CSS, Lucide Icons, Wllama WebAssembly, Vite etc.) stehen unter anerkannten permissiven Open-Source-Lizenzen (MIT, ISC, BSD-2, Apache 2.0). Diese sind gemäß der Free Software Foundation (FSF) zu 100 % mit der GNU GPLv3 kompatibel.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MODEL WEIGHTS EXCLUSION */}
          {activeTab === 'model-exclusion' && (
            <div className="space-y-4">
              <div className="p-4.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-700 shrink-0" />
                  <h3 className="font-bold text-amber-950 text-xs">
                    Ausdrücklicher Ausschluss von KI-Modellgewichten (Runtime AI Weights Exclusion)
                  </h3>
                </div>
                <p className="text-amber-900 leading-relaxed">
                  Die vorliegende GPLv3-Lizenz gilt für den <strong>Quellcode, die Algorithmen, Benutzeroberflächen und Build-Skripte</strong> des Förderplan-Assistenten.
                </p>
                <p className="text-amber-900 leading-relaxed font-medium">
                  <strong>Wichtiger Hinweis:</strong> Die wählbaren neuronalen Sprachmodelle (<code>Llama-3.2-3B-Instruct-Q4_K_S</code>, <code>Qwen2.5-1.5b-Instruct-Q8_0</code> und <code>Llama-3.2-1B-Instruct-Q8_0</code> im GGUF-Format), die optional zur Laufzeit durch die Lehrkraft interaktiv heruntergeladen und lokal im Browser (OPFS / IndexedDB) gespeichert werden können, sind <u>kein</u> Bestandteil des Anwendungsquellcodes und <u>kein</u> abgeleitetes Werk der Software.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">
                  Lizenzen der optionalen Sprachmodelle:
                </h4>
                <ul className="space-y-1.5 text-slate-600 list-disc list-inside text-xs">
                  <li>
                    <strong>Llama 3.2 (3B &amp; 1B Instruct):</strong> Meta Llama 3.2 Community License (Meta Platforms, Inc.)
                  </li>
                  <li>
                    <strong>Qwen 2.5 (1.5B Instruct):</strong> Apache License 2.0 (Alibaba Cloud / Qwen Team)
                  </li>
                  <li>
                    <strong>Separater On-Demand-Download:</strong> Die Modellgewichte werden ausschließlich auf expliziten Benutzerwunsch (Einwilligungs-Dialog) direkt von Hugging Face geladen und unterliegen den jeweiligen Modell-Lizenzen.
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                <strong>Zusammenfassung:</strong> Die Bereitstellung dieser Anwendung unter GPLv3 berührt und verändert in keiner Weise die Lizenzbedingungen der separat heruntergeladenen Modellgewichte. Die Anwendung kann zudem auch vollkommen ohne Modell-Download ausschließlich über die regelbasierte Berliner Richtlinien-Engine genutzt werden.
              </div>
            </div>
          )}

          {/* TAB 3: DEPENDENCIES */}
          {activeTab === 'dependencies' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                Alle statisch einkompilierten Bibliotheken und Entwicklungsabhängigkeiten wurden auf Lizenzkompatibilität mit der GNU GPLv3 geprüft:
              </p>
              
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Komponente / Paket</th>
                      <th className="py-2.5 px-3">Zweck</th>
                      <th className="py-2.5 px-3">Lizenz</th>
                      <th className="py-2.5 px-3 text-emerald-700">GPLv3-Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-800">react / react-dom</td>
                      <td className="py-2 px-3 font-sans text-slate-600">UI-Framework</td>
                      <td className="py-2 px-3 text-slate-700">MIT</td>
                      <td className="py-2 px-3 font-sans text-emerald-600 font-semibold">Kompatibel</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-800">@wllama/wllama / llama.cpp</td>
                      <td className="py-2 px-3 font-sans text-slate-600">WebAssembly LLM Runtime</td>
                      <td className="py-2 px-3 text-slate-700">MIT</td>
                      <td className="py-2 px-3 font-sans text-emerald-600 font-semibold">Kompatibel</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-800">lucide-react</td>
                      <td className="py-2 px-3 font-sans text-slate-600">Icons</td>
                      <td className="py-2 px-3 text-slate-700">ISC</td>
                      <td className="py-2 px-3 font-sans text-emerald-600 font-semibold">Kompatibel</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-800">tailwindcss</td>
                      <td className="py-2 px-3 font-sans text-slate-600">Styling & Layout</td>
                      <td className="py-2 px-3 text-slate-700">MIT</td>
                      <td className="py-2 px-3 font-sans text-emerald-600 font-semibold">Kompatibel</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-800">vite / vite-plugin-pwa</td>
                      <td className="py-2 px-3 font-sans text-slate-600">Bundler &amp; PWA-Worker</td>
                      <td className="py-2 px-3 text-slate-700">MIT</td>
                      <td className="py-2 px-3 font-sans text-emerald-600 font-semibold">Kompatibel</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FULL TEXT */}
          {activeTab === 'full-text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  GNU General Public License v3.0 (Volltext)
                </span>
                <button
                  type="button"
                  onClick={handleCopyGPL}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Vollständigen GPLv3-Lizenztext in die Zwischenablage kopieren"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Kopiert!' : 'Lizenztext kopieren'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[10.5px] leading-relaxed max-h-80 overflow-y-auto border border-slate-800 select-all shadow-inner">
                <pre className="whitespace-pre-wrap font-mono">{GPL_V3_FULL_TEXT}</pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>SPDX-Lizenzkennung:</span>
            <span className="font-mono font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
              GPL-3.0-or-later
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};

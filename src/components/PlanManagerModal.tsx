import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  Search,
  FolderOpen,
  ShieldCheck,
  User,
  ArrowRight,
  Sparkles,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { FoerderplanDocument, PlanStatus } from '../types/foerderplan';
import { duplicatePlan, createBlankPlan } from '../utils/planStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plans: FoerderplanDocument[];
  activePlanId: string;
  onSelectPlan: (planId: string) => void;
  onCreateNewPlan: () => void;
  onDeletePlan: (planId: string) => void;
  onDuplicatePlan: (plan: FoerderplanDocument) => void;
  onToggleStatus: (planId: string) => void;
  onImportPlans: (imported: FoerderplanDocument[], mode?: 'copy' | 'overwrite') => void;
}

export const PlanManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  plans,
  activePlanId,
  onSelectPlan,
  onCreateNewPlan,
  onDeletePlan,
  onDuplicatePlan,
  onToggleStatus,
  onImportPlans,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'entwurf' | 'abgeschlossen'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Filter plans
  const filteredPlans = plans.filter((plan) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'entwurf' && plan.status !== 'abgeschlossen') ||
      (statusFilter === 'abgeschlossen' && plan.status === 'abgeschlossen');

    const name = plan.profil.name.toLowerCase();
    const klasse = plan.profil.klasse.toLowerCase();
    const schwerpunkt = plan.profil.hauptschwerpunkt.toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      !query ||
      name.includes(query) ||
      klasse.includes(query) ||
      schwerpunkt.includes(query);

    return matchesStatus && matchesSearch;
  });

  const entwuerfeCount = plans.filter((p) => p.status !== 'abgeschlossen').length;
  const abgeschlossenCount = plans.filter((p) => p.status === 'abgeschlossen').length;

  const handleExportAll = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(plans, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `foerderplaene_gesamtsicherung_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportSingle = (plan: FoerderplanDocument) => {
    const safeName = (plan.profil.name || 'unbenannter_foerderplan')
      .trim()
      .replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_')
      .substring(0, 30);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(plan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `foerderplan_${safeName}_${plan.id.slice(-6)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let importedList: FoerderplanDocument[] = [];
        if (Array.isArray(parsed) && parsed.length > 0) {
          importedList = parsed;
        } else if (parsed && (parsed.profil || parsed.id)) {
          importedList = [parsed];
        } else {
          alert('Ungültiges Dateiformat. Es konnte kein gültiger Förderplan erkannt werden.');
          return;
        }

        // Check for collision with existing local database plans
        const existingIds = new Set(plans.map((p) => p.id));
        const colliding = importedList.filter((imp) => existingIds.has(imp.id));

        if (colliding.length > 0) {
          const collidingNames = colliding
            .map((c) => c.profil?.name?.trim() || 'Unbenannt')
            .join(', ');

          const shouldOverwrite = window.confirm(
            `Kollisionsprüfung beim Import:\n\n` +
            `${colliding.length} Förderplan/Pläne (${collidingNames}) sind mit identischer ID bereits in Ihrer lokalen Datenbank vorhanden.\n\n` +
            `• Klicken Sie auf [OK], um bestehende Pläne zu AKTUALISIEREN / ZU ÜBERSCHREIBEN.\n` +
            `• Klicken Sie auf [Abbrechen], um die Pläne als NEUE KOPIEN anzulegen (bestehende Pläne bleiben erhalten).`
          );

          if (shouldOverwrite) {
            onImportPlans(importedList, 'overwrite');
            alert(`Erfolgreich ${importedList.length} Förderplan/Pläne importiert (${colliding.length} bestehende Pläne aktualisiert).`);
          } else {
            onImportPlans(importedList, 'copy');
            alert(`Erfolgreich ${importedList.length} Förderplan/Pläne importiert (${colliding.length} als separate Kopie/Kopien angelegt).`);
          }
        } else {
          onImportPlans(importedList, 'copy');
          alert(`Erfolgreich ${importedList.length} Förderplan/Pläne importiert.`);
        }
      } catch (err) {
        alert('Fehler beim Lesen oder Parsen der JSON-Datei.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Plan-Verwaltung & Übersicht
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Verwalten Sie mehrere Entwürfe und abgeschlossene Förderpläne lokal im Browser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCreateNewPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Neuer Plan</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Privacy Offline Notice */}
        <div className="bg-emerald-50/80 border-b border-emerald-100 px-4 sm:px-6 py-2 sm:py-2.5 flex items-start gap-2.5 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] sm:text-xs text-emerald-900 leading-relaxed">
            <span className="font-semibold">100% Offline & Datenschutzkonform (DSGVO): </span>
            Alle Förderpläne werden ausschließlich in Ihrem lokalen Browser (LocalStorage) gespeichert. 
            Keine Schülerdaten verlassen Ihr Gerät. 
            Für höchste Vertraulichkeit können Sie als Schülerkennung reine Initialen (z. B. <code className="bg-emerald-150 px-1 py-0.5 rounded font-mono">A. K.</code>) oder eine Schüler-ID (z. B. <code className="bg-emerald-150 px-1 py-0.5 rounded font-mono">ID-24-03</code>) verwenden.
          </div>
        </div>

        {/* Toolbar: Filters & Search */}
        <div className="p-3 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Alle ({plans.length})
            </button>
            <button
              onClick={() => setStatusFilter('entwurf')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                statusFilter === 'entwurf'
                  ? 'bg-white text-amber-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-500" />
              Entwürfe ({entwuerfeCount})
            </button>
            <button
              onClick={() => setStatusFilter('abgeschlossen')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                statusFilter === 'abgeschlossen'
                  ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Abgeschlossen ({abgeschlossenCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Initialen, ID, Klasse suchen..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Plan Cards List */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-6 space-y-3 bg-slate-50/50">
          {filteredPlans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 p-6">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Keine Förderpläne gefunden</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                Erstellen Sie einen neuen Förderplan oder passen Sie die Suchfilter an.
              </p>
              <button
                onClick={onCreateNewPlan}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Neuen Förderplan starten
              </button>
            </div>
          ) : (
            filteredPlans.map((plan) => {
              const isActive = plan.id === activePlanId;
              const isCompleted = plan.status === 'abgeschlossen';
              const displayName = plan.profil.name.trim() || 'Unbenannter Förderplan (Leer)';
              const isInitialOrId =
                plan.profil.name.trim().length <= 6 ||
                plan.profil.name.includes('-') ||
                plan.profil.isAnonymized;

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl border p-4 transition-all shadow-xs ${
                    isActive
                      ? 'border-blue-500 ring-2 ring-blue-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Info Column */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isActive && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                            Aktiv geöffnet
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Abgeschlossen
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              Entwurf
                            </>
                          )}
                        </span>

                        {isInitialOrId && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">
                            Pseudonym / ID
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-normal">
                          Zuletzt bearbeitet: {plan.aktualisiertAm || plan.erstelltAm}
                        </span>
                      </div>

                      {/* Pupil identifier */}
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600 shrink-0" />
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {displayName}
                        </h3>
                        {plan.profil.klasse && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Kl. {plan.profil.klasse}
                          </span>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>
                          <strong className="text-slate-700">Schwerpunkt:</strong> {plan.profil.hauptschwerpunkt}
                        </span>
                        {plan.profil.zeitraumVon && plan.profil.zeitraumBis && (
                          <span>
                            <strong className="text-slate-700">Zeitraum:</strong> {plan.profil.zeitraumVon} bis {plan.profil.zeitraumBis}
                          </span>
                        )}
                        <span>
                          <strong className="text-slate-700">Maßnahmen:</strong> {plan.planEintraege?.length || 0} definiert
                        </span>
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {isActive ? (
                        <button
                          onClick={onClose}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
                        >
                          <span>Weiter bearbeiten</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectPlan(plan.id);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-xs"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Plan öffnen</span>
                        </button>
                      )}

                      <button
                        onClick={() => onToggleStatus(plan.id)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                        title={isCompleted ? 'Als Entwurf markieren' : 'Als abgeschlossen markieren'}
                      >
                        {isCompleted ? (
                          <Clock className="w-4 h-4 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>

                      <button
                        onClick={() => onDuplicatePlan(plan)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-slate-200"
                        title="Diesen Förderplan duplizieren (z. B. als Folgeplan oder Vorlage)"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleExportSingle(plan)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition border border-slate-200"
                        title="Diesen Förderplan einzeln als .json exportieren"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {confirmDeleteId === plan.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                          <button
                            onClick={() => {
                              onDeletePlan(plan.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700"
                          >
                            Wirklich löschen
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200 rounded"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(plan.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-slate-200"
                          title="Förderplan löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Backup & Import */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-xs"
              title="Alle Förderpläne als gemeinsame JSON-Sicherungsdatei herunterladen"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Gesamtsicherung exportieren (.json)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-xs"
              title="Einzelnen Förderplan oder Gesamtsicherung (.json) importieren"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Förderplan(e) importieren (.json)</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
          </div>

          <div className="text-slate-400 text-[11px]">
            {plans.length} Förderpläne lokal im Speicher
          </div>
        </div>

      </div>
    </div>
  );
};
